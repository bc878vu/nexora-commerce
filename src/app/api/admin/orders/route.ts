import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin, sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const p = z
    .object({
      id: z.string(),
      status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]),
    })
    .safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      const o = await tx.order.findUniqueOrThrow({
        where: { id: p.data.id },
        include: { items: true },
      });
      const valid =
        (o.status === "PROCESSING" &&
          ["SHIPPED", "CANCELLED"].includes(p.data.status)) ||
        (o.status === "SHIPPED" && p.data.status === "DELIVERED");
      if (!valid) throw Error("Invalid transition");
      const result = await tx.order.updateMany({
        where: { id: o.id, status: o.status },
        data: { status: p.data.status },
      });
      if (result.count !== 1) throw Error("Order changed");
      if (p.data.status === "CANCELLED")
        for (const i of [...o.items].sort((a, b) =>
          a.variantId.localeCompare(b.variantId),
        )) {
          const v = await tx.productVariant.update({
            where: { id: i.variantId },
            data: { onHandStock: { increment: i.quantity } },
          });
          await tx.stockLedger.create({
            data: {
              variantId: v.id,
              delta: i.quantity,
              balanceAfter: v.onHandStock,
              reason: "ORDER_CANCELLATION",
              actorName: "Administrator",
            },
          });
        }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Order could not be updated. Refresh and retry." },
      { status: 409 },
    );
  }
}
