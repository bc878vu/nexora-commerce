import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { catalog, money, presentationFor } from "@/lib/catalog";
import ProductArt from "@/components/ProductArt";

export const dynamic = "force-dynamic";

type CatInfo = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

async function getCategory(slug: string): Promise<CatInfo | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const c = await prisma.category.findUnique({
      where: { slug },
      include: { children: { select: { id: true, name: true, slug: true } } },
    });
    return c;
  } catch {
    return null;
  }
}

type CardProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  basePrice: number;
  icon: string;
  tone: string;
};

async function getProducts(cat: CatInfo): Promise<CardProduct[]> {
  // Include the category's own products + all subcategory products.
  const ids = [cat.id, ...cat.children.map((c) => c.id)];
  if (process.env.DATABASE_URL) {
    try {
      const ps = await prisma.product.findMany({
        where: { status: "ACTIVE", categoryId: { in: ids } },
        orderBy: { name: "asc" },
      });
      return ps.map((p) => {
        const pres = presentationFor(p.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          basePrice: Number(p.basePrice),
          icon: pres.icon,
          tone: pres.tone,
        };
      });
    } catch {
      /* fall through to static */
    }
  }
  // Demo fallback: match the static catalog by top-level name.
  return catalog
    .filter((c) => c.category.toLowerCase() === cat.name.toLowerCase())
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.id,
      category: c.category,
      basePrice: c.price,
      icon: c.icon,
      tone: c.tone,
    }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const cat = await getCategory((await params).slug);
  if (!cat) return { title: "Category not found" };
  const title = `${cat.name} — Nexora Commerce`;
  const description = `Shop ${cat.name.toLowerCase()} — handbags & footwear for her, with worldwide shipping and 7-day easy exchange.`;
  return {
    title,
    description,
    openGraph: { type: "website", title, description, siteName: "Nexora Commerce" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cat = await getCategory((await params).slug);
  if (!cat) notFound();
  const products = await getProducts(cat);
  return (
    <main className="dashboard">
      <p className="muted">
        <Link href="/">Home</Link> / <span>Categories</span> /{" "}
        <strong>{cat.name}</strong>
      </p>
      <p className="eyebrow">CATEGORY</p>
      <h1>{cat.name}</h1>
      {cat.children.length > 0 && (
        <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cat.children.map((ch) => (
            <Link key={ch.id} className="button" href={`/categories/${ch.slug}`}>
              {ch.name}
            </Link>
          ))}
        </p>
      )}
      {!products.length ? (
        <div className="empty">
          <p>No pieces in {cat.name} just yet — check back soon.</p>
          <Link className="button dark" href="/#collection">
            Browse everything
          </Link>
        </div>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <article className="product" key={p.id}>
              <Link
                className="art-button"
                href={`/products/${p.slug}`}
                aria-label={"View " + p.name}
              >
                <ProductArt icon={p.icon} tone={p.tone} />
                <span className="product-tag">{p.category}</span>
              </Link>
              <div className="product-info">
                <div>
                  <h3>
                    <Link href={`/products/${p.slug}`}>{p.name}</Link>
                  </h3>
                  <p>{money(p.basePrice)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
