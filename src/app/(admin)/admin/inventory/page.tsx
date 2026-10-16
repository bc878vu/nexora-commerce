"use client";
import { useEffect, useState } from "react";

type Variant = {
  id: string;
  sku: string;
  productName: string;
  attributes: { color?: string; spec?: string };
  retailPrice: string;
  onHandStock: number;
  reservedStock: number;
  reorderPoint: number;
  warehouseBin: string;
};

export default function AdminInventory() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ sku: "", delta: "", reason: "PURCHASE_ORDER_RESTOCK", note: "" });
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setVariants(d.variants);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku.trim(),
          delta: Number(form.delta),
          reason: form.reason,
          note: form.note || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Adjustment failed");
      setNotice(`Stock updated. New balance: ${d.balanceAfter}.`);
      setForm({ sku: "", delta: "", reason: "PURCHASE_ORDER_RESTOCK", note: "" });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shown = variants.filter(
    (v) =>
      !query ||
      (v.sku + " " + v.productName).toLowerCase().includes(query.toLowerCase()),
  );

  if (loading) return <p>Loading inventory…</p>;
  return (
    <>
      <h1>Inventory</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}

      <h2>Stock adjustment</h2>
      <form onSubmit={adjust} style={{ maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <label>
            SKU
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
              placeholder="Paste SKU"
            />
          </label>
          <label>
            Quantity (+/−)
            <input
              type="number"
              value={form.delta}
              onChange={(e) => setForm({ ...form, delta: e.target.value })}
              required
              placeholder="+50 or -5"
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Reason
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option value="PURCHASE_ORDER_RESTOCK">Purchase order restock</option>
              <option value="MANUAL_AUDIT">Manual audit correction</option>
              <option value="DAMAGED_WRITE_OFF">Damaged write-off</option>
            </select>
          </label>
          <label>
            Note (optional)
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              maxLength={300}
            />
          </label>
        </div>
        <button className="button dark" disabled={busy}>
          {busy ? "Applying…" : "Apply adjustment"}
        </button>
        <p className="muted">
          Every adjustment is written to the immutable stock ledger.
        </p>
      </form>

      <h2>Variants ({shown.length})</h2>
      <label className="search" style={{ maxWidth: 400 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU or product…"
          aria-label="Search variants"
        />
      </label>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>SKU</th>
              <th style={{ textAlign: "left", padding: 10 }}>Product</th>
              <th style={{ textAlign: "left", padding: 10 }}>Variant</th>
              <th style={{ textAlign: "right", padding: 10 }}>On hand</th>
              <th style={{ textAlign: "right", padding: 10 }}>Reserved</th>
              <th style={{ textAlign: "right", padding: 10 }}>Available</th>
              <th style={{ textAlign: "left", padding: 10 }}>Bin</th>
              <th style={{ textAlign: "left", padding: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 200).map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 10 }}>{v.sku}</td>
                <td style={{ padding: 10 }}>{v.productName}</td>
                <td style={{ padding: 10 }}>
                  {v.attributes.color} · {v.attributes.spec}
                </td>
                <td style={{ padding: 10, textAlign: "right" }}>{v.onHandStock}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{v.reservedStock}</td>
                <td style={{ padding: 10, textAlign: "right" }}>
                  <strong>{v.onHandStock - v.reservedStock}</strong>
                </td>
                <td style={{ padding: 10 }}>{v.warehouseBin}</td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => setForm((f) => ({ ...f, sku: v.sku }))}>
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > 200 && (
        <p className="muted">Showing first 200 — use search to narrow down.</p>
      )}
    </>
  );
}
