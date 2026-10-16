import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCategoryTree } from "@/lib/catalog";

/** Public category tree (roots with nested children). */
export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ categories: [], demo: true });
  try {
    const flat = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      demo: false,
      categories: buildCategoryTree(
        flat.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image,
          parentId: c.parentId,
        })),
      ),
    });
  } catch {
    return NextResponse.json({ categories: [], demo: true });
  }
}
