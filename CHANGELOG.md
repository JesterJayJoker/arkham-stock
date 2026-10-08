# Arkham Stock — Changelog

Consolidated release history for the public beta. The earliest recorded notes begin with v0.5.

## v0.16 — Mobile polish and documentation

- Fixed collapsed collection checklist groups stretching vertically on narrow screens.
- Added a first-visit cold-start notice near the Arkham Stock title.
- Consolidated release notes into this changelog and simplified the README.

## v0.15

- Mobile product filters start collapsed and open using an accessible Filters button. Apply and Clear All preserve existing filter logic; active-filter count is displayed. Desktop filter layout is unchanged.
- Collection setup has collapsible Bulk actions. On narrow screens, the checklist occupies the scrollable middle region, with a compact, persistent Save/Cancel footer.
- Campaign, product, and collection dialogs lock background page scrolling. Closing the final dialog restores the original scroll position.
- The original ownership, wishlist, JSON backup/restore, retailer stock checking and chapter navigation are unchanged.

## Verification

84 automated tests passed. Local API smoke tests and JavaScript syntax checks were performed. Live mobile browser navigation was blocked by the execution environment; verify scrolling and touch behavior on the deployed site.

## v0.14

## Changes

- Adds manufacturer SKU and barcode identifiers to Barkham Horror (`PAHC01`, `841333111410`), Where Doom Awaits (`AHC07`, `841333102357`), and Return to the Night of the Zealot (`AHC26`, `841333105266`).
- Adds alternate exact product-title aliases for retailer searches.
- Rejects retailer candidates with a conflicting known SKU or UPC **before** title similarity scoring. A candidate with missing identifiers may still match by title and is not automatically verified solely from an identifier-free listing.
- Rejects obvious empty-box and incomplete listings during candidate ranking; the existing product-page verification remains in place.
- Adds regression tests for these three products and preserves the 2026 Core Set edition guard.

## Source checks

- Barkham: Fantasy Flight Games official product page (`PAHC01`, `841333111410`).
- Where Doom Awaits: Fantasy Flight Games' 2017 release article (`AHC07`) and Cardhaus product UPC (`841333102357`).
- Return to the Night of the Zealot: official rule insert proof-of-purchase (`AHC26`) and product UPC (`841333105266`).

## Limitations

This update does not certify live retailer stock or price correctness. It is a catalog and candidate-matching improvement, not a new retailer integration. After deployment, perform actual five-product checks against direct retailer pages.

## v0.13

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

## v0.12

- Reclassifies both The Drowned City modern boxes as Chapter One retail in the backend catalog and the embedded browser catalog. This corrects chapter browsing, collection setup, campaign completion, and product badges.
- Adds The Drowned City to Chapter One completion/advisor cycle lists and removes it from Chapter Two. Children of Blood remains in Chapter Two.
- Stops cards next to an expanded advisor accordion from stretching their borders to match its height.
- Leaves the BoardGamePrices.co.uk Google site-search fallback unchanged; it is deliberately not a live verified UK feed.
- Adds four regression tests and updates the existing Chapter Two regression expectation for these changes.

Upload the changed files to GitHub preserving their paths, then deploy the latest commit on Render.

## v0.11

- Added top-level Chapter One, Chapter Two, and All chapters browsing selector, applied to Campaigns, Investigator Expansions, Investigator Decks, Standalones, Return To, Legacy releases, My collection, and All products.
- Chapter One and Chapter Two collection setup now place their respective Core Sets first.
- Selecting both modern boxes updates the checkboxes in place, preserving all expanded collection groups.
- Added Select all retail products in this chapter (including optional legacy/Return To), Select modern boxes only, and Clear this chapter. Select All requires confirmation; changes are not saved until Save my collection.
- Replaced the confusing 'Current line: 11' stat with 'Main campaigns complete', which counts campaign groups with all main modern-box content covered.
- UK marketplace links are presented as visible external search buttons with clear labels and no false stock claims. US verified stock and UK manual searches remain separate.
- Kept separate Shopping region selection (US/UK) and Release chapter selection (One/Two/All).

## Verification

- 55 Node automated tests passed.
- Chromium interaction smoke test passed using a local in-memory page (no live network): 11 campaigns across chapters, 2 Chapter Two campaigns, Chapter Two investigator filtering, Core Sets first in both setup chapters, expanded groups stay open, modern bulk selection, no JavaScript errors.
- Retailer accuracy and hosted deployment were not tested in this update.

## v0.10

## Changes

- **Category-wide Check all** on Investigator Expansions, Investigator Decks, Standalones, Return To, Legacy Releases, and All Products. Checks are opt-in, sequential, cache-aware, and stoppable. Active filters determine which products are included. The original campaign batch checker is unchanged.
- **Cardhaus category-page false-positive fix:** a retailer category/search page cannot be accepted as a product listing. In particular `/board-games/horror/` cannot produce a Barkham preorder. Final redirects are also checked. Generic whole-page `preorder`/`add to cart` language no longer establishes availability when product-specific structured data is missing. This is intentionally conservative.
- **Condensed advisor:** two-column expandable summaries on larger screens, single column on phones. Completed campaigns are counted in a compact summary rather than producing large repeated blocks.
- **International foundation:** a shopping-region selector near the title with US English and UK English (search preview). US retailer stock/prices are hidden in UK mode. UK mode offers unverified BoardGamePrices.co.uk and Amazon UK searches, and does not claim UK availability. This is not yet an international live retailer engine. Region is remembered in the browser; collection remains shared between regions for now.

## Important limitations

- Existing shared-cache records are not independently verified by this code update. A fresh Render deployment restarts the free instance's ephemeral cache. For confidence, check specific product links after deployment.
- UK prices/stock are not scraped or confirmed; do not represent them as verified.
- Do not conflate shopping region with language edition. Translated releases require separate SKU/UPC and product mapping.
- Render's free instance sleeps during inactivity, so scheduled availability checks run only while it is awake.

## Validation

`npm test` includes a mocked Cardhaus Barkham category-page regression and additional UI/region checks. A successful local test does not prove live retailer availability on the public deployment.

## v0.9

- Campaign guide groups original deluxe/Mythos packs and optional Return To in one expandable section. Return To is still distinct content and remains independently browsable.
- Original release group and its stock-check button now include optional Return To, without implying content equivalency with modern boxes.
- Campaign homepage adds an opt-in Check all campaign expansions control (modern Campaign/Investigator boxes), with sequential checks, progress, cancellation, and reuse of fresh cached results. Checks require the browser tab to remain open and may take several minutes.
- Amazon remains a manual search-only source. UI now says Search Amazon / Stock not verified rather than suggesting it was checked.
- Existing server-side automatic scheduler remains unchanged and continues gradual checks while the free Render instance is awake.

## v0.8

- Added **Return to the Night of the Zealot** as a distinct Return To box (2018), without marking it included in any Core Set.
- Renamed Rare / OOP browsing to **Legacy releases**. Legacy Core Sets remain visible on their own; Deluxe Expansions and Mythos Packs are collapsed into separate expandable groups. Return To stays in its own tab.
- Added **Investigator Expansions** and **Investigator Decks** sub-tabs.
- Reduced UI lag by limiting the master catalog to 24 cards initially, providing Show more, avoiding rendering unopened legacy sections, debouncing text search, and skipping unnecessary 45-second stock-summary rerenders when only cache ages change.
- Retained no-login ownership tracking and server-side stock cache.

## Verification

Run `npm test`. The suite contains 42 tests, including new checks for Return To catalog inclusion, legacy grouping, investigator sub-tabs and progressive rendering.

**Deployment:** Upload the changed files into the same repository paths. The server-side catalog and the browser's embedded catalog must both be updated. Then deploy the latest commit in Render. Live retailer accuracy remains a separate verification task.

## v0.7

This update is based on feedback from actual use of the public v0.6 site.

## Changes

1. **Main content coverage instead of physical SKU count.** Campaign summary cards show `Main content covered` (e.g. `2/2`), calculated from the Campaign/Investigator Expansion content equivalence model. Legacy deluxe/Mythos packs are not counted as missing SKUs once the same content is covered by modern boxes. Return To ownership is shown separately and remains optional. Physical ownership is preserved in the browser; it is not automatically overwritten or falsified.
2. **Chapter One / Chapter Two tabs.** The collection advisor, cycle summary, and quick-setup checklist have chapter tabs. Chapter One includes all nine earlier campaigns, original/revised core sets, Chapter One standalones, investigator starters, and other older catalog entries. Chapter Two includes Drowned City, Children of Blood, the 2026 core, investigator decks and relevant current standalones. Switching setup tabs retains pending selections from both chapters until Save.
3. **Return To is a separate browsing tab.** The Rare/OOP tab no longer includes Return To boxes. The Return To products remain available in campaign details and setup as optional items.
4. **Batch legacy check.** Expanded campaign detail has a `Check legacy deluxe & Mythos packs (7)` button for each original seven-part cycle. It checks sequentially to reduce retailer traffic and excludes the separate Return To box. The former `(8)` count included the Return To box.
5. **Amazon is discoverable in the live checker.** The product detail check now shows a `Check Amazon` search link even if the other retailer checks find no verified offers. Amazon is explicitly **not automatically verified**. This does not claim Amazon prices/stock are confirmed; a legitimate Amazon product API/integration would be required for that.
6. **Click-through to the retailer.** The retailer name on a verified cached in-stock product card links directly to the retailer's verified product URL. Links are restricted to the expected retailer's HTTPS domain.

## Upload

The incremental ZIP contains:
- `public/index.html` (replace)
- `tests/v07-ui.test.mjs` (new)
- `V07_RELEASE_NOTES.md` (new)

Upload these to the root of the existing GitHub repository while preserving folder paths, then deploy the latest commit on Render.

## Tests and limitations

Run `npm test` to execute the suite. UI behavior is covered by simulated browser tests; live Amazon stock is not verified and live retailer correctness still requires manual checks on the deployed host. Free Render hosting sleeps after inactivity and caches are ephemeral.

## v0.6

## What's new

- **Quick collection setup**: Click **Set up my collection** to check off modern campaign and investigator boxes independently, optionally expand legacy deluxe/Mythos packs and Return To boxes, and select other releases. Saves in the browser with no account. JSON remains an advanced backup/restore option.
- **Amazon US** is included in every product's manual market-search links. Amazon availability and prices are **not automatically verified**. No Amazon results are included in the live-stock badge, lowest-price calculations, or the ten direct retailer adapters without an authorized API integration.
- **Automatic retailer checks** run centrally on the server, one product per three minutes by default, while the server is awake. A visitor opening the site sees the shared cached summaries and a progress indicator; their browser polls the summary every 45 seconds while visible, not 114 retailer sweeps.
- Priority: 2026 core, current campaign/investigator boxes, modern boxes, then remaining retail products. All retail products are eventually considered while the server remains active.

## Important hosting caveat

The free Render instance sleeps when idle and its `/tmp` cache is ephemeral. It cannot maintain a 24/7 schedule or guarantee every product has recent verified stock. A persistent store and always-on worker will be needed for fully continuous checking. Statuses must remain timestamped and `unknown` when not verified.

## Update deployment

Upload the contents of this update archive into the existing GitHub repository, preserving directories and replacing existing files. Render's existing `npm start` configuration works. New `AUTO_CHECK_*` environment settings are optional: the backend has defaults, even if Render does not re-import the updated `render.yaml` environment block.

`AUTO_CHECK_ENABLED=0` disables the scheduler. `AUTO_CHECK_INTERVAL_MS` defaults to `180000` (3 minutes), minimum `60000`. `AUTO_CHECK_START_DELAY_MS` defaults to `15000` (15 seconds), minimum `5000`.

After deployment, open `/api/health` and confirm `version: 0.6.0` and an `autoStock` object. Visit `/api/stock-summary` and watch `autoStock.checkedProducts` increase while the instance remains awake. Do not interpret a deployment or automated unit-test pass as proof that all live retailer listings are accurate.

## v0.5

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

