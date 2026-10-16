import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewInput } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/ratelimit";

/**
 * GET ?productId= — approved reviews (newest first) + average + count.
 * When signed in, also reports whether the viewer may review (canReview).
 */
export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId)
    return NextResponse.json({ error: "productId required." }, { status: 400 });
  try {
    const [reviews, agg] = await Promise.all([
      prisma.review.findMany({
        where: { productId, status: "APPROVED" },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.review.aggregate({
        where: { productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    let canReview = false;
    let reviewReason: string | undefined;
    const s = await session();
    if (s?.role === "CUSTOMER") {
      const existing = await prisma.review.findUnique({
        where: { productId_userId: { productId, userId: s.id } },
      });
      if (existing) {
        reviewReason =
          existing.status === "PENDING"
            ? "Your review is waiting for approval."
            : "You have already reviewed this product.";
      } else {
        const delivered = await prisma.order.findFirst({
          where: {
            userId: s.id,
            status: "DELIVERED",
            items: { some: { variant: { productId } } },
          },
          select: { id: true },
        });
        canReview = !!delivered;
        if (!canReview)
          reviewReason =
            "Only verified buyers can review — this product isn't in any of your delivered orders.";
      }
    }
    return NextResponse.json({
      reviews,
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : null,
      count: agg._count,
      canReview,
      reviewReason,
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

/** Write a review — verified buyers only, one per product, rate-limited. */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in to write a review." }, { status: 401 });
  const rl = rateLimit(`review:${s.id}:${clientIp(req)}`, 5, 3_600_000);
  if (!rl.allowed)
    return NextResponse.json(
      { error: `Too many reviews — try again in ${rl.retryAfterSec}s.` },
      { status: 429 },
    );
  const parsed = reviewInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Give a 1–5 star rating, a title and your honest feedback." },
      { status: 400 },
    );
  const r = parsed.data;
  try {
    const product = await prisma.product.findUnique({
      where: { id: r.productId },
      select: { id: true },
    });
    if (!product)
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: r.productId, userId: s.id } },
    });
    if (existing)
      return NextResponse.json(
        { error: "You have already reviewed this product." },
        { status: 400 },
      );
    const delivered = await prisma.order.findFirst({
      where: {
        userId: s.id,
        status: "DELIVERED",
        items: { some: { variant: { productId: r.productId } } },
      },
      select: { id: true },
    });
    if (!delivered)
      return NextResponse.json(
        {
          error:
            "Only verified buyers can review — this product isn't in any of your delivered orders.",
        },
        { status: 403 },
      );
    const review = await prisma.review.create({
      data: {
        productId: r.productId,
        userId: s.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        status: "PENDING",
      },
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  }
}
