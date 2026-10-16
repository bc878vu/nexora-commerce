import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const wishlistInput = z.object({
  productId: z.string().min(1).max(100),
});

/** The signed-in customer's wishlist with product snapshots. */
export async function GET() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER") return NextResponse.json({ items: [] });
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: s.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            basePrice: true,
            status: true,
            variants: {
              select: { retailPrice: true, onHandStock: true, reservedStock: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      items: items.map((i) => ({
        productId: i.productId,
        addedAt: i.createdAt,
        product: {
          ...i.product,
          basePrice: Number(i.product.basePrice),
          minPrice: Math.min(
            ...i.product.variants.map((v) => Number(v.retailPrice)),
          ),
          inStock: i.product.variants.some(
            (v) => v.onHandStock - v.reservedStock > 0,
          ),
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

/** Add a product to the wishlist (idempotent). */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in to save items." }, { status: 401 });
  const parsed = wishlistInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  try {
    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true },
    });
    if (!product)
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId: s.id, productId: product.id },
      },
      update: {},
      create: { userId: s.id, productId: product.id },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}

/** Remove a product from the wishlist. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const parsed = wishlistInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: s.id, productId: parsed.data.productId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove." }, { status: 500 });
  }
}
