import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getGroup } from "@/lib/groups";
import { Participant } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  try {
    const { group: groupSlug } = await params;
    const group = getGroup(groupSlug);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const db = await getDb();
    const drawn = await db
      .collection<Participant>("participants")
      .find({ group: groupSlug }, { projection: { name: 1 } })
      .toArray();
    const drawnNames = new Set(drawn.map((p) => p.name));

    const names = group.whitelist.map((name) => ({
      name,
      drawn: drawnNames.has(name),
    }));

    return NextResponse.json({ names });
  } catch (error) {
    console.error("Names API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
