# Arkham Stock v0.4 — backend validation report

Date: 2026-10-07

## Automated tests

`npm test` passes **12/12** checks:

1. Persistent cache writes and reloads entries.
2. Accent/punctuation normalization.
3. Current-core alias matching versus an accessory collision.
4. SKU-based disambiguation.
5. Rejection of a weak unrelated title match.
6. Rate limiter allows the configured quota and blocks the next request.
7. End-to-end Shopify discovery + available variant => `in_stock`.
8. End-to-end Shopify discovery + unavailable variant => `out_of_stock`.
9. Concurrent callers coalesce into one retailer refresh.
10. Fresh cached results avoid new retailer requests.
11. Stale results are returned immediately while exactly one background refresh starts.
12. A hung retailer adapter is aborted at its time budget and does not block the whole product check.

## Server smoke test

A production-mode local server was started on a temporary port and verified to:

- return HTTP 200 from `/api/health`
- report version `0.4.0`
- report 114 catalog products and 10 retailer adapters
- report `loginRequired: false`
- serve the frontend successfully
- emit security headers
- hide admin endpoints with HTTP 404 when no `ADMIN_KEY` is configured
- return HTTP 404 for unknown API routes

## Public-traffic design

The backend no longer exposes a public force-refresh query parameter. A normal visitor receives:

- a fresh shared cache entry when available
- a stale shared entry immediately when still within the stale window, while one background refresh runs
- one coalesced retailer refresh when no usable cache exists

This prevents a Reddit traffic spike from multiplying retailer checks by the number of visitors.

## Source behavior

The source set remains 10 retailer adapters:

- Gamers Guild AZ
- Gamezenter
- Asmodee US
- Boarding School Games
- Cardhaus
- Miniature Market
- Noble Knight Games
- The Guardtower
- The Haunted Game Cafe
- Atomic Empire

Manual retailer-web and Board Game Oracle links remain fallback discovery tools in the UI, not authoritative stock evidence.

## Sandbox live-network smoke test

A first-time `core-2026` lookup was also run against the 10 real adapters from the build sandbox. The sandbox could not establish usable retailer responses, but the new per-retailer abort budget bounded the full sweep to about 32 seconds instead of allowing an unbounded multi-minute wait. This validates timeout behavior, not retailer availability; live stock must be re-smoke-tested from the eventual public host.
