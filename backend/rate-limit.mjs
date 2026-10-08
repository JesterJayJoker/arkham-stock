export function createRateLimiter({windowMs=60_000,max=120,maxEntries=10_000}={}){
  const buckets = new Map();
  function prune(now){
    if(buckets.size < maxEntries) return;
    for(const [key,b] of buckets){
      if(now - b.startedAt >= windowMs) buckets.delete(key);
      if(buckets.size < maxEntries * 0.8) break;
    }
  }
  return {
    check(key='unknown', now=Date.now()){
      prune(now);
      let b = buckets.get(key);
      if(!b || now - b.startedAt >= windowMs){
        b={startedAt:now,count:0}; buckets.set(key,b);
      }
      b.count++;
      const remaining=Math.max(0,max-b.count);
      const resetAt=b.startedAt+windowMs;
      return {allowed:b.count<=max,remaining,limit:max,resetAt,retryAfterMs:Math.max(0,resetAt-now)};
    },
    stats(){return {buckets:buckets.size,windowMs,max};},
    clear(){buckets.clear();}
  };
}
