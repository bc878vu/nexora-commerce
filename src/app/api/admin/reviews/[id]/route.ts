import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const moderation = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

/** Admin: approve or reject a review. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = moderation.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try {
    const review = await prisma.review.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "Could not moderate review." }, { status: 500 });
  }
}
