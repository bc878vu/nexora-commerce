/**
 * Nexora Commerce seed — Velora Vogue catalogue (women's handbags & footwear).
 * Worldwide market (USA / UK / Europe focus). All prices in USD.
 *
 * Usage (requires DATABASE_URL):
 *   npm run db:seed
 *
 * ADMIN CREATION: set ADMIN_EMAIL + ADMIN_PASSWORD env vars and the first user
 * is created with the ADMIN role. Never commit real credentials.
 */
import { PrismaClient, StockChangeReason } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { buildSkuCode } from "../src/lib/sku-generator";
import {
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SHIPPING_ZONES,
} from "../src/lib/catalog";

const prisma = new PrismaClient();

type SeedVariant = {
  color: string;
  spec: string;
  retailPrice: number;
  unitCost: number;
  onHandStock: number;
  reorderPoint: number;
};

type SeedProduct = {
  name: string;
  category: string;
  /** Subcategory slug, e.g. "totes". */
  subcategory: string;
  description: string;
  basePrice: number;
  variants: SeedVariant[];
};

function v(
  color: string,
  spec: string,
  retailPrice: number,
  unitCost: number,
  onHandStock: number,
  reorderPoint = 10,
): SeedVariant {
  return { color, spec, retailPrice, unitCost, onHandStock, reorderPoint };
}

function variants(
  colors: string[],
  specs: string[],
  retailPrice: number,
  unitCost: number,
  stock: number,
): SeedVariant[] {
  return colors.flatMap((color) => specs.map((spec) => v(color, spec, retailPrice, unitCost, stock)));
}

const HANDBAG_DESC = {
  aurelia:
    "Structured tote in grained vegan leather with a padded top handle and a detachable crossbody strap. Fits a 13-inch laptop, wallet, and daily essentials. Magnetic flap closure with a zipped interior pocket.",
  mira: "Everyday crossbody with an adjustable strap and a secure zip pocket. Roomy enough for phone, wallet, and keys — light enough to carry all day.",
  sofia:
    "Elegant shoulder bag with a sculpted silhouette and gold-tone hardware. Lined interior with slip pockets; a polished choice for office and evenings.",
  elena:
    "Compact evening clutch with a chain strap you can tuck inside for a true clutch look. Soft satin lining and room for phone, cards, and lipstick.",
  noor: "Classic satchel with twin top handles, a detachable shoulder strap, and a structured base that stands upright. Made for daily wear.",
  dua: "Mini backpack in soft-touch vegan leather with padded straps and a drawstring top. Fits a small tablet, wallet, and cosmetics.",
};

const SHOES_DESC = {
  zara: "Block-heel pumps in smooth vegan leather with a cushioned insole. A 5cm heel height designed for all-day comfort, from office to dinner.",
  amara: "Soft ballet flats with an elastic topline and a flexible sole. Lightweight and easy to slip on — a wardrobe essential.",
  lena: "Wedge sandals with a woven strap and ankle tie. A 4cm wedge gives lift without the pinch of a heel.",
  haya: "Everyday strappy sandals with a padded footbed. Water-friendly finish for daily wear.",
};

const WALLET_DESC = {
  ivy: "Long wallet with 12 card slots, two cash compartments, and a zipped coin pocket. RFID-safe lining.",
  pearl: "Slim card holder in grained vegan leather — six card slots and a centre pocket for folded notes.",
};

const BAG_COLORS = ["Black", "Tan", "Beige", "Olive"];
const SHOE_COLORS = ["Black", "Nude", "Tan", "White"];
const WALLET_COLORS = ["Black", "Tan", "Blush"];

const PRODUCTS: SeedProduct[] = [
  { name: "Aurelia Tote", category: "Handbags", subcategory: "totes", description: HANDBAG_DESC.aurelia, basePrice: 79,
    variants: variants(BAG_COLORS, ["One Size"], 79, 42, 30) },
  { name: "Mira Crossbody", category: "Handbags", subcategory: "shoulder-bags", description: HANDBAG_DESC.mira, basePrice: 49,
    variants: variants(BAG_COLORS, ["One Size"], 49, 26, 40) },
  { name: "Sofia Shoulder Bag", category: "Handbags", subcategory: "shoulder-bags", description: HANDBAG_DESC.sofia, basePrice: 89,
    variants: variants(BAG_COLORS, ["One Size"], 89, 48, 25) },
  { name: "Elena Clutch", category: "Handbags", subcategory: "clutches", description: HANDBAG_DESC.elena, basePrice: 45,
    variants: variants(["Black", "Gold", "Silver"], ["One Size"], 45, 24, 35) },
  { name: "Noor Satchel", category: "Handbags", subcategory: "shoulder-bags", description: HANDBAG_DESC.noor, basePrice: 65,
    variants: variants(BAG_COLORS, ["One Size"], 65, 35, 30) },
  { name: "Dua Mini Backpack", category: "Handbags", subcategory: "totes", description: HANDBAG_DESC.dua, basePrice: 59,
    variants: variants(["Black", "Tan", "Beige"], ["One Size"], 59, 32, 30) },
  { name: "Zara Block Heels", category: "Footwear", subcategory: "heels", description: SHOES_DESC.zara, basePrice: 69,
    variants: variants(SHOE_COLORS, ["36", "37", "38", "39", "40", "41"], 69, 37, 12) },
  { name: "Amara Flats", category: "Footwear", subcategory: "flats", description: SHOES_DESC.amara, basePrice: 39,
    variants: variants(SHOE_COLORS, ["36", "37", "38", "39", "40", "41"], 39, 21, 15) },
  { name: "Lena Wedges", category: "Footwear", subcategory: "sandals", description: SHOES_DESC.lena, basePrice: 55,
    variants: variants(["Black", "Tan", "Nude"], ["36", "37", "38", "39", "40", "41"], 55, 30, 12) },
  { name: "Haya Sandals", category: "Footwear", subcategory: "sandals", description: SHOES_DESC.haya, basePrice: 35,
    variants: variants(["Black", "White", "Tan"], ["36", "37", "38", "39", "40", "41"], 35, 19, 18) },
  { name: "Ivy Long Wallet", category: "Wallets", subcategory: "long-wallets", description: WALLET_DESC.ivy, basePrice: 29,
    variants: variants(WALLET_COLORS, ["One Size"], 29, 16, 45) },
  { name: "Pearl Card Holder", category: "Wallets", subcategory: "mini-wallets", description: WALLET_DESC.pearl, basePrice: 19,
    variants: variants(WALLET_COLORS, ["One Size"], 19, 10, 60) },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Category hierarchy seeded once (idempotent via slug upsert). */
const CATEGORIES: { name: string; slug: string; children: { name: string; slug: string }[] }[] = [
  {
    name: "Handbags",
    slug: "handbags",
    children: [
      { name: "Totes", slug: "totes" },
      { name: "Shoulder Bags", slug: "shoulder-bags" },
      { name: "Clutches", slug: "clutches" },
    ],
  },
  {
    name: "Footwear",
    slug: "footwear",
    children: [
      { name: "Heels", slug: "heels" },
      { name: "Flats", slug: "flats" },
      { name: "Sandals", slug: "sandals" },
    ],
  },
  {
    name: "Wallets",
    slug: "wallets",
    children: [
      { name: "Long Wallets", slug: "long-wallets" },
      { name: "Mini Wallets", slug: "mini-wallets" },
    ],
  },
];

async function seedCategories() {
  const slugToId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, parentId: null },
      create: { name: c.name, slug: c.slug },
    });
    slugToId.set(c.slug, parent.id);
    for (const ch of c.children) {
      const child = await prisma.category.upsert({
        where: { slug: ch.slug },
        update: { name: ch.name, parentId: parent.id },
        create: { name: ch.name, slug: ch.slug, parentId: parent.id },
      });
      slugToId.set(ch.slug, child.id);
    }
  }
  console.log(`Seeded categories: ${slugToId.size}`);
  return slugToId;
}

async function seedSettings() {
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      shippingZones: DEFAULT_SHIPPING_ZONES,
    },
  });
  console.log("Store settings ensured (edit payment details in Admin → Settings).");
}

async function main() {
  await seedCategories();
  await seedSettings();

  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`Seed skipped: ${count} products already exist (idempotent).`);
    return;
  }

  const slugToId = new Map<string, string>();
  for (const c of await prisma.category.findMany()) slugToId.set(c.slug, c.id);

  for (const p of PRODUCTS) {
    const prefix = p.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const code = slugify(p.name).slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        category: p.category,
        categoryId: slugToId.get(p.subcategory) ?? null,
        description: p.description,
        basePrice: p.basePrice,
      },
    });
    for (const variant of p.variants) {
      const sku = buildSkuCode(prefix, code || "GEN", {
        color: variant.color,
        spec: variant.spec,
      });
      const created = await prisma.productVariant.create({
        data: {
          sku,
          productId: product.id,
          attributes: { color: variant.color, spec: variant.spec },
          unitCost: variant.unitCost,
          retailPrice: variant.retailPrice,
          onHandStock: variant.onHandStock,
          reorderPoint: variant.reorderPoint,
          warehouseBin: `A-${prefix}`,
        },
      });
      await prisma.stockLedger.create({
        data: {
          variantId: created.id,
          delta: variant.onHandStock,
          balanceAfter: variant.onHandStock,
          reason: StockChangeReason.INITIAL_SEED,
          note: "Initial seed stock",
          actorName: "System",
        },
      });
    }
    console.log(`Seeded: ${p.name} (${p.variants.length} variants)`);
  }

  // Optional first admin (env-gated, never hard-coded)
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!exists) {
      await prisma.user.create({
        data: {
          name: "Store Admin",
          email: adminEmail,
          role: "ADMIN",
          passwordHash: await hashPassword(adminPassword),
        },
      });
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log("Admin user already exists, skipped.");
    }
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — admin creation skipped.");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
