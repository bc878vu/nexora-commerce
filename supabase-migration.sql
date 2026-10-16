-- ============================================================
-- Nexora Commerce — Supabase migration (idempotent)
-- Mirrors prisma/schema.prisma exactly. Safe to run multiple times
-- in the Supabase dashboard SQL editor.
-- Run AFTER connecting DATABASE_URL, BEFORE: npm run db:seed
-- ============================================================

-- ---- Enums (native Postgres enums; skip if they exist) ----
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'INVENTORY_MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockChangeReason" AS ENUM (
    'INITIAL_SEED', 'PURCHASE_ORDER_RESTOCK', 'CUSTOMER_CHECKOUT',
    'ORDER_CANCELLATION', 'MANUAL_AUDIT', 'DAMAGED_WRITE_OFF'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- User ----
CREATE TABLE IF NOT EXISTS "User" (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  "passwordHash" TEXT,
  role          "Role" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- ---- Address ----
CREATE TABLE IF NOT EXISTS "Address" (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"(id),
  label       TEXT NOT NULL,
  street      TEXT NOT NULL,
  city        TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  country     TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- ---- Product ----
CREATE TABLE IF NOT EXISTS "Product" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  "basePrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- ProductVariant ----
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  id            TEXT PRIMARY KEY,
  sku           TEXT NOT NULL UNIQUE,
  "productId"   TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  attributes    JSONB NOT NULL DEFAULT '{}',
  "unitCost"    DECIMAL(10,2) NOT NULL,
  "retailPrice" DECIMAL(10,2) NOT NULL,
  "onHandStock" INTEGER NOT NULL DEFAULT 0,
  "reservedStock" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER NOT NULL DEFAULT 10,
  "warehouseBin" TEXT NOT NULL DEFAULT 'WH-A1-01',
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "ProductVariant_sku_idx" ON "ProductVariant"(sku);
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- ---- StockLedger (immutable audit log — no UPDATE/DELETE by design) ----
CREATE TABLE IF NOT EXISTS "StockLedger" (
  id             TEXT PRIMARY KEY,
  "variantId"    TEXT NOT NULL REFERENCES "ProductVariant"(id),
  delta          INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  reason         "StockChangeReason" NOT NULL,
  note           TEXT,
  "actorName"    TEXT NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Order ----
CREATE TABLE IF NOT EXISTS "Order" (
  id              TEXT PRIMARY KEY,
  "orderNumber"   TEXT NOT NULL UNIQUE,
  "userId"        TEXT NOT NULL REFERENCES "User"(id),
  status          "OrderStatus" NOT NULL DEFAULT 'PROCESSING',
  "totalAmount"   DECIMAL(10,2) NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- OrderItem ----
CREATE TABLE IF NOT EXISTS "OrderItem" (
  id         TEXT PRIMARY KEY,
  "orderId"  TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "variantId" TEXT NOT NULL REFERENCES "ProductVariant"(id),
  sku        TEXT NOT NULL,
  quantity   INTEGER NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL
);

-- ---- Verification: run this SELECT after to confirm all tables exist ----
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('User','Address','Product','ProductVariant','StockLedger','Order','OrderItem')
-- ORDER BY table_name;

-- ============================================================
-- WAVE 2 — categories, claims, refunds, exchanges, reviews,
-- product status, payment columns, store settings.
-- Idempotent: safe to run multiple times.
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- block. If the SQL editor wraps the script in one transaction,
-- run the "New enum values" section separately first.
-- ============================================================

-- ---- New enum values on existing types ----
DO $$ BEGIN
  ALTER TYPE "StockChangeReason" ADD VALUE IF NOT EXISTS 'EXCHANGE_OUT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockChangeReason" ADD VALUE IF NOT EXISTS 'EXCHANGE_IN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- New enums ----
DO $$ BEGIN
  CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ClaimType" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'NOT_RECEIVED', 'QUALITY_ISSUE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "RefundMethod" AS ENUM ('BANK_TRANSFER', 'JAZZCASH', 'EASYPAYSA', 'STRIPE', 'PAYPAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ExchangeStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAYSA', 'STRIPE', 'PAYPAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- Category ----
CREATE TABLE IF NOT EXISTS "Category" (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  image      TEXT,
  "parentId" TEXT REFERENCES "Category"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");

-- ---- Product: category link + status ----
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT REFERENCES "Category"(id);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS status "ProductStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"(status);

-- ---- Order: payment columns ----
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentVerified" BOOLEAN NOT NULL DEFAULT false;

-- ---- Claim ----
CREATE TABLE IF NOT EXISTS "Claim" (
  id               TEXT PRIMARY KEY,
  "orderId"        TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "userId"         TEXT NOT NULL REFERENCES "User"(id),
  type             "ClaimType" NOT NULL,
  description      TEXT NOT NULL,
  status           "ClaimStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Claim_orderId_idx" ON "Claim"("orderId");
CREATE INDEX IF NOT EXISTS "Claim_userId_idx" ON "Claim"("userId");
CREATE INDEX IF NOT EXISTS "Claim_status_idx" ON "Claim"(status);

-- ---- Refund ----
CREATE TABLE IF NOT EXISTS "Refund" (
  id              TEXT PRIMARY KEY,
  "orderId"       TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "claimId"       TEXT REFERENCES "Claim"(id),
  "userId"        TEXT NOT NULL REFERENCES "User"(id),
  "amountInt"     INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  method          "RefundMethod" NOT NULL,
  "accountDetail" TEXT NOT NULL,
  status          "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX IF NOT EXISTS "Refund_userId_idx" ON "Refund"("userId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"(status);

-- ---- Exchange ----
CREATE TABLE IF NOT EXISTS "Exchange" (
  id              TEXT PRIMARY KEY,
  "orderId"       TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "userId"        TEXT NOT NULL REFERENCES "User"(id),
  "fromVariantId" TEXT NOT NULL REFERENCES "ProductVariant"(id),
  "toVariantId"   TEXT NOT NULL REFERENCES "ProductVariant"(id),
  quantity        INTEGER NOT NULL DEFAULT 1,
  reason          TEXT NOT NULL,
  status          "ExchangeStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Exchange_orderId_idx" ON "Exchange"("orderId");
CREATE INDEX IF NOT EXISTS "Exchange_userId_idx" ON "Exchange"("userId");
CREATE INDEX IF NOT EXISTS "Exchange_status_idx" ON "Exchange"(status);

-- ---- Review ----
CREATE TABLE IF NOT EXISTS "Review" (
  id          TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "userId"    TEXT NOT NULL REFERENCES "User"(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  comment     TEXT NOT NULL,
  status      "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("productId", "userId")
);
CREATE INDEX IF NOT EXISTS "Review_product_status_idx" ON "Review"("productId", status);

-- ---- StoreSettings (singleton row id='default') ----
CREATE TABLE IF NOT EXISTS "StoreSettings" (
  id                     TEXT PRIMARY KEY,
  "jazzcashNumber"       TEXT NOT NULL DEFAULT '',
  "easypaisaNumber"      TEXT NOT NULL DEFAULT '',
  "bankName"             TEXT NOT NULL DEFAULT '',
  "bankAccount"          TEXT NOT NULL DEFAULT '',
  "bankIban"             TEXT NOT NULL DEFAULT '',
  "stripePublishableKey" TEXT NOT NULL DEFAULT '',
  "stripeSecretKey"      TEXT NOT NULL DEFAULT '',
  "paypalClientId"       TEXT NOT NULL DEFAULT '',
  "paypalSecret"         TEXT NOT NULL DEFAULT '',
  "whatsappNumber"       TEXT NOT NULL DEFAULT '',
  "announcement"         TEXT NOT NULL DEFAULT 'Free worldwide shipping on orders over $75',
  "paymentMethods"       JSONB NOT NULL DEFAULT '[]',
  "shippingZones"        JSONB NOT NULL DEFAULT '[]',
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Verification: run this SELECT after to confirm wave-2 tables exist ----
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('Category','Claim','Refund','Exchange','Review','StoreSettings')
-- ORDER BY table_name;

-- ---- WishlistItem ----
CREATE TABLE IF NOT EXISTS "WishlistItem" (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "productId")
);
CREATE INDEX IF NOT EXISTS "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- ---- StoreSettings: announcement column (wave 2 polish) ----
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcement" TEXT NOT NULL DEFAULT 'Free worldwide shipping on orders over $75';
