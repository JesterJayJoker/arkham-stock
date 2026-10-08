import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoStockScheduler,prioritizedRetailProducts} from '../backend/auto-stock.mjs';
const products=[{id:'legacy',name:'Old Mythos',retail:true,status:'legacy-oop',category:'Mythos Pack'},{id:'core-2026',name:'Core',retail:true,status:'current',category:'Core'},{id:'modern',name:'Modern Campaign',retail:true,status:'chapter-one',category:'Campaign Expansion'},{id:'pnp',name:'Digital',retail:false}];
function fixture(){
  const cache=new Map();const calls=[];let pendingTimer;
  const stock={getCachedSummary:()=>[...cache].map(([productId,s])=>({productId,...s})),getOffers:async p=>{calls.push(p.id);cache.set(p.id,{cacheAgeMs:0});}};
  const scheduler=createAutoStockScheduler({products,stock,productMap:new Map(products.map(p=>[p.id,p])),intervalMs:200000,startDelayMs:1000,setTimer:(fn,ms)=>{pendingTimer={fn,ms};return 1;},clearTimer:()=>{pendingTimer=null;}});
  return {scheduler,calls,cache,get timer(){return pendingTimer;}};
}
test('scheduler prioritizes current core and skips nonretail products',()=>{
  assert.deepEqual(prioritizedRetailProducts(products).map(p=>p.id),['core-2026','modern','legacy']);
});
test('scheduler performs one background product check per tick, not all products',async()=>{
  const f=fixture();f.scheduler.start();assert.equal(f.timer.ms,1000);
  await f.scheduler.tick();assert.deepEqual(f.calls,['core-2026']);
  await f.scheduler.tick();assert.deepEqual(f.calls,['core-2026','modern']);
  assert.equal(f.scheduler.status().checkedProducts,2);
  assert.equal(f.scheduler.status().retailProducts,3);
  f.scheduler.stop();
});
test('scheduler skips all products when cached checks remain fresh',async()=>{
  const f=fixture();f.scheduler.start();
  for(let i=0;i<3;i++)await f.scheduler.tick();
  await f.scheduler.tick();assert.equal(f.calls.length,3);f.scheduler.stop();
});
