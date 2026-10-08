import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchOffer } from '../backend/retailers.mjs';

function fakeShopify({title='Arkham Horror: The Card Game Core Set',sku='AHC100EN',available=true,price=5599}){
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');
    res.setHeader('content-type','application/json');
    if(u.pathname==='/search/suggest.json'){
      return res.end(JSON.stringify({resources:{results:{products:[{title,url:'/products/core-set'}]}}}));
    }
    if(u.pathname==='/products/core-set.js'){
      return res.end(JSON.stringify({title,variants:[{available,price,sku,barcode:'841333133139'}]}));
    }
    res.statusCode=404;res.end('{}');
  });
  return server;
}

test('Shopify adapter discovers a product and verifies live stock', async()=>{
  const server=fakeShopify({});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {port}=server.address();
  try{
    const product={id:'core-2026',name:'Arkham Horror: The Card Game Core Set (2026)',sku:'AHC100EN',aliases:['Arkham Horror: The Card Game Core Set']};
    const cfg={id:'fake',name:'Fake',base:`http://127.0.0.1:${port}`,kind:'shopify',pathRx:/^\/products\//};
    const offer=await fetchOffer(product,cfg);
    assert.equal(offer.stockStatus,'in_stock');
    assert.equal(offer.price,55.99);
    assert.equal(offer.skuSeen,'AHC100EN');
    assert.ok(offer.confidence>=0.55);
  } finally { server.close(); }
});

test('Shopify adapter marks unavailable variants out of stock', async()=>{
  const server=fakeShopify({available:false});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {port}=server.address();
  try{
    const product={id:'core-2026',name:'Arkham Horror: The Card Game Core Set (2026)',sku:'AHC100EN',aliases:['Arkham Horror: The Card Game Core Set']};
    const cfg={id:'fake',name:'Fake',base:`http://127.0.0.1:${port}`,kind:'shopify',pathRx:/^\/products\//};
    const offer=await fetchOffer(product,cfg);
    assert.equal(offer.stockStatus,'out_of_stock');
  } finally { server.close(); }
});
