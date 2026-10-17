import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { catalog, presentationFor, categoryPath } from "@/lib/catalog";

export type ApiVariant = {
  id: string;
  sku: string;
  color: string;
  spec: string;
  price: number;
  stock: number;
};

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId: string | null;
  categoryPath: string[];
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  description: string;
  basePrice: number;
  icon: string;
  tone: string;
  image?: string;
  variants: ApiVariant[];
};

/** Static demo catalog (database not connected). Checkout stays disabled. */
function demoCatalog(): ApiProduct[] {
  return catalog.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.id,
    category: p.category,
    categoryId: null,
    categoryPath: [p.category],
    status: "ACTIVE" as const,
    description: p.description,
    basePrice: p.price,
    icon: p.icon,
    tone: p.tone,
    image: p.image,
    variants: p.colors.flatMap((color) =>
      p.specs.map((spec) => ({
        id: `${p.id}::${color}::${spec}`,
        sku: `DEMO-${p.id}-${color}-${spec}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
        color,
        spec,
        price: p.price,
        stock: p.stockPerVariant,
      })),
    ),
  }));
}

export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ products: demoCatalog(), demo: true });
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        include: { variants: { orderBy: { sku: "asc" } } },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany(),
    ]);
    return NextResponse.json({
      demo: false,
      products: products.map((p) => {
        const pres = presentationFor(p.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          categoryId: p.categoryId,
          categoryPath: categoryPath(
            categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
            p.categoryId,
          ).map((c) => c.name),
          status: p.status,
          description: p.description,
          basePrice: Number(p.basePrice),
          icon: pres.icon,
          tone: pres.tone,
          image: pres.image,
          variants: p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            color: (v.attributes as { color?: string }).color ?? "Standard",
            spec: (v.attributes as { spec?: string }).spec ?? "Standard",
            price: Number(v.retailPrice),
            stock: Math.max(0, v.onHandStock - v.reservedStock),
          })),
        } satisfies ApiProduct;
      }),
    });
  } catch {
    // Database configured but unreachable: degrade to demo catalog
    // instead of breaking the storefront.
    return NextResponse.json({ products: demoCatalog(), demo: true });
  }
}
