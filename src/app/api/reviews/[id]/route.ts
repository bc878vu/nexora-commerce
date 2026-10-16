import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewUpdate } from "@/lib/validation";

/** Edit your own review — it returns to PENDING for re-approval. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER")
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const parsed = reviewUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  try {
    const existing = await prisma.review.findFirst({
      where: { id, userId: s.id },
    });
    if (!existing)
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    const review = await prisma.review.update({
      where: { id },
      data: { ...parsed.data, status: "PENDING" },
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "Could not update review." }, { status: 500 });
  }
}
