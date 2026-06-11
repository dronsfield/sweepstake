import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getTopTierTeams, getBottomTierTeams } from "@/lib/teams";
import { getGroup, findByName } from "@/lib/groups";
import { Participant } from "@/lib/types";

const MAX_RETRIES = 5;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  try {
    const { group: groupSlug } = await params;
    const group = getGroup(groupSlug);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const whitelistName = findByName(group, name);
    if (!whitelistName) {
      return NextResponse.json(
        { error: "Name is not registered for this sweepstake" },
        { status: 403 }
      );
    }

    const db = await getDb();
    const collection = db.collection<Participant>("participants");
    const participantCount = group.whitelist.length;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const allParticipants = await collection
        .find({ group: groupSlug })
        .toArray();

      const existing = allParticipants.find((p) => p.name === whitelistName);
      if (existing) {
        const takenTopTeams = allParticipants.map((p) => p.topTierTeam.name);
        const takenBottomTeams = allParticipants.map((p) => p.bottomTierTeam.name);
        return NextResponse.json(
          { error: "You have already drawn your teams", participant: existing, takenTopTeams, takenBottomTeams },
          { status: 409 }
        );
      }

      const drawnTopTeams = new Set(
        allParticipants.map((p) => p.topTierTeam.name)
      );
      const drawnBottomTeams = new Set(
        allParticipants.map((p) => p.bottomTierTeam.name)
      );

      const availableTop = getTopTierTeams(participantCount).filter(
        (t) => !drawnTopTeams.has(t.name)
      );
      const availableBottom = getBottomTierTeams(participantCount).filter(
        (t) => !drawnBottomTeams.has(t.name)
      );

      if (availableTop.length === 0 || availableBottom.length === 0) {
        return NextResponse.json(
          { error: "All teams have been drawn" },
          { status: 410 }
        );
      }

      const participant: Participant = {
        group: groupSlug,
        name: whitelistName,
        topTierTeam: pickRandom(availableTop),
        bottomTierTeam: pickRandom(availableBottom),
        drawnAt: new Date().toISOString(),
      };

      const takenTopTeams = [...drawnTopTeams, participant.topTierTeam.name];
      const takenBottomTeams = [...drawnBottomTeams, participant.bottomTierTeam.name];

      try {
        await collection.insertOne(participant as any);
        return NextResponse.json({ participant, takenTopTeams, takenBottomTeams });
      } catch (err: any) {
        if (err?.code === 11000) {
          const keyPattern = err.keyPattern ?? {};
          if (keyPattern.name) {
            const freshParticipants = await collection
              .find({ group: groupSlug })
              .toArray();
            const existing = freshParticipants.find((p) => p.name === whitelistName);
            return NextResponse.json(
              {
                error: "You have already drawn your teams",
                participant: existing,
                takenTopTeams: freshParticipants.map((p) => p.topTierTeam.name),
                takenBottomTeams: freshParticipants.map((p) => p.bottomTierTeam.name),
              },
              { status: 409 }
            );
          }
          // Team collision — retry with fresh available pool
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json(
      { error: "Draw failed after retries, please try again" },
      { status: 503 }
    );
  } catch (error) {
    console.error("Draw API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
