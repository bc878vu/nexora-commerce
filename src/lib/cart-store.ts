"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Cart maps variant id -> quantity. */
export type Cart = Record<string, number>;

interface CartState {
  cart: Cart;
  /** Set quantity for a variant, clamped to [0, min(20, stock)]. */
  setQty: (id: string, qty: number, stock: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: () => number;
}

function sanitize(raw: unknown): Cart {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Cart = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof k === "string" &&
      k.length <= 100 &&
      Number.isInteger(v) &&
      (v as number) > 0 &&
      (v as number) <= 20
    )
      out[k] = v as number;
  }
  return out;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: {},
      setQty: (id, qty, stock) =>
        set((s) => {
          const q = Math.max(0, Math.min(20, Math.max(0, stock), Math.floor(qty)));
          const cart = { ...s.cart };
          if (q > 0) cart[id] = q;
          else delete cart[id];
          return { cart };
        }),
      remove: (id) =>
        set((s) => {
          const cart = { ...s.cart };
          delete cart[id];
          return { cart };
        }),
      clear: () => set({ cart: {} }),
      count: () => Object.values(get().cart).reduce((a, n) => a + n, 0),
    }),
    {
      name: "nexora-cart-v1",
      merge: (persisted, current) => ({
        ...current,
        cart: sanitize((persisted as { cart?: unknown } | null)?.cart),
      }),
    },
  ),
);
