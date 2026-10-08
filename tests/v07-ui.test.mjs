import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function mount(){
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const elements=new Map();
  function el(id){
    if(!elements.has(id)) elements.set(id,{
      innerHTML:'',textContent:'',value:['#cycleFilter','#statusFilter','#availabilityFilter'].includes(id)?'all':'',checked:false,hidden:false,open:false,
      classList:{toggle(){}},dataset:{},setAttribute(){},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},trigger(type,e={}){return this.listeners[type]?.(e)},appendChild(){},
      querySelector:q=>el(q),showModal(){this.open=true},close(){this.open=false}
    });
    return elements.get(id);
  }
  const tabs=['campaigns','investigators','standalones','returns','rare','collection','all'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){}}));
  const chapterTabs=['one','two'].map(chapter=>({dataset:{chapter},classList:{toggle(){}},setAttribute(){}}));
  const storage=new Map();
  const context=vm.createContext({window:{},console,Intl,URL,Date,Set,Map,Promise,Number,String,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:{querySelector:el,querySelectorAll:q=>q.includes('[data-chapter]')?chapterTabs:tabs,createElement:()=>({}),visibilityState:'hidden'},
    fetch:async()=>({ok:true,json:async()=>({items:[]})}),setTimeout(){},setInterval(){},confirm(){return true},alert(){}
  });
  for(const script of scripts)vm.runInContext(script,context);
  return {context,el};
}

test('two modern boxes cover the full main cycle, legacy products are not counted as missing',()=>{
  const {context,el}=mount();
  vm.runInContext("state.owned['dunwich-campaign']=true;state.owned['dunwich-investigator']=true;rerender()",context);
  const dunwich=el('#cycleSummary').innerHTML.split('</article>')[0];
  assert.match(dunwich,/Main content covered/);
  assert.match(dunwich,/>2\/2</);
  assert.doesNotMatch(dunwich,/2\/10|Products owned/);
  assert.match(dunwich,/Return To: 0\/1 owned \(optional\)/);
});

test('Chapter One advisor includes the later Chapter One campaigns and core/standalones',()=>{
  const {context,el}=mount();
  vm.runInContext("setView('collection');setCollectionChapter('one')",context);
  const text=el('#advisor').innerHTML;
  assert.match(text,/Edge of the Earth/);
  assert.match(text,/The Scarlet Keys/);
  assert.match(text,/The Feast of Hemlock Vale/);
  assert.match(text,/Standalone scenarios/);
  assert.match(text,/Core sets/);
  assert.doesNotMatch(el('#cycleSummary').innerHTML,/Children of Blood/);
});

test('Chapter Two advisor and cycle summary are distinct',()=>{
  const {context,el}=mount();
  vm.runInContext("setCollectionChapter('two')",context);
  assert.match(el('#cycleSummary').innerHTML,/The Drowned City/);
  assert.match(el('#cycleSummary').innerHTML,/Children of Blood/);
  assert.doesNotMatch(el('#cycleSummary').innerHTML,/The Dunwich Legacy/);
  assert.match(el('#advisor').innerHTML,/Investigator decks/);
});

test('Return To has its own view and is excluded from Rare / OOP',()=>{
  const {context,el}=mount();
  vm.runInContext("setView('returns')",context);
  assert.match(el('#catalog').innerHTML,/Return to the Dunwich Legacy/i);
  assert.doesNotMatch(el('#catalog').innerHTML,/The Miskatonic Museum/);
  vm.runInContext("setView('rare')",context);
  assert.match(el('#catalog').innerHTML,/The Miskatonic Museum/);
  assert.doesNotMatch(el('#catalog').innerHTML,/Return to the Dunwich Legacy/i);
});

test('legacy batch excludes Return To and shows accurate count',()=>{
  const {context,el}=mount();
  vm.runInContext("showCampaign('The Dunwich Legacy')",context);
  const html=el('#campaignDialogContent').innerHTML;
  assert.match(html,/Check legacy deluxe & Mythos packs \(7\)/);
  assert.doesNotMatch(html,/Check legacy deluxe & Mythos packs \(8\)/);
});

test('setup wizard Chapter One and Two each include relevant products',()=>{
  const {context,el}=mount();
  vm.runInContext('openSetup()',context);
  assert.match(el('#setupChecklist').innerHTML,/The Dunwich Legacy/);
  assert.match(el('#setupChecklist').innerHTML,/Edge of the Earth/);
  vm.runInContext("setSetupChapter('two')",context);
  assert.match(el('#setupChecklist').innerHTML,/Children of Blood/);
  assert.match(el('#setupChecklist').innerHTML,/Investigator Decks \(2026\)|Investigator decks/);
  assert.doesNotMatch(el('#setupChecklist').innerHTML,/The Miskatonic Museum/);
});

test('best retailer link is clickable and limited to expected retailer domain',()=>{
  const {context}=mount();
  const good=vm.runInContext("safeRetailerUrl('https://www.boardingschoolgames.com/products/example','boarding')",context);
  assert.match(good,/boardingschoolgames\.com/);
  const bad=vm.runInContext("safeRetailerUrl('https://evil.example/redirect','boarding')",context);
  assert.equal(bad,null);
});

test('Amazon is a manual search and is not counted as verified retailer stock',()=>{
  const {context}=mount();
  const url=vm.runInContext("marketSearchUrl(PRODUCTS.find(p=>p.name==='Where Doom Awaits'),RETAILER_SOURCES.find(s=>s.id==='amazon'))",context);
  assert.match(url,/amazon\.com\/s\?k=/);
  assert.match(decodeURIComponent(url),/Where Doom Awaits/);
});

test('cached in-stock offer shows the verified store as a clickable link',()=>{
  const {context}=mount();
  const html=vm.runInContext(`(()=>{
    const p=PRODUCTS.find(x=>x.id==='dunwich-campaign');
    STOCK_SUMMARIES.set(p.id,{cacheState:'fresh',inStockCount:3,preorderCount:0,bestPrice:33.67,checkedAt:new Date().toISOString(),bestOffer:{retailerId:'boarding',productUrl:'https://www.boardingschoolgames.com/products/dunwich'}});
    return cachedStockHtml(p);
  })()`,context);
  assert.match(html,/<a class="stock-store-link"/);
  assert.match(html,/Boarding School Games ↗/);
  assert.match(html,/\$33\.67/);
});
