import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { session, sameOrigin } from "@/lib/auth";
import { profileUpdate, passwordChange } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || !process.env.DATABASE_URL)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);

  // Password change flow
  if (body && typeof body === "object" && "newPassword" in body) {
    const parsed = passwordChange.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    try {
      const user = await prisma.user.findUnique({ where: { id: s.id } });
      if (
        !user?.passwordHash ||
        !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))
      )
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 },
        );
      await prisma.user.update({
        where: { id: s.id },
        data: { passwordHash: await hashPassword(parsed.data.newPassword) },
      });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Could not change password." }, { status: 500 });
    }
  }

  // Name update flow
  const parsed = profileUpdate.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
  try {
    const user = await prisma.user.update({
      where: { id: s.id },
      data: { name: parsed.data.name },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
