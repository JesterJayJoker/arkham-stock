# Arkham Stock v0.5 — campaign-first navigation

## What's new

- 11 campaign overview cards instead of 114 product cards on the homepage
- Current 2026 Core Set featured for new players
- Modern Campaign and Investigator boxes highlighted within campaign details
- Legacy deluxe and Mythos packs hidden in expandable sections
- Separate browsing views for Investigators, Standalones, Rare/OOP, My Collection and All Products
- Cached verified availability badges with source, last checked time, and stale status
- Availability filters: verified in stock, preorder, unchecked
- Check both modern boxes for a chosen campaign with one button
- Bounded background checks for two prioritized products once per browser session; no 114-product automatic sweep
- Existing browser-local collection, import/export, legacy equivalence and backend cache preserved
- 23 automated tests, including four frontend navigation checks

## Deployment

Upload the changed files while preserving their folder paths, then deploy the latest GitHub commit on Render. No database migration is required.

## Caveats

- Cached stock is not real-time-to-the-second.
- A product with no confirmed stock is not necessarily out of stock.
- The free Render instance sleeps after inactivity; cached data is ephemeral.
- Cover art is not yet implemented, to avoid unlicensed or unreliable image URLs.
