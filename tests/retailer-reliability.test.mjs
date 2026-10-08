import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { selectShopifyVariant, productCondition, fulfillmentFromProductText, verifyOfferIdentity, fetchOffer, isProductDetailUrl } from '../backend/retailers.mjs';
import { initCache, clearCache } from '../backend/cache.mjs';
import { createStockService } from '../backend/stock.mjs';

const product={id:'drowned-campaign',name:'The Drowned City Campaign Expansion',sku:'AHC84EN',upc:'841333131111',aliases:['Arkham Horror: LCG - The Drowned City: Campaign Expansion']};
function fakeStore({variants,description='',html='<h1>The Drowned City Campaign Expansion</h1>'}) {
  return http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/search/suggest.json'){
      res.setHeader('content-type','application/json');
      return res.end(JSON.stringify({resources:{results:{products:[{title:'The Drowned City Campaign Expansion',url:'/products/drowned'}]}}}));
    }
    if(u.pathname==='/products/drowned.js'){
      res.setHeader('content-type','application/json');
      return res.end(JSON.stringify({title:'The Drowned City Campaign Expansion',description,variants}));
    }
    if(u.pathname==='/products/drowned'){
      res.setHeader('content-type','text/html');return res.end(html);
    }
    res.statusCode=404;res.end('not found');
  });
}
async function withStore(config,fn){
  const server=fakeStore(config);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {return await fn(`http://127.0.0.1:${server.address().port}`);}
  finally {await new Promise(resolve=>server.close(resolve));}
}
const variant=(price,available,sku='AHC84EN',barcode='841333131111')=>({price,available,sku,barcode,title:'Default Title'});

test('only matching available Shopify variant sets in-stock price',async()=>{
  const s=selectShopifyVariant([variant(1000,false),variant(5262,true)],product);
  assert.equal(s.available,true);assert.equal(s.variant.price,5262);
});
test('mismatched SKU/UPC variants fail closed',()=>{
  const s=selectShopifyVariant([variant(1000,true,'AHC83EN','000000000000')],product);
  assert.equal(s.variant,null);
});
test('unavailable matching variant is not overridden by unrelated available variant',()=>{
  const s=selectShopifyVariant([variant(7499,false),variant(1000,true,'AHC83EN','000000000000')],product);
  assert.equal(s.available,false);assert.equal(s.variant.price,7499);
});
test('product fulfillment classifier separates delay, backorder, and preorder',()=>{
  assert.equal(fulfillmentFromProductText('Add to Cart - Extended Delay (READ BELOW)').status,'delayed');
  assert.equal(fulfillmentFromProductText('Typically ships in 1–2 weeks, may be delayed up to 30 days').status,'delayed');
  assert.equal(fulfillmentFromProductText('Special Order. Ships when back in stock').status,'backorder');
  assert.equal(fulfillmentFromProductText('Pre-order now!').status,'preorder');
});
test('incomplete or box-only collector listings are rejected',()=>{
  for(const title of ['Return to the Night of the Zealot - Box Only','Return to the Night of the Zealot (missing cards)','Return to the Night of the Zealot - components only']){
    assert.equal(productCondition(title).condition,'incomplete');
    assert.equal(verifyOfferIdentity({name:'Return to the Night of the Zealot'},{titleSeen:title}).valid,false);
  }
  assert.equal(productCondition('Return to the Night of the Zealot - Used').condition,'used');
});
test('Cardhaus category pages are never product detail pages',()=>{
  assert.equal(isProductDetailUrl('https://www.cardhaus.com/board-games/horror/','cardhaus'),false);
});
test('Boarding School Games extended-delay CTA prevents ordinary in-stock classification',async()=>{
  await withStore({variants:[variant(5262,true)],html:'<h1>The Drowned City Campaign Expansion</h1><button>Add to Cart - Extended Delay (READ BELOW)</button>'},async base=>{
    const offer=await fetchOffer(product,{id:'boarding',base,kind:'shopify',pathRx:/^\/products\//});
    assert.equal(offer.stockStatus,'delayed');assert.equal(offer.price,52.62);
    assert.match(offer.fulfillmentNotice,/delay/i);
  });
});
test('Shopify available price ignores unavailable cheap variant end-to-end',async()=>{
  await withStore({variants:[variant(1000,false),variant(5262,true)]},async base=>{
    const offer=await fetchOffer(product,{id:'fake',base,kind:'shopify',pathRx:/^\/products\//});
    assert.equal(offer.stockStatus,'in_stock');assert.equal(offer.price,52.62);
  });
});
test('delayed/used/backorder offers are not counted as ordinary in-stock',async()=>{
  initCache(null);clearCache();
  const statuses=['delayed','used','backorder','in_stock'];
  const service=createStockService({retailers:statuses.map(id=>({id})),fetchOffer:async(p,r)=>({productId:p.id,retailerId:r.id,stockStatus:r.id,price:50,confidence:1}),freshMs:1000});
  const result=await service.getOffers({id:'reliability-test',name:'Test'});
  assert.equal(result.inStock.length,1);assert.equal(result.delayed.length,1);
  assert.equal(result.used.length,1);assert.equal(result.backorder.length,1);
});

test('box-only URL is rejected even if title is generic',()=>{
  const result=verifyOfferIdentity({name:'Return to the Night of the Zealot'},{titleSeen:'Return to the Night of the Zealot',productUrl:'https://www.nobleknight.com/P/2148278205/Return-to-the-Night-of-the-Zealot---Box-Only'});
  assert.equal(result.valid,false);
});
test('mixed collector bundles cannot impersonate a single expansion',()=>{
  const result=verifyOfferIdentity({name:'Return to the Night of the Zealot'},{titleSeen:'Return to the Night of the Zealot - bundle of 5 boxes'});
  assert.equal(result.valid,false);
});
