// Background retailer checks are shared by visitors, never per-page 114-product sweeps.
export function prioritizedRetailProducts(products){
  const rank=p=>p.id==='core-2026'?0:(p.status==='current'&&['Campaign Expansion','Investigator Expansion'].includes(p.category))?1:['Campaign Expansion','Investigator Expansion'].includes(p.category)?2:p.status==='current'?3:4;
  return products.filter(p=>p.retail).sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
}
export function createAutoStockScheduler({products,stock,productMap,intervalMs=180000,startDelayMs=15000,freshMs=7200000,clock=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
  const ordered=prioritizedRetailProducts(products);
  let timer=null,running=false,stopped=true,lastProductId=null,lastCheckedAt=null,lastError=null,checksAttempted=0;
  function status(){
    const summaries=stock.getCachedSummary(productMap),checked=new Map(summaries.map(s=>[s.productId,s]));
    const fresh=ordered.filter(p=>{const s=checked.get(p.id);return s&&s.cacheAgeMs<freshMs;}).length;
    return {enabled:!stopped,currentlyChecking:running,lastProductId,lastCheckedAt,lastError,checksAttempted,retailProducts:ordered.length,checkedProducts:checked.size,freshProducts:fresh,intervalMs};
  }
  function selectNext(){
    const cache=new Map(stock.getCachedSummary(productMap).map(s=>[s.productId,s]));
    const missing=ordered.find(p=>!cache.has(p.id));
    if(missing)return missing;
    const expired=ordered.filter(p=>(cache.get(p.id)?.cacheAgeMs??Infinity)>=freshMs);
    return expired.sort((a,b)=>cache.get(b.id).cacheAgeMs-cache.get(a.id).cacheAgeMs)[0]||null;
  }
  async function tick(){
    if(stopped||running)return;
    running=true;
    try{
      const p=selectNext();
      if(p){lastProductId=p.id;checksAttempted++;await stock.getOffers(p,{allowStale:false});lastCheckedAt=new Date(clock()).toISOString();lastError=null;}
    }catch(e){lastError=e?.message||String(e);}
    finally{running=false;if(!stopped)timer=setTimer(tick,intervalMs);}
  }
  function start(){if(!stopped)return;stopped=false;timer=setTimer(tick,startDelayMs);}
  function stop(){stopped=true;if(timer!=null)clearTimer(timer);timer=null;}
  return {start,stop,tick,status,selectNext};
}
