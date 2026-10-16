"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  money,
  shipping,
  availablePaymentMethods,
  comingSoonMethods,
  DEFAULT_SHIPPING_ZONES,
  DEFAULT_PAYMENT_METHODS,
  type PaymentMethodConfig,
  type ShippingZone,
} from "@/lib/catalog";
import type { PublicSettings } from "@/lib/store-settings";
import ProductArt from "@/components/ProductArt";
import { useCart } from "@/lib/cart-store";
import type { ApiProduct } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Austria",
  "Ireland",
  "Portugal",
  "Sweden",
  "Denmark",
  "Finland",
  "Norway",
  "Poland",
  "Greece",
  "Switzerland",
  "United Arab Emirates",
  "Saudi Arabia",
  "Pakistan",
  "India",
];

const METHOD_LABEL: Record<string, { title: string; hint: string }> = {
  COD: {
    title: "Cash on delivery",
    hint: "Pay in cash when your order arrives (Pakistan only).",
  },
  BANK_TRANSFER: {
    title: "Bank transfer",
    hint: "Transfer to our account, then enter your transaction ID below.",
  },
  JAZZCASH: {
    title: "JazzCash",
    hint: "Send to our JazzCash number, then enter your transaction ID below.",
  },
  EASYPAYSA: {
    title: "Easypaisa",
    hint: "Send to our Easypaisa number, then enter your transaction ID below.",
  },
  STRIPE: {
    title: "Card payment",
    hint: "Pay securely by card — we'll send you a payment link right after you order.",
  },
  PAYPAL: {
    title: "PayPal",
    hint: "Pay with PayPal — we'll send you a payment link right after you order.",
  },
};

const MANUAL = ["BANK_TRANSFER", "JAZZCASH", "EASYPAYSA"];

export default function CheckoutPage() {
  const { cart, clear } = useCart();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("United States");
  const [method, setMethod] = useState<string>("COD");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() => setSettings(null));
  }, []);

  const methods: PaymentMethodConfig[] = settings?.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
  const zones: ShippingZone[] = settings?.shippingZones ?? DEFAULT_SHIPPING_ZONES;
  const configured = {
    stripeConfigured: settings?.stripeConfigured ?? false,
    paypalConfigured: settings?.paypalConfigured ?? false,
  };

  const offered = useMemo(
    () => availablePaymentMethods(country, methods, configured),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [country, JSON.stringify(methods), configured.stripeConfigured, configured.paypalConfigured],
  );
  const comingSoon = useMemo(
    () => comingSoonMethods(methods, configured),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(methods), configured.stripeConfigured, configured.paypalConfigured],
  );

  // Keep the selected method valid when the country changes.
  useEffect(() => {
    if (!offered.some((m) => m.method === method) && offered.length)
      setMethod(offered[0].method);
  }, [offered, method]);

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
  const delivery = shipping(subtotal, country, zones);
  const total = subtotal + delivery;

  const needsRef = MANUAL.includes(method);

  function receivingDetails() {
    if (!settings) return null;
    if (method === "BANK_TRANSFER" && (settings.bankName || settings.bankAccount || settings.bankIban))
      return (
        <div className="order-card" style={{ marginTop: 10 }}>
          <h4>Send your payment to</h4>
          {settings.bankName && <p>Bank: <b>{settings.bankName}</b></p>}
          {settings.bankAccount && <p>Account: <b>{settings.bankAccount}</b></p>}
          {settings.bankIban && <p>IBAN: <b>{settings.bankIban}</b></p>}
        </div>
      );
    if (method === "JAZZCASH" && settings.jazzcashNumber)
      return (
        <div className="order-card" style={{ marginTop: 10 }}>
          <h4>Send your payment to</h4>
          <p>JazzCash: <b>{settings.jazzcashNumber}</b></p>
        </div>
      );
    if (method === "EASYPAYSA" && settings.easypaisaNumber)
      return (
        <div className="order-card" style={{ marginTop: 10 }}>
          <h4>Send your payment to</h4>
          <p>Easypaisa: <b>{settings.easypaisaNumber}</b></p>
        </div>
      );
    if (MANUAL.includes(method))
      return (
        <p className="muted" style={{ marginTop: 10 }}>
          We&apos;ll share the payment details with you right after you place
          the order.
        </p>
      );
    return null;
  }

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
          country,
          paymentMethod: method,
          paymentRef: needsRef ? paymentRef : "",
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
            Delivery <b>{delivery ? money(delivery) : "Free"}</b>
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
          Phone number
          <input
            name="phone"
            required
            minLength={7}
            maxLength={20}
            placeholder="+1 555 123 4567"
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
        <label>
          Country
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <h2>Payment method</h2>
        {!offered.length && (
          <p role="alert" className="message">
            No payment methods are available for {country} right now. Please{" "}
            {settings?.whatsappNumber ? (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                contact us on WhatsApp
              </a>
            ) : (
              "contact us"
            )}{" "}
            to complete your order.
          </p>
        )}
        {offered.map((m) => {
          const label = METHOD_LABEL[m.method] ?? {
            title: m.method,
            hint: "",
          };
          return (
            <label
              key={m.method}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}
            >
              <input
                type="radio"
                name="pm"
                checked={method === m.method}
                onChange={() => setMethod(m.method)}
              />
              <span>
                <strong>{label.title}</strong>
                <br />
                <small className="muted">{label.hint}</small>
              </span>
            </label>
          );
        })}
        {comingSoon.length > 0 && (
          <p className="muted">
            Coming soon:{" "}
            {comingSoon
              .map((m) => METHOD_LABEL[m.method]?.title ?? m.method)
              .join(", ")}{" "}
            —{" "}
            {settings?.whatsappNumber ? (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                contact us on WhatsApp
              </a>
            ) : (
              "contact us"
            )}{" "}
            to complete your order.
          </p>
        )}

        {receivingDetails()}

        {needsRef && (
          <label>
            Transaction / reference ID
            <input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. TID123456789"
            />
            <small className="muted">
              Enter the ID from your {METHOD_LABEL[method]?.title} transfer so
              we can verify it faster.
            </small>
          </label>
        )}

        {error && (
          <p role="alert" className="message">
            {error}
          </p>
        )}
        <button className="button dark full" disabled={busy || !offered.length}>
          {busy ? "Placing order…" : `Place order · ${money(total)}`}
        </button>
        <p className="muted">
          By placing this order you agree to our 7-day exchange policy.
        </p>
      </form>
    </main>
  );
}
