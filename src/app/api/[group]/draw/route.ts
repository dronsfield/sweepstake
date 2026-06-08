import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getTopTierTeams, getBottomTierTeams, Team } from "@/lib/teams";
import { getGroup, findByPhone } from "@/lib/groups";
import { Participant } from "@/lib/types";

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

    const { phoneNumber } = await request.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const whitelistEntry = findByPhone(group, phoneNumber);
    if (!whitelistEntry) {
      return NextResponse.json(
        { error: "Phone number is not registered for this sweepstake" },
        { status: 403 }
      );
    }

    const db = await getDb();
    const collection = db.collection<Participant>("participants");

    const existing = await collection.findOne({
      group: groupSlug,
      phoneNumber,
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already drawn your teams", participant: existing },
        { status: 409 }
      );
    }

    const participantCount = group.whitelist.length;
    const allParticipants = await collection
      .find({ group: groupSlug })
      .toArray();
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

    const topTierTeam: Team = pickRandom(availableTop);
    const bottomTierTeam: Team = pickRandom(availableBottom);

    const participant: Participant = {
      group: groupSlug,
      phoneNumber,
      name: whitelistEntry.name,
      topTierTeam,
      bottomTierTeam,
      drawnAt: new Date().toISOString(),
    };

    // Atomic upsert to prevent race conditions
    const result = await collection.updateOne(
      { group: groupSlug, phoneNumber },
      { $setOnInsert: participant },
      { upsert: true }
    );

    if (result.upsertedCount === 0) {
      const existing = await collection.findOne({
        group: groupSlug,
        phoneNumber,
      });
      return NextResponse.json(
        { error: "You have already drawn your teams", participant: existing },
        { status: 409 }
      );
    }

    return NextResponse.json({ participant });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
