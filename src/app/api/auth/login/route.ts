import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { login } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { setSession, sameOrigin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Accounts are unavailable until the store database is connected." },
      { status: 503 },
    );
  const parsed = login.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400 },
    );
  const { email, password } = parsed.data;
  // 5 attempts per 10 minutes per IP+email.
  const rl = rateLimit(`login:${clientIp(req)}:${email}`, 5, 10 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user?.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    )
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    await setSession(user.id, user.role);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Sign in failed." }, { status: 500 });
  }
}
