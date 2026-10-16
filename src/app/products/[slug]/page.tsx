import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { catalog, money, presentationFor } from "@/lib/catalog";
import type { ApiProduct } from "@/app/api/catalog/route";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

async function getProduct(slug: string): Promise<ApiProduct | null> {
  if (process.env.DATABASE_URL) {
    try {
      const p = await prisma.product.findUnique({
        where: { slug },
        include: { variants: { orderBy: { sku: "asc" } } },
      });
      if (p) {
        const pres = presentationFor(p.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          description: p.description,
          basePrice: Number(p.basePrice),
          icon: pres.icon,
          tone: pres.tone,
          variants: p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            color: (v.attributes as { color?: string }).color ?? "Standard",
            spec: (v.attributes as { spec?: string }).spec ?? "Standard",
            price: Number(v.retailPrice),
            stock: Math.max(0, v.onHandStock - v.reservedStock),
          })),
        };
      }
    } catch {
      /* fall through to static catalog */
    }
  }
  const c = catalog.find((x) => x.id === slug);
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    slug: c.id,
    category: c.category,
    description: c.description,
    basePrice: c.price,
    icon: c.icon,
    tone: c.tone,
    variants: c.colors.flatMap((color) =>
      c.specs.map((spec) => ({
        id: `${c.id}::${color}::${spec}`,
        sku: `DEMO-${c.id}-${color}-${spec}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
        color,
        spec,
        price: c.price,
        stock: c.stockPerVariant,
      })),
    ),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Product not found" };
  return {
    title: `${p.name} — ${money(p.basePrice)}`,
    description: p.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = catalog
    .filter((c) => c.id !== product.id && c.category === product.category)
    .slice(0, 3);
  return (
    <main className="dashboard">
      <p className="muted">
        <Link href="/">Home</Link> / <Link href="/#collection">Shop</Link> /{" "}
        {product.category} / <strong>{product.name}</strong>
      </p>
      <ProductDetailClient product={product} />
      {related.length > 0 && (
        <section style={{ marginTop: 60 }}>
          <h2>You may also like</h2>
          <div className="grid">
            {related.map((r) => (
              <article className="product" key={r.id}>
                <Link
                  className="art-button"
                  href={`/products/${r.id}`}
                  aria-label={"View " + r.name}
                >
                  <span className="product-tag">{r.category}</span>
                </Link>
                <div className="product-info">
                  <div>
                    <h3>
                      <Link href={`/products/${r.id}`}>{r.name}</Link>
                    </h3>
                    <p>{money(r.price)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
