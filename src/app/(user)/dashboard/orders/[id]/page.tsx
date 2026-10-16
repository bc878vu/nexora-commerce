"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/catalog";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  shippingAddress: string;
  createdAt: string;
  items: { id: string; sku: string; quantity: number; unitPrice: string }[];
};

const STEPS = ["PROCESSING", "SHIPPED", "DELIVERED"];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) =>
      fetch("/api/orders")
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw Error(d.error);
          const found = (d.orders as OrderDetail[]).find((o) => o.id === id);
          if (!found) throw Error("Order not found.");
          setOrder(found);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    );
  }, [params]);

  if (loading)
    return (
      <main className="dashboard">
        <p>Loading order…</p>
      </main>
    );
  if (error || !order)
    return (
      <main className="dashboard">
        <p role="alert" className="message">
          {error || "Order not found."}
        </p>
        <p>
          <Link href="/dashboard/orders">← All orders</Link>
        </p>
      </main>
    );

  let addr: Record<string, string> = {};
  try {
    addr = JSON.parse(order.shippingAddress);
  } catch {}

  const idx = STEPS.indexOf(order.status);
  return (
    <main className="dashboard">
      <p className="eyebrow">ORDER DETAILS</p>
      <h1>{order.orderNumber}</h1>
      <p>
        <Link href="/dashboard/orders">← All orders</Link>
      </p>
      <div className="order-card">
        <p>
          <span>
            Placed {new Date(order.createdAt).toLocaleString("en-PK")}
          </span>
          <span className="badge">{order.status}</span>
        </p>
        {order.status === "CANCELLED" ? (
          <div className="timeline">
            <span className="done">Cancelled</span>
          </div>
        ) : (
          <div className="timeline">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= idx ? "done" : ""}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>
      <h2>Items</h2>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>SKU</th>
              <th style={{ textAlign: "right", padding: 12 }}>Qty</th>
              <th style={{ textAlign: "right", padding: 12 }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 12 }}>{i.sku}</td>
                <td style={{ padding: 12, textAlign: "right" }}>{i.quantity}</td>
                <td style={{ padding: 12, textAlign: "right" }}>
                  {money(Number(i.unitPrice) * i.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="order-card">
        <p>
          <span>Total paid</span>
          <b>{money(order.totalAmount)}</b>
        </p>
        <p>
          <span>Payment</span>
          <span>
            {addr.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : "Cash on delivery"}
          </span>
        </p>
        <h3>Delivery address</h3>
        <p className="muted">
          {addr.name}
          <br />
          {addr.street}, {addr.city} {addr.postalCode}
          <br />
          {addr.phone} · {addr.email}
        </p>
      </div>
    </main>
  );
}
