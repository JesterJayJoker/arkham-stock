import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const change=fs.readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8');
test('mobile collection groups do not stretch vertically',()=>{
  assert.match(html,/#setupChecklist\{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start/);
  assert.match(html,/#setupChecklist>\.setup-group\{display:block;flex:0 0 auto;min-height:0;height:auto/);
  assert.match(html,/#setupChecklist\{flex:1 1 auto;min-height:0;max-height:none;overflow-y:auto/);
});
test('first-visit notice appears near the title',()=>{
  const title=html.indexOf('<h1>Arkham Stock</h1>');
  const notice=html.indexOf('class="cold-start-notice"');
  const actions=html.indexOf('<div class="hero-actions">');
  assert.ok(title>=0 && notice>title && actions>notice);
  assert.match(html,/server can sleep when inactive/);
});
test('single changelog preserves historical releases',()=>{
  for(let v=5;v<=16;v++)assert.match(change,new RegExp(`## v0\\.${v}\\b`));
  assert.match(readme,/\[Release history\]\(CHANGELOG\.md\)/);
  assert.doesNotMatch(readme,/V\d\d_RELEASE_NOTES\.md/);
});
