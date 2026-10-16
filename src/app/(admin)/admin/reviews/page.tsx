"use client";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: string;
  createdAt: string;
  product: { name: string; slug: string };
  user: { name: string; email: string };
};

const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");

  function load() {
    fetch(`/api/admin/reviews?status=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setReviews(d.reviews);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function moderate(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Update failed");
      setNotice(`Review ${pretty(status)}.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading reviews…</p>;
  return (
    <>
      <h1>Reviews</h1>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {notice && <p className="message">{notice}</p>}
      <p style={{ display: "flex", gap: 8 }}>
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {pretty(s)}
          </button>
        ))}
      </p>
      {!reviews.length && !error && (
        <div className="empty">No {pretty(filter)} reviews.</div>
      )}
      {reviews.map((r) => (
        <article className="order-card" key={r.id}>
          <p>
            <span>
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)} <b>{r.title}</b>
            </span>
            <span className="badge">{pretty(r.status)}</span>
          </p>
          <p>
            <small className="muted">
              {r.product.name} · {r.user.name} ({r.user.email}) ·{" "}
              {new Date(r.createdAt).toLocaleString("en-US")}
            </small>
          </p>
          <p>{r.comment}</p>
          <p style={{ display: "flex", gap: 8 }}>
            {r.status !== "APPROVED" && (
              <button
                className="button dark"
                disabled={busy === r.id}
                onClick={() => moderate(r.id, "APPROVED")}
              >
                Approve
              </button>
            )}
            {r.status !== "REJECTED" && (
              <button
                className="button"
                disabled={busy === r.id}
                onClick={() => moderate(r.id, "REJECTED")}
              >
                Reject
              </button>
            )}
          </p>
        </article>
      ))}
      <p className="muted">
        <small>
          Only verified-buyer reviews can be submitted. Nothing is seeded —
          every review here came from a real delivered order.
        </small>
      </p>
    </>
  );
}
