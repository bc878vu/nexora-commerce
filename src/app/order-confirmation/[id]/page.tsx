import Link from "next/link";
import { Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { session } from "@/lib/auth";
import { money } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await session();
  let order: {
    orderNumber: string;
    totalAmount: unknown;
    status: string;
    createdAt: Date;
  } | null = null;
  if (process.env.DATABASE_URL && s) {
    try {
      order = await prisma.order.findFirst({
        where: { id, userId: s.id },
        select: {
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      });
    } catch {
      order = null;
    }
  }
  return (
    <main className="dashboard">
      <section className="login" style={{ maxWidth: 520, textAlign: "center" }}>
        <p className="eyebrow">ORDER PLACED</p>
        <h2>
          <Check size={22} /> Thank you!
        </h2>
        {order ? (
          <>
            <p>
              Your order <strong>{order.orderNumber}</strong> is confirmed.
            </p>
            <p className="muted">
              Total {money(order.totalAmount as number)} · Status: {order.status}
              <br />
              We will call you shortly to confirm delivery details.
            </p>
          </>
        ) : (
          <p className="muted">
            Your order has been placed. We will call you shortly to confirm
            delivery details.
          </p>
        )}
        <Link className="button dark full" href="/dashboard">
          Track my order
        </Link>
        <p>
          <Link href="/#collection">Continue shopping</Link>
        </p>
      </section>
    </main>
  );
}
