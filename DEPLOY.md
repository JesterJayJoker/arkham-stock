# Public deployment

Arkham Stock is a single Node service: the same process serves the frontend and the retailer-check API.

## Local Docker test

```bash
docker compose up --build
```

Open http://localhost:8787.

## Hosted deployment

Use a host that can run a long-lived Node/Docker service and make outbound HTTPS requests. A persistent disk/volume is strongly recommended for the shared cache; otherwise cached results survive only until the instance restarts.

Recommended production variables:

```text
CACHE_FILE=/data/cache.json
OFFER_CACHE_MS=7200000
OFFER_STALE_MS=86400000
MAX_PARALLEL=3
RETAILER_BUDGET_MS=8000
RETAILER_FETCH_TIMEOUT_MS=4500
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW_MS=60000
TRUST_PROXY=1
ADMIN_KEY=<long random secret, optional>
```

Do not expose `ADMIN_KEY` to browser JavaScript or commit it to Git.

A `render.yaml` is included as one deployment template. The Docker image is host-agnostic and can also run on other container hosts.

## Why the shared cache matters

One user's check populates the server cache. Subsequent visitors receive the same recent verified result without re-requesting all retailer sites.

When a result becomes stale but is still inside `OFFER_STALE_MS`, Arkham Stock returns it immediately and starts at most one background refresh for that product. Concurrent visitors therefore do not produce concurrent retailer sweeps.

## Before posting publicly

1. Deploy the service and confirm `/api/health` returns `ok: true`.
2. Check a mix of current, legacy, standalone, and OOP products from the deployed domain.
3. Confirm the persistent cache survives a service restart.
4. Confirm a repeated product lookup reports `cacheState: fresh` and does not create another retailer sweep.
5. Confirm mobile layout and collection import/export on the live HTTPS site.
6. Add the final public URL and source repository URL to the Reddit post.

## Free Render deployment option (October 2026)

The accompanying `render.yaml` uses Render's **free Node runtime** with `npm start` and an ephemeral `/tmp` cache, avoiding the paid Starter plan and paid persistent disk from the earlier production template. The cache remains shared between visitors while the service is running, but resets on sleep/restart/deploy. For persistent stock history, a separate durable data store will be needed later.
