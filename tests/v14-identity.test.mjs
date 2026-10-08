import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCT_MAP} from '../backend/catalog.mjs';
import {scoreCandidate,chooseBestCandidate} from '../backend/matcher.mjs';
import {verifyOfferIdentity} from '../backend/retailers.mjs';
const examples=[
 ['standalone-barkham','PAHC01','841333111410'],
 ['dunwich-where-doom-awaits','AHC07','841333102357'],
 ['return-notz','AHC26','841333105266'],
];
for(const [id,sku,upc] of examples){
 test(`${id} has verified catalog identifiers`,()=>{
  const p=PRODUCT_MAP.get(id);assert.ok(p);assert.equal(p.sku,sku);assert.equal(p.upc,upc);
 });
 test(`${id} rejects conflicting retailer identifiers`,()=>{
  const p=PRODUCT_MAP.get(id);
  assert.equal(scoreCandidate(p,{title:p.name,sku:'WRONG',upc}),0);
  assert.equal(scoreCandidate(p,{title:p.name,sku,upc:'000000000000'}),0);
  assert.equal(verifyOfferIdentity(p,{titleSeen:p.name,skuSeen:'WRONG',upcSeen:upc}).valid,false);
  assert.equal(verifyOfferIdentity(p,{titleSeen:p.name,skuSeen:sku,upcSeen:'000000000000'}).valid,false);
 });
 test(`${id} accepts matching identifiers`,()=>{
  const p=PRODUCT_MAP.get(id);
  assert.equal(verifyOfferIdentity(p,{titleSeen:p.name,skuSeen:sku,upcSeen:upc}).valid,true);
 });
}
test('a box-only listing cannot be the best matching Return To product',()=>{
 const p=PRODUCT_MAP.get('return-notz');
 assert.equal(chooseBestCandidate(p,[{title:p.name+' - Box Only',url:'https://example.com/box-only'}]),null);
});
test('2026 Core Set remains separate from original Core Set',()=>{
 const p=PRODUCT_MAP.get('core-2026');
 assert.equal(verifyOfferIdentity(p,{titleSeen:'Arkham Horror Core Set (2016)'}).valid,false);
});
