import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin claims inbox, newest first. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const claims = await prisma.claim.findMany({
      include: {
        order: { select: { orderNumber: true, totalAmount: true } },
        user: { select: { name: true, email: true } },
        refunds: { select: { id: true, status: true, amountInt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ claims });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
