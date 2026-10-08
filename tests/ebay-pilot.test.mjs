import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('eBay source exists and links to Buy It Now search',()=>{assert.match(ui,/kind:'ebay'/);assert.match(ui,/www\.ebay\.com\/sch\/i\.html/);assert.match(ui,/LH_BIN:'1'/);});
test('eBay links explicitly say listings unverified',()=>{assert.match(ui,/Listings unverified/);assert.match(ui,/Search eBay Buy It Now/);});
test('eBay is not added as a direct stock adapter',()=>{const r=fs.readFileSync(new URL('../backend/retailers.mjs',import.meta.url),'utf8');assert.doesNotMatch(r,/id:'ebay'/);});
