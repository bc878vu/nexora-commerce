import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Admin review moderation queue. ?status=PENDING|APPROVED|REJECTED */
export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const where: Prisma.ReviewWhereInput =
    status === "PENDING" || status === "APPROVED" || status === "REJECTED"
      ? { status }
      : {};
  try {
    const reviews = await prisma.review.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
