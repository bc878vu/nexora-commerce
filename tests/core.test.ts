import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSkuCode, generateVariantMatrix } from "../src/lib/sku-generator";
import { adjustment, checkout } from "../src/lib/validation";
import { signSession, verifySession } from "../src/lib/auth";
import { shipping } from "../src/lib/catalog";
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
test("checkout rejects duplicate lines and fractional quantities", () => {
  const base = {
    name: "Test Buyer",
    email: "buyer@example.com",
    address: "123 Example Street, Lahore",
  };
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
  assert.equal(
    checkout.safeParse({ ...base, items: [{ id: "a", quantity: 1.5 }] })
      .success,
    false,
  );
  assert.equal(
    checkout.safeParse({ ...base, items: [{ id: "a", quantity: 2 }] }).success,
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
test("delivery threshold is inclusive", () => {
  assert.equal(shipping(19999), 250);
  assert.equal(shipping(20000), 0);
});
