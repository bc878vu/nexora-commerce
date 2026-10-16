import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin-only user list. Never exposes password hashes. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, addresses: true } },
      },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
