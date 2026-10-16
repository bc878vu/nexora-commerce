"use client";
import { useEffect, useState } from "react";

type Claim = {
  id: string;
  type: string;
  description: string;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  order: { orderNumber: string; totalAmount: string };
  user: { name: string; email: string };
  refunds: { id: string; status: string; amountInt: number }[];
};

const STATUSES = ["OPEN", "IN_REVIEW", "APPROVED", "REJECTED", "RESOLVED"];
const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

export default function AdminClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("OPEN");
  const [notes, setNotes] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/admin/claims")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setClaims(d.claims);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: string) {
    if (!confirm(`Move claim to ${pretty(status)}?`)) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote: notes[id] ?? "" }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice(`Claim ${pretty(status)}.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const shown =
    filter === "ALL" ? claims : claims.filter((c) => c.status === filter);

  if (loading) return <p>Loading claims…</p>;
  return (
    <>
      <h1>Claims</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["ALL", ...STATUSES].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? "All" : pretty(s)} (
            {s === "ALL"
              ? claims.length
              : claims.filter((c) => c.status === s).length}
            )
          </button>
        ))}
      </p>
      {!shown.length && !error && <div className="empty">No claims here.</div>}
      {shown.map((c) => (
        <article className="order-card" key={c.id}>
          <p>
            <span>
              {c.order.orderNumber} · {pretty(c.type)}
            </span>
            <span className="badge">{pretty(c.status)}</span>
          </p>
          <p>
            {c.user.name} · {c.user.email}
          </p>
          <p>{c.description}</p>
          {c.resolutionNote && (
            <p className="muted">
              <b>Resolution:</b> {c.resolutionNote}
            </p>
          )}
          <label>
            Resolution note (shown to the customer)
            <textarea
              value={notes[c.id] ?? c.resolutionNote ?? ""}
              onChange={(e) =>
                setNotes((n) => ({ ...n, [c.id]: e.target.value }))
              }
              maxLength={2000}
              placeholder="e.g. Replacement shipped via DHL, tracking…"
            />
          </label>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {STATUSES.filter((s) => s !== c.status).map((s) => (
              <button
                key={s}
                className="button"
                disabled={busy === c.id}
                onClick={() => setStatus(c.id, s)}
              >
                {pretty(s)}
              </button>
            ))}
          </p>
        </article>
      ))}
    </>
  );
}
