"use client";
import { useEffect, useState } from "react";

type Exchange = {
  id: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: string;
  order: { orderNumber: string };
  user: { name: string; email: string };
  fromVariant: { sku: string; attributes: { color?: string; spec?: string }; onHandStock: number };
  toVariant: { sku: string; attributes: { color?: string; spec?: string }; onHandStock: number };
};

const FLOW: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED", "REJECTED"],
  REJECTED: [],
  COMPLETED: [],
};
const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");
const vlabel = (v: Exchange["fromVariant"]) =>
  `${v.attributes.color ?? ""} ${v.attributes.spec ?? ""}`.trim() || v.sku;

export default function AdminExchanges() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/exchanges")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setExchanges(d.exchanges);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    const extra =
      status === "APPROVED"
        ? " This moves stock: returned item +1, replacement −1."
        : "";
    if (!confirm(`Move exchange to ${pretty(status)}?${extra}`)) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/admin/exchanges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice(`Exchange ${pretty(status)}.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading exchanges…</p>;
  return (
    <>
      <h1>Exchanges</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      {!exchanges.length && !error && <div className="empty">No exchanges yet.</div>}
      {exchanges.map((e) => (
        <article className="order-card" key={e.id}>
          <p>
            <span>
              {e.order.orderNumber} · {vlabel(e.fromVariant)} → {vlabel(e.toVariant)}{" "}
              (× {e.quantity})
            </span>
            <span className="badge">{pretty(e.status)}</span>
          </p>
          <p>
            {e.user.name} · {e.user.email}
          </p>
          <p>
            <b>Reason:</b> {e.reason}
          </p>
          <p className="muted">
            <small>
              Stock now — returned: {e.fromVariant.onHandStock} · replacement:{" "}
              {e.toVariant.onHandStock}
            </small>
          </p>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FLOW[e.status].map((s) => (
              <button
                key={s}
                className="button"
                disabled={busy === e.id}
                onClick={() => setStatus(e.id, s)}
              >
                {s === "APPROVED" ? "Approve (adjust stock)" : pretty(s)}
              </button>
            ))}
            {!FLOW[e.status].length && (
              <small className="muted">No further actions</small>
            )}
          </p>
        </article>
      ))}
    </>
  );
}
