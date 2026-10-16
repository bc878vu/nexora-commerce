"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { money } from "@/lib/catalog";

type WishItem = {
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    minPrice: number;
    inStock: boolean;
    status: string;
  };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setItems(d.items ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(productId: string) {
    await fetch("/api/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  if (loading)
    return (
      <main className="dashboard">
        <p>Loading your wishlist…</p>
      </main>
    );

  return (
    <main className="dashboard">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>
        <Heart size={22} aria-hidden="true" /> Wishlist
      </h1>
      <p>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {!items.length && !error && (
        <div className="empty">
          <Heart size={28} aria-hidden="true" />
          <p>Your wishlist is empty.</p>
          <p className="muted">
            Tap the heart on any product to save it here for later.
          </p>
          <Link className="button dark" href="/#collection">
            Discover pieces
          </Link>
        </div>
      )}
      <div className="grid">
        {items.map(({ product: p }) => (
          <article className="product" key={p.id}>
            <div className="product-info">
              <div>
                <small>{p.category}</small>
                <h3>
                  <Link href={`/products/${p.slug}`}>{p.name}</Link>
                </h3>
                <p>{money(p.minPrice)}</p>
                <p className="muted">
                  <small>
                    {p.status !== "ACTIVE"
                      ? "Currently unavailable"
                      : p.inStock
                        ? "In stock"
                        : "Out of stock"}
                  </small>
                </p>
              </div>
              <button
                className="round"
                aria-label={`Remove ${p.name} from wishlist`}
                onClick={() => remove(p.id)}
              >
                <X size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
