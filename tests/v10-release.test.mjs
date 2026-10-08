import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {isProductDetailUrl,fetchOffer} from '../backend/retailers.mjs';

const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('Cardhaus category pages cannot be treated as product listings',()=>{
  assert.equal(isProductDetailUrl('https://www.cardhaus.com/board-games/horror/','cardhaus'),false);
  assert.equal(isProductDetailUrl('https://www.cardhaus.com/board-games/','cardhaus'),false);
  assert.equal(isProductDetailUrl('https://www.cardhaus.com/arkham-horror-the-card-game-film-fatale-scenario-pack/','cardhaus'),true);
});

test('v1.0 has bulk checking in every catalog category with cancellation',()=>{
  assert.match(page,/id="checkAllCurrent"/);
  assert.match(page,/id="stopCurrentChecks"/);
  assert.match(page,/categoryBatchStop/);
  assert.match(page,/filteredProducts\(\)\.filter\(p=>p\.retail\)/);
  assert.match(page,/await checkProductStock\(p,\{silent:true,render:false\}\)/);
});

test('advisor condenses recommendations into expandable sections',()=>{
  assert.match(page,/function renderAdvisor\(\)/);
  assert.match(page,/Expand the sections you want to review/);
  assert.match(page,/class="advice warn"><details>/);
  assert.match(page,/class="advice-list"/);
});

test('UK preview hides US stock and offers only clearly unverified searches',()=>{
  assert.match(page,/id="marketRegion"/);
  assert.match(page,/UK · English \(search preview\)/);
  assert.match(page,/UK stock: not verified/);
  assert.match(page,/site:boardgameprices\.co\.uk/);
  assert.match(page,/amazon\.co\.uk\/s\?k=/);
  assert.match(page,/if\(marketRegion==='UK'\)return;/);
});

test('Cardhaus false Barkham category hit produces unknown, not preorder',async()=>{
  const http=await import('node:http');
  const server=http.createServer((req,res)=>{
    res.setHeader('content-type','text/html');
    if(req.url.startsWith('/search.php'))res.end('<a href="/board-games/horror/">Barkham Horror: The Meddling of Meowlathotep Preorder</a>');
    else res.end('<title>Horror games</title>Pre-order your next favorite game!');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    const cfg={id:'cardhaus',base,kind:'bigcommerce',pathRx:/^\/(?!search)[^?#]+\/?$/};
    const p={id:'barkham',name:'Barkham Horror: The Meddling of Meowlathotep',aliases:[],retail:true};
    const result=await fetchOffer(p,cfg);
    assert.equal(result.stockStatus,'unknown');
    assert.equal(result.confidence,0);
  }finally{server.close();}
});
