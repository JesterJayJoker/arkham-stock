import { getCacheEntry, setCache, cacheEntries } from './cache.mjs';

export function createStockService({retailers,fetchOffer,freshMs=2*60*60*1000,staleMs=24*60*60*1000,maxParallel=3,retailerBudgetMs=8000}={}){
  const inFlight = new Map();

  async function pooled(items,worker,limit=maxParallel){
    const out=new Array(items.length); let i=0;
    async function runner(){
      while(true){
        const n=i++; if(n>=items.length) return;
        try{out[n]=await worker(items[n]);}
        catch(e){out[n]={error:e?.message||String(e)};}
      }
    }
    await Promise.all(Array.from({length:Math.min(Math.max(1,limit),items.length)},runner));
    return out;
  }

  async function doRefresh(product){
    const key='offers:'+product.id;
    if(inFlight.has(key)) return inFlight.get(key);
    const promise=(async()=>{
      const offers=await pooled(retailers,async cfg=>{
        const ctl=new AbortController();
        const timer=setTimeout(()=>ctl.abort(),retailerBudgetMs);
        try{return await fetchOffer(product,cfg,{signal:ctl.signal});}
        catch(e){return {productId:product.id,retailerId:cfg.id,titleSeen:null,price:null,stockStatus:'unknown',productUrl:cfg.base||null,checkedAt:new Date().toISOString(),confidence:0,evidence:'Retailer check timed out or failed',error:e?.name==='AbortError'?'Retailer time budget exceeded':(e?.message||String(e))};}
        finally{clearTimeout(timer);}
      });
      const verified=offers.filter(o=>o && o.confidence>=0.55 && o.stockStatus!=='unknown');
      const byPrice=(a,b)=>(a.price??Infinity)-(b.price??Infinity);
      const inStock=verified.filter(o=>o.stockStatus==='in_stock').sort(byPrice);
      const preorder=verified.filter(o=>o.stockStatus==='preorder').sort(byPrice);
      const outOfStock=verified.filter(o=>o.stockStatus==='out_of_stock').sort(byPrice);
      const value={
        productId:product.id,
        productName:product.name,
        checkedAt:new Date().toISOString(),
        offers,
        inStock,
        preorder,
        outOfStock,
        bestPrice:inStock[0]?.price??null,
        bestOffer:inStock[0]??null
      };
      setCache(key,value);
      return {...value,cached:false,cacheState:'refreshed',refreshing:false,cacheAgeMs:0};
    })().finally(()=>inFlight.delete(key));
    inFlight.set(key,promise);
    return promise;
  }

  function decorate(value,entry,state,refreshing=false){
    return {...value,cached:true,cacheState:state,refreshing,cacheAgeMs:Math.max(0,Date.now()-entry.time)};
  }

  async function getOffers(product,{force=false,allowStale=true}={}){
    const key='offers:'+product.id;
    const entry=getCacheEntry(key);
    const age=entry?Date.now()-entry.time:Infinity;
    if(!force && entry && age<=freshMs) return decorate(entry.value,entry,'fresh',false);
    if(!force && allowStale && entry && age<=staleMs){
      if(!inFlight.has(key)) doRefresh(product).catch(()=>{});
      return decorate(entry.value,entry,'stale',true);
    }
    return doRefresh(product);
  }

  function getCachedSummary(productMap){
    const items=[];
    for(const entry of cacheEntries('offers:')){
      const productId=entry.key.slice('offers:'.length);
      const product=productMap.get(productId);
      if(!product) continue;
      const value=entry.value||{};
      items.push({
        productId,
        productName:product.name,
        checkedAt:value.checkedAt||null,
        cacheAgeMs:entry.ageMs,
        cacheState:entry.ageMs<=freshMs?'fresh':(entry.ageMs<=staleMs?'stale':'expired'),
        inStockCount:Array.isArray(value.inStock)?value.inStock.length:0,
        preorderCount:Array.isArray(value.preorder)?value.preorder.length:0,
        bestPrice:value.bestPrice??null,
        bestOffer:value.bestOffer??null
      });
    }
    return items.sort((a,b)=>a.productName.localeCompare(b.productName));
  }

  return {getOffers,refresh:product=>getOffers(product,{force:true,allowStale:false}),getCachedSummary,inFlightCount:()=>inFlight.size};
}
