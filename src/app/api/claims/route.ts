import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { claimInput } from "@/lib/validation";

export async function GET() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ claims: [] });
  try {
    const claims = await prisma.claim.findMany({
      where: { userId: s.id },
      include: {
        order: { select: { orderNumber: true } },
        refunds: { select: { id: true, status: true, amountInt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ claims });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

/** File a claim against one of the customer's own orders. */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in to file a claim." }, { status: 401 });
  const parsed = claimInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please describe the issue (at least 10 characters)." },
      { status: 400 },
    );
  try {
    // The order must belong to this customer and not be cancelled.
    const order = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, userId: s.id },
    });
    if (!order)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "CANCELLED")
      return NextResponse.json(
        { error: "Cancelled orders can't have claims." },
        { status: 400 },
      );
    const open = await prisma.claim.count({
      where: {
        orderId: order.id,
        status: { in: ["OPEN", "IN_REVIEW", "APPROVED"] },
      },
    });
    if (open > 0)
      return NextResponse.json(
        { error: "There's already an open claim for this order." },
        { status: 400 },
      );
    const claim = await prisma.claim.create({
      data: {
        orderId: order.id,
        userId: s.id,
        type: parsed.data.type,
        description: parsed.data.description,
      },
    });
    return NextResponse.json({ claim }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not file claim." }, { status: 500 });
  }
}
