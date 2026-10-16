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
