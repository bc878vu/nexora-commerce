"use client";
import { useEffect, useState } from "react";

type Entry = {
  id: string;
  createdAt: string;
  sku: string;
  productName: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  note: string | null;
  actorName: string;
};

export default function AdminLedger() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setEntries(d.ledger);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = entries.filter(
    (e) =>
      !query ||
      (e.sku + " " + e.productName + " " + e.reason)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  if (loading) return <p>Loading ledger…</p>;
  return (
    <>
      <h1>Stock ledger</h1>
      <p className="muted">
        Immutable audit log — every stock movement, newest first. Entries are
        never edited or deleted.
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      <label className="search" style={{ maxWidth: 400 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, product, reason…"
          aria-label="Search ledger"
        />
      </label>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Time</th>
              <th style={{ textAlign: "left", padding: 10 }}>SKU</th>
              <th style={{ textAlign: "left", padding: 10 }}>Product</th>
              <th style={{ textAlign: "right", padding: 10 }}>Delta</th>
              <th style={{ textAlign: "right", padding: 10 }}>Balance</th>
              <th style={{ textAlign: "left", padding: 10 }}>Reason</th>
              <th style={{ textAlign: "left", padding: 10 }}>Actor</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 10 }}>
                  {new Date(e.createdAt).toLocaleString("en-PK")}
                </td>
                <td style={{ padding: 10 }}>{e.sku}</td>
                <td style={{ padding: 10 }}>{e.productName}</td>
                <td
                  style={{
                    padding: 10,
                    textAlign: "right",
                    color: e.delta < 0 ? "#a33" : "#3a6",
                  }}
                >
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </td>
                <td style={{ padding: 10, textAlign: "right" }}>{e.balanceAfter}</td>
                <td style={{ padding: 10 }}>
                  {e.reason.replace(/_/g, " ")}
                  {e.note ? ` — ${e.note}` : ""}
                </td>
                <td style={{ padding: 10 }}>{e.actorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
