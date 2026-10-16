import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryInput } from "@/lib/validation";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "category"
  );
}

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = categoryInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Check category fields." }, { status: 400 });
  const c = parsed.data;
  try {
    if (c.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: c.parentId },
      });
      if (!parent)
        return NextResponse.json({ error: "Parent category not found." }, { status: 400 });
    }
    let slug = c.slug || slugify(c.name);
    let n = 1;
    while (await prisma.category.findUnique({ where: { slug } }))
      slug = `${slugify(c.name)}-${++n}`;
    const category = await prisma.category.create({
      data: {
        name: c.name,
        slug,
        image: c.image || null,
        parentId: c.parentId || null,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create category." },
      { status: 500 },
    );
  }
}
