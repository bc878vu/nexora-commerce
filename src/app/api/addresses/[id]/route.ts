import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { session, sameOrigin } from "@/lib/auth";
import { addressInput } from "@/lib/validation";

async function ownedAddress(userId: string, id: string) {
  return prisma.address.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER" || !process.env.DATABASE_URL)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const parsed = addressInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please check the address fields." }, { status: 400 });
  if (!(await ownedAddress(s.id, id)))
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  try {
    const address = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault)
        await tx.address.updateMany({
          where: { userId: s.id },
          data: { isDefault: false },
        });
      return tx.address.update({ where: { id }, data: parsed.data });
    });
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ error: "Could not update address." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || s.role !== "CUSTOMER" || !process.env.DATABASE_URL)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  if (!(await ownedAddress(s.id, id)))
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  try {
    await prisma.address.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete address." }, { status: 500 });
  }
}
