import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('chapter-first navigation filters all product categories',()=>{
  assert.match(ui,/id="browseChapterTabs"/);
  assert.match(ui,/matchesBrowseChapter\(p\)/);
  assert.match(ui,/campaignPrimary\(c\)\.some\(p=>chapterFor\(p\)===browseChapter\)/);
});
test('setup wizard has core-first ordering and chapter bulk controls',()=>{
  assert.match(ui,/root\.innerHTML=core\+campaigns/);
  assert.match(ui,/id="setupSelectAll"/);
  assert.match(ui,/id="setupSelectModern"/);
  assert.match(ui,/id="setupClearChapter"/);
});
test('select both modern boxes does not rerender expanded groups',()=>{
  const start=ui.indexOf("document.querySelector('#setupChecklist').addEventListener('click'");
  const end=ui.indexOf('function setupChapterItems()',start);
  const handler=ui.slice(start,end);
  assert.doesNotMatch(handler,/renderSetupChecklist\(/);
  assert.match(handler,/input\.checked=true/);
});
test('UK links have explicit external clickable controls',()=>{
  assert.match(ui,/uk-search-actions/);
  assert.match(ui,/Find on BoardGamePrices \(web search\)/);
  assert.match(ui,/Search Amazon UK/);
});
test('current-line statistic replaced with campaign completion',()=>{
  assert.match(ui,/\['Main campaigns complete'/);
  assert.doesNotMatch(ui,/\['Current line'/);
});
