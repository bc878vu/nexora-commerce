"use client";
import { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
} from "lucide-react";
import { categories, money, shipping } from "@/lib/catalog";
import type { ApiProduct, ApiVariant } from "@/app/api/catalog/route";
import ProductArt from "./ProductArt";
import { useCart } from "@/lib/cart-store";

type Selection = { product: ApiProduct; variant: ApiVariant };

export default function Store() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState("featured");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ApiProduct | null>(null);
  const [selColor, setSelColor] = useState("");
  const [selSpec, setSelSpec] = useState("");
  const [notice, setNotice] = useState("");
  const { cart, setQty, remove, clear, count } = useCart();

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setProducts(d.products);
        setDemo(d.demo);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Variant lookup: variant id -> { product, variant }
  const variantIndex = useMemo(() => {
    const m = new Map<string, Selection>();
    for (const p of products)
      for (const v of p.variants) m.set(v.id, { product: p, variant: v });
    return m;
  }, [products]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ sel: variantIndex.get(id), qty }))
        .filter((l) => l.sel && l.qty > 0) as {
        sel: Selection;
        qty: number;
      }[],
    [cart, variantIndex],
  );
  const subtotal = lines.reduce(
    (s, l) => s + l.sel.variant.price * l.qty,
    0,
  );
  const bagCount = count();

  function addVariant(sel: Selection, qty = 1) {
    const cur = cart[sel.variant.id] || 0;
    setQty(sel.variant.id, cur + qty, sel.variant.stock);
    setNotice(`${sel.product.name} (${sel.variant.color}) added to your bag`);
  }

  // Detail modal variant selection
  useEffect(() => {
    if (detail && detail.variants.length) {
      setSelColor(detail.variants[0].color);
      const specs = [
        ...new Set(
          detail.variants
            .filter((v) => v.color === detail.variants[0].color)
            .map((v) => v.spec),
        ),
      ];
      setSelSpec(specs[0] ?? "");
    }
  }, [detail]);

  const detailColors = detail
    ? [...new Set(detail.variants.map((v) => v.color))]
    : [];
  const detailSpecs = detail
    ? [
        ...new Set(
          detail.variants
            .filter((v) => v.color === selColor)
            .map((v) => v.spec),
        ),
      ]
    : [];
  const detailVariant =
    detail?.variants.find(
      (v) => v.color === selColor && v.spec === selSpec,
    ) ?? detail?.variants[0] ??
    null;

  // Focus trap + escape for dialogs (kept from original)
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

  const minPrice = (p: ApiProduct) =>
    Math.min(...p.variants.map((v) => v.price));
  const totalStock = (p: ApiProduct) =>
    p.variants.reduce((s, v) => s + v.stock, 0);

  let shown = products.filter(
    (p) =>
      (category === "All" || category === p.category) &&
      (p.name + " " + p.category + " " + p.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === "low")
    shown = [...shown].sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "high")
    shown = [...shown].sort((a, b) => minPrice(b) - minPrice(a));

  const featured = products.find((p) => p.id === "hb-mira") ?? products[0];

  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> THE VELORA VOGUE COLLECTION
            </p>
            <h1>
              Carry confidence.
              <br />
              <em>Step out in style.</em>
            </h1>
            <p>
              Handbags & footwear designed for her.
              <br />
              Thoughtful pieces for every day in Pakistan.
            </p>
            <a className="button dark" href="#collection">
              Shop the collection <ArrowUpRight size={19} />
            </a>
            <div className="hero-note">
              <span>01 — 12</span> CURATED WITH CARE
            </div>
          </div>
          <div className="hero-visual">
            <ProductArt icon="handbag" tone="#f3e9df" large />
            {featured && (
              <div className="hero-product">
                <div>
                  <small>BESTSELLER</small>
                  <h3>{featured.name}</h3>
                  <p>
                    {featured.variants[0]?.color} / {money(minPrice(featured))}
                  </p>
                </div>
                <button
                  className="round"
                  aria-label={"View " + featured.name}
                  onClick={() => setDetail(featured)}
                >
                  <ArrowUpRight />
                </button>
              </div>
            )}
            <span className="vertical-label">DESIGNED FOR HER</span>
          </div>
        </section>
        <div className="benefits">
          <span>
            <Truck size={19} /> Free delivery over Rs 5,000
          </span>
          <span>
            <RotateCcw size={19} /> 7-day easy exchange
          </span>
          <span>
            <Check size={19} /> Cash on delivery nationwide
          </span>
        </div>
        <section id="collection" className="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HANDPICKED FOR YOU</p>
              <h2>Bags & footwear, elevated.</h2>
            </div>
            <p>Twelve favorites. Endless possibilities.</p>
          </div>
          {demo && (
            <div className="preview-note">
              Sample catalog preview · Orders open after the store database is
              connected.
            </div>
          )}
          <div className="toolbar">
            <div className="tabs">
              {categories.map((c) => (
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
              <ShoppingBag size={17} /> Bag <b>{bagCount}</b>
            </button>
          </div>
          <div className="filters">
            <label className="search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search handbags, heels, wallets…"
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
            {shown.map((p, i) => {
              const stock = totalStock(p);
              return (
                <article className="product" key={p.id}>
                  <button
                    className="art-button"
                    onClick={() => setDetail(p)}
                    aria-label={"View " + p.name}
                  >
                    <ProductArt icon={p.icon} tone={p.tone} />
                    <span className="product-tag">
                      {stock === 0
                        ? "Sold out"
                        : stock < 20
                          ? "Almost gone"
                          : i === 0
                            ? "BESTSELLER"
                            : p.category}
                    </span>
                    <span className="art-link">
                      <ArrowUpRight size={18} />
                    </span>
                  </button>
                  <div className="product-info">
                    <div>
                      <small>{p.category}</small>
                      <h3>
                        <button onClick={() => setDetail(p)}>{p.name}</button>
                      </h3>
                      <p>{money(minPrice(p))}</p>
                    </div>
                    <button
                      className="round add"
                      disabled={stock === 0}
                      aria-label={"View " + p.name}
                      onClick={() => setDetail(p)}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                </article>
              );
            })}
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
            Beautiful things,
            <br />
            made for every day.
          </h2>
          <p>
            We curate handbags and footwear for the way she lives, works and
            celebrates — delivered across Pakistan with cash on delivery.
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
      {detail && detailVariant && (
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
              <h3>{money(detailVariant.price)}</h3>
              <div className="filters" style={{ margin: "12px 0" }}>
                <label>
                  Colour
                  <select
                    value={selColor}
                    onChange={(e) => {
                      setSelColor(e.target.value);
                      const specs = [
                        ...new Set(
                          detail.variants
                            .filter((v) => v.color === e.target.value)
                            .map((v) => v.spec),
                        ),
                      ];
                      setSelSpec(specs[0] ?? "");
                    }}
                    aria-label="Choose colour"
                  >
                    {detailColors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                {detailSpecs.length > 1 && (
                  <label>
                    {detail.category === "Footwear" ? "Size" : "Option"}
                    <select
                      value={selSpec}
                      onChange={(e) => setSelSpec(e.target.value)}
                      aria-label="Choose size"
                    >
                      {detailSpecs.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <p>
                {detailVariant.stock > 0
                  ? `${detailVariant.stock} available`
                  : "Sold out"}
              </p>
              <small>SKU: {detailVariant.sku}</small>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  className="button dark"
                  disabled={!detailVariant.stock}
                  onClick={() => {
                    addVariant({ product: detail, variant: detailVariant });
                    setDetail(null);
                    setOpen(true);
                  }}
                >
                  Add to bag <Plus size={18} />
                </button>
                <a className="button" href={`/products/${detail.slug}`}>
                  Full details <ArrowUpRight size={16} />
                </a>
              </div>
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
            <p className="eyebrow">YOUR SELECTION</p>
            <h2>Shopping bag ({bagCount})</h2>
            {!lines.length ? (
              <div className="empty">
                <ShoppingBag />
                <p>Your bag is waiting for something beautiful.</p>
                <button className="button dark" onClick={() => setOpen(false)}>
                  Explore collection
                </button>
              </div>
            ) : (
              <>
                {lines.map(({ sel, qty }) => (
                  <div className="cart-line" key={sel.variant.id}>
                    <ProductArt icon={sel.product.icon} tone={sel.product.tone} />
                    <div>
                      <strong>{sel.product.name}</strong>
                      <p>
                        {sel.variant.color}
                        {sel.variant.spec !== "One Size"
                          ? ` · Size ${sel.variant.spec}`
                          : ""}
                      </p>
                      <p>{money(sel.variant.price)}</p>
                      <div className="quantity">
                        <button
                          aria-label={"Decrease " + sel.product.name}
                          onClick={() =>
                            setQty(sel.variant.id, qty - 1, sel.variant.stock)
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{qty}</span>
                        <button
                          aria-label={"Increase " + sel.product.name}
                          onClick={() =>
                            setQty(sel.variant.id, qty + 1, sel.variant.stock)
                          }
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          aria-label={"Remove " + sel.product.name}
                          onClick={() => remove(sel.variant.id)}
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
                <button
                  className="button dark full"
                  disabled={demo}
                  onClick={() => {
                    setOpen(false);
                    window.location.assign("/checkout");
                  }}
                >
                  {demo
                    ? "Preview — checkout unavailable"
                    : "Proceed to checkout"}
                </button>
                <p className="muted">
                  Cash on delivery · 7-day easy exchange · Secure checkout
                </p>
                <button
                  className="button full"
                  onClick={() => {
                    clear();
                    setNotice("Bag cleared");
                  }}
                >
                  Clear bag
                </button>
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
