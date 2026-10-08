# Arkham Stock v0.7 — collection and navigation improvements

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
