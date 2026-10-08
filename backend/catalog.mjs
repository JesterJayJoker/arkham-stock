import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/catalog.json'),'utf8'));
const extras=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/product-meta.json'),'utf8'));
const map=new Map(Object.entries(extras));
export const PRODUCTS=catalog.map(p=>({...p,...(map.get(p.id)||{})}));
export const PRODUCT_MAP=new Map(PRODUCTS.map(p=>[p.id,p]));
