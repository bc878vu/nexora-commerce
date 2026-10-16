import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { z } from "zod";
import { generateVariantMatrix } from "@/lib/sku-generator";

const matrixInput = z.object({
  categoryPrefix: z.string().trim().min(1).max(10),
  productCode: z.string().trim().min(1).max(20),
  colors: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
  specs: z.array(z.string().trim().min(1).max(60)).min(1).max(50),
  unitCost: z.number().min(0).max(10000000),
  retailPrice: z.number().positive().max(10000000),
  initialStock: z.number().int().min(0).max(1000000),
  reorderPoint: z.number().int().min(0).max(1000000).default(10),
});

/** Preview the cartesian SKU matrix before creating variants. Admin only. */
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = matrixInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Check matrix fields." }, { status: 400 });
  try {
    const m = parsed.data;
    const matrix = generateVariantMatrix(
      m.categoryPrefix,
      m.productCode,
      m.colors,
      m.specs,
      m.unitCost,
      m.retailPrice,
      m.initialStock,
      m.reorderPoint,
    );
    return NextResponse.json({ count: matrix.length, matrix });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Matrix failed." },
      { status: 400 },
    );
  }
}
