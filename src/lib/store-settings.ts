import { prisma } from "@/lib/db";
import {
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SHIPPING_ZONES,
  type PaymentMethodConfig,
  type ShippingZone,
} from "@/lib/catalog";

export type StoreSettingsData = {
  jazzcashNumber: string;
  easypaisaNumber: string;
  bankName: string;
  bankAccount: string;
  bankIban: string;
  stripePublishableKey: string;
  /** Server-side only — never sent to the browser. */
  stripeSecretKey: string;
  paypalClientId: string;
  /** Server-side only — never sent to the browser. */
  paypalSecret: string;
  whatsappNumber: string;
  announcement: string;
  paymentMethods: PaymentMethodConfig[];
  shippingZones: ShippingZone[];
};

/** Public-safe subset shown at checkout (no secret keys). */
export type PublicSettings = {
  jazzcashNumber: string;
  easypaisaNumber: string;
  bankName: string;
  bankAccount: string;
  bankIban: string;
  stripePublishableKey: string;
  paypalClientId: string;
  whatsappNumber: string;
  announcement: string;
  paymentMethods: PaymentMethodConfig[];
  shippingZones: ShippingZone[];
  stripeConfigured: boolean;
  paypalConfigured: boolean;
  demo: boolean;
};

function asArray<T>(v: unknown, fallback: T[]): T[] {
  return Array.isArray(v) && v.length ? (v as T[]) : fallback;
}

export async function getStoreSettings(): Promise<StoreSettingsData | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const s = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });
    if (!s) return null;
    return {
      jazzcashNumber: s.jazzcashNumber,
      easypaisaNumber: s.easypaisaNumber,
      bankName: s.bankName,
      bankAccount: s.bankAccount,
      bankIban: s.bankIban,
      stripePublishableKey: s.stripePublishableKey,
      stripeSecretKey: s.stripeSecretKey,
      paypalClientId: s.paypalClientId,
      paypalSecret: s.paypalSecret,
      whatsappNumber: s.whatsappNumber,
      announcement: s.announcement,
      paymentMethods: asArray<PaymentMethodConfig>(
        s.paymentMethods,
        DEFAULT_PAYMENT_METHODS,
      ),
      shippingZones: asArray<ShippingZone>(s.shippingZones, DEFAULT_SHIPPING_ZONES),
    };
  } catch {
    return null;
  }
}

/** Demo-mode defaults when the database isn't connected. */
export function demoSettings(): PublicSettings {
  return {
    jazzcashNumber: "",
    easypaisaNumber: "",
    bankName: "",
    bankAccount: "",
    bankIban: "",
    stripePublishableKey: "",
    paypalClientId: "",
    whatsappNumber: "",
    announcement: "Free worldwide shipping on orders over $75",
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    shippingZones: DEFAULT_SHIPPING_ZONES,
    stripeConfigured: false,
    paypalConfigured: false,
    demo: true,
  };
}

export function toPublic(s: StoreSettingsData | null): PublicSettings {
  if (!s) return demoSettings();
  return {
    jazzcashNumber: s.jazzcashNumber,
    easypaisaNumber: s.easypaisaNumber,
    bankName: s.bankName,
    bankAccount: s.bankAccount,
    bankIban: s.bankIban,
    stripePublishableKey: s.stripePublishableKey,
    paypalClientId: s.paypalClientId,
    whatsappNumber: s.whatsappNumber,
    announcement: s.announcement,
    paymentMethods: s.paymentMethods,
    shippingZones: s.shippingZones,
    stripeConfigured: s.stripeSecretKey.trim().length > 0,
    paypalConfigured:
      s.paypalClientId.trim().length > 0 && s.paypalSecret.trim().length > 0,
    demo: false,
  };
}
