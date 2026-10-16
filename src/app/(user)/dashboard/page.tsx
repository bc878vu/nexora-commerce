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
export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
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
      <p className="eyebrow">YOUR NEXORA</p>
      <h1>My orders.</h1>
      <p className="muted">
        Orders placed in this browser. Session expires after 7 days; save your
        order reference.
      </p>
      {loading ? (
        <p>Loading your orders…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !orders.length ? (
        <div className="empty">
          <h2>Your next favorite is waiting.</h2>
          <p>You haven’t placed an order in this session.</p>
          <Link className="button dark" href="/">
            Discover the collection ↗
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <article className="order-card" key={o.id}>
            <div className="section-heading">
              <div>
                <small>{new Date(o.createdAt).toLocaleDateString()}</small>
                <h3 className="order-id">{o.orderNumber}</h3>
              </div>
              <span className="badge">{o.status}</span>
            </div>
            {o.items.map((i) => (
              <p key={i.id}>
                {i.quantity} × {i.sku}{" "}
                <b>{money(Number(i.unitPrice) * i.quantity)}</b>
              </p>
            ))}
            <hr />
            <p>
              Total including delivery <b>{money(Number(o.totalAmount))}</b>
            </p>
            <div className="timeline">
              {["PROCESSING", "SHIPPED", "DELIVERED"].map((s, i) => (
                <span
                  key={s}
                  className={
                    o.status !== "CANCELLED" &&
                    i <=
                      ["PROCESSING", "SHIPPED", "DELIVERED"].indexOf(o.status)
                      ? "done"
                      : ""
                  }
                >
                  {s}
                </span>
              ))}
            </div>
          </article>
        ))
      )}
    </main>
  );
}
