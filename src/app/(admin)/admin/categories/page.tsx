"use client";
import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  _count: { products: number; children: number };
};

const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState("");

  function load() {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setCats(d.categories);
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
      const r = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: parentId || null }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not create");
      setNotice(`Created “${d.category.name}”.`);
      setName("");
      setParentId("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/categories/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          parentId: editParent || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice("Category updated.");
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (
      !confirm(
        `Delete “${name}”? Its subcategories move up one level and products keep their label.`,
      )
    )
      return;
    const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Could not delete");
    else {
      setNotice("Category deleted.");
      load();
    }
  }

  if (loading) return <p>Loading categories…</p>;
  return (
    <>
      <h1>Categories</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}

      <h2>Add category</h2>
      <form onSubmit={create} style={{ maxWidth: 560 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="e.g. Totes"
            />
          </label>
          <label>
            Parent (optional — makes it a subcategory)
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (top-level)</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button dark" disabled={busy}>
          {busy ? "Creating…" : "Create category"}
        </button>
      </form>

      <h2>All categories ({cats.length})</h2>
      {cats.map((c) => (
        <article className="order-card" key={c.id}>
          <p>
            <strong>{c.name}</strong>
            <span>
              <button
                onClick={() => {
                  setEditing(c);
                  setEditName(c.name);
                  setEditParent(c.parentId ?? "");
                }}
              >
                Edit
              </button>{" "}
              <button onClick={() => remove(c.id, c.name)}>Delete</button>
            </span>
          </p>
          <p className="muted">
            /{c.slug} · {c.parent ? `under ${c.parent.name}` : "top-level"} ·{" "}
            {c._count.products} products · {c._count.children} subcategories
          </p>
          {editing?.id === c.id && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <label>
                Name
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>
              <label>
                Parent
                <select
                  value={editParent}
                  onChange={(e) => setEditParent(e.target.value)}
                >
                  <option value="">None (top-level)</option>
                  {cats
                    .filter((x) => x.id !== c.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
              <p style={{ display: "flex", gap: 8 }}>
                <button className="button dark" disabled={busy} onClick={saveEdit}>
                  Save
                </button>
                <button className="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </p>
            </div>
          )}
        </article>
      ))}
      <p className="muted">
        <small>
          Tip: {pretty("Handbags")} → Totes, Shoulder Bags, Clutches are seeded
          for you — rename or extend them here.
        </small>
      </p>
    </>
  );
}
