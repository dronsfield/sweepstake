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
    const participants = await db
      .collection<Participant>("participants")
      .find(
        { group: groupSlug },
        { projection: { _id: 0, phoneNumber: 0, group: 0 } }
      )
      .sort({ drawnAt: 1 })
      .toArray();

    return NextResponse.json({ participants });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
