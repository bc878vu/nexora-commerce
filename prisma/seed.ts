/**
 * Nexora Commerce seed — Velora Vogue catalogue (women's handbags & footwear).
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
  { name: "Aurelia Tote", category: "Handbags", description: HANDBAG_DESC.aurelia, basePrice: 4850,
    variants: variants(BAG_COLORS, ["One Size"], 4850, 2600, 30) },
  { name: "Mira Crossbody", category: "Handbags", description: HANDBAG_DESC.mira, basePrice: 3290,
    variants: variants(BAG_COLORS, ["One Size"], 3290, 1750, 40) },
  { name: "Sofia Shoulder Bag", category: "Handbags", description: HANDBAG_DESC.sofia, basePrice: 5450,
    variants: variants(BAG_COLORS, ["One Size"], 5450, 2950, 25) },
  { name: "Elena Clutch", category: "Handbags", description: HANDBAG_DESC.elena, basePrice: 2990,
    variants: variants(["Black", "Gold", "Silver"], ["One Size"], 2990, 1600, 35) },
  { name: "Noor Satchel", category: "Handbags", description: HANDBAG_DESC.noor, basePrice: 4250,
    variants: variants(BAG_COLORS, ["One Size"], 4250, 2300, 30) },
  { name: "Dua Mini Backpack", category: "Handbags", description: HANDBAG_DESC.dua, basePrice: 3950,
    variants: variants(["Black", "Tan", "Beige"], ["One Size"], 3950, 2100, 30) },
  { name: "Zara Block Heels", category: "Footwear", description: SHOES_DESC.zara, basePrice: 3850,
    variants: variants(SHOE_COLORS, ["36", "37", "38", "39", "40", "41"], 3850, 2000, 12) },
  { name: "Amara Flats", category: "Footwear", description: SHOES_DESC.amara, basePrice: 2450,
    variants: variants(SHOE_COLORS, ["36", "37", "38", "39", "40", "41"], 2450, 1250, 15) },
  { name: "Lena Wedges", category: "Footwear", description: SHOES_DESC.lena, basePrice: 3150,
    variants: variants(["Black", "Tan", "Nude"], ["36", "37", "38", "39", "40", "41"], 3150, 1650, 12) },
  { name: "Haya Sandals", category: "Footwear", description: SHOES_DESC.haya, basePrice: 2150,
    variants: variants(["Black", "White", "Tan"], ["36", "37", "38", "39", "40", "41"], 2150, 1100, 18) },
  { name: "Ivy Long Wallet", category: "Wallets", description: WALLET_DESC.ivy, basePrice: 1850,
    variants: variants(WALLET_COLORS, ["One Size"], 1850, 950, 45) },
  { name: "Pearl Card Holder", category: "Wallets", description: WALLET_DESC.pearl, basePrice: 950,
    variants: variants(WALLET_COLORS, ["One Size"], 950, 480, 60) },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`Seed skipped: ${count} products already exist (idempotent).`);
    return;
  }

  for (const p of PRODUCTS) {
    const prefix = p.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const code = slugify(p.name).slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        category: p.category,
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
