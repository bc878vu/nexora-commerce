import { createHash } from "node:crypto";
import { SkuAttributes } from "@/types/inventory";
export function buildSkuCode(
  categoryPrefix: string,
  productCode: string,
  attributes: SkuAttributes,
): string {
  const values = [
    categoryPrefix,
    productCode,
    attributes.color,
    attributes.spec,
  ].map((v) => v.trim());
  if (values.some((v) => !v)) throw new Error("SKU fields cannot be empty");
  const clean = (v: string) =>
    v
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "OPT";
  const suffix = createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return values.map(clean).join("-") + "-" + suffix;
}
export function generateVariantMatrix(
  categoryPrefix: string,
  productCode: string,
  colors: string[],
  specs: string[],
  baseCost: number,
  basePrice: number,
  initialStock: number,
  reorderPoint: number,
  warehousePrefix = "WH-A",
) {
  if (
    !Number.isFinite(baseCost) ||
    baseCost < 0 ||
    !Number.isFinite(basePrice) ||
    basePrice < 0 ||
    !Number.isSafeInteger(initialStock) ||
    initialStock < 0 ||
    !Number.isSafeInteger(reorderPoint) ||
    reorderPoint < 0
  )
    throw new Error("Invalid price or stock");
  if (!colors.length || !specs.length || colors.length * specs.length > 1000)
    throw new Error("Select between 1 and 1000 variants");
  const matrix = [];
  let idx = 1;
  const seen = new Set<string>();
  for (const color of colors)
    for (const spec of specs) {
      const sku = buildSkuCode(categoryPrefix, productCode, { color, spec });
      if (seen.has(sku)) throw new Error("Duplicate variant");
      seen.add(sku);
      matrix.push({
        sku,
        attributes: { color, spec },
        unitCost: baseCost,
        retailPrice: basePrice,
        onHandStock: initialStock,
        reservedStock: 0,
        reorderPoint,
        warehouseBin: `${warehousePrefix}-${String(idx++).padStart(2, "0")}`,
      });
    }
  return matrix;
}
