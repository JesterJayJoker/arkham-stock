# Arkham Stock v0.15 — mobile usability

- Mobile product filters start collapsed and open using an accessible Filters button. Apply and Clear All preserve existing filter logic; active-filter count is displayed. Desktop filter layout is unchanged.
- Collection setup has collapsible Bulk actions. On narrow screens, the checklist occupies the scrollable middle region, with a compact, persistent Save/Cancel footer.
- Campaign, product, and collection dialogs lock background page scrolling. Closing the final dialog restores the original scroll position.
- The original ownership, wishlist, JSON backup/restore, retailer stock checking and chapter navigation are unchanged.

## Verification

84 automated tests passed. Local API smoke tests and JavaScript syntax checks were performed. Live mobile browser navigation was blocked by the execution environment; verify scrolling and touch behavior on the deployed site.
