"use client";
import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  Minus,
  Plus,
  X,
  Check,
  Truck,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import { CatalogItem, money, shipping } from "@/lib/catalog";
import ProductArt from "./ProductArt";
type Cart = Record<string, number>;
export default function Store() {
  const [products, setProducts] = useState<CatalogItem[]>([]),
    [demo, setDemo] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All essentials"),
    [sort, setSort] = useState("featured"),
    [cart, setCart] = useState<Cart>({}),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [detail, setDetail] = useState<CatalogItem | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setProducts(d.products);
        setDemo(d.demo);
      })
      .catch((e) => setError(e.message));
    try {
      const saved = JSON.parse(localStorage.getItem("nexora-cart-v1") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved))
        setCart(
          Object.fromEntries(
            Object.entries(saved).filter(
              ([, v]) =>
                Number.isInteger(v) && Number(v) > 0 && Number(v) <= 20,
            ),
          ) as Cart,
        );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("nexora-cart-v1", JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  useEffect(() => {
    if (!open && !detail) return;
    const previous = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setDetail(null);
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[role=dialog] button:not(:disabled),[role=dialog] input,[role=dialog] textarea,[role=dialog] select,[role=dialog] a[href]",
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = prior;
      previous?.focus();
    };
  }, [open, detail]);
  const lines = products.filter((p) => cart[p.id] > 0);
  const subtotal = lines.reduce((s, p) => s + p.price * cart[p.id], 0);
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  function change(id: string, delta: number) {
    const p = products.find((p) => p.id === id);
    if (!p) return;
    setCart((c) => {
      const q = Math.max(0, Math.min(20, p.stock, (c[id] || 0) + delta));
      const next = { ...c };
      if (q) next[id] = q;
      else delete next[id];
      return next;
    });
  }
  function add(p: CatalogItem) {
    change(p.id, 1);
    setNotice(p.name + " added to your bag");
  }
  async function place(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          address: f.get("address"),
          items: lines.map((p) => ({ id: p.id, quantity: cart[p.id] })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setCart({});
      window.location.assign("/dashboard");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  let shown = products.filter(
    (p) =>
      (category === "All essentials" || category === p.category) &&
      (p.name + " " + p.category + " " + p.sku)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === "low") shown = [...shown].sort((a, b) => a.price - b.price);
  if (sort === "high") shown = [...shown].sort((a, b) => b.price - a.price);
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> THE EVERYDAY COLLECTION
            </p>
            <h1>
              Less ordinary.
              <br />
              <em>More you.</em>
            </h1>
            <p>
              Thoughtful tech. Beautiful essentials.
              <br />
              Small upgrades that make a big difference.
            </p>
            <a className="button dark" href="#collection">
              Find your everyday <ArrowUpRight size={19} />
            </a>
            <div className="hero-note">
              <span>01 — 06</span> CURATED WITH PURPOSE
            </div>
          </div>
          <div className="hero-visual">
            <ProductArt icon="headphones" tone="#dce4d7" large />
            <div className="hero-product">
              <div>
                <small>THE SOUND OF SOMETHING BETTER</small>
                <h3>Studio Wireless</h3>
                <p>Graphite / {money(18900)}</p>
              </div>
              <button
                className="round"
                aria-label="View Studio Wireless"
                onClick={() =>
                  setDetail(products.find((p) => p.id === "audio-01") ?? null)
                }
              >
                <ArrowUpRight />
              </button>
            </div>
            <span className="vertical-label">FORM MEETS FUNCTION</span>
          </div>
        </section>
        <div className="benefits">
          <span>
            <Truck size={19} /> Free delivery over Rs 20,000
          </span>
          <span>
            <Package size={19} /> Carefully selected essentials
          </span>
          <span>
            <Check size={19} /> Cash on delivery
          </span>
        </div>
        <section id="collection" className="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GOOD THINGS, WELL CHOSEN</p>
              <h2>Your everyday, elevated.</h2>
            </div>
            <p>A few favorites. Endless possibilities.</p>
          </div>
          {demo && (
            <div className="preview-note">
              Sample catalog preview · Orders open after the store database is
              connected.
            </div>
          )}
          <div className="toolbar">
            <div className="tabs">
              {[
                "All essentials",
                "Audio",
                "Wearables",
                "Workspace",
                "Accessories",
              ].map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  className={c === category ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              className="bag-button"
              onClick={() => {
                setNotice("");
                setOpen(true);
              }}
            >
              <ShoppingBag size={17} /> Bag <b>{count}</b>
            </button>
          </div>
          <div className="filters">
            <label className="search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find your next favorite..."
                aria-label="Search products"
              />
            </label>
            <label className="sort">
              <SlidersHorizontal size={17} />
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          {error && <p role="alert">{error}</p>}
          {!products.length && !error && <p>Loading collection…</p>}
          <div className="grid">
            {shown.map((p, i) => (
              <article className="product" key={p.id}>
                <button
                  className="art-button"
                  onClick={() => setDetail(p)}
                  aria-label={"View " + p.name}
                >
                  <ProductArt icon={p.icon} tone={p.tone} />
                  <span className="product-tag">
                    {p.stock === 0
                      ? "Sold out"
                      : p.stock < 10
                        ? "Almost gone"
                        : i === 0
                          ? "THE EVERYDAY FAVORITE"
                          : p.category}
                  </span>
                  <span className="art-link">
                    <ArrowUpRight size={18} />
                  </span>
                </button>
                <div className="product-info">
                  <div>
                    <small>
                      {p.category} / {p.color}
                    </small>
                    <h3>
                      <button onClick={() => setDetail(p)}>{p.name}</button>
                    </h3>
                    <p>{money(p.price)}</p>
                  </div>
                  <button
                    className="round add"
                    disabled={
                      p.stock === 0 ||
                      (cart[p.id] || 0) >= Math.min(20, p.stock)
                    }
                    aria-label={"Add " + p.name + " to bag"}
                    onClick={() => add(p)}
                  >
                    <Plus size={19} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {products.length > 0 && !shown.length && (
            <div className="empty">
              No products found. Try another search or category.
            </div>
          )}
        </section>
        <section className="story">
          <p className="eyebrow">THE NEXORA WAY</p>
          <h2>
            Good design belongs
            <br />
            in your everyday.
          </h2>
          <p>
            We bring together useful, considered essentials for the way you
            listen, work and unwind.
          </p>
          <a href="#collection">
            Explore the collection <ArrowRight size={18} />
          </a>
        </section>
      </main>
      {notice && !open && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={detail.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close"
              onClick={() => setDetail(null)}
              aria-label="Close product"
            >
              <X />
            </button>
            <ProductArt icon={detail.icon} tone={detail.tone} />
            <div className="detail-copy">
              <p className="eyebrow">{detail.category}</p>
              <h2>{detail.name}</h2>
              <p>{detail.description}</p>
              <h3>{money(detail.price)}</h3>
              <p>
                {detail.color} · {detail.stock} available
              </p>
              <small>SKU: {detail.sku}</small>
              <button
                className="button dark"
                disabled={!detail.stock}
                onClick={() => {
                  add(detail);
                  setDetail(null);
                  setOpen(true);
                }}
              >
                Add to bag <Plus size={18} />
              </button>
            </div>
          </section>
        </div>
      )}
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <section
            className="bag-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close"
              aria-label="Close bag"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
            <p className="eyebrow">YOUR EVERYDAY EDIT</p>
            <h2>Shopping bag ({count})</h2>
            {!lines.length ? (
              <div className="empty">
                <ShoppingBag />
                <p>Your bag is waiting for something good.</p>
                <button className="button dark" onClick={() => setOpen(false)}>
                  Explore collection
                </button>
              </div>
            ) : (
              <>
                {lines.map((p) => (
                  <div className="cart-line" key={p.id}>
                    <ProductArt icon={p.icon} tone={p.tone} />
                    <div>
                      <strong>{p.name}</strong>
                      <p>{money(p.price)}</p>
                      <div className="quantity">
                        <button
                          aria-label={"Decrease " + p.name}
                          onClick={() => change(p.id, -1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{cart[p.id]}</span>
                        <button
                          aria-label={"Increase " + p.name}
                          onClick={() => change(p.id, 1)}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          aria-label={"Remove " + p.name}
                          onClick={() =>
                            setCart((c) => {
                              const n = { ...c };
                              delete n[p.id];
                              return n;
                            })
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="totals">
                  <p>
                    Subtotal <b>{money(subtotal)}</b>
                  </p>
                  <p>
                    Delivery{" "}
                    <b>
                      {shipping(subtotal) ? money(shipping(subtotal)) : "Free"}
                    </b>
                  </p>
                  <h3>
                    Total <span>{money(subtotal + shipping(subtotal))}</span>
                  </h3>
                </div>
                <form onSubmit={place}>
                  <h3>Delivery details</h3>
                  <label>
                    Full name
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    Complete address
                    <textarea
                      name="address"
                      required
                      minLength={10}
                      maxLength={500}
                      autoComplete="street-address"
                    />
                  </label>
                  <p className="muted">
                    Cash on delivery · Order history is saved to this browser’s
                    secure session for 7 days.
                  </p>
                  <button className="button dark full" disabled={busy || demo}>
                    {busy
                      ? "Placing order…"
                      : demo
                        ? "Preview — checkout unavailable"
                        : "Place order · " +
                          money(subtotal + shipping(subtotal))}
                  </button>
                </form>
              </>
            )}
            {notice && (
              <p role="alert" className="message">
                {notice}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
