import { PrismaClient } from "@prisma/client";
import { catalog } from "../src/lib/catalog";
const db = new PrismaClient();
async function main() {
  for (const p of catalog) {
    await db.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        slug: p.id,
        category: p.category,
        description: p.description,
        basePrice: p.price,
        variants: {
          create: {
            id: p.id,
            sku: p.sku,
            attributes: { color: p.color, spec: "Standard" },
            unitCost: Math.round(p.price * 0.6),
            retailPrice: p.price,
            onHandStock: p.stock,
            ledgerEntries: {
              create: {
                delta: p.stock,
                balanceAfter: p.stock,
                reason: "INITIAL_SEED",
                actorName: "Seed",
              },
            },
          },
        },
      },
    });
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
