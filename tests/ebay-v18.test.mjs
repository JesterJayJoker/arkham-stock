import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/g)?.at(-1)?.replace(/^<script>|<\/script>$/g,'');
// Extract pure functions rather than executing browser startup.
const start=html.indexOf('const EBAY_EXCLUSIONS=');const end=html.indexOf('function marketSearchUrl(',start);
const code=html.slice(start,end);
const context=vm.createContext({URLSearchParams,marketAlias:p=>p.name});
vm.runInContext(code,context);
const url=(name)=>new URL(vm.runInContext('ebayProductSearchUrl',context)({name}));
test('all product searches use Buy It Now and total price ascending',()=>{
 for(const name of ['Barkham Horror: The Meddling of Meowlathotep','Where Doom Awaits','Return to the Night of the Zealot','The Drowned City Campaign Expansion']){
  const u=url(name);assert.equal(u.searchParams.get('LH_BIN'),'1');assert.equal(u.searchParams.get('_sop'),'15');assert.match(u.searchParams.get('_nkw'),/divider/);assert.match(u.searchParams.get('_nkw'),/box only/);
 }
});
test('campaign search includes title, collection terms and sorting',()=>{
 const u=new URL(vm.runInContext('ebayCampaignSearchUrl',context)('The Dunwich Legacy'));
 assert.equal(u.searchParams.get('_sop'),'15');assert.match(u.searchParams.get('_nkw'),/The Dunwich Legacy/);assert.match(u.searchParams.get('_nkw'),/collection/);
});
test('legacy campaign guide groups individual packs and campaign search',()=>{
 assert.match(html,/Deluxe &amp; Mythos packs/);assert.match(html,/Search eBay for a complete original campaign collection/);
});
