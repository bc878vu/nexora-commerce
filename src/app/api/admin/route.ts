import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Admin overview: KPIs + recent activity. All admin routes require ADMIN. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json(
      { error: "Sign in to manage your store" },
      { status: 401 },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not connected." },
      { status: 503 },
    );
  try {
    const [orders, variants, users, ledger] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { items: true, user: { select: { name: true, email: true } } },
      }),
      prisma.productVariant.findMany({ include: { product: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.stockLedger.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { variant: { include: { product: true } } },
      }),
    ]);

    const active = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = active.reduce((s, o) => s + Number(o.totalAmount), 0);
    const byStatus = active.reduce<Record<string, number>>((m, o) => {
      m[o.status] = (m[o.status] || 0) + 1;
      return m;
    }, {});
    const stockValuation = variants.reduce(
      (s, v) => s + Number(v.unitCost) * v.onHandStock,
      0,
    );
    const lowStock = variants.filter(
      (v) => v.onHandStock - v.reservedStock <= v.reorderPoint,
    );

    return NextResponse.json({
      kpis: {
        revenue,
        orders: orders.length,
        byStatus,
        customers: users.filter((u) => u.role === "CUSTOMER").length,
        stockValuation,
        lowStockCount: lowStock.length,
        variants: variants.length,
      },
      orders,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        productId: v.productId,
        productName: v.product.name,
        attributes: v.attributes,
        retailPrice: v.retailPrice.toString(),
        unitCost: v.unitCost.toString(),
        onHandStock: v.onHandStock,
        reservedStock: v.reservedStock,
        reorderPoint: v.reorderPoint,
        warehouseBin: v.warehouseBin,
      })),
      lowStock: lowStock.map((v) => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.name,
        available: v.onHandStock - v.reservedStock,
        reorderPoint: v.reorderPoint,
      })),
      users,
      ledger: ledger.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        sku: l.variant.sku,
        productName: l.variant.product.name,
        delta: l.delta,
        balanceAfter: l.balanceAfter,
        reason: l.reason,
        note: l.note,
        actorName: l.actorName,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable. Check setup." },
      { status: 503 },
    );
  }
}
