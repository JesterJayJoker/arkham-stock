# Arkham Stock v0.11 — chapter-first browsing and collection setup

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
