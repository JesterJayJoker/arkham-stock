import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initCache,clearCache,setCache} from '../backend/cache.mjs';
import {createStockService} from '../backend/stock.mjs';

function tempCache(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arkham-stock-'));
  initCache(path.join(dir,'cache.json'));
  clearCache();
  return dir;
}

const product={id:'x',name:'Test Product'};
const retailers=[{id:'a'},{id:'b'}];

test('concurrent callers coalesce into one retailer refresh',async()=>{
  const dir=tempCache(); let calls=0;
  const fetchOffer=async(p,r)=>{calls++; await new Promise(x=>setTimeout(x,30)); return {productId:p.id,retailerId:r.id,confidence:1,stockStatus:'in_stock',price:r.id==='a'?10:12};};
  const s=createStockService({retailers,fetchOffer,freshMs:1000,staleMs:5000,maxParallel:2});
  const [a,b,c]=await Promise.all([s.getOffers(product),s.getOffers(product),s.getOffers(product)]);
  assert.equal(calls,2,'two retailers should be queried once each, not once per caller');
  assert.equal(a.bestPrice,10); assert.equal(b.bestPrice,10); assert.equal(c.bestPrice,10);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('fresh cache avoids retailer requests',async()=>{
  const dir=tempCache(); let calls=0;
  setCache('offers:x',{productId:'x',productName:'Test Product',checkedAt:new Date().toISOString(),offers:[],inStock:[],preorder:[],bestPrice:null,bestOffer:null});
  const s=createStockService({retailers,fetchOffer:async()=>{calls++;return {};},freshMs:100000,staleMs:200000});
  const r=await s.getOffers(product);
  assert.equal(r.cacheState,'fresh'); assert.equal(calls,0);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('stale cache returns immediately and starts one background refresh',async()=>{
  const dir=tempCache(); let calls=0;
  setCache('offers:x',{productId:'x',productName:'Test Product',checkedAt:new Date(Date.now()-5000).toISOString(),offers:[],inStock:[],preorder:[],bestPrice:null,bestOffer:null},Date.now()-5000);
  const s=createStockService({retailers,fetchOffer:async(p,r)=>{calls++;await new Promise(x=>setTimeout(x,25));return {productId:p.id,retailerId:r.id,confidence:1,stockStatus:'out_of_stock',price:null};},freshMs:1000,staleMs:10000,maxParallel:2});
  const [a,b]=await Promise.all([s.getOffers(product),s.getOffers(product)]);
  assert.equal(a.cacheState,'stale'); assert.equal(b.cacheState,'stale'); assert.equal(a.refreshing,true);
  await new Promise(x=>setTimeout(x,80));
  assert.equal(calls,2,'background refresh should query each retailer once');
  fs.rmSync(dir,{recursive:true,force:true});
});

test('retailer time budget aborts a hung adapter and still returns a result',async()=>{
  const dir=tempCache();
  const fetchOffer=async(p,r,{signal}={})=>new Promise((resolve,reject)=>{
    const onAbort=()=>{const e=new Error('aborted'); e.name='AbortError'; reject(e);};
    if(signal?.aborted) return onAbort();
    signal?.addEventListener('abort',onAbort,{once:true});
  });
  const s=createStockService({retailers:[{id:'slow',base:'https://example.invalid'}],fetchOffer,freshMs:1000,staleMs:5000,maxParallel:1,retailerBudgetMs:20});
  const start=Date.now();
  const r=await s.getOffers(product);
  assert.ok(Date.now()-start<500,'hung retailer should be bounded');
  assert.equal(r.offers[0].stockStatus,'unknown');
  assert.match(r.offers[0].error,/time budget/i);
  fs.rmSync(dir,{recursive:true,force:true});
});
