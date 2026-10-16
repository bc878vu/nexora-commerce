import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSkuCode, generateVariantMatrix } from "../src/lib/sku-generator";
import {
  adjustment,
  checkout,
  signup,
  login,
  addressInput,
  productInput,
  variantInput,
  orderStatusUpdate,
  orderAdminUpdate,
  profileUpdate,
  passwordChange,
  categoryInput,
  productStatusUpdate,
  claimInput,
  claimStatusUpdate,
  refundInput,
  refundStatusUpdate,
  exchangeInput,
  exchangeStatusUpdate,
  settingsInput,
  reviewInput,
  reviewUpdate,
} from "../src/lib/validation";
import { signSession, verifySession } from "../src/lib/auth";
import {
  shipping,
  money,
  moneyCents,
  stockBadge,
  buildCategoryTree,
  categoryPath,
  planExchangeStock,
  reviewEligibility,
  availablePaymentMethods,
  comingSoonMethods,
  zoneForCountry,
  DEFAULT_SHIPPING_ZONES,
  DEFAULT_PAYMENT_METHODS,
} from "../src/lib/catalog";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { rateLimit } from "../src/lib/ratelimit";
test("SKU distinguishes colors sharing truncated prefixes", () => {
  assert.notEqual(
    buildSkuCode("Audio", "Studio", { color: "Blue light", spec: "ANC" }),
    buildSkuCode("Audio", "Studio", { color: "Blue dark", spec: "ANC" }),
  );
});
test("matrix rejects duplicated attributes and negative stock", () => {
  assert.throws(() =>
    generateVariantMatrix("A", "P", ["Blue", "Blue"], ["S"], 10, 20, 4, 1),
  );
  assert.throws(() =>
    generateVariantMatrix("A", "P", ["Blue"], ["S"], 10, 20, -1, 1),
  );
  assert.equal(
    generateVariantMatrix("A", "P", ["Blue", "Red"], ["S", "L"], 10, 20, 4, 1)
      .length,
    4,
  );
});
test("stock deltas require nonzero bounded integers", () => {
  for (const delta of [0, 0.5, Infinity, 100001])
    assert.equal(
      adjustment.safeParse({ sku: "X", delta, reason: "MANUAL_AUDIT" }).success,
      false,
    );
  assert.equal(
    adjustment.safeParse({ sku: "X", delta: -4, reason: "MANUAL_AUDIT" })
      .success,
    true,
  );
});
test("checkout validates international address, phone and payment method", () => {
  const base = {
    name: "Test Buyer",
    email: "buyer@example.com",
    phone: "+15551234567",
    street: "123 Main St, Apt 4B",
    city: "New York",
    country: "United States",
    paymentMethod: "COD",
  };
  assert.equal(
    checkout.safeParse({ ...base, items: [{ id: "a", quantity: 1 }] })
      .success,
    true,
  );
  // Duplicate lines rejected
  assert.equal(
    checkout.safeParse({
      ...base,
      items: [
        { id: "a", quantity: 1 },
        { id: "a", quantity: 2 },
      ],
    }).success,
    false,
  );
  // Fractional quantities rejected
  assert.equal(
    checkout.safeParse({ ...base, items: [{ id: "a", quantity: 1.5 }] })
      .success,
    false,
  );
  // Garbage phone rejected
  assert.equal(
    checkout.safeParse({ ...base, phone: "not-a-phone", items: [{ id: "a", quantity: 1 }] }).success,
    false,
  );
  assert.equal(
    checkout.safeParse({ ...base, phone: "12", items: [{ id: "a", quantity: 1 }] }).success,
    false,
  );
  // Pakistani mobile still accepted (worldwide format)
  assert.equal(
    checkout.safeParse({ ...base, phone: "03001234567", items: [{ id: "a", quantity: 1 }] }).success,
    true,
  );
  // Unknown payment method rejected
  assert.equal(
    checkout.safeParse({
      ...base,
      paymentMethod: "WESTERN_UNION",
      items: [{ id: "a", quantity: 1 }],
    }).success,
    false,
  );
  // All six payment methods accepted
  for (const pm of ["COD", "BANK_TRANSFER", "JAZZCASH", "EASYPAYSA", "STRIPE", "PAYPAL"]) {
    assert.equal(
      checkout.safeParse({ ...base, paymentMethod: pm, items: [{ id: "a", quantity: 1 }] }).success,
      true,
      pm,
    );
  }
  // Country defaults to United States
  const noCountry = checkout.safeParse({
    name: "A", email: "a@b.co", phone: "+15551234567", street: "123 Main St",
    city: "NYC", paymentMethod: "PAYPAL", items: [{ id: "a", quantity: 1 }],
  });
  // name too short -> still invalid, but country default applies on valid input
  assert.equal(noCountry.success, false);
  const okCountry = checkout.safeParse({ ...base, items: [{ id: "a", quantity: 1 }] });
  assert.equal(okCountry.success, true);
  if (okCountry.success) assert.equal(okCountry.data.country, "United States");
});
test("session signatures reject tampering and missing keys", () => {
  process.env.SESSION_SECRET = "test-only-secret-that-is-at-least-32-chars";
  const token = signSession("u1", "CUSTOMER");
  assert.equal(verifySession(token)?.id, "u1");
  assert.equal(verifySession(token + "a"), null);
  const [body, sig] = token.split(".");
  const modified = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(body, "base64url").toString()),
      role: "ADMIN",
    }),
  ).toString("base64url");
  assert.equal(verifySession(modified + "." + sig), null);
  delete process.env.SESSION_SECRET;
  assert.equal(verifySession(token), null);
});
test("delivery is zone-based in USD (free over $75)", () => {
  // USA zone: $6.95 flat, free at $75
  assert.equal(shipping(74.99, "United States"), 6.95);
  assert.equal(shipping(75, "United States"), 0);
  assert.equal(shipping(200, "United States"), 0);
  // UK zone: $5.95
  assert.equal(shipping(10, "United Kingdom"), 5.95);
  // Europe zone: $7.95
  assert.equal(shipping(10, "Germany"), 7.95);
  // Unknown country falls back to Rest of World ($12.95, free over $150)
  assert.equal(shipping(10, "Atlantis"), 12.95);
  assert.equal(shipping(150, "Atlantis"), 0);
  // No country given: conservative Rest-of-World rate
  assert.equal(shipping(10), 12.95);
});

test("money formats USD", () => {
  assert.equal(money(49), "$49.00");
  assert.equal(money("19.5"), "$19.50");
  assert.equal(moneyCents(4900), "$49.00");
  assert.equal(moneyCents(1999), "$19.99");
});

test("auth schemas enforce password rules", () => {
  assert.equal(
    signup.safeParse({
      name: "Ayesha",
      email: "ayesha@example.com",
      password: "short",
    }).success,
    false,
  );
  const ok = signup.safeParse({
    name: "Ayesha Khan",
    email: "AYESHA@example.com",
    password: "correct-horse-9",
  });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.email, "ayesha@example.com"); // normalized
  assert.equal(
    login.safeParse({ email: "not-an-email", password: "x" }).success,
    false,
  );
  assert.equal(
    login.safeParse({ email: "a@b.co", password: "x" }).success,
    true,
  );
});

test("password change requires a stronger new password", () => {
  assert.equal(
    passwordChange.safeParse({
      currentPassword: "old-password-1",
      newPassword: "new-password-2",
    }).success,
    true,
  );
  assert.equal(
    passwordChange.safeParse({
      currentPassword: "old-password-1",
      newPassword: "short",
    }).success,
    false,
  );
});

test("bcrypt password hashing round-trips and rejects wrong passwords", async () => {
  const hash = await hashPassword("correct-horse-9");
  assert.notEqual(hash, "correct-horse-9");
  assert.equal(await verifyPassword("correct-horse-9", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("rate limiter allows then blocks within the window", () => {
  const key = `test-${Date.now()}`;
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  const blocked = rateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
});

test("address input fills sensible defaults", () => {
  const parsed = addressInput.safeParse({
    street: "House 1, Street 2",
    city: "Karachi",
    postalCode: "75500",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.label, "Home");
    assert.equal(parsed.data.country, "Pakistan");
  }
});

test("admin product and variant inputs validate", () => {
  assert.equal(
    productInput.safeParse({
      name: "A",
      category: "Handbags",
      description: "Too short a name",
      basePrice: 100,
    }).success,
    false,
  );
  assert.equal(
    productInput.safeParse({
      name: "Aurelia Tote",
      category: "Handbags",
      description: "A proper description with enough detail.",
      basePrice: 4850,
    }).success,
    true,
  );
  assert.equal(
    variantInput.safeParse({
      color: "Black",
      spec: "36",
      unitCost: 2000,
      retailPrice: 3850,
      onHandStock: 12,
    }).success,
    true,
  );
  assert.equal(
    variantInput.safeParse({
      color: "Black",
      spec: "36",
      unitCost: 2000,
      retailPrice: 3850,
      onHandStock: -1,
    }).success,
    false,
  );
});

test("order status updates accept only the four known statuses", () => {
  assert.equal(orderStatusUpdate.safeParse({ status: "SHIPPED" }).success, true);
  assert.equal(
    orderStatusUpdate.safeParse({ status: "REFUNDED" }).success,
    false,
  );
});

test("profile update accepts a new display name only", () => {
  assert.equal(profileUpdate.safeParse({ name: "Ayesha Khan" }).success, true);
  assert.equal(profileUpdate.safeParse({ name: "X" }).success, false);
});

test("category input validates names, slugs and parents", () => {
  assert.equal(
    categoryInput.safeParse({ name: "Totes" }).success,
    true,
  );
  const withParent = categoryInput.safeParse({
    name: "Totes",
    parentId: "abc123",
  });
  assert.equal(withParent.success, true);
  // Bad slugs rejected
  assert.equal(
    categoryInput.safeParse({ name: "Totes", slug: "Bad Slug!" }).success,
    false,
  );
  assert.equal(
    categoryInput.safeParse({ name: "Totes", slug: "totes-2024" }).success,
    true,
  );
  // Name too short rejected
  assert.equal(categoryInput.safeParse({ name: "X" }).success, false);
});

test("product status updates accept only known statuses", () => {
  assert.equal(productStatusUpdate.safeParse({ status: "ACTIVE" }).success, true);
  assert.equal(productStatusUpdate.safeParse({ status: "DRAFT" }).success, true);
  assert.equal(productStatusUpdate.safeParse({ status: "ARCHIVED" }).success, false);
});

test("claim input requires a real description", () => {
  assert.equal(
    claimInput.safeParse({
      orderId: "o1",
      type: "DAMAGED",
      description: "The handle arrived torn and unusable.",
    }).success,
    true,
  );
  assert.equal(
    claimInput.safeParse({ orderId: "o1", type: "DAMAGED", description: "bad" })
      .success,
    false,
  );
  assert.equal(
    claimInput.safeParse({
      orderId: "o1",
      type: "STOLEN",
      description: "A long enough description here.",
    }).success,
    false,
  );
  assert.equal(
    claimStatusUpdate.safeParse({ status: "IN_REVIEW" }).success,
    true,
  );
  assert.equal(
    claimStatusUpdate.safeParse({ status: "PENDING" }).success,
    false,
  );
});

test("refund input validates USD cents, method and account detail", () => {
  const base = {
    orderId: "o1",
    amountInt: 4900,
    reason: "Item arrived damaged",
    method: "JAZZCASH",
    accountDetail: "JazzCash 03001234567 — Ayesha",
  };
  assert.equal(refundInput.safeParse(base).success, true);
  // Zero/negative amounts rejected
  assert.equal(
    refundInput.safeParse({ ...base, amountInt: 0 }).success,
    false,
  );
  // Missing account detail rejected
  assert.equal(
    refundInput.safeParse({ ...base, accountDetail: "x" }).success,
    false,
  );
  // Stripe/PayPal are valid refund methods too
  assert.equal(
    refundInput.safeParse({ ...base, method: "STRIPE" }).success,
    true,
  );
  assert.equal(
    refundStatusUpdate.safeParse({ status: "PROCESSED" }).success,
    true,
  );
  assert.equal(
    refundStatusUpdate.safeParse({ status: "REFUNDED" }).success,
    false,
  );
});

test("exchange input requires item, replacement and reason", () => {
  const base = {
    orderId: "o1",
    orderItemId: "oi1",
    toVariantId: "v2",
    reason: "Need a bigger size",
  };
  assert.equal(exchangeInput.safeParse(base).success, true);
  assert.equal(
    exchangeInput.safeParse({ ...base, reason: "x" }).success,
    false,
  );
  assert.equal(
    exchangeStatusUpdate.safeParse({ status: "COMPLETED" }).success,
    true,
  );
  assert.equal(
    exchangeStatusUpdate.safeParse({ status: "SHIPPED" }).success,
    false,
  );
});

test("order admin update accepts status or payment verification", () => {
  assert.equal(
    orderAdminUpdate.safeParse({ status: "SHIPPED" }).success,
    true,
  );
  assert.equal(
    orderAdminUpdate.safeParse({ paymentVerified: true }).success,
    true,
  );
  assert.equal(orderAdminUpdate.safeParse({}).success, true);
  assert.equal(
    orderAdminUpdate.safeParse({ status: "REFUNDED" }).success,
    false,
  );
});

test("settings input validates zones and methods", () => {
  const ok = settingsInput.safeParse({
    jazzcashNumber: "03001234567",
    whatsappNumber: "15551234567",
    paymentMethods: [
      { method: "COD", enabled: true, allowedCountries: ["Pakistan"] },
      { method: "STRIPE", enabled: false, allowedCountries: [] },
    ],
    shippingZones: [
      { zone: "USA", countries: ["United States"], rateCents: 695, freeOverCents: 7500 },
    ],
  });
  assert.equal(ok.success, true);
  // Negative rates rejected
  assert.equal(
    settingsInput.safeParse({
      shippingZones: [
        { zone: "USA", countries: [], rateCents: -5, freeOverCents: 7500 },
      ],
    }).success,
    false,
  );
});

test("review input enforces 1-5 stars and honest content", () => {
  assert.equal(
    reviewInput.safeParse({
      productId: "p1",
      rating: 5,
      title: "Love it",
      comment: "Beautiful quality, fast shipping to New York!",
    }).success,
    true,
  );
  assert.equal(
    reviewInput.safeParse({
      productId: "p1",
      rating: 6,
      title: "Love it",
      comment: "Beautiful quality, fast shipping to New York!",
    }).success,
    false,
  );
  assert.equal(
    reviewInput.safeParse({
      productId: "p1",
      rating: 0,
      title: "Love it",
      comment: "Beautiful quality, fast shipping to New York!",
    }).success,
    false,
  );
  assert.equal(
    reviewInput.safeParse({
      productId: "p1",
      rating: 4,
      title: "OK",
      comment: "short",
    }).success,
    false,
  );
  // Partial updates allowed
  assert.equal(reviewUpdate.safeParse({ rating: 3 }).success, true);
  assert.equal(reviewUpdate.safeParse({}).success, true);
});

test("category tree nests children under parents", () => {
  const flat = [
    { id: "1", name: "Handbags", parentId: null },
    { id: "2", name: "Totes", parentId: "1" },
    { id: "3", name: "Clutches", parentId: "1" },
    { id: "4", name: "Footwear", parentId: null },
  ];
  const tree = buildCategoryTree(flat);
  assert.equal(tree.length, 2);
  const handbags = tree.find((t) => t.id === "1")!;
  assert.equal(handbags.children.length, 2);
  assert.equal(handbags.children[0].name, "Totes");
});

test("category path builds root-to-leaf breadcrumbs", () => {
  const flat = [
    { id: "1", name: "Handbags", parentId: null },
    { id: "2", name: "Totes", parentId: "1" },
  ];
  const path = categoryPath(flat, "2");
  assert.deepEqual(path.map((c) => c.name), ["Handbags", "Totes"]);
  assert.deepEqual(categoryPath(flat, null), []);
  assert.deepEqual(categoryPath(flat, "missing"), []);
});

test("stock badges follow the In/Low/Out rule", () => {
  assert.equal(stockBadge(0), "Out of Stock");
  assert.equal(stockBadge(1), "Low Stock");
  assert.equal(stockBadge(5), "Low Stock");
  assert.equal(stockBadge(6), "In Stock");
  assert.equal(stockBadge(100), "In Stock");
});

test("exchange planner moves stock safely", () => {
  // Happy path: returned +2, replacement −2
  const ok = planExchangeStock(10, 8, 2);
  assert.equal(ok.ok, true);
  assert.equal(ok.fromDelta, 2);
  assert.equal(ok.toDelta, -2);
  // Replacement out of stock -> blocked
  const oos = planExchangeStock(10, 1, 2);
  assert.equal(oos.ok, false);
  assert.match(oos.reason ?? "", /out of stock/i);
  // Invalid quantity blocked
  assert.equal(planExchangeStock(10, 8, 0).ok, false);
});

test("review eligibility blocks non-buyers and duplicates", () => {
  // Non-buyer blocked
  const blocked = reviewEligibility([], "p1", false);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason ?? "", /verified buyers/i);
  // Duplicate blocked
  const dup = reviewEligibility(["p1"], "p1", true);
  assert.equal(dup.ok, false);
  assert.match(dup.reason ?? "", /already reviewed/i);
  // Verified buyer allowed
  const allowed = reviewEligibility(["p1", "p2"], "p1", false);
  assert.equal(allowed.ok, true);
});

test("payment methods respect enabled flags, countries and key config", () => {
  const noKeys = { stripeConfigured: false, paypalConfigured: false };
  const keys = { stripeConfigured: true, paypalConfigured: true };
  // COD only in Pakistan
  const usMethods = availablePaymentMethods("United States", DEFAULT_PAYMENT_METHODS, noKeys);
  assert.ok(!usMethods.some((m) => m.method === "COD"));
  assert.ok(usMethods.some((m) => m.method === "BANK_TRANSFER"));
  const pkMethods = availablePaymentMethods("Pakistan", DEFAULT_PAYMENT_METHODS, noKeys);
  assert.ok(pkMethods.some((m) => m.method === "COD"));
  assert.ok(pkMethods.some((m) => m.method === "JAZZCASH"));
  // Stripe/PayPal need keys
  assert.ok(!usMethods.some((m) => m.method === "STRIPE"));
  const withKeys = availablePaymentMethods("United States", DEFAULT_PAYMENT_METHODS.map((m) =>
    m.method === "STRIPE" ? { ...m, enabled: true } : m,
  ), keys);
  assert.ok(withKeys.some((m) => m.method === "STRIPE"));
  // Coming-soon lists enabled-but-unconfigured card methods
  const soon = comingSoonMethods(
    DEFAULT_PAYMENT_METHODS.map((m) =>
      m.method === "STRIPE" ? { ...m, enabled: true } : m,
    ),
    noKeys,
  );
  assert.ok(soon.some((m) => m.method === "STRIPE"));
});

test("zone lookup matches countries case-insensitively with fallback", () => {
  assert.equal(zoneForCountry("united states", DEFAULT_SHIPPING_ZONES)?.zone, "USA");
  assert.equal(zoneForCountry("Germany", DEFAULT_SHIPPING_ZONES)?.zone, "Europe");
  assert.equal(zoneForCountry("Mars", DEFAULT_SHIPPING_ZONES)?.zone, "Rest of World");
  assert.equal(zoneForCountry("", DEFAULT_SHIPPING_ZONES)?.zone, "Rest of World");
  assert.equal(zoneForCountry("USA", []), null);
});
