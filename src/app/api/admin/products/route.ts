import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productInput, variantInput } from "@/lib/validation";
import { buildSkuCode } from "@/lib/sku-generator";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "product"
  );
}

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const products = await prisma.product.findMany({
      include: { variants: { orderBy: { sku: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = productInput.safeParse(body?.product);
  const variantsParsed = variantInput
    .array()
    .min(1)
    .max(200)
    .safeParse(body?.variants);
  if (!parsed.success || !variantsParsed.success)
    return NextResponse.json(
      { error: "Check product fields and at least one variant." },
      { status: 400 },
    );
  const p = parsed.data;
  try {
    // Ensure unique slug
    let slug = slugify(p.name);
    let n = 1;
    while (await prisma.product.findUnique({ where: { slug } })) slug = `${slugify(p.name)}-${++n}`;

    const prefix = p.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const code = slugify(p.name).slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: p.name,
          slug,
          category: p.category,
          description: p.description,
          basePrice: p.basePrice,
        },
      });
      for (const v of variantsParsed.data) {
        const sku = buildSkuCode(prefix, code || "GEN", {
          color: v.color,
          spec: v.spec,
        });
        const variant = await tx.productVariant.create({
          data: {
            sku,
            productId: created.id,
            attributes: { color: v.color, spec: v.spec },
            unitCost: v.unitCost,
            retailPrice: v.retailPrice,
            onHandStock: v.onHandStock,
            reorderPoint: v.reorderPoint,
          },
        });
        if (v.onHandStock > 0)
          await tx.stockLedger.create({
            data: {
              variantId: variant.id,
              delta: v.onHandStock,
              balanceAfter: v.onHandStock,
              reason: "INITIAL_SEED",
              note: "Product created in admin",
              actorName: "Admin",
            },
          });
      }
      return created;
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create product." },
      { status: 500 },
    );
  }
}
