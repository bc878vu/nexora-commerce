export const catalog = [
  {
    id: "audio-01",
    name: "Studio Wireless",
    category: "Audio",
    description:
      "Immersive sound. A quieter world. Over-ear wireless headphones with soft cushions and a folding design.",
    price: 18900,
    stock: 24,
    color: "Graphite",
    icon: "headphones",
    sku: "AUD-STUDIO-GRAPHITE",
    tone: "#ece9e4",
  },
  {
    id: "audio-02",
    name: "Pocket Sound",
    category: "Audio",
    description:
      "A compact portable speaker for your desk, weekend and everything between.",
    price: 8500,
    stock: 18,
    color: "Sand",
    icon: "speaker",
    sku: "AUD-POCKET-SAND",
    tone: "#eae4db",
  },
  {
    id: "wear-01",
    name: "Everyday Watch",
    category: "Wearables",
    description:
      "A clean everyday timepiece with a comfortable strap and a bright digital display.",
    price: 14500,
    stock: 12,
    color: "Midnight",
    icon: "watch",
    sku: "WEAR-EVERYDAY-MIDNIGHT",
    tone: "#e3e8e2",
  },
  {
    id: "desk-01",
    name: "Focus Keyboard",
    category: "Workspace",
    description:
      "A thoughtfully arranged wireless keyboard for a calmer, more comfortable workspace.",
    price: 12500,
    stock: 9,
    color: "Cloud",
    icon: "keyboard",
    sku: "DESK-FOCUS-CLOUD",
    tone: "#e5e7ec",
  },
  {
    id: "desk-02",
    name: "Arc Desk Light",
    category: "Workspace",
    description:
      "Warm, adjustable light with a sculptural silhouette for your evening routine.",
    price: 6900,
    stock: 16,
    color: "Sage",
    icon: "lamp",
    sku: "DESK-ARC-SAGE",
    tone: "#e1e7dd",
  },
  {
    id: "tech-01",
    name: "Travel Power",
    category: "Accessories",
    description:
      "A compact charging companion for your daily commute and weekend adventures.",
    price: 4900,
    stock: 30,
    color: "Stone",
    icon: "battery",
    sku: "TECH-POWER-STONE",
    tone: "#ece2dd",
  },
];
export type CatalogItem = (typeof catalog)[number];
export const money = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
export const shipping = (subtotal: number) => (subtotal >= 20000 ? 0 : 250);
