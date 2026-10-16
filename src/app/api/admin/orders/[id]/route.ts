import { NextResponse } from "next/server";
import { isAdmin, sameOrigin, session } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orderStatusUpdate } from "@/lib/validation";

const FLOW: Record<string, string[]> = {
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = orderStatusUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const next = parsed.data.status;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!FLOW[order.status].includes(next))
      return NextResponse.json(
        { error: `Cannot move order from ${order.status} to ${next}.` },
        { status: 400 },
      );

    const s = await session();
    const actor = `Admin (${s?.id?.slice(0, 8) ?? "unknown"})`;

    await prisma.$transaction(async (tx) => {
      // Cancellation releases the stock that checkout deducted.
      if (next === "CANCELLED") {
        for (const item of order.items) {
          const v = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
          });
          const updated = await tx.productVariant.updateMany({
            where: { id: v.id, onHandStock: v.onHandStock },
            data: { onHandStock: { increment: item.quantity } },
          });
          if (updated.count !== 1) throw new Error("Stock changed during cancel");
          await tx.stockLedger.create({
            data: {
              variantId: v.id,
              delta: item.quantity,
              balanceAfter: v.onHandStock + item.quantity,
              reason: "ORDER_CANCELLATION",
              note: `Order ${order.orderNumber} cancelled`,
              actorName: actor,
            },
          });
        }
      }
      await tx.order.update({ where: { id }, data: { status: next } });
    });

    return NextResponse.json({ ok: true, status: next });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update order." },
      { status: 409 },
    );
  }
}
