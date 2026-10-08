import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initCache,setCache,getCacheEntry,clearCache} from '../backend/cache.mjs';

test('persistent cache writes and reloads entries',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arkham-cache-'));
  const file=path.join(dir,'cache.json');
  clearCache(); initCache(file);
  setCache('offers:test',{value:42},12345);
  assert.ok(fs.existsSync(file));
  clearCache();
  // clearCache persists an empty cache, so restore a hand-written snapshot to exercise loading.
  fs.writeFileSync(file,JSON.stringify({version:1,entries:{'offers:test':{time:12345,value:{value:42}}}}));
  initCache(file);
  assert.deepEqual(getCacheEntry('offers:test'),{time:12345,value:{value:42}});
  clearCache();
  fs.rmSync(dir,{recursive:true,force:true});
});
