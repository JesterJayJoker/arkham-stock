# Arkham Stock v0.10 release notes

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
