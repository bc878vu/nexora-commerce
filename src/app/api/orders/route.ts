import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { session, setSession, sameOrigin } from "@/lib/auth";
import { checkout } from "@/lib/validation";
import {
  shipping,
  availablePaymentMethods,
  DEFAULT_PAYMENT_METHODS,
} from "@/lib/catalog";
import { getStoreSettings } from "@/lib/store-settings";
export async function GET() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER") return NextResponse.json({ orders: [] });
  try {
    return NextResponse.json({
      orders: await prisma.order.findMany({
        where: { userId: s.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load orders" },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (
    !process.env.DATABASE_URL ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
  )
    return NextResponse.json(
      {
        error:
          "Preview mode: checkout requires database and session setup. No order has been placed.",
      },
      { status: 503 },
    );
  const parsed = checkout.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please check your contact details, address and cart." },
      { status: 400 },
    );
  const body = parsed.data;
  const s = await session();
  const userId = s?.role === "CUSTOMER" ? s.id : randomUUID();
  // Server-trusted shipping: zone rate from store settings for the country.
  const settings = await getStoreSettings();
  const zones = settings?.shippingZones;
  // The chosen method must actually be offered for this country right now.
  const offered = availablePaymentMethods(
    body.country,
    settings?.paymentMethods ?? DEFAULT_PAYMENT_METHODS,
    {
      stripeConfigured: !!settings && settings.stripeSecretKey.trim().length > 0,
      paypalConfigured:
        !!settings &&
        settings.paypalClientId.trim().length > 0 &&
        settings.paypalSecret.trim().length > 0,
    },
  );
  if (!offered.some((m) => m.method === body.paymentMethod))
    return NextResponse.json(
      { error: "That payment method isn't available for your country." },
      { status: 400 },
    );
  // Manual (non-COD, non-card) methods require the customer's reference ID.
  if (
    ["BANK_TRANSFER", "JAZZCASH", "EASYPAYSA"].includes(body.paymentMethod) &&
    !body.paymentRef.trim()
  )
    return NextResponse.json(
      { error: "Please enter your transaction / reference ID." },
      { status: 400 },
    );
  try {
    const order = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          name: body.name,
          email: userId + "@guest.nexora.invalid",
        },
        update: { name: body.name },
      });
      const items = [];
      let subtotal = 0;
      for (const item of [...body.items].sort((a, b) =>
        a.id.localeCompare(b.id),
      )) {
        const v = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.id },
        });
        if (v.onHandStock - v.reservedStock < item.quantity)
          throw new Error("Stock unavailable");
        const update = await tx.productVariant.updateMany({
          where: {
            id: v.id,
            onHandStock: v.onHandStock,
            reservedStock: v.reservedStock,
          },
          data: { onHandStock: { decrement: item.quantity } },
        });
        if (update.count !== 1) throw new Error("Stock changed");
        await tx.stockLedger.create({
          data: {
            variantId: v.id,
            delta: -item.quantity,
            balanceAfter: v.onHandStock - item.quantity,
            reason: "CUSTOMER_CHECKOUT",
            actorName: "Customer checkout",
          },
        });
        subtotal += Math.round(Number(v.retailPrice) * 100) * item.quantity;
        items.push({
          variantId: v.id,
          sku: v.sku,
          quantity: item.quantity,
          unitPrice: v.retailPrice,
        });
      }
      const total = subtotal / 100;
      return tx.order.create({
        data: {
          orderNumber: "NX-" + randomUUID().toUpperCase(),
          userId,
          totalAmount: total + shipping(total, body.country, zones),
          shippingAddress: JSON.stringify({
            name: body.name,
            email: body.email,
            phone: body.phone,
            street: body.street,
            city: body.city,
            postalCode: body.postalCode,
            country: body.country,
            paymentMethod: body.paymentMethod,
            paymentRef: body.paymentRef || undefined,
          }),
          paymentMethod: body.paymentMethod,
          paymentRef: body.paymentRef || null,
          items: { create: items },
        },
      });
    });
    await setSession(userId);
    return NextResponse.json({ order }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not place order. Stock may have changed; refresh your cart and retry.",
      },
      { status: 409 },
    );
  }
}
