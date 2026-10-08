import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreCandidate,chooseBestCandidate,normalizeTitle} from '../backend/matcher.mjs';

test('normalizes punctuation and accents',()=>{
  assert.equal(normalizeTitle('André Patel – Investigator Deck'), 'andre patel investigator deck');
});

test('prefers exact current core alias over accessories',()=>{
  const p={name:'Arkham Horror: The Card Game Core Set (2026)',aliases:['Arkham Horror: The Card Game Core Set 2026'],sku:'AHC100EN'};
  const best=chooseBestCandidate(p,[
    {title:'Arkham Horror: The Card Game - Core Set',url:'https://x/products/core',sku:'AHC100EN'},
    {title:'Arkham Horror: The Card Game Core Set Insert',url:'https://x/products/insert'}
  ]);
  assert.equal(best.url,'https://x/products/core');
  assert.ok(best.matchScore>=0.99);
});

test('SKU can disambiguate generic titles',()=>{
  const p={name:'Traces to Nowhere',aliases:['Traces to Nowhere Scenario Pack'],sku:'AHC107EN'};
  const s=scoreCandidate(p,{title:'Arkham Horror Scenario Pack',sku:'AHC107EN'});
  assert.equal(s,1);
});

test('rejects weak unrelated candidates',()=>{
  const p={name:'The Dunwich Legacy Campaign Expansion'};
  const best=chooseBestCandidate(p,[{title:'Marvel Champions Campaign Expansion',url:'https://x/a'}]);
  assert.equal(best,null);
});
