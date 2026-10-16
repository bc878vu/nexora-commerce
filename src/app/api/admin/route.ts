import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      { error: "Sign in to manage your store" },
      { status: 401 },
    );
  try {
    const [variants, orders, ledger] = await Promise.all([
      prisma.productVariant.findMany({ include: { product: true } }),
      prisma.order.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { items: true, user: true },
      }),
      prisma.stockLedger.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { variant: true },
      }),
    ]);
    return NextResponse.json({ variants, orders, ledger });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable. Check setup." },
      { status: 503 },
    );
  }
}
