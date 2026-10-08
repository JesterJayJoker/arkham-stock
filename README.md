# Arkham Stock

**First visit may take longer:** Free Render hosting may put the server to sleep when idle. Waking can take up to a minute; please allow time for stock checks to initialize.

[Release history](CHANGELOG.md) · [Deployment](DEPLOY.md) · [Privacy](PRIVACY.md) · [Contributing](CONTRIBUTING.md)

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

Public traffic protections include:

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
