import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRODUCTS} from '../backend/catalog.mjs';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const drowned=PRODUCTS.filter(p=>p.cycle==='The Drowned City');

test('Drowned City modern boxes belong to Chapter One in API catalog',()=>{
  assert.equal(drowned.length,2);
  assert.ok(drowned.every(p=>p.status==='chapter-one'));
});
test('Drowned City embedded frontend catalog matches backend',()=>{
  for(const p of drowned){
    const needle=`"id": "${p.id}"`;
    const start=html.indexOf(needle);
    assert.notEqual(start,-1);
    assert.match(html.slice(start,start+350),/"status": "chapter-one"/);
  }
});
test('Chapter One completion includes Drowned City, Chapter Two excludes it',()=>{
  assert.match(html,/CHAPTER_ONE_CYCLES=\[[^\n]*'The Drowned City'\]/);
  assert.match(html,/CHAPTER_TWO_CYCLES=\['Children of Blood'\]/);
});
test('advisor grid cards align to start independently',()=>{
  assert.match(html,/\.advice-list\{[^}]*align-items:start/);
  assert.match(html,/\.advice-list>\.advice\{align-self:start\}/);
});
