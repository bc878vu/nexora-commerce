import { prisma } from "@/lib/db";
import { catalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function baseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://nexora-commerce-9leqix42w-asad2327s-projects.vercel.app";
}

export async function GET(req: Request) {
  const base = baseUrl(req);
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${base}/` },
    { loc: `${base}/#collection` },
  ];
  try {
    if (process.env.DATABASE_URL) {
      const [products, categories] = await Promise.all([
        prisma.product.findMany({
          where: { status: "ACTIVE" },
          select: { slug: true, updatedAt: true },
        }),
        prisma.category.findMany({ select: { slug: true } }),
      ]);
      for (const p of products)
        urls.push({
          loc: `${base}/products/${p.slug}`,
          lastmod: p.updatedAt.toISOString(),
        });
      for (const c of categories) urls.push({ loc: `${base}/categories/${c.slug}` });
    } else {
      for (const p of catalog)
        urls.push({ loc: `${base}/products/${p.id}` });
    }
  } catch {
    for (const p of catalog) urls.push({ loc: `${base}/products/${p.id}` });
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
