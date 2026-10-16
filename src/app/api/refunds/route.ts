import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundInput } from "@/lib/validation";

export async function GET() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER") return NextResponse.json({ refunds: [] });
  try {
    const refunds = await prisma.refund.findMany({
      where: { userId: s.id },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ refunds });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

/**
 * Request a refund for one of the customer's own orders (optionally linked
 * to a claim). Refunds are MANUAL — no payment gateway is called.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in to request a refund." }, { status: 401 });
  const parsed = refundInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the amount, reason and account details." },
      { status: 400 },
    );
  const r = parsed.data;
  try {
    const order = await prisma.order.findFirst({
      where: { id: r.orderId, userId: s.id },
    });
    if (!order)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "CANCELLED")
      return NextResponse.json(
        { error: "Cancelled orders don't need refunds." },
        { status: 400 },
      );
    // Amount (USD cents) must not exceed the order total.
    const totalCents = Math.round(Number(order.totalAmount) * 100);
    if (r.amountInt > totalCents)
      return NextResponse.json(
        { error: "Refund can't exceed the order total." },
        { status: 400 },
      );
    if (r.claimId) {
      const claim = await prisma.claim.findFirst({
        where: { id: r.claimId, orderId: order.id, userId: s.id },
      });
      if (!claim)
        return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    const pending = await prisma.refund.count({
      where: { orderId: order.id, status: { in: ["REQUESTED", "APPROVED"] } },
    });
    if (pending > 0)
      return NextResponse.json(
        { error: "There's already a pending refund for this order." },
        { status: 400 },
      );
    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        claimId: r.claimId || null,
        userId: s.id,
        amountInt: r.amountInt,
        reason: r.reason,
        method: r.method,
        accountDetail: r.accountDetail,
      },
    });
    return NextResponse.json({ refund }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not request refund." }, { status: 500 });
  }
}
