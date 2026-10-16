"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/catalog";

type Variant = {
  id: string;
  sku: string;
  attributes: { color?: string; spec?: string };
  retailPrice: string;
  unitCost: string;
  onHandStock: number;
  reservedStock: number;
  reorderPoint: number;
  warehouseBin: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: string;
  variants: Variant[];
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    category: "Handbags",
    description: "",
    basePrice: "",
    colors: "",
    specs: "",
    unitCost: "",
    stock: "",
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState("");

  function load() {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setProducts(d.products);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const colors = form.colors.split(",").map((s) => s.trim()).filter(Boolean);
      const specs = form.specs.split(",").map((s) => s.trim()).filter(Boolean);
      if (!colors.length || !specs.length) throw Error("Add at least one colour and one size/option.");
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: form.name,
            category: form.category,
            description: form.description,
            basePrice: Number(form.basePrice),
          },
          variants: colors.flatMap((color) =>
            specs.map((spec) => ({
              color,
              spec,
              unitCost: Number(form.unitCost),
              retailPrice: Number(form.basePrice),
              onHandStock: Number(form.stock),
              reorderPoint: 10,
            })),
          ),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not create product");
      setNotice(`Created ${d.product.name}.`);
      setForm({ name: "", category: "Handbags", description: "", basePrice: "", colors: "", specs: "", unitCost: "", stock: "" });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete ${name} and all its variants?`)) return;
    const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Could not delete");
    else {
      setNotice("Product deleted.");
      load();
    }
  }

  async function savePrice() {
    if (!editing) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: Number(editPrice) }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice("Price updated.");
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading products…</p>;
  return (
    <>
      <h1>Products</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}

      <h2>Add product</h2>
      <form onSubmit={create} style={{ maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Handbags</option>
              <option>Footwear</option>
              <option>Wallets</option>
              <option>Accessories</option>
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={10} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            Retail price (Rs)
            <input type="number" min={1} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required />
          </label>
          <label>
            Unit cost (Rs)
            <input type="number" min={0} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required />
          </label>
          <label>
            Stock per variant
            <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Colours (comma separated)
            <input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} placeholder="Black, Tan" required />
          </label>
          <label>
            Sizes / options (comma separated)
            <input value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} placeholder="One Size  OR  36, 37, 38" required />
          </label>
        </div>
        <button className="button dark" disabled={busy}>
          {busy ? "Creating…" : "Create product + variants"}
        </button>
        <p className="muted">SKUs are generated automatically (colour × size matrix).</p>
      </form>

      <h2>All products ({products.length})</h2>
      {products.map((p) => (
        <article className="order-card" key={p.id}>
          <p>
            <strong>{p.name}</strong>
            <span>
              <button
                onClick={() => {
                  setEditing(p);
                  setEditPrice(p.basePrice.toString());
                }}
              >
                Edit price
              </button>{" "}
              <button onClick={() => remove(p.id, p.name)}>Delete</button>
            </span>
          </p>
          <p className="muted">
            {p.category} · Base {money(p.basePrice)} · {p.variants.length} variants
          </p>
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>SKU</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Variant</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Price</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {p.variants.map((v) => (
                  <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: 8 }}>{v.sku}</td>
                    <td style={{ padding: 8 }}>
                      {v.attributes.color} · {v.attributes.spec}
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>{money(v.retailPrice)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{v.onHandStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editing?.id === p.id && (
            <p style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label>
                New base price (Rs)
                <input type="number" min={1} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </label>
              <button className="button dark" disabled={busy} onClick={savePrice}>
                Save
              </button>
              <button className="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </p>
          )}
        </article>
      ))}
    </>
  );
}
