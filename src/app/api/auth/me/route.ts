import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { session } from "@/lib/auth";

export async function GET() {
  const s = await session();
  if (!s || !process.env.DATABASE_URL) return NextResponse.json({ user: null });
  try {
    const user = await prisma.user.findUnique({
      where: { id: s.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
