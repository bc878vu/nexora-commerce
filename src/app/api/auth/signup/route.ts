import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signup } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { setSession, sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Accounts are unavailable until the store database is connected." },
      { status: 503 },
    );
  const parsed = signup.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please check your name, email and password (min 8 characters)." },
      { status: 400 },
    );
  const { name, email, password } = parsed.data;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
    await setSession(user.id, user.role);
    return NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
