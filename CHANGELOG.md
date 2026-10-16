# Nexora Commerce — Changelog

## Wave 2+3 (2026-10-17) — Worldwide, claims/returns, reviews, polish

**Market:** worldwide (USA/UK/Europe focus), currency **USD**.

- **Categories:** `Category` model with parent/child hierarchy (Handbags → Totes/Shoulder
  Bags/Clutches, Footwear → Heels/Flats/Sandals, Wallets → Long/Mini). Shop page has an
  expandable category tree; `/categories/[slug]` landing pages with per-category SEO meta;
  product pages show breadcrumbs; admin category CRUD with parent picker.
- **Product status:** ACTIVE/INACTIVE/DRAFT — storefront hides non-ACTIVE; admin toggle +
  status badges; stock badges (In Stock / Low Stock ≤5 / Out of Stock) on cards.
- **Claims:** user files from order detail (DAMAGED/WRONG_ITEM/NOT_RECEIVED/QUALITY_ISSUE/OTHER);
  "My claims" dashboard page; admin inbox with status + resolution note.
- **Refunds:** manual, honestly labeled ("sent within 3–5 working days" for manual methods;
  "to original payment method" for Stripe/PayPal only when configured). Request from
  claim or order; admin approve/reject/mark-processed with flow guards.
- **Exchanges:** user picks replacement variant (in-stock only); admin approve → stock
  adjusts (+1 returned, −1 replacement) with immutable ledger entries (EXCHANGE_IN/OUT).
- **Payments (configurable, honest):** StoreSettings per-method `enabled` + `allowedCountries`.
  COD (Pakistan only), Bank Transfer, JazzCash, Easypaisa (manual + paymentRef), Stripe,
  PayPal (shown as available only when enabled AND keys configured; otherwise honest
  "coming soon — contact us on WhatsApp"). No fake gateway integrations.
- **Shipping zones:** USA/UK/Europe/Rest of World — flat USD rate + free-over threshold
  (default $75), editable in admin Settings; checkout prices by customer country.
- **Reviews:** verified buyers only (DELIVERED order containing the product), one per
  product per user, editable (re-moderated), rate-limited; admin moderation queue.
  Zero seeded reviews — honest "No reviews yet" state.
- **Wishlist:** heart toggle on product cards (DB-persisted per user), dashboard wishlist page.
- **Polish:** configurable announcement bar (default "Free worldwide shipping on orders over
  $75"); hero + featured-categories grid + featured pieces + trust badges + Instagram CTA
  (https://instagram.com/shopvelora_vogue); quick-view modal; sticky mobile add-to-cart;
  per-product/per-category meta + OG tags; sitemap.xml; robots.txt.
- **Infra:** Prisma schema validated; `supabase-migration.sql` extended (idempotent DDL);
  30/30 tests pass; `tsc` clean; `next build` green (58 routes).

## Wave 1 (2026-10-17)

- Storefront (home, shop w/ search/filter/sort, product detail, cart), checkout,
  order confirmation; bcrypt auth (12 rounds), HMAC cookie sessions, login rate-limit,
  zod validation everywhere; user dashboard (orders, addresses, profile); admin panel
  (KPIs, orders, products CRUD + SKU matrix, inventory ledger, users); 12 products,
  ~111 variants; security headers, sameOrigin CSRF, admin role guards.
- Deployed to Vercel (public). Note: needs `DATABASE_URL` + `supabase-migration.sql`
  run in Supabase before checkout/accounts/admin work with live data (demo mode until then).
