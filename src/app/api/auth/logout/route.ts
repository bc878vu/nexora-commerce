import { NextResponse } from "next/server";
import { clearSession, sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  await clearSession();
  return NextResponse.json({ ok: true });
}
