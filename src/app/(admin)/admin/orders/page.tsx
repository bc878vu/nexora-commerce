"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/catalog";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  shippingAddress: string;
  user: { name: string; email: string };
  items: { sku: string; quantity: number; unitPrice: string }[];
};

const NEXT: Record<string, string[]> = {
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setOrders(d.orders);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    if (!confirm(`Move order to ${status}?`)) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice(`Order updated to ${d.status}.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading orders…</p>;
  return (
    <>
      <h1>Orders</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      {!orders.length && !error && <div className="empty">No orders yet.</div>}
      {orders.map((o) => {
        let addr: Record<string, string> = {};
        try {
          addr = JSON.parse(o.shippingAddress);
        } catch {}
        return (
          <article className="order-card" key={o.id}>
            <p>
              <span className="order-id">{o.orderNumber}</span>
              <span className="badge">{o.status}</span>
            </p>
            <p>
              <span>
                {o.user.name} · {o.user.email}
              </span>
              <b>{money(o.totalAmount)}</b>
            </p>
            <p className="muted">
              {addr.name}, {addr.phone} · {addr.street}, {addr.city} ·{" "}
              {addr.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : "COD"}
            </p>
            <p className="muted">
              {o.items.map((i) => `${i.sku} × ${i.quantity}`).join(" · ")}
            </p>
            <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {NEXT[o.status].map((s) => (
                <button
                  key={s}
                  className="button"
                  disabled={busy === o.id}
                  onClick={() => setStatus(o.id, s)}
                >
                  Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
              {!NEXT[o.status].length && (
                <small className="muted">No further actions</small>
              )}
            </p>
          </article>
        );
      })}
    </>
  );
}
