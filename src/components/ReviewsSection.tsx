"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  user: { name: string };
};

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.round(value) ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export { Stars };

export default function ReviewsSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewReason, setReviewReason] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setReviews(d.reviews ?? []);
        setAverage(d.average);
        setCount(d.count ?? 0);
        setCanReview(!!d.canReview);
        setReviewReason(d.reviewReason);
      })
      .catch(() => {});
  }
  useEffect(load, [productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save review");
      setNotice("Thank you! Your review is waiting for approval.");
      setShowForm(false);
      setTitle("");
      setComment("");
      setRating(5);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews" style={{ marginTop: 60 }} aria-label="Customer reviews">
      <h2>Customer reviews</h2>
      {average !== null ? (
        <p style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Stars value={average} size={20} />
          <b>{average.toFixed(1)}</b>
          <span className="muted">
            · {count} review{count === 1 ? "" : "s"}
          </span>
        </p>
      ) : (
        <p className="muted">No reviews yet — be the first to share your experience.</p>
      )}

      {reviews.map((r) => (
        <article className="order-card" key={r.id}>
          <p>
            <Stars value={r.rating} />
            <b style={{ marginLeft: 8 }}>{r.title}</b>
          </p>
          <p>{r.comment}</p>
          <p className="muted">
            <small>
              {r.user.name} ·{" "}
              {new Date(r.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · Verified buyer
            </small>
          </p>
        </article>
      ))}

      {canReview && !showForm && (
        <button className="button dark" onClick={() => setShowForm(true)}>
          Write a review
        </button>
      )}
      {!canReview && reviewReason && <p className="muted">{reviewReason}</p>}

      {showForm && (
        <form onSubmit={submit} style={{ maxWidth: 560, marginTop: 16 }}>
          <h3>Your review</h3>
          <label>
            Rating
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i} star${i > 1 ? "s" : ""}`}
                  aria-pressed={rating === i}
                  onClick={() => setRating(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                >
                  <Star
                    size={26}
                    fill={i <= rating ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
          </label>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="Sum it up in a few words"
            />
          </label>
          <label>
            Your feedback
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              placeholder="What did you love? How's the quality and fit?"
            />
          </label>
          {error && (
            <p role="alert" className="message">
              {error}
            </p>
          )}
          <p style={{ display: "flex", gap: 8 }}>
            <button className="button dark" disabled={busy}>
              {busy ? "Submitting…" : "Submit review"}
            </button>
            <button type="button" className="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </p>
          <p className="muted">
            <small>
              Reviews appear after approval. Only honest reviews from verified
              buyers are published.
            </small>
          </p>
        </form>
      )}
      {notice && <p className="message">{notice}</p>}
    </section>
  );
}
