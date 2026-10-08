const STOP = new Set(['arkham','horror','the','card','game','lcg','a','an','of','to','and','edition','expansion','pack','set']);

export function normalizeTitle(s='') {
  return String(s)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

export function tokens(s='') {
  return normalizeTitle(s).split(/\s+/).filter(Boolean);
}

export function significantTokens(s='') {
  return tokens(s).filter(t => !STOP.has(t) && t.length > 1);
}

export function scoreCandidate(product, candidate) {
  const aliases = [product.name, ...(product.aliases || [])];
  const cTitle = candidate.title || candidate.name || candidate.url || '';
  const cNorm = normalizeTitle(cTitle);
  let best = 0;

  for (const alias of aliases) {
    const aNorm = normalizeTitle(alias);
    if (!aNorm) continue;
    if (cNorm === aNorm) best = Math.max(best, 1);
    if (cNorm.includes(aNorm) || aNorm.includes(cNorm)) best = Math.max(best, 0.92);
    const at = significantTokens(alias);
    const ct = new Set(significantTokens(cTitle));
    if (at.length) {
      const overlap = at.filter(t => ct.has(t)).length / at.length;
      best = Math.max(best, overlap * 0.86);
    }
  }

  if (product.sku && candidate.sku) {
    const a = normalizeTitle(product.sku).replace(/ /g,'');
    const b = normalizeTitle(candidate.sku).replace(/ /g,'');
    if (a && a === b) best = Math.max(best, 1);
  }
  if (product.upc && candidate.upc && String(product.upc).replace(/\D/g,'') === String(candidate.upc).replace(/\D/g,'')) {
    best = 1;
  }

  // Penalize accessories that commonly collide with product names.
  if (/playmat|game mat|deck tome|sleeve|binder|token|insert|storage/i.test(cTitle) && !/playmat|game mat|deck tome|sleeve|binder|token|insert|storage/i.test(product.name)) {
    best *= 0.35;
  }
  return Math.max(0, Math.min(1, best));
}

export function chooseBestCandidate(product, candidates, threshold=0.55) {
  const ranked = candidates.map(c => ({...c, matchScore: scoreCandidate(product,c)}))
    .sort((a,b)=>b.matchScore-a.matchScore);
  return ranked[0] && ranked[0].matchScore >= threshold ? ranked[0] : null;
}
