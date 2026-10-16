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

/** Pakistani mobile: 03XXXXXXXXX */
export const phone = z
  .string()
  .trim()
  .regex(/^03\d{9}$/, "Enter a valid 11-digit mobile number (03XXXXXXXXX)");

export const checkout = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(200),
    phone,
    street: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().max(20).optional().default(""),
    paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),
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

export const signup = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const login = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(72),
});

export const addressInput = z.object({
  label: z.string().trim().min(1).max(50).default("Home"),
  street: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).default(""),
  country: z.string().trim().max(50).default("Pakistan"),
  isDefault: z.boolean().optional().default(false),
});

export const productInput = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(2000),
  basePrice: z.number().positive().max(10000000),
});

export const variantInput = z.object({
  color: z.string().trim().min(1).max(60),
  spec: z.string().trim().min(1).max(60),
  unitCost: z.number().min(0).max(10000000),
  retailPrice: z.number().positive().max(10000000),
  onHandStock: z.number().int().min(0).max(1000000),
  reorderPoint: z.number().int().min(0).max(1000000).default(10),
});

export const orderStatusUpdate = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export const profileUpdate = z.object({
  name: z.string().trim().min(2).max(100),
});

export const passwordChange = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
});
