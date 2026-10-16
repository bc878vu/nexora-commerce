import { z } from "zod";
export const adjustment = z.object({
  sku: z.string().min(1).max(100),
  delta: z
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((v) => v !== 0),
  reason: z.enum([
    "PURCHASE_ORDER_RESTOCK",
    "MANUAL_AUDIT",
    "DAMAGED_WRITE_OFF",
  ]),
  note: z.string().max(300).optional(),
});
export const checkout = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(200),
    address: z.string().trim().min(10).max(500),
    items: z
      .array(
        z.object({
          id: z.string().max(100),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.id)).size === v.items.length,
    "Duplicate items",
  );
