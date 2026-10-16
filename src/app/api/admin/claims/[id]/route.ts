import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { claimStatusUpdate } from "@/lib/validation";

/** Admin: move a claim through OPEN → IN_REVIEW → APPROVED/REJECTED → RESOLVED. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = claimStatusUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try {
    const claim = await prisma.claim.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote || null,
      },
    });
    return NextResponse.json({ claim });
  } catch {
    return NextResponse.json({ error: "Could not update claim." }, { status: 500 });
  }
}
