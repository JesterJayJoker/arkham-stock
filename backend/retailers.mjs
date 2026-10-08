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

// Reject category, search, and editorial URLs before reading inventory.
export function isProductDetailUrl(value, retailerId) {
  try {
    const path=new URL(value).pathname;
    if(retailerId==='cardhaus')return /^\/[^/]+\/?$/.test(path) && !/^\/(?:board-games|search|shop|categories?|brands?|collections?|cart|account|pages?|blog|new-releases|preorders?)\/?$/i.test(path);
    if(retailerId==='nobleknight')return /^\/P\/\d+\//.test(path);
    if(retailerId==='miniaturemarket')return /\.html?$|\/product\//i.test(path);
    if(retailerId==='atomicempire')return /^\/Item\/\d+/.test(path);
    return /^\/products\/[^/]+\/?$/.test(path);
  }catch{return false;}
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

// Classify fulfillment only from product-specific copy, never site-wide footers.
export function fulfillmentFromProductText(text='') {
  const t=stripTags(String(text)).toLowerCase();
  if (/\bpre[- ]?order(?:s|ing)?\b|expected release date/.test(t))return {status:'preorder',notice:'Preorder: ships around release date'};
  if (/special order|back[- ]?order(?:ed)?|awaiting (?:a )?reprint|ship(?:s)? when (?:back )?in stock/.test(t))return {status:'backorder',notice:'Backorder or special order: not ready to ship'};
  if (/extended delay|extended fulfillment|may be delayed up to \d+ days|shipping delay|delayed shipping|typically ships? in \d+[-–]\d+ weeks?|additional (?:handling|processing) (?:of )?\d+[-–]\d+ (?:business )?days?/.test(t))return {status:'delayed',notice:'Extended shipping or handling delay: check retailer terms'};
  return {status:null,notice:null};
}
export function productCondition(title='',description='') {
  const t=stripTags(String(title)).toLowerCase();const d=stripTags(String(description)).toLowerCase();
  const incomplete=/(?:box\s*only|empty\s*box|no\s*cards|without\s*cards|missing\s*(?:cards|components|pieces)|incomplete|components?\s*only|parts?\s*only|replacement\s*(?:box|cards|parts)|box\s*and\s*insert\s*only)/i;
  if(incomplete.test(t)||incomplete.test(d.slice(0,350)))return {condition:'incomplete',completeness:'incomplete'};
  if(/(?:^|[\s(])(?:used|pre-owned|preowned|second-hand|secondhand|opened)(?:[\s):,-]|$)/i.test(t))return {condition:'used',completeness:'unknown'};
  if(/(?:^|[\s(])(?:new|factory sealed|brand new)(?:[\s):,-]|$)/i.test(t))return {condition:'new',completeness:'complete'};
  return {condition:'unknown',completeness:'unknown'};
}
function normalizeId(s){return String(s||'').replace(/[^a-z0-9]/gi,'').toUpperCase();}
function normalizeBarcode(s){return String(s||'').replace(/\D/g,'');}
// Only price an available variant matching the product identifiers.
export function selectShopifyVariant(variants,product) {
  const all=Array.isArray(variants)?variants:[];
  const sku=normalizeId(product.sku),upc=normalizeBarcode(product.upc);
  const identified=all.filter(v=>normalizeId(v.sku)||normalizeBarcode(v.barcode));
  let eligible=all;
  if(sku||upc){
    const matches=all.filter(v=>(sku&&normalizeId(v.sku)===sku)||(upc&&normalizeBarcode(v.barcode)===upc));
    if(matches.length)eligible=matches;
    else if(identified.length)eligible=[]; // Mixed variants with no identifier match: do not guess
  }
  if(!eligible.length)return {variant:null,reason:'No variant matches requested SKU/UPC'};
  const available=eligible.filter(v=>v.available===true);
  const pool=available.length?available:eligible;
  const priced=pool.filter(v=>Number.isFinite(Number(v.price))&&Number(v.price)>0);
  const variant=(priced.length?priced:pool).slice().sort((a,b)=>(Number(a.price)||Infinity)-(Number(b.price)||Infinity))[0];
  return {variant,available:available.length>0,reason:available.length?'Matching available variant':'Matching variants unavailable'};
}

function parseMoney(v) {
  if(v==null) return null;
  const n=Number(String(v).replace(/[^0-9.]/g,''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function parseGenericProductPage(url, retailerId, productId, confidence=0.75, signal=null) {
  const r=await get(url,'text/html,application/xhtml+xml',signal);
  if(!isProductDetailUrl(r.url,retailerId))throw new Error('Redirected to a category or non-product page');
  const html=await r.text();
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
  if(stock==='unknown'){stock='unknown';evidence='No product-specific structured availability; site-wide text is not stock proof';}
  const price=parseMoney(offer.price ?? findMeta(html,'product:price:amount') ?? null);
  const sku=ld.sku || (body.match(/\bSKU\s*[:#]?\s*([A-Z0-9-]{4,})/i)||[])[1] || null;
  const upc=ld.gtin13 || ld.gtin12 || (body.match(/\bUPC\s*[:#]?\s*(\d{10,14})/i)||[])[1] || null;
  const {condition,completeness}=productCondition(title,ld.description||'');
  const f=fulfillmentFromProductText(String(ld.description||''));
  if(stock==='in_stock' && f.status){stock=f.status;evidence+='; '+f.notice;}
  if(stock==='in_stock' && condition==='used')stock='used';
  return {productId,retailerId,titleSeen:title,skuSeen:sku,upcSeen:upc,price,shipping:null,stockStatus:stock,condition,completeness,fulfillmentNotice:f.notice,productUrl:r.url,checkedAt:new Date().toISOString(),confidence,evidence};
}

async function shopifySuggest(base, q, signal=null) {
  const url=`${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`;
  const r=await get(url,'application/json,text/plain,*/*',signal);
  const data=await r.json();
  const products=data?.resources?.results?.products || [];
  return products.map(p=>({title:p.title||p.name||'',url:abs(base,p.url),price:parseMoney(p.price),sku:p.sku||null})).filter(x=>x.url);
}

async function shopifyProductJson(url, retailerId, product, confidence, signal=null) {
  const u=new URL(url);u.search='';u.hash='';
  const jsUrl=u.href.replace(/\/$/,'')+'.js';
  try {
    // Boarding School Games places extended-delay warnings on its product page.
    // Request it alongside the variant data, without delaying the common path.
    const [r,pageResult]=await Promise.all([
      get(jsUrl,'application/json,text/plain,*/*',signal),
      retailerId==='boarding'?get(u.href,'text/html,application/xhtml+xml',signal).then(async r=>({url:r.url,html:await r.text()})).catch(()=>null):Promise.resolve(null)
    ]);
    const p=await r.json();
    const title=p.title||'';
    const selection=selectShopifyVariant(p.variants,product);
    const variant=selection.variant;
    if(!variant)return {productId:product.id,retailerId,titleSeen:title,skuSeen:null,upcSeen:null,price:null,shipping:null,stockStatus:'unknown',condition:'unknown',completeness:'unknown',fulfillmentNotice:null,productUrl:u.href,checkedAt:new Date().toISOString(),confidence:0,evidence:selection.reason};
    const cents=Number(variant.price);
    const price=Number.isFinite(cents)&&cents>0?cents/100:null;
    const desc=String(p.description||'');
    const conditionInfo=productCondition(title+' '+String(variant.title||''),desc);
    let stock=selection.available?'in_stock':'out_of_stock';
    const productHtml=pageResult && isProductDetailUrl(pageResult.url,retailerId)?pageResult.html:'';
    // Restrict page HTML to a product-specific extended-delay CTA, not a footer.
    const cta=productHtml.match(/(?:Add to Cart[^<]{0,120}(?:Extended Delay|Special Order|Backorder|Pre-?order)|(?:Extended Delay|Special Order|Backorder|Pre-?order)[^<]{0,120}Add to Cart|<[^>]*>[^<]{0,160}Extended Delay[^<]{0,120}<\/[^>]+>)/i)?.[0]||'';
    const f=fulfillmentFromProductText([title,variant.title,desc,cta].filter(Boolean).join(' '));
    let notice=f.notice;
    if(stock==='in_stock' && f.status)stock=f.status;
    if(stock==='in_stock' && conditionInfo.condition==='used')stock='used';
    if(stock==='in_stock' && retailerId==='boarding' && !productHtml && !f.status){
      stock='unknown';notice='Retailer fulfillment could not be checked';
    }
    return {productId:product.id,retailerId,titleSeen:title,skuSeen:variant.sku||null,upcSeen:variant.barcode||null,price,shipping:null,stockStatus:stock,condition:conditionInfo.condition,completeness:conditionInfo.completeness,fulfillmentNotice:notice,productUrl:u.href,checkedAt:new Date().toISOString(),confidence,evidence:(selection.available?'Shopify matching variant available':'Shopify matching variants unavailable')+(notice?'; '+notice:'')};
  } catch {
    return parseGenericProductPage(u.href,retailerId,product.id,confidence-0.05,signal);
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
  const listingPath=(()=>{try{return decodeURIComponent(new URL(offer.productUrl).pathname).replace(/[-_]/g,' ');}catch{return '';}})();
  const condition=productCondition(title+' '+listingPath);
  if(condition.condition==='incomplete'||offer.completeness==='incomplete')return {valid:false,reason:'Incomplete product or box-only listing'};
  if(/\b(?:bundle|lot of|collection of)\b/i.test(title) && !/\b(?:bundle|lot of|collection of)\b/i.test(product.name))return {valid:false,reason:'Mixed bundle rather than the requested individual product'};
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
  {id:'cardhaus',name:'Cardhaus',base:'https://www.cardhaus.com',kind:'bigcommerce',pathRx:/^\/(?!board-games|search|shop|cart|account|categories?|brands?|collections?|pages?|blog)[^/]+\/?$/i},
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
        if(!isProductDetailUrl(chosen.url,cfg.id)){lastError=new Error('Category page, not a product');all=all.filter(x=>x.url!==chosen.url);continue;}
        const conf=Math.max(0.55,chosen.matchScore);
        const offer = cfg.kind==='shopify' && /\/products\//.test(new URL(chosen.url).pathname)
          ? await shopifyProductJson(chosen.url,cfg.id,product,conf,signal)
          : await parseGenericProductPage(chosen.url,cfg.id,product.id,conf,signal);
        if(!isProductDetailUrl(offer.productUrl,cfg.id)){lastError=new Error('Final URL is not a product page');continue;}
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
