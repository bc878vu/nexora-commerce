"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const empty = { label: "Home", street: "", city: "", postalCode: "", isDefault: false };

export default function AddressesPage() {
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setList(d.addresses);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(
        editing ? `/api/addresses/${editing}` : "/api/addresses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save address");
      setForm(empty);
      setEditing(null);
      setNotice("Address saved.");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this address?")) return;
    const r = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Could not delete");
    else {
      setNotice("Address deleted.");
      load();
    }
  }

  function edit(a: Address) {
    setEditing(a.id);
    setForm({
      label: a.label,
      street: a.street,
      city: a.city,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>Addresses</h1>
      <p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      {loading && <p>Loading…</p>}
      {list.map((a) => (
        <article className="order-card" key={a.id}>
          <p>
            <strong>
              {a.label} {a.isDefault && <span className="badge">Default</span>}
            </strong>
            <span>
              <button onClick={() => edit(a)}>Edit</button>{" "}
              <button onClick={() => remove(a.id)}>Delete</button>
            </span>
          </p>
          <p className="muted">
            {a.street}, {a.city} {a.postalCode}, {a.country}
          </p>
        </article>
      ))}

      <h2>{editing ? "Edit address" : "Add new address"}</h2>
      <form onSubmit={save} style={{ maxWidth: 560 }}>
        <label>
          Label
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            maxLength={50}
            placeholder="Home, Office…"
          />
        </label>
        <label>
          Street address
          <textarea
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            required
            minLength={5}
            maxLength={300}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            City
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label>
            Postal code
            <input
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              maxLength={20}
            />
          </label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Set as default address
        </label>
        <p style={{ display: "flex", gap: 10 }}>
          <button className="button dark" disabled={busy}>
            {busy ? "Saving…" : editing ? "Update address" : "Add address"}
          </button>
          {editing && (
            <button
              type="button"
              className="button"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              Cancel
            </button>
          )}
        </p>
      </form>
    </main>
  );
}
