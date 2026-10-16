"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money, shipping } from "@/lib/catalog";
import ProductArt from "@/components/ProductArt";
import { useCart } from "@/lib/cart-store";
import type { ApiProduct } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const { cart, clear } = useCart();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"COD" | "BANK_TRANSFER">("COD");

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  const index = useMemo(() => {
    const m = new Map<string, { p: ApiProduct; v: ApiProduct["variants"][number] }>();
    for (const p of products)
      for (const v of p.variants) m.set(v.id, { p, v });
    return m;
  }, [products]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: index.get(id), qty }))
    .filter((l) => l.item && l.qty > 0) as {
    item: { p: ApiProduct; v: ApiProduct["variants"][number] };
    qty: number;
  }[];
  const subtotal = lines.reduce((s, l) => s + l.item.v.price * l.qty, 0);
  const total = subtotal + shipping(subtotal);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          street: f.get("street"),
          city: f.get("city"),
          postalCode: f.get("postalCode") || "",
          paymentMethod: method,
          items: lines.map((l) => ({ id: l.item.v.id, quantity: l.qty })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not place order");
      clear();
      window.location.assign(`/order-confirmation/${d.order.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length)
    return (
      <main className="dashboard">
        <div className="empty">
          <h2>Your bag is empty</h2>
          <p>Add something beautiful first.</p>
          <Link className="button dark" href="/#collection">
            Continue shopping
          </Link>
        </div>
      </main>
    );

  return (
    <main className="dashboard">
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1>Checkout</h1>
      <div className="table-wrap" style={{ padding: 25 }}>
        <h3>Order summary ({lines.reduce((s, l) => s + l.qty, 0)} items)</h3>
        {lines.map(({ item, qty }) => (
          <div className="cart-line" key={item.v.id}>
            <ProductArt icon={item.p.icon} tone={item.p.tone} />
            <div>
              <strong>{item.p.name}</strong>
              <p>
                {item.v.color}
                {item.v.spec !== "One Size" ? ` · Size ${item.v.spec}` : ""} ×{" "}
                {qty}
              </p>
              <p>{money(item.v.price * qty)}</p>
            </div>
          </div>
        ))}
        <div className="totals">
          <p>
            Subtotal <b>{money(subtotal)}</b>
          </p>
          <p>
            Delivery <b>{shipping(subtotal) ? money(shipping(subtotal)) : "Free"}</b>
          </p>
          <h3>
            Total <span>{money(total)}</span>
          </h3>
        </div>
      </div>

      <form onSubmit={submit} style={{ maxWidth: 640 }}>
        <h2>Delivery details</h2>
        <label>
          Full name
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Mobile number
          <input
            name="phone"
            required
            pattern="03[0-9]{9}"
            title="11-digit mobile starting with 03"
            placeholder="03XXXXXXXXX"
            autoComplete="tel"
          />
        </label>
        <label>
          Street address
          <textarea
            name="street"
            required
            minLength={5}
            maxLength={300}
            placeholder="House, street, area"
            autoComplete="street-address"
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            City
            <input name="city" required minLength={2} maxLength={100} autoComplete="address-level2" />
          </label>
          <label>
            Postal code (optional)
            <input name="postalCode" maxLength={20} autoComplete="postal-code" />
          </label>
        </div>

        <h2>Payment method</h2>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input
            type="radio"
            name="pm"
            checked={method === "COD"}
            onChange={() => setMethod("COD")}
          />
          <span>
            <strong>Cash on delivery</strong>
            <br />
            <small className="muted">Pay in cash when your order arrives.</small>
          </span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input
            type="radio"
            name="pm"
            checked={method === "BANK_TRANSFER"}
            onChange={() => setMethod("BANK_TRANSFER")}
          />
          <span>
            <strong>Bank transfer</strong>
            <br />
            <small className="muted">
              We will share bank details on WhatsApp after you order.
            </small>
          </span>
        </label>

        {error && (
          <p role="alert" className="message">
            {error}
          </p>
        )}
        <button className="button dark full" disabled={busy}>
          {busy ? "Placing order…" : `Place order · ${money(total)}`}
        </button>
        <p className="muted">
          By placing this order you agree to our 7-day exchange policy.
        </p>
      </form>
    </main>
  );
}
