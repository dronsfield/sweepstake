import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getGroup } from "@/lib/groups";
import { validateAdminPin } from "@/lib/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  const unauthorized = validateAdminPin(request);
  if (unauthorized) return unauthorized;

  try {
    const { group: groupSlug } = await params;
    const group = getGroup(groupSlug);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const db = await getDb();
    const result = await db
      .collection("participants")
      .deleteMany({ group: groupSlug });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
