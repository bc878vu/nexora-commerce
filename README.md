# Nexora Commerce

A responsive Next.js / TypeScript storefront with a PostgreSQL inventory and order backend. Renamed and rebuilt from the uploaded Nexus Commerce starter.

## What works

- Responsive catalog, category filters, search, price sorting and product detail dialogs.
- Browser-persisted cart, quantity limits and cash-on-delivery checkout.
- Server-priced orders, atomic stock deduction, ledger entries and cancellation restocking.
- Signed, HttpOnly customer sessions and browser-scoped order history.
- Admin password sign-in, inventory overview, stock adjustment, orders and movement ledger.
- Validated input, protected admin endpoints, compare-and-update concurrency checks, safe server errors.
- Collision-resistant SKU generation, idempotent sample catalog seed, CI and unit tests.

## Start locally

Requires Node.js 22+ and PostgreSQL for checkout/admin data.

```sh
npm ci
cp .env.example .env
# Fill DATABASE_URL, SESSION_SECRET (32+ random characters), ADMIN_PASSWORD (16+ random characters).
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Admin: `/admin/inventory`. Orders: `/dashboard`.

Without DATABASE_URL the catalog uses clearly marked sample data; cart, filters and product details work, but checkout is disabled. No fake orders or fake stock adjustments are reported as successful. There is no live database bundled in this project.

## Production deployment

1. Push this directory's contents to a new GitHub repository (do not upload node_modules, .next or .env).
2. Import the repository into a Next.js-capable host such as Vercel. Use Node 22+, `npm ci`, and `npm run build`.
3. Configure DATABASE*URL, SESSION_SECRET and ADMIN_PASSWORD as server-side secrets. Never prefix them with NEXT_PUBLIC*.
4. Initialize an empty PostgreSQL database with `npm run db:push`; run `npm run db:seed` only if the sample products are wanted. For an existing production database, review and version Prisma migrations rather than using db:push blindly.
5. Enable HTTPS, rate limiting on `/api/admin/session` and `/api/orders`, backups, and monitoring at the hosting layer before opening to shoppers.
6. Replace sample products, prices and illustrations with your actual catalog. Review business shipping, privacy and return policies before launch.

## Deliberate limits

- Cash on delivery only; no online payment gateway or card data processing.
- Customer history is session-based (7 days), not email/password account authentication. Save order references; another browser cannot retrieve old orders. Email is recorded on the order for fulfillment, not used as proof of identity.
- One shared administrator credential; no multi-staff accounts, password reset or MFA yet. Deploy behind additional access controls as appropriate.
- Fulfillment is manually updated by the admin; there is no courier integration or automated email.
- Product editing is currently via Prisma/database; the UI manages stock and orders. Inventory/order/ledger tables show the latest 100 orders/movements.
- Addresses are entered at checkout, not a separate address book. Return requests are not implemented.
- Product art is illustrative vector artwork, not photographs of real merchandise. Font loading has system-font fallbacks.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Unit tests cover SKU collisions, invalid stock adjustments, malformed checkout payloads, session tampering and delivery thresholds. Live database transaction and browser tests require the corresponding environments; do not treat unit tests as production acceptance.

## Important paths

- `src/components/Store.tsx`: catalog, bag and checkout
- `src/app/api/orders/route.ts`: session-owned orders and transactional checkout
- `src/app/api/inventory/adjust/route.ts`: authorized stock adjustments
- `src/app/api/admin/orders/route.ts`: fulfillment transitions and cancellation restock
- `src/lib/auth.ts`: signed server sessions
- `prisma/schema.prisma`: retained relational inventory/order model
- `prisma/seed.ts`: repeatable starter catalog without stock-resetting existing records

## GitHub upload

```sh
git init -b main
git add .
git commit -m "Build Nexora Commerce storefront and inventory platform"
git remote add origin https://github.com/YOUR_USERNAME/nexora-commerce.git
git push -u origin main
```

Create the empty repository before running the last two commands.
