"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money, moneyCents } from "@/lib/catalog";
import type { ApiProduct } from "@/app/api/catalog/route";

type OrderItem = {
  id: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  variantId: string;
};
type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  shippingAddress: string;
  createdAt: string;
  items: OrderItem[];
};

const STEPS = ["PROCESSING", "SHIPPED", "DELIVERED"];

const CLAIM_TYPES = [
  ["DAMAGED", "Damaged item"],
  ["WRONG_ITEM", "Wrong item received"],
  ["NOT_RECEIVED", "Not received"],
  ["QUALITY_ISSUE", "Quality issue"],
  ["OTHER", "Other"],
] as const;

const REFUND_METHODS = [
  ["BANK_TRANSFER", "Bank transfer"],
  ["JAZZCASH", "JazzCash"],
  ["EASYPAYSA", "Easypaisa"],
  ["STRIPE", "Card (Stripe)"],
  ["PAYPAL", "PayPal"],
] as const;

const METHOD_LABEL: Record<string, string> = {
  COD: "Cash on delivery",
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAYSA: "Easypaisa",
  STRIPE: "Card (Stripe)",
  PAYPAL: "PayPal",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [claims, setClaims] = useState<{ id: string; status: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // claim form
  const [showClaim, setShowClaim] = useState(false);
  const [claimType, setClaimType] = useState("DAMAGED");
  const [claimDesc, setClaimDesc] = useState("");
  // refund form
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("BANK_TRANSFER");
  const [refundAccount, setRefundAccount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  // exchange form
  const [exItem, setExItem] = useState<OrderItem | null>(null);
  const [toVariant, setToVariant] = useState("");
  const [exReason, setExReason] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    params.then(({ id }) =>
      Promise.all([
        fetch("/api/orders").then((r) => r.json()),
        fetch("/api/claims").then((r) => r.json()).catch(() => ({ claims: [] })),
        fetch("/api/catalog").then((r) => r.json()).catch(() => ({ products: [] })),
      ])
        .then(([o, c, cat]) => {
          if (o.error) throw Error(o.error);
          const found = (o.orders as OrderDetail[]).find((x) => x.id === id);
          if (!found) throw Error("Order not found.");
          setOrder(found);
          setClaims(
            (c.claims ?? []).filter(
              (cl: { orderId: string }) => cl.orderId === found.id,
            ),
          );
          setProducts(cat.products ?? []);
          setRefundAmount(Number(found.totalAmount).toFixed(2));
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    );
  }
  useEffect(load, [params]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Request failed");
      return d;
    } finally {
      setBusy(false);
    }
  }

  async function fileClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    try {
      await post("/api/claims", {
        orderId: order.id,
        type: claimType,
        description: claimDesc,
      });
      setNotice("Claim filed. We'll review it and get back to you soon.");
      setShowClaim(false);
      setClaimDesc("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function requestRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    try {
      await post("/api/refunds", {
        orderId: order.id,
        amountInt: Math.round(Number(refundAmount) * 100),
        reason: refundReason,
        method: refundMethod,
        accountDetail: refundAccount,
      });
      setNotice(
        "Refund requested. Manual refunds are sent within 3–5 working days after approval.",
      );
      setShowRefund(false);
      setRefundReason("");
      setRefundAccount("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function siblingsOf(item: OrderItem): ApiProduct["variants"] {
    for (const p of products)
      if (p.variants.some((v) => v.id === item.variantId))
        return p.variants.filter((v) => v.id !== item.variantId && v.stock >= item.quantity);
    return [];
  }

  function productSlugOf(item: OrderItem): string | null {
    for (const p of products)
      if (p.variants.some((v) => v.id === item.variantId)) return p.slug;
    return null;
  }

  async function requestExchange(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !exItem || !toVariant) return;
    try {
      await post("/api/exchanges", {
        orderId: order.id,
        orderItemId: exItem.id,
        toVariantId: toVariant,
        reason: exReason,
      });
      setNotice("Exchange requested. We'll confirm once it's approved.");
      setExItem(null);
      setToVariant("");
      setExReason("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading)
    return (
      <main className="dashboard">
        <p>Loading order…</p>
      </main>
    );
  if (error && !order)
    return (
      <main className="dashboard">
        <p role="alert" className="message">
          {error}
        </p>
        <p>
          <Link href="/dashboard/orders">← All orders</Link>
        </p>
      </main>
    );
  if (!order) return null;

  let addr: Record<string, string> = {};
  try {
    addr = JSON.parse(order.shippingAddress);
  } catch {}

  const idx = STEPS.indexOf(order.status);
  const openClaim = claims.find((c) =>
    ["OPEN", "IN_REVIEW", "APPROVED"].includes(c.status),
  );
  const canClaim = order.status !== "CANCELLED" && !openClaim;

  return (
    <main className="dashboard">
      <p className="eyebrow">ORDER DETAILS</p>
      <h1>{order.orderNumber}</h1>
      <p>
        <Link href="/dashboard/orders">← All orders</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      <div className="order-card">
        <p>
          <span>Placed {new Date(order.createdAt).toLocaleString("en-US")}</span>
          <span className="badge">{order.status}</span>
        </p>
        {order.status === "CANCELLED" ? (
          <div className="timeline">
            <span className="done">Cancelled</span>
          </div>
        ) : (
          <div className="timeline">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= idx ? "done" : ""}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      <h2>Items</h2>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>SKU</th>
              <th style={{ textAlign: "right", padding: 12 }}>Qty</th>
              <th style={{ textAlign: "right", padding: 12 }}>Price</th>
              <th style={{ textAlign: "right", padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => {
              const slug = productSlugOf(i);
              return (
                <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 12 }}>{i.sku}</td>
                  <td style={{ padding: 12, textAlign: "right" }}>{i.quantity}</td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    {money(Number(i.unitPrice) * i.quantity)}
                  </td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    {order.status === "DELIVERED" && slug && (
                      <Link href={`/products/${slug}#reviews`}>Write a review</Link>
                    )}
                    {order.status !== "CANCELLED" && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => {
                            setExItem(i);
                            setToVariant("");
                          }}
                          style={{ background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                        >
                          Exchange
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="order-card">
        <p>
          <span>Total paid</span>
          <b>{money(order.totalAmount)}</b>
        </p>
        <p>
          <span>Payment</span>
          <span>{METHOD_LABEL[addr.paymentMethod] ?? addr.paymentMethod ?? "—"}</span>
        </p>
        {addr.paymentRef && (
          <p>
            <span>Transaction ref</span>
            <span>{addr.paymentRef}</span>
          </p>
        )}
        <h3>Delivery address</h3>
        <p className="muted">
          {addr.name}
          <br />
          {addr.street}, {addr.city} {addr.postalCode} {addr.country}
          <br />
          {addr.phone} · {addr.email}
        </p>
      </div>

      <h2>Help with this order</h2>
      {openClaim && (
        <p className="muted">
          You have an open claim ({openClaim.type.toLowerCase().replace(/_/g, " ")},
          status: {openClaim.status.toLowerCase().replace(/_/g, " ")}).{" "}
          <Link href="/dashboard/claims">View my claims →</Link>
        </p>
      )}
      <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {canClaim && (
          <button className="button" onClick={() => setShowClaim((v) => !v)}>
            File a claim
          </button>
        )}
        {order.status !== "CANCELLED" && (
          <button className="button" onClick={() => setShowRefund((v) => !v)}>
            Request a refund
          </button>
        )}
        <Link className="button" href="/dashboard/claims">
          My claims
        </Link>
      </p>

      {showClaim && (
        <form onSubmit={fileClaim} style={{ maxWidth: 560 }}>
          <h3>File a claim</h3>
          <label>
            Issue type
            <select value={claimType} onChange={(e) => setClaimType(e.target.value)}>
              {CLAIM_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Describe the issue
            <textarea
              value={claimDesc}
              onChange={(e) => setClaimDesc(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Tell us what happened…"
            />
          </label>
          <button className="button dark" disabled={busy}>
            {busy ? "Filing…" : "Submit claim"}
          </button>
        </form>
      )}

      {showRefund && (
        <form onSubmit={requestRefund} style={{ maxWidth: 560 }}>
          <h3>Request a refund</h3>
          <label>
            Amount (USD)
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={order.totalAmount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              required
            />
            <small className="muted">
              Order total: {money(order.totalAmount)}. Refunds are sent manually
              within 3–5 working days after approval.
            </small>
          </label>
          <label>
            Refund method
            <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              {REFUND_METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your receiving account details
            <input
              value={refundAccount}
              onChange={(e) => setRefundAccount(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              placeholder="e.g. JazzCash 0300XXXXXXX — your name"
            />
          </label>
          <label>
            Reason
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
              minLength={5}
              maxLength={1000}
            />
          </label>
          <button className="button dark" disabled={busy}>
            {busy ? "Requesting…" : `Request ${refundAmount ? moneyCents(Math.round(Number(refundAmount) * 100)) : ""} refund`}
          </button>
        </form>
      )}

      {exItem && (
        <form onSubmit={requestExchange} style={{ maxWidth: 560 }}>
          <h3>Request an exchange</h3>
          <p className="muted">
            Swap <b>{exItem.sku}</b> (× {exItem.quantity}) for another colour/size
            of the same product.
          </p>
          <label>
            Replacement
            <select
              value={toVariant}
              onChange={(e) => setToVariant(e.target.value)}
              required
            >
              <option value="">Choose…</option>
              {siblingsOf(exItem).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.color} · {v.spec} — {money(v.price)} ({v.stock} in stock)
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <textarea
              value={exReason}
              onChange={(e) => setExReason(e.target.value)}
              required
              minLength={5}
              maxLength={1000}
              placeholder="Wrong size? Changed your mind?"
            />
          </label>
          <p style={{ display: "flex", gap: 8 }}>
            <button className="button dark" disabled={busy}>
              {busy ? "Requesting…" : "Request exchange"}
            </button>
            <button type="button" className="button" onClick={() => setExItem(null)}>
              Cancel
            </button>
          </p>
        </form>
      )}
    </main>
  );
}
