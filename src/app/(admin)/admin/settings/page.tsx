"use client";
import { useEffect, useState } from "react";
import type { PaymentMethodConfig, ShippingZone } from "@/lib/catalog";

type Settings = {
  jazzcashNumber: string;
  easypaisaNumber: string;
  bankName: string;
  bankAccount: string;
  bankIban: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  paypalClientId: string;
  paypalSecret: string;
  whatsappNumber: string;
  announcement: string;
  paymentMethods: PaymentMethodConfig[];
  shippingZones: ShippingZone[];
};

const METHOD_TITLES: Record<string, string> = {
  COD: "Cash on delivery",
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAYSA: "Easypaisa",
  STRIPE: "Card (Stripe)",
  PAYPAL: "PayPal",
};

const empty: Settings = {
  jazzcashNumber: "",
  easypaisaNumber: "",
  bankName: "",
  bankAccount: "",
  bankIban: "",
  stripePublishableKey: "",
  stripeSecretKey: "",
  paypalClientId: "",
  paypalSecret: "",
  whatsappNumber: "",
  announcement: "Free worldwide shipping on orders over $75",
  paymentMethods: [],
  shippingZones: [],
};

export default function AdminSettings() {
  const [s, setS] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setS({ ...empty, ...d.settings });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Settings, v: string) =>
    setS((prev) => ({ ...prev, [k]: v }));

  function toggleMethod(i: number) {
    setS((prev) => {
      const ms = [...prev.paymentMethods];
      ms[i] = { ...ms[i], enabled: !ms[i].enabled };
      return { ...prev, paymentMethods: ms };
    });
  }
  function methodCountries(i: number, v: string) {
    setS((prev) => {
      const ms = [...prev.paymentMethods];
      ms[i] = {
        ...ms[i],
        allowedCountries: v.split(",").map((x) => x.trim()).filter(Boolean),
      };
      return { ...prev, paymentMethods: ms };
    });
  }

  function zoneField(
    i: number,
    k: "zone" | "rateCents" | "freeOverCents" | "countries",
    v: string | number | string[],
  ) {
    setS((prev) => {
      const zs = [...prev.shippingZones];
      zs[i] = { ...zs[i], [k]: v };
      return { ...prev, shippingZones: zs };
    });
  }
  function zoneCountries(i: number, v: string) {
    zoneField(
      i,
      "countries",
      v
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    );
  }
  function addZone() {
    setS((prev) => ({
      ...prev,
      shippingZones: [
        ...prev.shippingZones,
        { zone: "New zone", countries: [], rateCents: 1295, freeOverCents: 15000 },
      ],
    }));
  }
  function removeZone(i: number) {
    setS((prev) => ({
      ...prev,
      shippingZones: prev.shippingZones.filter((_, x) => x !== i),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save");
      setNotice("Settings saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading settings…</p>;
  return (
    <>
      <h1>Store settings</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}

      <form onSubmit={save} style={{ maxWidth: 720 }}>
        <h2>Announcement bar</h2>
        <label>
          Announcement text
          <input
            value={s.announcement}
            onChange={(e) => set("announcement", e.target.value)}
            maxLength={200}
            placeholder="Free worldwide shipping on orders over $75"
          />
        </label>

        <h2>Payment receiving details</h2>
        <p className="muted">
          These are shown to customers at checkout for manual payments. Never
          hard-coded anywhere else.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            JazzCash number
            <input value={s.jazzcashNumber} onChange={(e) => set("jazzcashNumber", e.target.value)} placeholder="03XXXXXXXXX" />
          </label>
          <label>
            Easypaisa number
            <input value={s.easypaisaNumber} onChange={(e) => set("easypaisaNumber", e.target.value)} placeholder="03XXXXXXXXX" />
          </label>
          <label>
            Bank name
            <input value={s.bankName} onChange={(e) => set("bankName", e.target.value)} />
          </label>
          <label>
            Bank account
            <input value={s.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />
          </label>
          <label>
            Bank IBAN
            <input value={s.bankIban} onChange={(e) => set("bankIban", e.target.value)} />
          </label>
          <label>
            WhatsApp number (for order help)
            <input value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} placeholder="e.g. 15551234567" />
          </label>
        </div>

        <h2>Stripe &amp; PayPal</h2>
        <p className="muted">
          Card/PayPal checkout is offered <b>only</b> when the method is enabled
          below <b>and</b> these keys are filled in. Until then customers see
          an honest “coming soon” note — never a fake payment form.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Stripe publishable key
            <input value={s.stripePublishableKey} onChange={(e) => set("stripePublishableKey", e.target.value)} autoComplete="off" />
          </label>
          <label>
            Stripe secret key
            <input type="password" value={s.stripeSecretKey} onChange={(e) => set("stripeSecretKey", e.target.value)} autoComplete="off" />
          </label>
          <label>
            PayPal client ID
            <input value={s.paypalClientId} onChange={(e) => set("paypalClientId", e.target.value)} autoComplete="off" />
          </label>
          <label>
            PayPal secret
            <input type="password" value={s.paypalSecret} onChange={(e) => set("paypalSecret", e.target.value)} autoComplete="off" />
          </label>
        </div>

        <h2>Payment methods</h2>
        {s.paymentMethods.map((m, i) => (
          <div className="order-card" key={m.method}>
            <p>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={() => toggleMethod(i)}
                />
                <strong>{METHOD_TITLES[m.method] ?? m.method}</strong>
              </label>
            </p>
            <label>
              Allowed countries (comma separated — empty = worldwide
              {m.method === "COD" ? "; COD is Pakistan-only by default" : ""})
              <input
                value={m.allowedCountries.join(", ")}
                onChange={(e) => methodCountries(i, e.target.value)}
                placeholder="Leave empty for worldwide"
              />
            </label>
          </div>
        ))}

        <h2>Shipping zones</h2>
        <p className="muted">
          Checkout charges the flat rate for the customer&apos;s country zone;
          orders at or above the threshold ship free. Amounts in USD.
        </p>
        {s.shippingZones.map((z, i) => (
          <div className="order-card" key={i}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Zone name
                <input
                  value={z.zone}
                  onChange={(e) => zoneField(i, "zone", e.target.value)}
                />
              </label>
              <label>
                Flat rate (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(z.rateCents / 100).toFixed(2)}
                  onChange={(e) =>
                    zoneField(i, "rateCents", Math.round(Number(e.target.value) * 100))
                  }
                />
              </label>
              <label>
                Free over (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(z.freeOverCents / 100).toFixed(2)}
                  onChange={(e) =>
                    zoneField(i, "freeOverCents", Math.round(Number(e.target.value) * 100))
                  }
                />
              </label>
              <label>
                Countries (comma separated)
                <input
                  value={z.countries.join(", ")}
                  onChange={(e) => zoneCountries(i, e.target.value)}
                  placeholder="e.g. United States"
                />
              </label>
            </div>
            <button type="button" className="button" onClick={() => removeZone(i)}>
              Remove zone
            </button>
          </div>
        ))}
        <p>
          <button type="button" className="button" onClick={addZone}>
            + Add zone
          </button>
        </p>

        <button className="button dark" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </>
  );
}
