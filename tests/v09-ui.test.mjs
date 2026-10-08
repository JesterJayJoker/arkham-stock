import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('campaign guide groups Return To with original deluxe and Mythos packs',()=>{
  assert.match(html,/const original=\[\.\.\.legacy,\.\.\.returns\]/);
  assert.match(html,/Original releases &amp; Return To/);
  assert.match(html,/Optional Return To/);
  assert.match(html,/\['Deluxe Expansion','Mythos Pack','Return To'\]/);
});
test('homepage campaign sweep is opt-in, sequential, cancellable, and cache-aware',()=>{
  assert.match(html,/id="checkAllCampaigns"/);
  assert.match(html,/id="campaignBatchProgress"/);
  assert.match(html,/if\(campaignBatchStop\)break/);
  assert.match(html,/await checkProductStock\(p,\{silent:true,render:false\}\)/);
  assert.match(html,/cacheState!=='fresh'/);
});
test('Amazon search clearly does not claim verified stock',()=>{
  assert.match(html,/Amazon US · manual search/);
  assert.match(html,/Stock not verified/);
  assert.match(html,/Search Amazon ↗/);
});
