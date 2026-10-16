"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, MapPin, User, LogOut } from "lucide-react";
import { money } from "@/lib/catalog";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: { id: string; sku: string; quantity: number; unitPrice: string }[];
};

type Me = { id: string; name: string; email: string; role: string };

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([m, o]) => {
        if (o.error) throw Error(o.error);
        setMe(m.user);
        setOrders(o.orders);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  if (loading)
    return (
      <main className="dashboard">
        <p>Loading your dashboard…</p>
      </main>
    );

  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>{me ? `Assalam o alaikum, ${me.name.split(" ")[0]}` : "My dashboard"}</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      <div className="stats">
        <div>
          <small>ORDERS</small>
          <h2>{orders.length}</h2>
        </div>
        <div>
          <small>TOTAL SPENT</small>
          <h2>{money(totalSpent)}</h2>
        </div>
        <div>
          <small>IN PROGRESS</small>
          <h2>
            {orders.filter((o) => ["PROCESSING", "SHIPPED"].includes(o.status)).length}
          </h2>
        </div>
        <div>
          <small>DELIVERED</small>
          <h2>{orders.filter((o) => o.status === "DELIVERED").length}</h2>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 25 }}>
        <h3>Quick links</h3>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button" href="/dashboard/orders">
            <Package size={15} /> All orders
          </Link>
          <Link className="button" href="/dashboard/addresses">
            <MapPin size={15} /> Addresses
          </Link>
          <Link className="button" href="/dashboard/profile">
            <User size={15} /> Profile & password
          </Link>
          <button className="button" onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </p>
      </div>

      <h2>Recent orders</h2>
      {!orders.length ? (
        <div className="empty">
          <p>No orders yet.</p>
          <Link className="button dark" href="/#collection">
            Start shopping
          </Link>
        </div>
      ) : (
        orders.slice(0, 3).map((o) => (
          <article className="order-card" key={o.id}>
            <p>
              <span className="order-id">{o.orderNumber}</span>
              <span className="badge">{STATUS_LABEL[o.status] ?? o.status}</span>
            </p>
            <p>
              <span>{new Date(o.createdAt).toLocaleDateString("en-PK")}</span>
              <b>{money(o.totalAmount)}</b>
            </p>
            <p>
              <span>
                {o.items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
              <Link href={`/dashboard/orders/${o.id}`}>View details →</Link>
            </p>
          </article>
        ))
      )}
      {orders.length > 3 && (
        <p>
          <Link href="/dashboard/orders">View all {orders.length} orders →</Link>
        </p>
      )}
    </main>
  );
}
