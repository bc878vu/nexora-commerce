import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { catalog } from "@/lib/catalog";
export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ products: catalog, demo: true });
  try {
    const variants = await prisma.productVariant.findMany({
      include: { product: true },
      orderBy: { sku: "asc" },
    });
    return NextResponse.json({
      demo: false,
      products: variants.map((v) => ({
        ...catalog.find((c) => c.id === v.id),
        id: v.id,
        name: v.product.name,
        description: v.product.description,
        category: v.product.category,
        price: Number(v.retailPrice),
        stock: Math.max(0, v.onHandStock - v.reservedStock),
        sku: v.sku,
        color: (v.attributes as { color?: string }).color ?? "Standard",
        icon: catalog.find((c) => c.id === v.id)?.icon ?? "battery",
        tone: catalog.find((c) => c.id === v.id)?.tone ?? "#e5e7eb",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Catalog is temporarily unavailable" },
      { status: 503 },
    );
  }
}
