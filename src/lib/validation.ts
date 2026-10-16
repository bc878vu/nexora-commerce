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

/** International phone: digits with optional +, spaces, dashes, parentheses. */
export const intlPhone = z
  .string()
  .trim()
  .regex(
    /^\+?[0-9][0-9\s\-.()]{5,18}[0-9]$/,
    "Enter a valid phone number",
  );

export const checkout = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(200),
    phone: intlPhone,
    street: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().max(20).optional().default(""),
    country: z.string().trim().min(2).max(100).default("United States"),
    paymentMethod: z.enum([
      "COD",
      "BANK_TRANSFER",
      "JAZZCASH",
      "EASYPAYSA",
      "STRIPE",
      "PAYPAL",
    ]),
    /** Customer's transaction/reference ID for manual payment methods. */
    paymentRef: z.string().trim().max(100).optional().default(""),
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
  categoryId: z.string().max(100).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
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

/* ---------- Second wave: categories, claims, refunds, exchanges, settings, reviews ---------- */

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
    .max(80)
    .optional(),
  image: z.string().trim().max(500).optional().default(""),
  parentId: z.string().max(100).nullable().optional(),
});

export const productStatusUpdate = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]),
});

export const claimInput = z.object({
  orderId: z.string().min(1).max(100),
  type: z.enum([
    "DAMAGED",
    "WRONG_ITEM",
    "NOT_RECEIVED",
    "QUALITY_ISSUE",
    "OTHER",
  ]),
  description: z.string().trim().min(10).max(2000),
});

export const claimStatusUpdate = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "APPROVED", "REJECTED", "RESOLVED"]),
  resolutionNote: z.string().trim().max(2000).optional().default(""),
});

export const refundInput = z.object({
  orderId: z.string().min(1).max(100),
  claimId: z.string().max(100).nullable().optional(),
  /** USD cents — must not exceed the order total. Checked server-side. */
  amountInt: z.number().int().min(1).max(100000000),
  reason: z.string().trim().min(5).max(1000),
  method: z.enum(["BANK_TRANSFER", "JAZZCASH", "EASYPAYSA", "STRIPE", "PAYPAL"]),
  accountDetail: z.string().trim().min(5).max(500),
});

export const refundStatusUpdate = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"]),
});

export const exchangeInput = z.object({
  orderId: z.string().min(1).max(100),
  /** OrderItem id — identifies which purchased variant is being returned. */
  orderItemId: z.string().min(1).max(100),
  /** Variant id of the replacement — must be in stock. Checked server-side. */
  toVariantId: z.string().min(1).max(100),
  reason: z.string().trim().min(5).max(1000),
});

export const exchangeStatusUpdate = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"]),
});

export const orderAdminUpdate = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  paymentVerified: z.boolean().optional(),
});

const paymentMethodConfig = z.object({
  method: z.enum([
    "COD",
    "BANK_TRANSFER",
    "JAZZCASH",
    "EASYPAYSA",
    "STRIPE",
    "PAYPAL",
  ]),
  enabled: z.boolean(),
  /** Empty = worldwide (subject to the method's own rules, e.g. COD). */
  allowedCountries: z.array(z.string().trim().min(2).max(100)).max(250),
});

const shippingZoneConfig = z.object({
  zone: z.string().trim().min(2).max(60),
  countries: z.array(z.string().trim().min(2).max(100)).max(250),
  /** Flat rate in USD cents. */
  rateCents: z.number().int().min(0).max(1000000),
  /** Free shipping at or above this subtotal, in USD cents. */
  freeOverCents: z.number().int().min(0).max(100000000),
});

export const settingsInput = z.object({
  jazzcashNumber: z.string().trim().max(30).default(""),
  easypaisaNumber: z.string().trim().max(30).default(""),
  bankName: z.string().trim().max(100).default(""),
  bankAccount: z.string().trim().max(100).default(""),
  bankIban: z.string().trim().max(100).default(""),
  stripePublishableKey: z.string().trim().max(200).default(""),
  stripeSecretKey: z.string().trim().max(200).default(""),
  paypalClientId: z.string().trim().max(200).default(""),
  paypalSecret: z.string().trim().max(200).default(""),
  whatsappNumber: z.string().trim().max(30).default(""),
  announcement: z.string().trim().max(200).default("Free worldwide shipping on orders over $75"),
  paymentMethods: z.array(paymentMethodConfig).max(10).default([]),
  shippingZones: z.array(shippingZoneConfig).max(20).default([]),
});

export const reviewInput = z.object({
  productId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  comment: z.string().trim().min(10).max(2000),
});

export const reviewUpdate = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  comment: z.string().trim().min(10).max(2000).optional(),
});
