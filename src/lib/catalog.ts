/**
 * Nexora Commerce — Velora Vogue collection.
 * Women's handbags & footwear, priced in USD for a worldwide market
 * (USA / UK / Europe focus).
 *
 * `catalog` is the static source of truth used for demo mode and seeding.
 * When the database is connected, /api/catalog serves live variant data
 * merged with these presentation fields (icon, tone).
 */
export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number; // USD
  icon: "handbag" | "footprints" | "wallet";
  tone: string;
  image?: string;
  colors: string[];
  specs: string[];
  stockPerVariant: number;
};

export const catalog: CatalogProduct[] = [
  {
    id: "hb-aurelia",
    name: "Aurelia Tote",
    category: "Handbags",
    description:
      "A roomy everyday tote in soft-grain faux leather with a zip-top closure, inner pocket and detachable pouch. Carries workday to weekend with ease.",
    price: 79,
    image: "/products/hb-aurelia.jpg",
    icon: "handbag",
    tone: "#f3e9df",
    colors: ["Tan", "Black", "Cream"],
    specs: ["One Size"],
    stockPerVariant: 22,
  },
  {
    id: "hb-mira",
    name: "Mira Crossbody",
    category: "Handbags",
    description:
      "A compact crossbody with an adjustable strap and gold-tone hardware. Fits phone, wallet and keys — perfect for days on the move.",
    price: 49,
    image: "/products/hb-mira.jpg",
    icon: "handbag",
    tone: "#f0e4e6",
    colors: ["Beige", "Black", "Blush"],
    specs: ["One Size"],
    stockPerVariant: 28,
  },
  {
    id: "hb-sofia",
    name: "Sofia Shoulder Bag",
    category: "Handbags",
    description:
      "A structured shoulder bag with a flap closure and chain-accent strap. Polished enough for evenings, practical enough for every day.",
    price: 89,
    image: "/products/hb-sofia.jpg",
    icon: "handbag",
    tone: "#e9e2d6",
    colors: ["Cognac", "Black"],
    specs: ["One Size"],
    stockPerVariant: 15,
  },
  {
    id: "hb-elena",
    name: "Elena Evening Clutch",
    category: "Handbags",
    description:
      "A slim evening clutch with a magnetic clasp and optional wristlet chain. Just enough room for the essentials, with a little shine.",
    price: 45,
    image: "/products/hb-elena.jpg",
    icon: "handbag",
    tone: "#ece7f0",
    colors: ["Gold", "Silver", "Black"],
    specs: ["One Size"],
    stockPerVariant: 20,
  },
  {
    id: "hb-noor",
    name: "Noor Satchel",
    category: "Handbags",
    description:
      "A classic satchel with top handles and a detachable shoulder strap. Multiple compartments keep everything in its place.",
    price: 65,
    image: "/products/hb-noor.jpg",
    icon: "handbag",
    tone: "#efe4d8",
    colors: ["Brown", "Maroon"],
    specs: ["One Size"],
    stockPerVariant: 16,
  },
  {
    id: "hb-dua",
    name: "Dua Mini Backpack",
    category: "Handbags",
    description:
      "A petite backpack with drawstring closure and padded straps. Hands-free comfort for campus, travel and daily errands.",
    price: 59,
    image: "/products/hb-dua.jpg",
    icon: "handbag",
    tone: "#e4e8dd",
    colors: ["Black", "Olive", "Grey"],
    specs: ["One Size"],
    stockPerVariant: 18,
  },
  {
    id: "fw-zara",
    name: "Zara Block Heels",
    category: "Footwear",
    description:
      "Comfortable 2-inch block heels with a cushioned insole and ankle strap. Steady enough for all-day wear, pretty enough for dinner.",
    price: 69,
    icon: "footprints",
    tone: "#f2e7dc",
    colors: ["Nude", "Black"],
    specs: ["36", "37", "38", "39", "40", "41"],
    stockPerVariant: 12,
  },
  {
    id: "fw-amara",
    name: "Amara Ballet Flats",
    category: "Footwear",
    description:
      "Soft ballet flats with a flexible sole and bow detail. The pair you'll reach for every single morning.",
    price: 39,
    icon: "footprints",
    tone: "#eee9e4",
    colors: ["Beige", "Black", "White"],
    specs: ["36", "37", "38", "39", "40", "41"],
    stockPerVariant: 14,
  },
  {
    id: "fw-lena",
    name: "Lena Wedge Sandals",
    category: "Footwear",
    description:
      "Easy wedge sandals with a braided strap and non-slip sole. Summer comfort with a little lift.",
    price: 55,
    icon: "footprints",
    tone: "#e8ecdf",
    colors: ["Tan", "Black"],
    specs: ["36", "37", "38", "39", "40", "41"],
    stockPerVariant: 12,
  },
  {
    id: "fw-haya",
    name: "Haya Strappy Flats",
    category: "Footwear",
    description:
      "Lightweight strappy flats with a soft footbed. Breathable, bendable and kind to long days.",
    price: 35,
    icon: "footprints",
    tone: "#f3e3e3",
    colors: ["Brown", "Black", "Pink"],
    specs: ["36", "37", "38", "39", "40", "41"],
    stockPerVariant: 16,
  },
  {
    id: "wl-ivy",
    name: "Ivy Bifold Wallet",
    category: "Wallets",
    description:
      "A slim bifold wallet with 8 card slots, 2 currency compartments and an ID window. Everyday organization, beautifully simple.",
    price: 29,
    icon: "wallet",
    tone: "#ece4da",
    colors: ["Tan", "Black", "Rose"],
    specs: ["One Size"],
    stockPerVariant: 30,
  },
  {
    id: "wl-pearl",
    name: "Pearl Card Holder",
    category: "Wallets",
    description:
      "A minimal card holder for 6 cards plus folded notes. Slips into any bag — or any pocket.",
    price: 19,
    icon: "wallet",
    tone: "#f0ece6",
    colors: ["Ivory", "Beige", "Black"],
    specs: ["One Size"],
    stockPerVariant: 40,
  },
];

export const categories = ["All", "Handbags", "Footwear", "Wallets"] as const;

/** USD formatting: 49 -> "$49.00". */
export function money(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  return "$" + v.toFixed(2);
}

/** USD cents -> dollars string: 4900 -> "$49.00". */
export function moneyCents(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

export type ShippingZone = {
  zone: string;
  countries: string[];
  /** Flat rate in USD cents. */
  rateCents: number;
  /** Free shipping at or above this subtotal, in USD cents. */
  freeOverCents: number;
};

export type PaymentMethodConfig = {
  method: "COD" | "BANK_TRANSFER" | "JAZZCASH" | "EASYPAYSA" | "STRIPE" | "PAYPAL";
  enabled: boolean;
  /** Empty = worldwide (subject to the method's own rules, e.g. COD). */
  allowedCountries: string[];
};

/** Default zones — also seeded into StoreSettings on first seed. */
export const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  {
    zone: "USA",
    countries: ["United States"],
    rateCents: 695,
    freeOverCents: 7500,
  },
  {
    zone: "UK",
    countries: ["United Kingdom"],
    rateCents: 595,
    freeOverCents: 7500,
  },
  {
    zone: "Europe",
    countries: [
      "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
      "Austria", "Ireland", "Portugal", "Sweden", "Denmark", "Finland",
      "Norway", "Poland", "Greece", "Czech Republic", "Hungary",
      "Romania", "Switzerland",
    ],
    rateCents: 795,
    freeOverCents: 7500,
  },
  {
    zone: "Rest of World",
    countries: [],
    rateCents: 1295,
    freeOverCents: 15000,
  },
];

/** Default payment methods — also seeded into StoreSettings on first seed. */
export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { method: "COD", enabled: true, allowedCountries: ["Pakistan"] },
  { method: "BANK_TRANSFER", enabled: true, allowedCountries: [] },
  { method: "JAZZCASH", enabled: true, allowedCountries: ["Pakistan"] },
  { method: "EASYPAYSA", enabled: true, allowedCountries: ["Pakistan"] },
  { method: "STRIPE", enabled: false, allowedCountries: [] },
  { method: "PAYPAL", enabled: false, allowedCountries: [] },
];

/** Match a country to its shipping zone (case-insensitive). */
export function zoneForCountry(
  country: string,
  zones: ShippingZone[],
): ShippingZone | null {
  if (!zones.length) return null;
  const c = country.trim().toLowerCase();
  const direct = zones.find((z) =>
    z.countries.some((x) => x.toLowerCase() === c),
  );
  if (direct) return direct;
  return (
    zones.find((z) => z.zone.toLowerCase() === "rest of world") ??
    zones[zones.length - 1]
  );
}

/**
 * Delivery charge in USD for a subtotal, based on the customer's country.
 * Returns 0 when the zone's free-shipping threshold is met.
 */
export function shipping(
  subtotalUSD: number,
  country?: string,
  zones: ShippingZone[] = DEFAULT_SHIPPING_ZONES,
): number {
  const zone = zoneForCountry(country ?? "", zones) ?? zones[zones.length - 1];
  const subtotalCents = Math.round(subtotalUSD * 100);
  if (subtotalCents >= zone.freeOverCents) return 0;
  return zone.rateCents / 100;
}

/** Which payment methods may be offered at checkout for a country. */
export function availablePaymentMethods(
  country: string,
  configs: PaymentMethodConfig[],
  opts: { stripeConfigured: boolean; paypalConfigured: boolean },
): PaymentMethodConfig[] {
  const c = country.trim().toLowerCase();
  return configs.filter((m) => {
    if (!m.enabled) return false;
    if (m.allowedCountries.length > 0 &&
        !m.allowedCountries.some((x) => x.toLowerCase() === c))
      return false;
    // Stripe/PayPal need real API keys — never offer a fake integration.
    if (m.method === "STRIPE" && !opts.stripeConfigured) return false;
    if (m.method === "PAYPAL" && !opts.paypalConfigured) return false;
    return true;
  });
}

/** Methods the store lists but can't actually process yet (honest "coming soon"). */
export function comingSoonMethods(
  configs: PaymentMethodConfig[],
  opts: { stripeConfigured: boolean; paypalConfigured: boolean },
): PaymentMethodConfig[] {
  return configs.filter(
    (m) =>
      m.enabled &&
      ((m.method === "STRIPE" && !opts.stripeConfigured) ||
        (m.method === "PAYPAL" && !opts.paypalConfigured)),
  );
}

/** Stock badge for product cards: In Stock / Low Stock (<=5) / Out of Stock. */
export function stockBadge(available: number): string {
  if (available <= 0) return "Out of Stock";
  if (available <= 5) return "Low Stock";
  return "In Stock";
}

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  parentId?: string | null;
  children: CategoryNode[];
};

/** Build a nested category tree from a flat list (pure, testable). */
export function buildCategoryTree<
  T extends { id: string; parentId?: string | null },
>(flat: T[]): (T & { children: (T & { children: unknown[] })[] })[] {
  const byId = new Map<string, T & { children: unknown[] }>();
  for (const c of flat) byId.set(c.id, { ...c, children: [] });
  const roots: (T & { children: unknown[] })[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      (byId.get(c.parentId)!.children as unknown[]).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots as (T & { children: (T & { children: unknown[] })[] })[];
}

/** Breadcrumb path for a category: [root, ..., leaf]. */
export function categoryPath<
  T extends { id: string; name: string; parentId?: string | null },
>(flat: T[], leafId: string | null | undefined): T[] {
  if (!leafId) return [];
  const byId = new Map(flat.map((c) => [c.id, c]));
  const path: T[] = [];
  let cur = byId.get(leafId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/**
 * Pure exchange planner (testable without DB).
 * Returns the stock deltas + ledger entries an approved exchange produces:
 * the returned variant goes back up (+qty), the replacement goes down (-qty).
 */
export function planExchangeStock(
  fromOnHand: number,
  toOnHand: number,
  quantity: number,
): {
  ok: boolean;
  reason?: string;
  fromDelta: number;
  toDelta: number;
} {
  if (!Number.isInteger(quantity) || quantity < 1)
    return { ok: false, reason: "Invalid quantity", fromDelta: 0, toDelta: 0 };
  if (toOnHand < quantity)
    return {
      ok: false,
      reason: "Replacement variant is out of stock",
      fromDelta: 0,
      toDelta: 0,
    };
  return { ok: true, fromDelta: quantity, toDelta: -quantity };
}

/**
 * Pure review-eligibility check (testable without DB).
 * A user may review a product only with a DELIVERED order containing it,
 * and only once per product.
 */
export function reviewEligibility(
  deliveredProductIds: string[],
  productId: string,
  alreadyReviewed: boolean,
): { ok: boolean; reason?: string } {
  if (alreadyReviewed)
    return { ok: false, reason: "You have already reviewed this product." };
  if (!deliveredProductIds.includes(productId))
    return {
      ok: false,
      reason: "Only verified buyers can review — this product isn't in any of your delivered orders.",
    };
  return { ok: true };
}

/** Presentation lookup for DB-backed variants. */
export function presentationFor(productId: string) {
  const p = catalog.find((c) => c.id === productId);
  return { icon: p?.icon ?? "handbag", tone: p?.tone ?? "#e5e7eb", image: p?.image };
}
