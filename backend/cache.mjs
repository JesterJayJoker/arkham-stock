import fs from 'node:fs';
import path from 'node:path';

const cache = new Map();
let cacheFile = null;
let loadedAt = null;
let writes = 0;
let loadError = null;

function ensureParent(file){
  if(!file) return;
  fs.mkdirSync(path.dirname(file), {recursive:true});
}

function serialize(){
  return Object.fromEntries([...cache.entries()].map(([key, entry]) => [key, entry]));
}

function persist(){
  if(!cacheFile) return;
  ensureParent(cacheFile);
  const tmp = cacheFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({version:1, savedAt:new Date().toISOString(), entries:serialize()}));
  fs.renameSync(tmp, cacheFile);
  writes++;
}

export function initCache(file){
  cacheFile = file || null;
  loadedAt = new Date().toISOString();
  loadError = null;
  if(!cacheFile || !fs.existsSync(cacheFile)) return;
  try{
    const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const entries = parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {};
    for(const [key, entry] of Object.entries(entries)){
      if(entry && Number.isFinite(entry.time) && Object.prototype.hasOwnProperty.call(entry,'value')) cache.set(key, entry);
    }
  }catch(e){
    loadError = e.message;
  }
}

export function getCacheEntry(key){
  return cache.get(key) || null;
}

export function getCache(key, ttlMs){
  const entry = getCacheEntry(key);
  if(!entry) return null;
  if(Date.now() - entry.time > ttlMs) return null;
  return entry.value;
}

export function setCache(key, value, time=Date.now()){
  cache.set(key, {time, value});
  persist();
  return value;
}

export function clearCache(prefix=''){
  let changed = false;
  for(const key of [...cache.keys()]){
    if(!prefix || key.startsWith(prefix)){
      cache.delete(key);
      changed = true;
    }
  }
  if(changed) persist();
}

export function cacheEntries(prefix=''){
  return [...cache.entries()]
    .filter(([key])=>!prefix || key.startsWith(prefix))
    .map(([key,entry])=>({key,...entry,ageMs:Math.max(0,Date.now()-entry.time)}));
}

export function cacheStats(){
  let oldestAgeMs = 0;
  for(const [,entry] of cache) oldestAgeMs = Math.max(oldestAgeMs, Math.max(0,Date.now()-entry.time));
  return {entries:cache.size, persistent:Boolean(cacheFile), cacheFile:cacheFile ? path.basename(cacheFile) : null, loadedAt, writes, oldestAgeMs, loadError};
}
