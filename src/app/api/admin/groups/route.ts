import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getGroups } from "@/lib/groups";
import { validateAdminPin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const unauthorized = validateAdminPin(request);
  if (unauthorized) return unauthorized;

  try {
    const allGroups = getGroups();
    const db = await getDb();

    const groups = await Promise.all(
      allGroups.map(async (group) => {
        const drawnCount = await db
          .collection("participants")
          .countDocuments({ group: group.slug });
        return {
          slug: group.slug,
          displayName: group.displayName,
          participantCount: group.whitelist.length,
          drawnCount,
        };
      })
    );

    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
