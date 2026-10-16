import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundStatusUpdate } from "@/lib/validation";

const FLOW: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSED", "REJECTED"],
  REJECTED: [],
  PROCESSED: [],
};

/** Admin: REQUESTED → APPROVED/REJECTED → PROCESSED. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = refundStatusUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try {
    const refund = await prisma.refund.findUnique({ where: { id } });
    if (!refund)
      return NextResponse.json({ error: "Refund not found." }, { status: 404 });
    if (!FLOW[refund.status].includes(parsed.data.status))
      return NextResponse.json(
        { error: `Cannot move refund from ${refund.status} to ${parsed.data.status}.` },
        { status: 400 },
      );
    const updated = await prisma.refund.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ refund: updated });
  } catch {
    return NextResponse.json({ error: "Could not update refund." }, { status: 500 });
  }
}
