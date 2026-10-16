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
  profileUpdate,
  passwordChange,
} from "../src/lib/validation";
import { signSession, verifySession } from "../src/lib/auth";
import { shipping } from "../src/lib/catalog";
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
test("checkout validates Pakistani address, phone and payment method", () => {
  const base = {
    name: "Test Buyer",
    email: "buyer@example.com",
    phone: "03001234567",
    street: "House 12, Street 4, DHA Phase 5, Lahore",
    city: "Lahore",
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
  // Bad Pakistani phone rejected; landline rejected
  assert.equal(
    checkout.safeParse({ ...base, phone: "0423571234", items: [{ id: "a", quantity: 1 }] }).success,
    false,
  );
  assert.equal(
    checkout.safeParse({ ...base, phone: "0300123456", items: [{ id: "a", quantity: 1 }] }).success,
    false,
  );
  // Unknown payment method rejected
  assert.equal(
    checkout.safeParse({
      ...base,
      paymentMethod: "STRIPE",
      items: [{ id: "a", quantity: 1 }],
    }).success,
    false,
  );
  // Bank transfer accepted
  assert.equal(
    checkout.safeParse({
      ...base,
      paymentMethod: "BANK_TRANSFER",
      items: [{ id: "a", quantity: 1 }],
    }).success,
    true,
  );
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
test("delivery threshold is inclusive (free over Rs 5,000)", () => {
  assert.equal(shipping(4999), 250);
  assert.equal(shipping(5000), 0);
  assert.equal(shipping(20000), 0);
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
