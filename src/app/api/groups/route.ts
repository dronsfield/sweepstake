import { NextResponse } from "next/server";
import { getGroups } from "@/lib/groups";

export async function GET() {
  const groups = getGroups().map((g) => ({
    slug: g.slug,
    displayName: g.displayName,
    participantCount: g.whitelist.length,
  }));
  return NextResponse.json({ groups });
}
