import { chooseBestCandidate, normalizeTitle, scoreCandidate } from './matcher.mjs';

const UA = 'ArkhamStock/0.4 (+fan availability tracker; low-frequency requests)';
const FETCH_TIMEOUT = Number(process.env.RETAILER_FETCH_TIMEOUT_MS||4500);

function abs(base, href) {
  try { return new URL(href, base).href; } catch { return null; }
}
function decodeHtml(s='') {
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function stripTags(s='') { return decodeHtml(s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()); }

async function get(url, accept='text/html,application/xhtml+xml', externalSignal=null) {
  const ctl = new AbortController();
  const abort = ()=>ctl.abort();
  if(externalSignal?.aborted) ctl.abort();
  else externalSignal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(()=>ctl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, {headers:{'user-agent':UA,'accept':accept}, signal:ctl.signal, redirect:'follow'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener?.('abort',abort);
  }
}

function extractAnchors(html, base, pathRx) {
  const out=[];
  const rx=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=rx.exec(html))) {
    const url=abs(base,m[1]); if(!url) continue;
    if(pathRx && !pathRx.test(new URL(url).pathname)) continue;
    const title=stripTags(m[2]);
    if(!title) continue;
    out.push({title,url});
  }
  const seen=new Set(); return out.filter(x=>!seen.has(x.url)&&(seen.add(x.url),true));
}

function findMeta(html, prop) {
  const rx1=new RegExp(`<meta[^>]+(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]+content=["']([^"']+)["']`,'i');
  const rx2=new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i');
  return decodeHtml((html.match(rx1)||html.match(rx2)||[])[1]||'');
}

function jsonLdProducts(html) {
  const result=[];
  const rx=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while((m=rx.exec(html))) {
    try {
      const parsed=JSON.parse(m[1].trim());
      const walk=v=>{
        if(!v) return;
        if(Array.isArray(v)) return v.forEach(walk);
        if(typeof v==='object') {
          const type=v['@type'];
          if(type==='Product' || (Array.isArray(type)&&type.includes('Product'))) result.push(v);
          if(v['@graph']) walk(v['@graph']);
        }
      };
      walk(parsed);
    } catch {}
  }
  return result;
}

function stockFromText(text='') {
  const t=text.toLowerCase();
  if (/pre[- ]?order|preorder|expected release date/.test(t)) return {status:'preorder',evidence:'Product page labels the item as a pre-order'};
  if (/sold out|out of stock|currently unavailable|notify me when available|unavailable/.test(t)) return {status:'out_of_stock',evidence:'Product page contains an explicit sold-out/unavailable state'};
  if (/in stock and ready for shipping|ready to ship|online[^.]{0,80}in stock|add to cart|adding to cart/.test(t)) return {status:'in_stock',evidence:'Product page exposes an online purchase/ship signal'};
  if (/store availability|available for pickup|in-store pickup/.test(t) && /\bin stock\b/.test(t)) return {status:'unknown',evidence:'Only local/pickup stock could be verified'};
  if (/\bin in stock\b|current stock/.test(t)) return {status:'in_stock',evidence:'Product page explicitly states in stock'};
  return {status:'unknown',evidence:'No unambiguous stock signal found'};
}

function parseMoney(v) {
  if(v==null) return null;
  const n=Number(String(v).replace(/[^0-9.]/g,''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function parseGenericProductPage(url, retailerId, productId, confidence=0.75, signal=null) {
  const r=await get(url,'text/html,application/xhtml+xml',signal); const html=await r.text();
  const ld=jsonLdProducts(html)[0] || {};
  const offer=Array.isArray(ld.offers)?ld.offers[0]:(ld.offers||{});
  const body=stripTags(html);
  const title=ld.name || findMeta(html,'og:title') || stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'') || stripTags((html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const avail=String(offer.availability||'').toLowerCase();
  let stock='unknown';
  if(avail.includes('instock')) stock='in_stock';
  else if(avail.includes('outofstock') || avail.includes('soldout')) stock='out_of_stock';
  else if(avail.includes('preorder') || avail.includes('presale')) stock='preorder';
  let evidence='Structured availability metadata';
  if(stock==='unknown') { const cls=stockFromText(body); stock=cls.status; evidence=cls.evidence; }
  const price=parseMoney(offer.price ?? findMeta(html,'product:price:amount') ?? ((body.match(/(?:Price|Our Price)\s*[: ]\s*\$([0-9]+(?:\.[0-9]{2})?)/i)||[])[1]) ?? ((body.match(/\$([0-9]+(?:\.[0-9]{2})?)/)||[])[1]));
  const sku=ld.sku || (body.match(/\bSKU\s*[:#]?\s*([A-Z0-9-]{4,})/i)||[])[1] || null;
  const upc=ld.gtin13 || ld.gtin12 || (body.match(/\bUPC\s*[:#]?\s*(\d{10,14})/i)||[])[1] || null;
  return {productId,retailerId,titleSeen:title,skuSeen:sku,upcSeen:upc,price,shipping:null,stockStatus:stock,productUrl:r.url,checkedAt:new Date().toISOString(),confidence,evidence};
}

async function shopifySuggest(base, q, signal=null) {
  const url=`${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`;
  const r=await get(url,'application/json,text/plain,*/*',signal);
  const data=await r.json();
  const products=data?.resources?.results?.products || [];
  return products.map(p=>({title:p.title||p.name||'',url:abs(base,p.url),price:parseMoney(p.price),sku:p.sku||null})).filter(x=>x.url);
}

async function shopifyProductJson(url, retailerId, productId, confidence, signal=null) {
  const u=new URL(url); u.search=''; u.hash='';
  const jsUrl=u.href.replace(/\/$/,'')+'.js';
  try {
    const r=await get(jsUrl,'application/json,text/plain,*/*',signal);
    const p=await r.json();
    const vars=Array.isArray(p.variants)?p.variants:[];
    const available=vars.some(v=>v.available===true);
    const prices=vars.map(v=>Number(v.price)/100).filter(v=>Number.isFinite(v) && v > 0);
    const price=prices.length?Math.min(...prices):null;
    const variant=vars.find(v=>v.available)||vars[0]||{};
    const bodyTitle=p.title||'';
    const preorder=/pre[- ]?order/i.test(bodyTitle);
    return {productId,retailerId,titleSeen:bodyTitle,skuSeen:variant.sku||null,upcSeen:variant.barcode||null,price,shipping:null,stockStatus:preorder?'preorder':(available?'in_stock':'out_of_stock'),productUrl:u.href,checkedAt:new Date().toISOString(),confidence,evidence:preorder?'Product is labeled pre-order':(available?'Shopify variant reports available':'Shopify variants report unavailable')};
  } catch {
    return parseGenericProductPage(u.href,retailerId,productId,confidence-0.05,signal);
  }
}


// A search hit is not proof of product identity. Re-validate the retailer's
// actual product record, especially for overlapping Core Set editions.
export function verifyOfferIdentity(product, offer) {
  const title = String(offer.titleSeen || '');
  const sku = String(offer.skuSeen || '').replace(/[^a-z0-9]/gi,'').toUpperCase();
  const expectedSku = String(product.sku || '').replace(/[^a-z0-9]/gi,'').toUpperCase();
  const upc = String(offer.upcSeen || '').replace(/\D/g,'');
  const expectedUpc = String(product.upc || '').replace(/\D/g,'');
  if (expectedUpc && upc && expectedUpc !== upc) return {valid:false, reason:'UPC differs from requested product'};
  if (expectedSku && sku && expectedSku !== sku) return {valid:false, reason:'SKU differs from requested product'};
  const identifierMatch = Boolean((expectedUpc && upc && expectedUpc === upc) || (expectedSku && sku && expectedSku === sku));
  const t = normalizeTitle(title);
  if (/playmat|game mat|deck tome|sleeve|binder|token|insert|storage|upgrade kit/.test(t))
    return {valid:false,reason:'Accessory rather than requested game product'};
  // The 2016, 2021 revised, and 2026 core sets share ambiguous retailer titles.
  // An unqualified 'Core Set' listing is never enough to identify the edition.
  if (['core-2016','core-revised','core-2026'].includes(product.id)) {
    const is2016 = /(?:2016|original core|first edition|old core|1st edition)/.test(t);
    const isRevised = /(?:revised|2021)/.test(t);
    const is2026 = /(?:2026|chapter two|chapter 2|second chapter)/.test(t);
    if (product.id === 'core-2016' && (isRevised || is2026)) return {valid:false,reason:'Different Core Set edition'};
    if (product.id === 'core-revised' && (is2016 || is2026)) return {valid:false,reason:'Different Core Set edition'};
    if (product.id === 'core-2026' && (is2016 || isRevised)) return {valid:false,reason:'Different Core Set edition'};
    if (!identifierMatch && !(product.id === 'core-2016' ? is2016 : product.id === 'core-revised' ? isRevised : is2026))
      return {valid:false,reason:'Core Set edition not verified'};
  }
  if (!identifierMatch && scoreCandidate(product,{title}) < 0.70)
    return {valid:false,reason:'Retailer product title is insufficiently specific'};
  return {valid:true,reason:identifierMatch?'Retailer SKU/UPC verified':'Retailer edition/title verified'};
}

function retailerSearchUrl(cfg,q) {
  if(cfg.kind==='bigcommerce') return `${cfg.base}/search.php?search_query=${encodeURIComponent(q)}`;
  if(cfg.id==='miniaturemarket') return `${cfg.base}/searchresults/?q=${encodeURIComponent(q)}`;
  if(cfg.id==='nobleknight') return `${cfg.base}/Search?text=${encodeURIComponent(q)}`;
  if(cfg.id==='atomicempire') return `${cfg.base}/Item/List?cat=6773&pg=0&sz=100`;
  return `${cfg.base}/search?q=${encodeURIComponent(q)}&type=product`;
}

async function htmlSearch(cfg,q,signal=null) {
  const r=await get(retailerSearchUrl(cfg,q),'text/html,application/xhtml+xml',signal); const html=await r.text();
  return extractAnchors(html,cfg.base,cfg.pathRx);
}

export const RETAILERS = [
  {id:'gamersguild',name:'Gamers Guild AZ',base:'https://www.gamersguildusa.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'gamezenter',name:'Gamezenter',base:'https://gamezenter.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'asmodee',name:'Asmodee US',base:'https://store.asmodee.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'boarding',name:'Boarding School Games',base:'https://www.boardingschoolgames.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'cardhaus',name:'Cardhaus',base:'https://www.cardhaus.com',kind:'bigcommerce',pathRx:/^\/(?!search|cart|account|categories?\/)[^?#]+\/?$/},
  {id:'miniaturemarket',name:'Miniature Market',base:'https://www.miniaturemarket.com',kind:'html',pathRx:/\.(html?)$|\/product\//},
  {id:'nobleknight',name:'Noble Knight Games',base:'https://www.nobleknight.com',kind:'html',pathRx:/\/P\//},
  {id:'guardtower',name:'The Guardtower',base:'https://theguardtower.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'hauntedgamecafe',name:'The Haunted Game Cafe',base:'https://www.hauntedgamecafe.com',kind:'shopify',pathRx:/^\/products\//},
  {id:'atomicempire',name:'Atomic Empire',base:'https://www.atomicempire.com',kind:'collection',pathRx:/^\/Item\/\d+/}
];

export async function fetchOffer(product,cfg,{signal=null}={}) {
  const queries=[product.sku, ...(product.aliases||[]), product.name].filter(Boolean);
  let all=[];
  let lastError=null;
  for(const q of queries.slice(0,2)) {
    try {
      let candidates=[];
      if(cfg.kind==='shopify') {
        try { candidates=await shopifySuggest(cfg.base,q,signal); }
        catch { candidates=await htmlSearch(cfg,q,signal); }
      } else candidates=await htmlSearch(cfg,q,signal);
      all.push(...candidates);
      const chosen=chooseBestCandidate(product,all,product.sku?0.45:0.58);
      if(chosen) {
        const conf=Math.max(0.55,chosen.matchScore);
        const offer = cfg.kind==='shopify' && /\/products\//.test(new URL(chosen.url).pathname)
          ? await shopifyProductJson(chosen.url,cfg.id,product.id,conf,signal)
          : await parseGenericProductPage(chosen.url,cfg.id,product.id,conf,signal);
        const identity = verifyOfferIdentity(product,offer);
        if (!identity.valid) {
          lastError=new Error(identity.reason);
          continue;
        }
        offer.evidence += '; '+identity.reason;
        // Zero and missing prices are unknown, not free products.
        if (!(Number.isFinite(offer.price) && offer.price > 0)) offer.price=null;
        return offer;
      }
    } catch(e) { lastError=e; if(signal?.aborted) break; }
  }
  const error=signal?.aborted?'Retailer time budget exceeded':(lastError?.message||'No matching product page found');
  return {productId:product.id,retailerId:cfg.id,titleSeen:null,skuSeen:null,upcSeen:null,price:null,shipping:null,stockStatus:'unknown',productUrl:retailerSearchUrl(cfg,product.name),checkedAt:new Date().toISOString(),confidence:0,evidence:'No verified matching product page',error};
}

export function retailerSummary(){ return RETAILERS.map(({id,name,base,kind})=>({id,name,base,kind})); }
