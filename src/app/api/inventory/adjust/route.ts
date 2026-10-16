import { NextResponse } from "next/server";
import { isAdmin, sameOrigin, session } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustment } from "@/lib/validation";

/**
 * Atomic stock adjustment with optimistic locking + immutable ledger entry.
 * Admin/Inventory-manager only.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s || !["ADMIN", "INVENTORY_MANAGER"].includes(s.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = adjustment.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check SKU, quantity and reason." },
      { status: 400 },
    );
  const { sku, delta, reason, note } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.findUniqueOrThrow({ where: { sku } });
      if (v.onHandStock + delta < 0)
        throw new Error("Adjustment would make stock negative");
      const updated = await tx.productVariant.updateMany({
        where: { id: v.id, onHandStock: v.onHandStock },
        data: { onHandStock: { increment: delta } },
      });
      if (updated.count !== 1) throw new Error("Stock changed, please retry");
      const entry = await tx.stockLedger.create({
        data: {
          variantId: v.id,
          delta,
          balanceAfter: v.onHandStock + delta,
          reason,
          note: note || null,
          actorName: `Staff (${s.role.toLowerCase()})`,
        },
      });
      return { balanceAfter: v.onHandStock + delta, entryId: entry.id };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Adjustment failed." },
      { status: 409 },
    );
  }
}
