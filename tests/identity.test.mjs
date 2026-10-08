import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOfferIdentity} from '../backend/retailers.mjs';

const core2016={id:'core-2016',name:'Arkham Horror: The Card Game Core Set (2016)',aliases:['Arkham Horror The Card Game Core Set']};
const core2026={id:'core-2026',name:'Arkham Horror: The Card Game Core Set (2026)',sku:'AHC100EN',upc:'841333133139'};
test('legacy 2016 core rejects generic edition-ambiguous retailer title',()=>{
  assert.equal(verifyOfferIdentity(core2016,{titleSeen:'Arkham Horror The Card Game Core Set'}).valid,false);
});
test('legacy 2016 core rejects explicitly revised core',()=>{
  assert.equal(verifyOfferIdentity(core2016,{titleSeen:'Arkham Horror Revised Core Set 2021'}).valid,false);
});
test('legacy 2016 core accepts explicitly identified original core',()=>{
  assert.equal(verifyOfferIdentity(core2016,{titleSeen:'Arkham Horror The Card Game Original Core Set (2016)'}).valid,true);
});
test('2026 core rejects conflicting SKU even when title matches',()=>{
  assert.equal(verifyOfferIdentity(core2026,{titleSeen:'Arkham Horror Core Set (2026)',skuSeen:'AHC001EN'}).valid,false);
});
test('2026 core accepts matching SKU with generic retailer title',()=>{
  assert.equal(verifyOfferIdentity(core2026,{titleSeen:'Arkham Horror Core Set',skuSeen:'AHC100EN'}).valid,true);
});
test('2026 core rejects ambiguous core without identifiers',()=>{
  assert.equal(verifyOfferIdentity(core2026,{titleSeen:'Arkham Horror Core Set'}).valid,false);
});
test('2026 core rejects accessories even with matching SKU',()=>{
  assert.equal(verifyOfferIdentity(core2026,{titleSeen:'Arkham Horror Core Set Storage Insert',skuSeen:'AHC100EN'}).valid,false);
});
