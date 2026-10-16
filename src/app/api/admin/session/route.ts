import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { setSession, sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (
    !expected ||
    expected.length < 16 ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
  )
    return NextResponse.json(
      {
        error:
          "Set ADMIN_PASSWORD (16+ characters) and SESSION_SECRET (32+ characters) on the server.",
      },
      { status: 503 },
    );
  if (
    typeof password !== "string" ||
    password.length > 500 ||
    Buffer.byteLength(password) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(password), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  await setSession("administrator", "ADMIN");
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  (await cookies()).delete("nexora_session");
  return NextResponse.json({ ok: true });
}
