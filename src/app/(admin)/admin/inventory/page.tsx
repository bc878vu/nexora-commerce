"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/catalog";
type Variant = {
  id: string;
  sku: string;
  onHandStock: number;
  reservedStock: number;
  retailPrice: string;
  unitCost: string;
  reorderPoint: number;
  product: { name: string };
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  shippingAddress: string;
};
type Ledger = {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  variant: { sku: string };
};
type Data = { variants: Variant[]; orders: Order[]; ledger: Ledger[] };
export default function Admin() {
  const [data, setData] = useState<Data | null>(null),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("Inventory"),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function load() {
    try {
      const r = await fetch("/api/admin");
      const d = await r.json();
      if (!r.ok) {
        setMessage(d.error);
        setData(null);
      } else setData(d);
    } catch {
      setMessage("Connection failed. Retry shortly.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function send(url: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setMessage("Saved successfully.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NEXORA / OPERATIONS</p>
          <h1>Store overview.</h1>
        </div>
        {data && (
          <button
            onClick={async () => {
              await fetch("/api/admin/session", { method: "DELETE" });
              setData(null);
              setMessage("Signed out.");
            }}
          >
            Sign out
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
      {loading ? (
        <p>Checking store session…</p>
      ) : !data ? (
        <form
          className="login"
          onSubmit={(e) => {
            e.preventDefault();
            send("/api/admin/session", {
              password: new FormData(e.currentTarget).get("password"),
            });
          }}
        >
          <h2>Administrator sign in</h2>
          <p>Use the administrator password configured on your server.</p>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button dark" disabled={busy}>
            Sign in securely
          </button>
        </form>
      ) : (
        <>
          <div className="stats">
            <div>
              <small>ACTIVE SKUS</small>
              <h2>{data.variants.length}</h2>
            </div>
            <div>
              <small>ON-HAND UNITS</small>
              <h2>{data.variants.reduce((s, v) => s + v.onHandStock, 0)}</h2>
            </div>
            <div>
              <small>LOW STOCK</small>
              <h2>
                {
                  data.variants.filter(
                    (v) => v.onHandStock - v.reservedStock <= v.reorderPoint,
                  ).length
                }
              </h2>
            </div>
            <div>
              <small>STOCK AT COST</small>
              <h2>
                {money(
                  data.variants.reduce(
                    (s, v) => s + Number(v.unitCost) * v.onHandStock,
                    0,
                  ),
                )}
              </h2>
            </div>
          </div>
          <div className="tabs">
            {["Inventory", "Orders", "Stock ledger"].map((t) => (
              <button
                className={t === tab ? "active" : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Inventory" ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>On hand</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      <th>Retail</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.product.name}</strong>
                          <br />
                          <small>{v.sku}</small>
                        </td>
                        <td>{v.onHandStock}</td>
                        <td>{v.reservedStock}</td>
                        <td>{v.onHandStock - v.reservedStock}</td>
                        <td>{money(Number(v.retailPrice))}</td>
                        <td>
                          <span className="badge">
                            {v.onHandStock - v.reservedStock <= v.reorderPoint
                              ? "Reorder"
                              : "Healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form
                className="adjust-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  send("/api/inventory/adjust", {
                    sku: f.get("sku"),
                    delta: Number(f.get("delta")),
                    reason: f.get("reason"),
                    note: f.get("note"),
                  });
                }}
              >
                <h2>Adjust stock</h2>
                <label>
                  SKU
                  <select name="sku" required>
                    {data.variants.map((v) => (
                      <option key={v.id}>{v.sku}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Change (+ restock / − remove)
                  <input
                    name="delta"
                    type="number"
                    required
                    step="1"
                    min="-100000"
                    max="100000"
                  />
                </label>
                <label>
                  Reason
                  <select name="reason">
                    <option value="PURCHASE_ORDER_RESTOCK">Restock</option>
                    <option value="MANUAL_AUDIT">Manual audit</option>
                    <option value="DAMAGED_WRITE_OFF">Damaged stock</option>
                  </select>
                </label>
                <label>
                  Audit note
                  <input name="note" maxLength={300} />
                </label>
                <button
                  className="button dark"
                  disabled={busy || !data.variants.length}
                >
                  Save stock change
                </button>
              </form>
            </>
          ) : tab === "Orders" ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order / delivery</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong className="order-id">{o.orderNumber}</strong>
                        <details>
                          <summary>Delivery details</summary>
                          <p>{o.shippingAddress}</p>
                        </details>
                      </td>
                      <td>{money(Number(o.totalAmount))}</td>
                      <td>{o.status}</td>
                      <td>
                        {(o.status === "PROCESSING"
                          ? ["SHIPPED", "CANCELLED"]
                          : o.status === "SHIPPED"
                            ? ["DELIVERED"]
                            : []
                        ).map((status) => (
                          <button
                            disabled={busy}
                            key={status}
                            onClick={() =>
                              send("/api/admin/orders", { id: o.id, status })
                            }
                          >
                            {status === "CANCELLED"
                              ? "Cancel + restock"
                              : status === "SHIPPED"
                                ? "Mark shipped"
                                : "Mark delivered"}
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.orders.length && <p className="empty">No orders yet.</p>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>SKU</th>
                    <th>Change</th>
                    <th>Balance</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.createdAt).toLocaleString()}</td>
                      <td>{l.variant.sku}</td>
                      <td>
                        {l.delta > 0 ? "+" : ""}
                        {l.delta}
                      </td>
                      <td>{l.balanceAfter}</td>
                      <td>{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted">Latest 100 movements.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
