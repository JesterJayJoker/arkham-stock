# Arkham Stock v0.6 — collection checklist, Amazon search, automatic availability

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
