import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function mount(){
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,2);
  const elements=new Map();
  function el(id){
    if(!elements.has(id)) elements.set(id,{
      innerHTML:'',textContent:'',value:id==='#cycleFilter'||id==='#statusFilter'||id==='#availabilityFilter'?'all':'',checked:false,hidden:false,open:false,
      classList:{toggle(){}},dataset:{},setAttribute(){},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},trigger(type,e={}){return this.listeners[type]?.(e)},appendChild(){},
      querySelector(q){return el(q)},showModal(){this.open=true},close(){this.open=false}
    });
    return elements.get(id);
  }
  const tabs=['campaigns','investigators','standalones','rare','collection','all'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){}}));
  const storage=new Map();
  const context=vm.createContext({
    window:{},console,Intl,URL,Date,Set,Map,Promise,Number,String,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:{querySelector:el,querySelectorAll:()=>tabs,createElement:()=>({}),visibilityState:'hidden'},
    fetch:async()=>({ok:true,json:async()=>({items:[]})}),setTimeout(){},setInterval(){},confirm(){return true},alert(){}
  });
  for(const script of scripts)vm.runInContext(script,context);
  return {context,el};
}

test('homepage shows campaign guide, not 114 product cards',()=>{
  const {el}=mount();
  assert.equal((el('#campaignCards').innerHTML.match(/class="campaign-overview"/g)||[]).length,11);
  assert.match(el('#starterSpotlight').innerHTML,/Start with the Core Set/);
  assert.equal(el('#catalog').innerHTML,'');
  assert.equal(el('#catalogWrap').hidden,true);
});

test('standalone and investigator modes filter without losing master catalog',()=>{
  const {context,el}=mount();
  vm.runInContext("setView('standalones')",context);
  assert.match(el('#catalog').innerHTML,/The Blob That Ate Everything/);
  assert.doesNotMatch(el('#catalog').innerHTML,/The Miskatonic Museum/);
  vm.runInContext("setView('investigators')",context);
  assert.match(el('#catalog').innerHTML,/Investigator/);
  assert.doesNotMatch(el('#catalog').innerHTML,/The Essex County Express/);
  vm.runInContext("setView('all')",context);
  assert.equal(el('#resultsCount').textContent,'114 shown');
});

test('campaign detail starts with modern boxes and collapses legacy products',()=>{
  const {context,el}=mount();
  vm.runInContext("showCampaign('The Dunwich Legacy')",context);
  const html=el('#campaignDialogContent').innerHTML;
  assert.match(html,/Legacy deluxe &amp; Mythos packs|Legacy deluxe & Mythos packs/);
  assert.match(html,/Campaign Expansion/);
  assert.match(html,/Investigator Expansion/);
  assert.match(html,/<details class="legacy-expander">/);
});

test('collection mode shows only marked products and empty state otherwise',()=>{
  const {context,el}=mount();
  vm.runInContext("setView('collection')",context);
  assert.match(el('#catalog').innerHTML,/No owned or wanted products yet/);
  vm.runInContext("state.owned['core-2026']=true; rerender()",context);
  assert.match(el('#catalog').innerHTML,/Core Set \(2026\)/);
  assert.doesNotMatch(el('#catalog').innerHTML,/The Essex County Express/);
});


test('Amazon US is a clearly unverified manual search source',()=>{
  const {context}=mount();
  assert.equal(vm.runInContext("RETAILER_SOURCES.some(s=>s.id==='amazon')",context),true);
  const url=vm.runInContext("marketSearchUrl(PRODUCTS.find(p=>p.id==='core-2016'),RETAILER_SOURCES.find(s=>s.id==='amazon'))",context);
  assert.match(url,/amazon\.com\/s\?k=/);
  assert.match(decodeURIComponent(url),/2016/);
});

test('quick checklist separates campaign and investigator ownership and legacy packs',()=>{
  const {context,el}=mount();
  vm.runInContext('openSetup()',context);
  assert.equal(el('#setupDialog').open,true);
  const html=el('#setupChecklist').innerHTML;
  assert.match(html,/The Dunwich Legacy/);
  assert.match(html,/The Dunwich Legacy Campaign Expansion/);
  assert.match(html,/The Dunwich Legacy Investigator Expansion/);
  assert.match(html,/Original deluxe \+ Mythos packs/);
  assert.match(html,/Return To/);
  assert.equal(vm.runInContext("setupSelection.has('dunwich-campaign')",context),false);
});

test('saving quick checklist replaces owned list and preserves unrelated wanted entries',()=>{
  const {context,el}=mount();
  vm.runInContext("state.wanted['core-2026']=true;state.owned['core-revised']=true;openSetup();setupSelection.delete('core-revised');setupSelection.add('dunwich-campaign');",context);
  el('#setupSave').trigger('click');
  assert.equal(vm.runInContext("Boolean(state.owned['dunwich-campaign'])",context),true);
  assert.equal(vm.runInContext("Boolean(state.owned['dunwich-investigator'])",context),false);
  assert.equal(vm.runInContext("Boolean(state.owned['core-revised'])",context),false);
  assert.equal(vm.runInContext("Boolean(state.wanted['core-2026'])",context),true);
  assert.equal(el('#setupDialog').open,false);
});
