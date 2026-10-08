# Arkham Stock v0.8 — catalog organization and responsiveness

- Added **Return to the Night of the Zealot** as a distinct Return To box (2018), without marking it included in any Core Set.
- Renamed Rare / OOP browsing to **Legacy releases**. Legacy Core Sets remain visible on their own; Deluxe Expansions and Mythos Packs are collapsed into separate expandable groups. Return To stays in its own tab.
- Added **Investigator Expansions** and **Investigator Decks** sub-tabs.
- Reduced UI lag by limiting the master catalog to 24 cards initially, providing Show more, avoiding rendering unopened legacy sections, debouncing text search, and skipping unnecessary 45-second stock-summary rerenders when only cache ages change.
- Retained no-login ownership tracking and server-side stock cache.

## Verification

Run `npm test`. The suite contains 42 tests, including new checks for Return To catalog inclusion, legacy grouping, investigator sub-tabs and progressive rendering.

**Deployment:** Upload the changed files into the same repository paths. The server-side catalog and the browser's embedded catalog must both be updated. Then deploy the latest commit in Render. Live retailer accuracy remains a separate verification task.
