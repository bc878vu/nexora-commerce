import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryInput } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = categoryInput.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const data = parsed.data;
  try {
    // Prevent a category from becoming its own parent (or a cycle via children).
    if (data.parentId) {
      if (data.parentId === id)
        return NextResponse.json(
          { error: "A category cannot be its own parent." },
          { status: 400 },
        );
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent)
        return NextResponse.json({ error: "Parent not found." }, { status: 400 });
    }
    if (data.slug) {
      const clash = await prisma.category.findUnique({ where: { slug: data.slug } });
      if (clash && clash.id !== id)
        return NextResponse.json({ error: "Slug already in use." }, { status: 400 });
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.image !== undefined ? { image: data.image || null } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
      },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Could not update category." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    // Reassign children to this category's parent (or make them roots),
    // and unlink products (they keep their display category label).
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await prisma.$transaction([
      prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: cat.parentId },
      }),
      prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      prisma.category.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete category." }, { status: 500 });
  }
}
