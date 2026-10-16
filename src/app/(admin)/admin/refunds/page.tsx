"use client";
import { useEffect, useState } from "react";
import { moneyCents } from "@/lib/catalog";

type Refund = {
  id: string;
  amountInt: number;
  method: string;
  reason: string;
  accountDetail: string;
  status: string;
  createdAt: string;
  order: { orderNumber: string; totalAmount: string; paymentMethod: string };
  user: { name: string; email: string };
  claim: { id: string; type: string } | null;
};

const FLOW: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSED", "REJECTED"],
  REJECTED: [],
  PROCESSED: [],
};
const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

/** Honest per-method expectation label. */
function expectation(r: Refund): string {
  if ((r.method === "STRIPE" || r.method === "PAYPAL"))
    return "Refund will be processed to the original payment method once confirmed.";
  const via =
    r.method === "BANK_TRANSFER"
      ? "bank transfer"
      : r.method === "JAZZCASH"
        ? "JazzCash"
        : "Easypaisa";
  return `Manual refund — sent via ${via} within 3–5 working days after you mark it processed.`;
}

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/refunds")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setRefunds(d.refunds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    if (!confirm(`Move refund to ${pretty(status)}?`)) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/admin/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice(`Refund ${pretty(status)}.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading refunds…</p>;
  return (
    <>
      <h1>Refunds</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      {!refunds.length && !error && <div className="empty">No refunds yet.</div>}
      {refunds.map((r) => (
        <article className="order-card" key={r.id}>
          <p>
            <span>
              {r.order.orderNumber} · {moneyCents(r.amountInt)} via {pretty(r.method)}
            </span>
            <span className="badge">{pretty(r.status)}</span>
          </p>
          <p>
            {r.user.name} · {r.user.email}
          </p>
          <p>
            <b>Reason:</b> {r.reason}
          </p>
          <p className="muted">
            <b>Customer account:</b> {r.accountDetail}
          </p>
          {r.claim && (
            <p className="muted">Linked claim: {pretty(r.claim.type)}</p>
          )}
          <p className="muted">
            <small>{expectation(r)}</small>
          </p>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FLOW[r.status].map((s) => (
              <button
                key={s}
                className="button"
                disabled={busy === r.id}
                onClick={() => setStatus(r.id, s)}
              >
                {s === "PROCESSED" ? "Mark processed (money sent)" : pretty(s)}
              </button>
            ))}
            {!FLOW[r.status].length && (
              <small className="muted">No further actions</small>
            )}
          </p>
        </article>
      ))}
    </>
  );
}
