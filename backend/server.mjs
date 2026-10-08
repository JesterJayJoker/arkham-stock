import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, PRODUCT_MAP } from './catalog.mjs';
import { RETAILERS, fetchOffer, retailerSummary } from './retailers.mjs';
import { initCache, clearCache, cacheStats } from './cache.mjs';
import { createStockService } from './stock.mjs';
import { createRateLimiter } from './rate-limit.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.join(__dirname,'../public');
const PORT=Number(process.env.PORT||8787);
const CACHE_MS=Number(process.env.OFFER_CACHE_MS||2*60*60*1000);
const STALE_MS=Number(process.env.OFFER_STALE_MS||24*60*60*1000);
const MAX_PARALLEL=Number(process.env.MAX_PARALLEL||3);
const RETAILER_BUDGET_MS=Number(process.env.RETAILER_BUDGET_MS||8000);
const RATE_LIMIT_MAX=Number(process.env.RATE_LIMIT_MAX||120);
const RATE_LIMIT_WINDOW_MS=Number(process.env.RATE_LIMIT_WINDOW_MS||60_000);
const CACHE_FILE=process.env.CACHE_FILE||path.join(__dirname,'../data/cache-runtime.json');
const ADMIN_KEY=process.env.ADMIN_KEY||'';
const TRUST_PROXY=process.env.TRUST_PROXY==='1';

initCache(CACHE_FILE);
const stock=createStockService({retailers:RETAILERS,fetchOffer,freshMs:CACHE_MS,staleMs:STALE_MS,maxParallel:MAX_PARALLEL,retailerBudgetMs:RETAILER_BUDGET_MS});
const limiter=createRateLimiter({windowMs:RATE_LIMIT_WINDOW_MS,max:RATE_LIMIT_MAX});

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const SECURITY={
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'referrer-policy':'strict-origin-when-cross-origin',
  'permissions-policy':'camera=(), microphone=(), geolocation=()',
  'cross-origin-resource-policy':'same-origin'
};
function headers(extra={}){return {...SECURITY,...extra};}
function send(res,status,body,type='application/json; charset=utf-8',extra={}){
  res.writeHead(status,headers({'content-type':type,'cache-control':'no-store',...extra}));
  res.end(typeof body==='string'?body:JSON.stringify(body,null,2));
}
function safeFile(urlPath){let rel=decodeURIComponent(urlPath.split('?')[0]); if(rel==='/'||!rel)rel='/index.html'; const f=path.normalize(path.join(ROOT,rel)); return f.startsWith(ROOT)?f:null;}
function requestIp(req){
  if(TRUST_PROXY){const xf=String(req.headers['x-forwarded-for']||'').split(',')[0].trim(); if(xf) return xf;}
  return req.socket.remoteAddress||'unknown';
}
function rateLimit(req,res){
  if(!req.url?.startsWith('/api/')) return true;
  const r=limiter.check(requestIp(req));
  res.setHeader('x-ratelimit-limit',String(r.limit));
  res.setHeader('x-ratelimit-remaining',String(r.remaining));
  if(!r.allowed){
    send(res,429,{error:'Too many API requests. Please retry shortly.'},undefined,{'retry-after':String(Math.max(1,Math.ceil(r.retryAfterMs/1000)))});
    return false;
  }
  return true;
}
function timingSafeEqualString(a,b){
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function isAdmin(req){
  if(!ADMIN_KEY) return false;
  const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const header=String(req.headers['x-admin-key']||'');
  return timingSafeEqualString(bearer,ADMIN_KEY)||timingSafeEqualString(header,ADMIN_KEY);
}
function adminGuard(req,res){
  if(!ADMIN_KEY){send(res,404,{error:'Not found'});return false;}
  if(!isAdmin(req)){send(res,401,{error:'Unauthorized'});return false;}
  return true;
}

const server=http.createServer(async(req,res)=>{
  try{
    if(!rateLimit(req,res)) return;
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/api/health') return send(res,200,{ok:true,version:'0.4.0',products:PRODUCTS.length,retailers:retailerSummary(),cache:cacheStats(),inFlight:stock.inFlightCount(),rateLimit:limiter.stats(),loginRequired:false});
    if(u.pathname==='/api/products') return send(res,200,PRODUCTS);
    if(u.pathname==='/api/retailers') return send(res,200,retailerSummary());
    if(u.pathname==='/api/stock-summary') return send(res,200,{generatedAt:new Date().toISOString(),items:stock.getCachedSummary(PRODUCT_MAP)});

    const offerMatch=u.pathname.match(/^\/api\/offers\/([^/]+)$/);
    if(offerMatch){
      const product=PRODUCT_MAP.get(decodeURIComponent(offerMatch[1]));
      if(!product)return send(res,404,{error:'Unknown product'});
      if(!product.retail)return send(res,200,{productId:product.id,offers:[],inStock:[],preorder:[],message:'Not a retail product'});
      const data=await stock.getOffers(product);
      return send(res,200,data);
    }

    const refreshMatch=u.pathname.match(/^\/api\/admin\/refresh\/([^/]+)$/);
    if(refreshMatch && req.method==='POST'){
      if(!adminGuard(req,res)) return;
      const product=PRODUCT_MAP.get(decodeURIComponent(refreshMatch[1]));
      if(!product)return send(res,404,{error:'Unknown product'});
      const data=await stock.refresh(product);
      return send(res,200,data);
    }
    if(u.pathname==='/api/admin/cache/clear' && req.method==='POST'){
      if(!adminGuard(req,res)) return;
      clearCache(); return send(res,200,{ok:true});
    }

    if(u.pathname.startsWith('/api/')) return send(res,404,{error:'Not found'});

    const f=safeFile(u.pathname);
    if(!f||!fs.existsSync(f)||fs.statSync(f).isDirectory())return send(res,404,'Not found','text/plain; charset=utf-8');
    const ext=path.extname(f);
    const cacheControl=ext==='.html'?'no-cache':'public, max-age=3600';
    res.writeHead(200,headers({'content-type':types[ext]||'application/octet-stream','cache-control':cacheControl}));
    fs.createReadStream(f).pipe(res);
  }catch(e){send(res,500,{error:'Internal server error',detail:process.env.NODE_ENV==='development'?e.message:undefined});}
});

if(process.env.NODE_ENV!=='test') server.listen(PORT,()=>console.log(`Arkham Stock v0.4 running at http://localhost:${PORT}`));
export {server};
