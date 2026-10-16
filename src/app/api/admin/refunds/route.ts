import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin refunds inbox, newest first. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const refunds = await prisma.refund.findMany({
      include: {
        order: { select: { orderNumber: true, totalAmount: true, paymentMethod: true } },
        user: { select: { name: true, email: true } },
        claim: { select: { id: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ refunds });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
