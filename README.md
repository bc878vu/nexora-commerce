# Nexora Commerce

A full, real e-commerce store for **Velora Vogue** — women's handbags &
footwear, priced in Pakistani Rupees. Next.js 16 (App Router) + TypeScript +
Prisma (PostgreSQL) + Zustand cart + HMAC-signed cookie sessions. Cash on
delivery and manual bank transfer (no card gateways operate in Pakistan, so
none are integrated — by design, not a gap).

## What it includes (A to Z)

- **Storefront** — home with hero + featured products, shop page with
  search / filter / sort, product detail pages with colour & size variant
  (SKU) selectors, persistent cart (Zustand + localStorage), checkout with
  address form + COD / bank-transfer choice, order confirmation page.
- **User panel** — dashboard overview, full order history with a
  Processing → Shipped → Delivered tracking timeline, address book CRUD,
  profile + password change.
- **Admin panel** (`/admin`) — KPI dashboard (revenue, orders by status,
  customers, stock valuation, low-stock alerts), order management with
  status transitions (cancelling releases stock back into inventory),
  product CRUD with automatic SKU-matrix generation, stock adjustments with
  an **immutable stock ledger**, and a user list (password hashes never
  exposed).
- **Security** — bcrypt password hashing (12 rounds), zod validation on
  every input, login rate-limiting (5 attempts / 10 min per IP+email),
  HMAC-signed httpOnly cookies (`Secure` + `SameSite=Lax` in production),
  same-origin (CSRF) checks on all mutations, no secrets client-side,
  security headers in `next.config.ts`.

## Product photos

Product tiles currently render as clean icon art
(`src/components/ProductArt.tsx` — Lucide icons, no hotlinked images). To
go live with real photography, drop real photos into
`public/products/<slug>.jpg` and point `ProductArt` at them — the layout
already reserves the space.

No testimonials or reviews are fabricated anywhere on the site.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL + SESSION_SECRET
```

### Database (Supabase)

1. Create a project at supabase.com.
2. **Supabase dashboard → SQL editor → New query**, paste the contents of
   `supabase-migration.sql` and run it. The script is idempotent — safe to
   re-run. Verify with the check query at the bottom of the file.
3. **Project settings → Database → Connection string → URI** (direct,
   port 5432) → paste into `DATABASE_URL` in `.env`.

> If you prefer Prisma migrations instead: `npm run db:push` or
> `npm run db:migrate` (both need `DATABASE_URL`).

### Seed the catalogue

```bash
# Optional: create the first admin (one time only)
export ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-strong-password"

npm run db:seed
```

Seeds 12 Velora Vogue products (6 handbags, 4 footwear styles, 2 wallets),
~111 variants with generated SKUs, opening stock and `INITIAL_SEED` ledger
entries. Re-running is a no-op once products exist.

### Run

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm test           # node:test suite
```

## Environment variables

| Variable        | Required | Notes                                              |
| --------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`  | yes      | Supabase Postgres URI (direct, port 5432)          |
| `SESSION_SECRET`| yes      | ≥ 32 random chars (`openssl rand -hex 32`)         |
| `ADMIN_EMAIL`   | no       | seed-only: first admin account                     |
| `ADMIN_PASSWORD`| no       | seed-only: admin password                          |

Without `DATABASE_URL` the storefront runs in **demo mode** (the built-in
12-product catalogue) so the UI is always viewable; checkout, accounts and
admin require the database.

## Payments

Cash on delivery and manual bank transfer only. At checkout with
**Bank transfer**, the confirmation page shows the store's account details
and asks the customer to share the transfer receipt on WhatsApp. No card
gateways, no test-mode fakes.

## Project layout

```
prisma/            schema.prisma, seed.ts
supabase-migration.sql   idempotent DDL for the Supabase SQL editor
src/
  app/
    api/           catalog, auth/*, orders, addresses/*, profile,
                   admin/*, inventory/*
    (auth)/        login, signup pages
    (user)/dashboard   user panel
    (admin)/admin      admin panel
    checkout/      checkout + order confirmation
    products/[slug]    product detail
  lib/             auth (HMAC sessions), password (bcrypt), validation (zod),
                   ratelimit, catalog (pricing/demo data), sku-generator,
                   cart-store (zustand), db
  components/      Store.tsx (shop UI), ProductArt.tsx
tests/core.test.ts
.github/workflows/ci.yml   install → prisma generate → typecheck → test
```
