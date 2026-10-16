import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { adjustment } from "@/lib/validation";
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin()))
    return NextResponse.json(
      { error: "Admin sign-in required" },
      { status: 403 },
    );
  const parsed = adjustment.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter an integer stock change and a valid reason" },
      { status: 400 },
    );
  try {
    const v = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.findUniqueOrThrow({
        where: { sku: parsed.data.sku },
      });
      if (v.onHandStock + parsed.data.delta < v.reservedStock)
        throw new Error("Insufficient stock");
      const changed = await tx.productVariant.updateMany({
        where: {
          id: v.id,
          onHandStock: v.onHandStock,
          reservedStock: v.reservedStock,
        },
        data: { onHandStock: { increment: parsed.data.delta } },
      });
      if (changed.count !== 1) throw new Error("Stock changed; retry");
      await tx.stockLedger.create({
        data: {
          variantId: v.id,
          delta: parsed.data.delta,
          balanceAfter: v.onHandStock + parsed.data.delta,
          reason: parsed.data.reason,
          note: parsed.data.note,
          actorName: "Administrator",
        },
      });
      return { sku: v.sku, balance: v.onHandStock + parsed.data.delta };
    });
    return NextResponse.json(v);
  } catch {
    return NextResponse.json(
      { error: "Stock update failed. Check available stock and retry." },
      { status: 409 },
    );
  }
}
