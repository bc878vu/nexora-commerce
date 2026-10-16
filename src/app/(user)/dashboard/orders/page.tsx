"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/catalog";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: { id: string; sku: string; quantity: number; unitPrice: string }[];
};

const STEPS = ["PROCESSING", "SHIPPED", "DELIVERED"];

function Timeline({ status }: { status: string }) {
  if (status === "CANCELLED")
    return (
      <div className="timeline">
        <span className="done">Cancelled</span>
      </div>
    );
  const idx = STEPS.indexOf(status);
  return (
    <div className="timeline" aria-label={`Order status: ${status}`}>
      {STEPS.map((s, i) => (
        <span key={s} className={i <= idx ? "done" : ""}>
          {s.charAt(0) + s.slice(1).toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setOrders(d.orders);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>My orders</h1>
      <p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>
      {loading && <p>Loading orders…</p>}
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {!loading && !orders.length && !error && (
        <div className="empty">
          <p>No orders yet.</p>
          <Link className="button dark" href="/#collection">
            Start shopping
          </Link>
        </div>
      )}
      {orders.map((o) => (
        <article className="order-card" key={o.id}>
          <p>
            <span className="order-id">{o.orderNumber}</span>
            <span className="badge">{o.status}</span>
          </p>
          <p>
            <span>{new Date(o.createdAt).toLocaleString("en-PK")}</span>
            <b>{money(o.totalAmount)}</b>
          </p>
          <Timeline status={o.status} />
          <p>
            <span>{o.items.reduce((s, i) => s + i.quantity, 0)} items</span>
            <Link href={`/dashboard/orders/${o.id}`}>View details →</Link>
          </p>
        </article>
      ))}
    </main>
  );
}
