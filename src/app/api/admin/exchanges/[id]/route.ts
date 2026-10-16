import { NextResponse } from "next/server";
import { isAdmin, sameOrigin, session } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeStatusUpdate } from "@/lib/validation";
import { planExchangeStock } from "@/lib/catalog";

const FLOW: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED", "REJECTED"],
  REJECTED: [],
  COMPLETED: [],
};

/**
 * Admin: REQUESTED → APPROVED (moves stock: returned variant +qty,
 * replacement variant −qty, with ledger entries) → COMPLETED.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = exchangeStatusUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const next = parsed.data.status;
  try {
    const exchange = await prisma.exchange.findUnique({
      where: { id },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!exchange)
      return NextResponse.json({ error: "Exchange not found." }, { status: 404 });
    if (!FLOW[exchange.status].includes(next))
      return NextResponse.json(
        { error: `Cannot move exchange from ${exchange.status} to ${next}.` },
        { status: 400 },
      );

    const s = await session();
    const actor = `Admin (${s?.id?.slice(0, 8) ?? "unknown"})`;

    await prisma.$transaction(async (tx) => {
      if (next === "APPROVED") {
        const from = await tx.productVariant.findUniqueOrThrow({
          where: { id: exchange.fromVariantId },
        });
        const to = await tx.productVariant.findUniqueOrThrow({
          where: { id: exchange.toVariantId },
        });
        const plan = planExchangeStock(
          from.onHandStock,
          to.onHandStock - to.reservedStock,
          exchange.quantity,
        );
        if (!plan.ok)
          throw new Error(plan.reason ?? "Stock changed, please retry");
        // Optimistic locking on both variants.
        const updFrom = await tx.productVariant.updateMany({
          where: { id: from.id, onHandStock: from.onHandStock },
          data: { onHandStock: { increment: plan.fromDelta } },
        });
        const updTo = await tx.productVariant.updateMany({
          where: { id: to.id, onHandStock: to.onHandStock },
          data: { onHandStock: { increment: plan.toDelta } },
        });
        if (updFrom.count !== 1 || updTo.count !== 1)
          throw new Error("Stock changed, please retry");
        await tx.stockLedger.createMany({
          data: [
            {
              variantId: from.id,
              delta: plan.fromDelta,
              balanceAfter: from.onHandStock + plan.fromDelta,
              reason: "EXCHANGE_IN",
              note: `Exchange approved (${exchange.order.orderNumber})`,
              actorName: actor,
            },
            {
              variantId: to.id,
              delta: plan.toDelta,
              balanceAfter: to.onHandStock + plan.toDelta,
              reason: "EXCHANGE_OUT",
              note: `Exchange approved (${exchange.order.orderNumber})`,
              actorName: actor,
            },
          ],
        });
      }
      await tx.exchange.update({ where: { id }, data: { status: next } });
    });

    return NextResponse.json({ ok: true, status: next });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update exchange." },
      { status: 409 },
    );
  }
}
