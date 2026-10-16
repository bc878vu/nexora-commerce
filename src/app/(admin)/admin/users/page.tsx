"use client";
import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { orders: number; addresses: number };
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setUsers(d.users);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading users…</p>;
  return (
    <>
      <h1>Users ({users.length})</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Name</th>
              <th style={{ textAlign: "left", padding: 10 }}>Email</th>
              <th style={{ textAlign: "left", padding: 10 }}>Role</th>
              <th style={{ textAlign: "right", padding: 10 }}>Orders</th>
              <th style={{ textAlign: "left", padding: 10 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: 10 }}>{u.name}</td>
                <td style={{ padding: 10 }}>{u.email}</td>
                <td style={{ padding: 10 }}>
                  <span className="badge">{u.role}</span>
                </td>
                <td style={{ padding: 10, textAlign: "right" }}>{u._count.orders}</td>
                <td style={{ padding: 10 }}>
                  {new Date(u.createdAt).toLocaleDateString("en-PK")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Roles are managed in the database. Guest checkouts appear as customers
        with @guest.nexora.invalid emails.
      </p>
    </>
  );
}
