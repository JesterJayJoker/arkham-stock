> Latest changes: see [v0.13 release notes](V13_RELEASE_NOTES.md).

# Arkham Stock v0.13 — public beta build

Arkham Stock is an independent fan-made Arkham Horror: The Card Game collection and retail-availability tracker inspired by the old Stackham Horror workflow.

## Public-user experience

- **No login or account required.**
- Ownership and wanted lists stay in the visitor's browser (`localStorage`).
- Live retailer results are checked by one shared backend and cached for everyone.
- Legacy deluxe/Mythos packaging can satisfy the same underlying content represented by later repackaged boxes.
- Import/export lets visitors move or back up their local collection state.
- Manual multi-store search links remain available when a retailer parser cannot verify a result.

## Run locally

Requires Node 18+ and no third-party npm packages.

```bash
npm start
```

Open http://localhost:8787.

Or use Docker:

```bash
docker compose up --build
```

## Public traffic protections

v0.4–v0.6 include:

- persistent shared offer cache
- stale-while-revalidate behavior
- in-flight request coalescing (many visitors -> one retailer refresh)
- API rate limiting
- reduced retailer concurrency
- admin-only force-refresh / clear operations
- security headers
- public health/status endpoint

A normal public stock lookup cannot force-refresh a retailer. That is deliberate: many visitors requesting the same product reuse the same shared result.

## API

Public:

- `GET /api/health`
- `GET /api/products`
- `GET /api/retailers`
- `GET /api/stock-summary`
- `GET /api/offers/:productId`

Optional admin endpoints exist only when `ADMIN_KEY` is configured:

- `POST /api/admin/refresh/:productId`
- `POST /api/admin/cache/clear`

Send the key as `Authorization: Bearer <key>` or `X-Admin-Key: <key>`.

## Important environment variables

- `PORT` — default `8787`
- `CACHE_FILE` — default `data/cache-runtime.json`
- `OFFER_CACHE_MS` — fresh result lifetime, default 2 hours
- `OFFER_STALE_MS` — stale-while-revalidate lifetime, default 24 hours
- `MAX_PARALLEL` — simultaneous retailer requests per refresh, default 3
- `RETAILER_BUDGET_MS` — maximum wall time per retailer check, default 8 seconds
- `RETAILER_FETCH_TIMEOUT_MS` — timeout per individual HTTP request, default 4.5 seconds
- `RATE_LIMIT_MAX` — API requests per IP/window, default 120
- `RATE_LIMIT_WINDOW_MS` — default 60 seconds
- `TRUST_PROXY=1` — use only behind a trusted reverse proxy/host
- `ADMIN_KEY` — optional private refresh/cache-management key

## Tests

```bash
npm test
```

The current release passes **29/29 automated tests**, covering product matching, Shopify stock parsing, persistent cache behavior, rate limiting, request coalescing, fresh-cache reuse, stale-while-revalidate behavior, and bounded retailer timeouts.

## Collection privacy

Collection state is kept in browser `localStorage`; normal collection use does not send ownership data to the backend. See `PRIVACY.md`.

## Deployment

See `DEPLOY.md`. The repository contains a Dockerfile, Docker Compose configuration, a Render deployment template, and a GitHub Actions test workflow.

## Disclaimer

Arkham Stock is an independent fan utility and is not affiliated with Fantasy Flight Games, Asmodee, ArkhamDB, or the retailers it checks. Product names and trademarks belong to their respective owners.

## v0.5: Campaign-first browsing

The default page now shows 11 campaigns, plus a current Core Set spotlight. Campaign details emphasize the modern Campaign and Investigator Expansions, with original deluxe boxes and Mythos packs behind an expandable section.

Visitors can switch between Campaigns, Investigators, Standalones, Rare/OOP, My Collection, and All Products. Collection mode shows only owned or wanted items; the 114-item catalog remains available under All Products. Product cards show cached verified stock summaries before historical snapshots. The stock filter never counts unverified items as out of stock.

Opening the site loads the shared stock-summary cache without triggering a sweep of every retailer for all 114 items. At most two prioritized products (2026 Core and Children of Blood) may be automatically checked once per browser session when no usable cache is available. Campaign details provide a one-click check for that campaign's modern boxes.

**Important:** Render free-tier sleep and ephemeral storage mean automatic checks cannot run continuously while the instance is sleeping. This release does not claim to provide comprehensive, real-time inventory for all products.

## v0.6: Automatic checking, Amazon, and quick collection setup

The server checks one retail product per three minutes (configurable) while active. Shared summaries refresh in the browser without generating a full retailer sweep per visitor. Render's free tier sleeps, so these checks are **not** guaranteed to run continuously. `GET /api/health` and `GET /api/stock-summary` include `autoStock` progress. See `V06_RELEASE_NOTES.md`.

Amazon US appears as a manual product search link. Amazon is **not** a verified automatic stock source without authorized access to product and offer data. The site's live stock counts and lowest prices still come from supported direct retailer checks only.

**Set up my collection** opens a guided ownership checklist. Legacy packs and Return To products are separate from modern campaign/investigator boxes; marking one never silently marks another. JSON export/restore remains for backups.

## v0.10 updates

See [V10_RELEASE_NOTES.md](V10_RELEASE_NOTES.md) for category bulk checks, Cardhaus category-page rejection, compact advisor, and UK search preview.

## v0.13 retailer reliability update

- Shopify variant prices now use the cheapest **available, matching** variant, not a sold-out variant. If SKU/UPC conflicts, the offer is unknown rather than guessed.
- Boarding School Games product-specific extended-delay CTAs are checked alongside Shopify variant data. Listings can be `delayed`, `backorder`, `preorder`, `used`, `out_of_stock`, or `unknown` instead of all appearing as ordinary `in_stock`.
- Used, incomplete, box-only, and mixed-bundle listings are differentiated or rejected. A used copy is not counted as an ordinary new in-stock copy.
- The Return To completion note is above the list, not appended to the final title.
- Availability remains time-stamped, cached, and subject to retailer changes. Automated unit tests are **not** a substitute for real hosted checkout verification.

For the public beta, test at least the Drowned City campaign, Barkham Horror, Return to the Night of the Zealot, Where Doom Awaits, and the 2026 Core Set on the deployed host.
