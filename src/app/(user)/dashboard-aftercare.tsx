"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { moneyCents } from "@/lib/catalog";

type Claim = {
  id: string;
  type: string;
  description: string;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  order: { orderNumber: string };
  refunds: { id: string; status: string; amountInt: number }[];
};

type Refund = {
  id: string;
  amountInt: number;
  method: string;
  reason: string;
  status: string;
  createdAt: string;
  order: { orderNumber: string };
};

type Exchange = {
  id: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: string;
  order: { orderNumber: string };
  fromVariant: { sku: string; attributes: { color?: string; spec?: string } };
  toVariant: { sku: string; attributes: { color?: string; spec?: string } };
};

const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

function useList<T>(url: string, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setItems(d[key] ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url, key]);
  return { items, loading, error };
}

export function ClaimsPage() {
  const { items, loading, error } = useList<Claim>("/api/claims", "claims");
  if (loading)
    return (
      <main className="dashboard">
        <p>Loading…</p>
      </main>
    );
  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>My claims</h1>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <div className="empty">
          <p>No claims yet. If something goes wrong with an order, you can file one from the order page.</p>
          <Link className="button dark" href="/dashboard/orders">
            My orders
          </Link>
        </div>
      )}
      {items.map((c) => (
        <article className="order-card" key={c.id}>
          <p>
            <span>
              {c.order.orderNumber} · {pretty(c.type)}
            </span>
            <span className="badge">{pretty(c.status)}</span>
          </p>
          <p>{c.description}</p>
          {c.resolutionNote && (
            <p className="muted">
              <b>Resolution:</b> {c.resolutionNote}
            </p>
          )}
          {c.refunds.length > 0 && (
            <p className="muted">
              Refund: {moneyCents(c.refunds[0].amountInt)} ·{" "}
              {pretty(c.refunds[0].status)}
            </p>
          )}
          <p className="muted">
            <small>{new Date(c.createdAt).toLocaleString("en-US")}</small>
          </p>
        </article>
      ))}
    </main>
  );
}

export function RefundsPage() {
  const { items, loading, error } = useList<Refund>("/api/refunds", "refunds");
  if (loading)
    return (
      <main className="dashboard">
        <p>Loading…</p>
      </main>
    );
  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>My refunds</h1>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <div className="empty">
          <p>No refunds requested yet.</p>
          <Link className="button dark" href="/dashboard/orders">
            My orders
          </Link>
        </div>
      )}
      {items.map((r) => (
        <article className="order-card" key={r.id}>
          <p>
            <span>
              {r.order.orderNumber} · {moneyCents(r.amountInt)} via{" "}
              {pretty(r.method)}
            </span>
            <span className="badge">{pretty(r.status)}</span>
          </p>
          <p>{r.reason}</p>
          <p className="muted">
            <small>
              {new Date(r.createdAt).toLocaleString("en-US")} · Manual refunds
              are sent within 3–5 working days after approval.
            </small>
          </p>
        </article>
      ))}
    </main>
  );
}

export function ExchangesPage() {
  const { items, loading, error } = useList<Exchange>("/api/exchanges", "exchanges");
  if (loading)
    return (
      <main className="dashboard">
        <p>Loading…</p>
      </main>
    );
  const label = (v: Exchange["fromVariant"]) =>
    `${v.attributes.color ?? ""} ${v.attributes.spec ?? ""}`.trim() || v.sku;
  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>My exchanges</h1>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <div className="empty">
          <p>No exchanges requested yet.</p>
          <Link className="button dark" href="/dashboard/orders">
            My orders
          </Link>
        </div>
      )}
      {items.map((e) => (
        <article className="order-card" key={e.id}>
          <p>
            <span>
              {e.order.orderNumber} · {label(e.fromVariant)} →{" "}
              {label(e.toVariant)} (× {e.quantity})
            </span>
            <span className="badge">{pretty(e.status)}</span>
          </p>
          <p>{e.reason}</p>
          <p className="muted">
            <small>{new Date(e.createdAt).toLocaleString("en-US")}</small>
          </p>
        </article>
      ))}
    </main>
  );
}
