import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('mobile filters collapse with accessible toggle and Apply/Clear',()=>{
 assert.match(html,/id="mobileFilterToggle"[^>]*aria-expanded="false"/);
 assert.match(html,/#catalogToolbar\{display:none/);
 assert.match(html,/#catalogToolbar\.mobile-filter-open\{display:grid/);
 assert.match(html,/id="applyMobileFilters"/);
 assert.match(html,/id="clearMobileFilters"/);
});
test('collection has collapsible bulk actions and bounded checklist scroller',()=>{
 assert.match(html,/id="setupBulkDisclosure"/);
 assert.match(html,/#setupChecklist\{flex:1;min-height:0;max-height:none;overflow-y:auto/);
 assert.match(html,/#setupDialog\[open\]\{display:flex\}/);
 assert.match(html,/\.setup-footer\{position:relative/);
});
test('all three modal dialogs lock background and unlock on close',()=>{
 assert.match(html,/const arkhamModals=\['campaignDialog','detailDialog','setupDialog'\]/);
 assert.match(html,/modal-scroll-locked/);
 assert.match(html,/arkhamModals\.forEach\(dialog=>dialog\.addEventListener\('close',unlockBackgroundScroll\)\)/);
 assert.match(html,/window\.scrollTo\(0,modalLockedScrollY\)/);
});
