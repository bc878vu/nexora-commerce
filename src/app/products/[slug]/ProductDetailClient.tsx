"use client";
import { useMemo, useState } from "react";
import { Plus, Check, Truck, RotateCcw } from "lucide-react";
import { money } from "@/lib/catalog";
import type { ApiProduct } from "@/app/api/catalog/route";
import ProductArt from "@/components/ProductArt";
import { useCart } from "@/lib/cart-store";

export default function ProductDetailClient({
  product,
}: {
  product: ApiProduct;
}) {
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product],
  );
  const [color, setColor] = useState(colors[0] ?? "");
  const specs = useMemo(
    () => [
      ...new Set(
        product.variants.filter((v) => v.color === color).map((v) => v.spec),
      ),
    ],
    [product, color],
  );
  const [spec, setSpec] = useState(specs[0] ?? "");
  const variant =
    product.variants.find((v) => v.color === color && v.spec === spec) ??
    product.variants[0];
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { setQty: setCartQty } = useCart();

  function pickColor(c: string) {
    setColor(c);
    const s = [
      ...new Set(
        product.variants.filter((v) => v.color === c).map((v) => v.spec),
      ),
    ];
    setSpec(s[0] ?? "");
    setAdded(false);
  }

  function add() {
    if (!variant || variant.stock === 0) return;
    setCartQty(variant.id, qty, variant.stock);
    setAdded(true);
  }

  if (!variant) return null;
  return (
    <>
    <section className="detail-modal" style={{ margin: "30px auto", maxWidth: 960 }}>
      <ProductArt icon={product.icon} tone={product.tone} large />
      <div className="detail-copy">
        <p className="eyebrow">{product.category}</p>
        <h1 style={{ fontSize: 34 }}>{product.name}</h1>
        <h2>{money(variant.price)}</h2>
        <p>{product.description}</p>
        <label>
          Colour
          <div className="tabs" style={{ margin: "8px 0" }}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                className={color === c ? "active" : ""}
                onClick={() => pickColor(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </label>
        {specs.length > 1 && (
          <label>
            {product.category === "Footwear" ? "Size (EU)" : "Option"}
            <div className="tabs" style={{ margin: "8px 0" }}>
              {specs.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={spec === s}
                  className={spec === s ? "active" : ""}
                  onClick={() => {
                    setSpec(s);
                    setAdded(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>
        )}
        <p className="muted">
          {variant.stock > 0 ? `${variant.stock} in stock` : "Sold out"} · SKU:{" "}
          {variant.sku}
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <div className="quantity">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{qty}</span>
            <button
              aria-label="Increase quantity"
              onClick={() =>
                setQty((q) => Math.min(20, variant.stock, q + 1))
              }
            >
              +
            </button>
          </div>
          <button
            className="button dark"
            disabled={variant.stock === 0}
            onClick={add}
          >
            {added ? (
              <>
                <Check size={16} /> Added to bag
              </>
            ) : (
              <>
                Add to bag <Plus size={16} />
              </>
            )}
          </button>
        </div>
        <div className="benefits" style={{ marginTop: 20 }}>
          <span>
            <Truck size={16} /> Free delivery over $75
          </span>
          <span>
            <RotateCcw size={16} /> 7-day easy exchange
          </span>
        </div>
      </div>
    </section>
    {/* Sticky mobile add-to-cart bar */}
    <div
      className="sticky-cart"
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        background: "var(--bg, #fff)",
        borderTop: "1px solid var(--line, #eee)",
        padding: "10px 16px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{money(variant.price)}</div>
        <small className="muted">
          {variant.stock > 0 ? `${variant.stock} in stock` : "Sold out"}
        </small>
      </div>
      <button
        className="button dark"
        disabled={variant.stock === 0}
        onClick={add}
        style={{ flex: 1, maxWidth: 320 }}
      >
        {added ? (
          <>
            <Check size={16} /> Added to bag
          </>
        ) : (
          <>
            Add to bag <Plus size={16} />
          </>
        )}
      </button>
    </div>
    </>
  );
}
