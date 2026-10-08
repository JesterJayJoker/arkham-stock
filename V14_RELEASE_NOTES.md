# Arkham Stock v0.14 — Rare-product identifier and matching update

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
