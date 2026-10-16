import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { session, sameOrigin } from "@/lib/auth";
import { addressInput } from "@/lib/validation";

async function customerId() {
  const s = await session();
  if (!s || s.role !== "CUSTOMER" || !process.env.DATABASE_URL) return null;
  return s.id;
}

export async function GET() {
  const userId = await customerId();
  if (!userId) return NextResponse.json({ addresses: [] });
  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });
    return NextResponse.json({ addresses });
  } catch {
    return NextResponse.json({ error: "Could not load addresses" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const userId = await customerId();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = addressInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please check the address fields." }, { status: 400 });
  try {
    const address = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault)
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...parsed.data, userId } });
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save address." }, { status: 500 });
  }
}
