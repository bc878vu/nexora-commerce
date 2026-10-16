import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeInput } from "@/lib/validation";

export async function GET() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER") return NextResponse.json({ exchanges: [] });
  try {
    const exchanges = await prisma.exchange.findMany({
      where: { userId: s.id },
      include: {
        order: { select: { orderNumber: true } },
        fromVariant: { select: { sku: true, attributes: true } },
        toVariant: { select: { sku: true, attributes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ exchanges });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

/**
 * Request an exchange: swap a purchased variant for another variant of the
 * same product (different colour/size). The replacement must be in stock.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in to request an exchange." }, { status: 401 });
  const parsed = exchangeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Pick a replacement and tell us why." },
      { status: 400 },
    );
  const e = parsed.data;
  try {
    const order = await prisma.order.findFirst({
      where: { id: e.orderId, userId: s.id },
      include: { items: true },
    });
    if (!order)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "CANCELLED")
      return NextResponse.json(
        { error: "Cancelled orders can't be exchanged." },
        { status: 400 },
      );
    const item = order.items.find((i) => i.id === e.orderItemId);
    if (!item)
      return NextResponse.json({ error: "Order item not found." }, { status: 404 });
    const fromVariant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: { select: { id: true } } },
    });
    const toVariant = await prisma.productVariant.findUnique({
      where: { id: e.toVariantId },
      include: { product: { select: { id: true } } },
    });
    if (!fromVariant || !toVariant)
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    if (fromVariant.id === toVariant.id)
      return NextResponse.json(
        { error: "Pick a different colour or size." },
        { status: 400 },
      );
    if (fromVariant.product.id !== toVariant.product.id)
      return NextResponse.json(
        { error: "Exchanges are within the same product." },
        { status: 400 },
      );
    const available = toVariant.onHandStock - toVariant.reservedStock;
    if (available < item.quantity)
      return NextResponse.json(
        { error: "The replacement is out of stock right now." },
        { status: 400 },
      );
    const pending = await prisma.exchange.count({
      where: {
        orderId: order.id,
        fromVariantId: fromVariant.id,
        status: { in: ["REQUESTED", "APPROVED"] },
      },
    });
    if (pending > 0)
      return NextResponse.json(
        { error: "There's already a pending exchange for this item." },
        { status: 400 },
      );
    const exchange = await prisma.exchange.create({
      data: {
        orderId: order.id,
        userId: s.id,
        fromVariantId: fromVariant.id,
        toVariantId: toVariant.id,
        quantity: item.quantity,
        reason: e.reason,
      },
    });
    return NextResponse.json({ exchange }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not request exchange." }, { status: 500 });
  }
}
