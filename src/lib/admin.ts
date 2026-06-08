import { NextRequest, NextResponse } from "next/server";

export function validateAdminPin(request: NextRequest): NextResponse | null {
  const pin = request.headers.get("x-admin-pin");
  const expected = process.env.ADMIN_PIN;

  if (!expected || pin !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
