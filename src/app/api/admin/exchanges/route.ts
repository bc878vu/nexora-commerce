import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin exchanges inbox, newest first. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const exchanges = await prisma.exchange.findMany({
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { name: true, email: true } },
        fromVariant: {
          select: { sku: true, attributes: true, onHandStock: true },
        },
        toVariant: {
          select: { sku: true, attributes: true, onHandStock: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ exchanges });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
