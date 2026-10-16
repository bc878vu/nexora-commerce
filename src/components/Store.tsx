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
  Heart,
  ShieldCheck,
  Globe,
  Instagram,
} from "lucide-react";
import {
  categories,
  money,
  shipping,
  stockBadge,
  buildCategoryTree,
  type CategoryNode,
} from "@/lib/catalog";
import type { ApiProduct, ApiVariant } from "@/app/api/catalog/route";
import ProductArt from "./ProductArt";
import { useCart } from "@/lib/cart-store";

type Selection = { product: ApiProduct; variant: ApiVariant };

function CategoryTree({
  nodes,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  depth = 0,
}: {
  nodes: CategoryNode[];
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: depth ? "4px 0 4px 18px" : 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {nodes.map((n) => (
        <li key={n.id}>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {n.children.length > 0 ? (
              <button
                type="button"
                aria-label={expanded.has(n.id) ? `Collapse ${n.name}` : `Expand ${n.name}`}
                aria-expanded={expanded.has(n.id)}
                onClick={() => onToggle(n.id)}
                style={{ minWidth: 24 }}
              >
                {expanded.has(n.id) ? "−" : "+"}
              </button>
            ) : (
              <span style={{ minWidth: 24 }} aria-hidden="true" />
            )}
            <button
              type="button"
              aria-pressed={selectedId === n.id}
              className={selectedId === n.id ? "active" : ""}
              onClick={() => onSelect(n.id)}
            >
              {n.name}
            </button>
          </span>
          {expanded.has(n.id) && n.children.length > 0 && (
            <CategoryTree
              nodes={n.children}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Store() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [catTree, setCatTree] = useState<CategoryNode[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState("featured");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ApiProduct | null>(null);
  const [selColor, setSelColor] = useState("");
  const [selSpec, setSelSpec] = useState("");
  const [notice, setNotice] = useState("");
  const { cart, setQty, remove, clear, count } = useCart();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [wishReady, setWishReady] = useState(false);

  useEffect(() => {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) =>
        setWishlist(new Set((d.items ?? []).map((i: { productId: string }) => i.productId))),
      )
      .catch(() => {})
      .finally(() => setWishReady(true));
  }, []);

  async function toggleWish(productId: string) {
    if (!wishReady) return;
    const adding = !wishlist.has(productId);
    // Optimistic update
    setWishlist((prev) => {
      const next = new Set(prev);
      if (adding) next.add(productId);
      else next.delete(productId);
      return next;
    });
    try {
      const r = await fetch("/api/wishlist", {
        method: adding ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (r.status === 401) {
        // Not signed in — revert and nudge to login
        setWishlist((prev) => {
          const next = new Set(prev);
          if (adding) next.delete(productId);
          else next.add(productId);
          return next;
        });
        setNotice("Sign in to save items to your wishlist");
      }
    } catch {
      /* revert on network failure */
      setWishlist((prev) => {
        const next = new Set(prev);
        if (adding) next.delete(productId);
        else next.add(productId);
        return next;
      });
    }
  }

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setProducts(d.products);
        setDemo(d.demo);
      })
      .catch((e) => setError(e.message));
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.categories)) setCatTree(d.categories);
      })
      .catch(() => {});
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

  // All category ids inside the selected subtree (selected + descendants).
  const selectedIds = useMemo(() => {
    if (!selectedCatId) return null;
    const ids = new Set<string>();
    const collect = (x: CategoryNode) => {
      ids.add(x.id);
      x.children.forEach(collect);
    };
    const find = (nodes: CategoryNode[]): boolean => {
      for (const n of nodes) {
        if (n.id === selectedCatId) {
          collect(n);
          return true;
        }
        if (find(n.children)) return true;
      }
      return false;
    };
    find(catTree);
    return ids;
  }, [selectedCatId, catTree]);

  const selectedName = useMemo(() => {
    if (!selectedCatId) return null;
    const find = (nodes: CategoryNode[]): string | null => {
      for (const n of nodes) {
        if (n.id === selectedCatId) return n.name;
        const r = find(n.children);
        if (r) return r;
      }
      return null;
    };
    return find(catTree);
  }, [selectedCatId, catTree]);

  let shown = products.filter((p) => {
    if (p.status !== "ACTIVE") return false;
    if (selectedIds) {
      // Tree selection wins: match by categoryId subtree, falling back to
      // the legacy category label for products not yet linked.
      const linked =
        p.categoryId != null
          ? selectedIds.has(p.categoryId)
          : selectedName != null &&
            p.category.toLowerCase() === selectedName.toLowerCase();
      if (!linked) return false;
    } else if (category !== "All" && category !== p.category) {
      return false;
    }
    return (p.name + " " + p.category + " " + p.description)
      .toLowerCase()
      .includes(query.toLowerCase());
  });
  if (sort === "low")
    shown = [...shown].sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "high")
    shown = [...shown].sort((a, b) => minPrice(b) - minPrice(a));

  const featured = products.find((p) => p.id === "hb-mira") ?? products[0];

  const featuredPieces = useMemo(
    () =>
      products
        .filter((p) => p.status === "ACTIVE" && totalStock(p) > 0)
        .slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products],
  );

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
              Thoughtful pieces for every day, everywhere.
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
            <Truck size={19} /> Free delivery over $75
          </span>
          <span>
            <RotateCcw size={19} /> 7-day easy exchange
          </span>
          <span>
            <Check size={19} /> Secure worldwide checkout
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
              {catTree.length > 0 ? (
                <button
                  aria-pressed={selectedCatId === null && category === "All"}
                  className={selectedCatId === null && category === "All" ? "active" : ""}
                  onClick={() => {
                    setSelectedCatId(null);
                    setCategory("All");
                  }}
                >
                  All
                </button>
              ) : (
                categories.map((c) => (
                  <button
                    key={c}
                    aria-pressed={category === c}
                    className={c === category ? "active" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))
              )}
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
          {catTree.length > 0 && (
            <nav aria-label="Categories" style={{ margin: "12px 0" }}>
              <CategoryTree
                nodes={catTree}
                selectedId={selectedCatId}
                expanded={expanded}
                onSelect={(id) => {
                  setSelectedCatId((cur) => (cur === id ? null : id));
                  setCategory("All");
                }}
                onToggle={(id) =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            </nav>
          )}
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
              const badge = stockBadge(stock);
              return (
                <article className="product" key={p.id}>
                  <button
                    className="art-button"
                    onClick={() => setDetail(p)}
                    aria-label={"View " + p.name}
                  >
                    <ProductArt icon={p.icon} tone={p.tone} />
                    <span className="product-tag">
                      {badge === "In Stock"
                        ? i === 0
                          ? "BESTSELLER"
                          : p.category
                        : badge}
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
                    <span style={{ display: "flex", gap: 8 }}>
                      <button
                        className="round"
                        aria-label={
                          wishlist.has(p.id)
                            ? `Remove ${p.name} from wishlist`
                            : `Save ${p.name} to wishlist`
                        }
                        aria-pressed={wishlist.has(p.id)}
                        onClick={() => toggleWish(p.id)}
                      >
                        <Heart
                          size={18}
                          fill={wishlist.has(p.id) ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        className="round add"
                        disabled={stock === 0}
                        aria-label={"Quick view " + p.name}
                        onClick={() => setDetail(p)}
                      >
                        <Plus size={19} />
                      </button>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {products.length > 0 && !shown.length && (
            <div className="empty">
              <Package size={28} aria-hidden="true" />
              <p>No products found. Try another search or category.</p>
              <button
                className="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                  setSelectedCatId(null);
                }}
              >
                Clear filters
              </button>
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
            celebrates — shipped worldwide with secure checkout.
          </p>
          <a href="#collection">
            Explore the collection <ArrowRight size={18} />
          </a>
        </section>

        {catTree.length > 0 && (
          <section className="collection" aria-label="Shop by category">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BROWSE</p>
                <h2>Shop by category</h2>
              </div>
            </div>
            <div className="grid">
              {catTree.map((c) => (
                <article className="product" key={c.id}>
                  <button
                    className="art-button"
                    aria-label={`Shop ${c.name}`}
                    onClick={() => {
                      setSelectedCatId(c.id);
                      setCategory("All");
                      setExpanded(new Set([c.id]));
                      document
                        .getElementById("collection")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <ProductArt
                      icon={
                        c.name.toLowerCase().includes("foot")
                          ? "footprints"
                          : c.name.toLowerCase().includes("wallet")
                            ? "wallet"
                            : "handbag"
                      }
                      tone="#f3e9df"
                    />
                    <span className="product-tag">
                      {c.children.length
                        ? `${c.children.length} styles`
                        : "Shop now"}
                    </span>
                  </button>
                  <div className="product-info">
                    <div>
                      <h3>
                        <button
                          onClick={() => {
                            setSelectedCatId(c.id);
                            setCategory("All");
                            document
                              .getElementById("collection")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          {c.name}
                        </button>
                      </h3>
                      <p className="muted">
                        {c.children.map((x) => x.name).join(" · ")}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {featuredPieces.length > 0 && (
          <section className="collection" aria-label="Featured pieces">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HANDPICKED</p>
                <h2>Featured pieces</h2>
              </div>
              <a href="#collection">View all →</a>
            </div>
            <div className="grid">
              {featuredPieces.map((p) => (
                <article className="product" key={p.id}>
                  <button
                    className="art-button"
                    onClick={() => setDetail(p)}
                    aria-label={"Quick view " + p.name}
                  >
                    <ProductArt icon={p.icon} tone={p.tone} />
                    <span className="product-tag">Featured</span>
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
                      aria-label={"Quick view " + p.name}
                      onClick={() => setDetail(p)}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="story" aria-label="Why shop with us">
          <p className="eyebrow">SHOP WITH CONFIDENCE</p>
          <h2>Why Nexora?</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginTop: 20,
              textAlign: "left",
            }}
          >
            <div>
              <Globe size={22} aria-hidden="true" />
              <h3>Worldwide shipping</h3>
              <p className="muted">
                Free delivery on orders over $75 — USA, UK, Europe and beyond.
              </p>
            </div>
            <div>
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>Secure checkout</h3>
              <p className="muted">
                Cards, PayPal, bank transfer and cash on delivery (Pakistan).
              </p>
            </div>
            <div>
              <RotateCcw size={22} aria-hidden="true" />
              <h3>7-day easy exchange</h3>
              <p className="muted">
                Changed your mind? Swap colours or sizes within 7 days.
              </p>
            </div>
          </div>
        </section>

        <section className="story" aria-label="Follow us on Instagram">
          <p className="eyebrow">
            <Instagram size={16} aria-hidden="true" /> INSTAGRAM
          </p>
          <h2>
            Follow @shopvelora_vogue
          </h2>
          <p>
            New arrivals, styling ideas and behind-the-scenes — see it first on
            Instagram.
          </p>
          <a
            className="button dark"
            href="https://instagram.com/shopvelora_vogue"
            target="_blank"
            rel="noreferrer"
          >
            Follow on Instagram <ArrowUpRight size={18} />
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
                  Secure checkout · 7-day easy exchange · Worldwide delivery
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
