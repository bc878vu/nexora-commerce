import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/login");
  return (
    <main className="dashboard">
      <p className="eyebrow">STORE ADMIN</p>
      <nav aria-label="Admin" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <Link className="button" href="/admin">Dashboard</Link>
        <Link className="button" href="/admin/orders">Orders</Link>
        <Link className="button" href="/admin/products">Products</Link>
        <Link className="button" href="/admin/categories">Categories</Link>
        <Link className="button" href="/admin/claims">Claims</Link>
        <Link className="button" href="/admin/refunds">Refunds</Link>
        <Link className="button" href="/admin/exchanges">Exchanges</Link>
        <Link className="button" href="/admin/reviews">Reviews</Link>
        <Link className="button" href="/admin/inventory">Inventory</Link>
        <Link className="button" href="/admin/ledger">Ledger</Link>
        <Link className="button" href="/admin/users">Users</Link>
        <Link className="button" href="/admin/settings">Settings</Link>
      </nav>
      {children}
    </main>
  );
}
