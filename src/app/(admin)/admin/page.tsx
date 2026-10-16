"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/catalog";

type Overview = {
  kpis: {
    revenue: number;
    orders: number;
    byStatus: Record<string, number>;
    customers: number;
    stockValuation: number;
    lowStockCount: number;
    variants: number;
  };
  lowStock: { id: string; sku: string; productName: string; available: number; reorderPoint: number }[];
  orders: { id: string; orderNumber: string; status: string; totalAmount: string; createdAt: string; user: { name: string; email: string } }[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard…</p>;
  if (error)
    return (
      <p role="alert" className="message">
        {error}
      </p>
    );
  if (!data) return null;
  const k = data.kpis;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div>
          <small>REVENUE</small>
          <h2>{money(k.revenue)}</h2>
        </div>
        <div>
          <small>ORDERS</small>
          <h2>{k.orders}</h2>
        </div>
        <div>
          <small>CUSTOMERS</small>
          <h2>{k.customers}</h2>
        </div>
        <div>
          <small>STOCK VALUE</small>
          <h2>{money(k.stockValuation)}</h2>
        </div>
      </div>
      <div className="stats">
        <div>
          <small>PROCESSING</small>
          <h2>{k.byStatus.PROCESSING ?? 0}</h2>
        </div>
        <div>
          <small>SHIPPED</small>
          <h2>{k.byStatus.SHIPPED ?? 0}</h2>
        </div>
        <div>
          <small>DELIVERED</small>
          <h2>{k.byStatus.DELIVERED ?? 0}</h2>
        </div>
        <div>
          <small>LOW STOCK ALERTS</small>
          <h2>{k.lowStockCount}</h2>
        </div>
      </div>

      {data.lowStock.length > 0 && (
        <>
          <h2>Low stock alerts</h2>
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 12 }}>Product</th>
                  <th style={{ textAlign: "left", padding: 12 }}>SKU</th>
                  <th style={{ textAlign: "right", padding: 12 }}>Available</th>
                  <th style={{ textAlign: "right", padding: 12 }}>Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock.map((v) => (
                  <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: 12 }}>{v.productName}</td>
                    <td style={{ padding: 12 }}>{v.sku}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{v.available}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{v.reorderPoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>
        Recent orders <Link href="/admin/orders" style={{ fontSize: 14 }}>View all →</Link>
      </h2>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>Order</th>
              <th style={{ textAlign: "left", padding: 12 }}>Customer</th>
              <th style={{ textAlign: "left", padding: 12 }}>Status</th>
              <th style={{ textAlign: "right", padding: 12 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.slice(0, 10).map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 12 }}>{o.orderNumber}</td>
                <td style={{ padding: 12 }}>{o.user.name}</td>
                <td style={{ padding: 12 }}>
                  <span className="badge">{o.status}</span>
                </td>
                <td style={{ padding: 12, textAlign: "right" }}>{money(o.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
