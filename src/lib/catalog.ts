/**
 * Nexora Commerce — Velora Vogue collection.
 * Women's handbags & footwear, priced in PKR for Pakistan.
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
  price: number;
  icon: "handbag" | "footprints" | "wallet";
  tone: string;
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
    price: 4850,
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
    price: 3290,
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
    price: 5450,
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
    price: 2990,
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
    price: 4250,
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
    price: 3950,
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
    price: 3850,
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
    price: 2450,
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
    price: 3150,
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
    price: 2150,
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
    price: 1850,
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
    price: 950,
    icon: "wallet",
    tone: "#f0ece6",
    colors: ["Ivory", "Beige", "Black"],
    specs: ["One Size"],
    stockPerVariant: 40,
  },
];

export const categories = ["All", "Handbags", "Footwear", "Wallets"] as const;

export function money(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  return "Rs " + Math.round(v).toLocaleString("en-PK");
}

/** Flat Rs 250 delivery, free on orders of Rs 5,000+. */
export function shipping(subtotal: number): number {
  return subtotal >= 5000 ? 0 : 250;
}

/** Presentation lookup for DB-backed variants. */
export function presentationFor(productId: string) {
  const p = catalog.find((c) => c.id === productId);
  return { icon: p?.icon ?? "handbag", tone: p?.tone ?? "#e5e7eb" };
}
