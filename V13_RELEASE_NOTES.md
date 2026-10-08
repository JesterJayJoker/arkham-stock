# Arkham Stock v0.13 — Retailer Reliability

## Corrections

1. Product-specific delayed shipping and special orders are no longer classified as ordinary ready-to-ship stock. Boarding School Games is checked for product-level extended-delay CTAs. If that page cannot be verified, availability is marked unknown rather than silently assuming normal fulfillment.
2. Shopify offer prices are selected from the matching available variant, not from sold-out variants. SKU/UPC mismatches are rejected.
3. Complete used copies are separated from normal in-stock results. Empty boxes, incomplete products, and mixed collector bundles are excluded from verified complete-product stock.
4. Summary cards display delayed, used, and backorder states distinctly. The Verified In Stock filter remains restricted to ordinary in-stock offers.
5. Return To optional-content note appears above the individual products.

## Validation

- Added controlled mock-retailer regression tests for pricing, delays, mismatched identifiers, used/incomplete listings, and summary classification.
- Local server/API and JavaScript syntax checks.
- Live hosted inventory and checkout remain **unverified** until deployed and tested against actual retailer pages.

## Deployment

Upload the update ZIP contents to the root of the existing GitHub repository (preserve backend/, public/, tests/), then deploy the newest commit on Render. No collection storage format change. The Render free tier may sleep and its cache may reset after deployment.
