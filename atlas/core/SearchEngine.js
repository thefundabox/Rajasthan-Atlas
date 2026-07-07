/**
 * SearchEngine — generic full-text ranking across every searchable layer.
 *
 * The engine walks LayerManager.searchable(), pulls feature .name /
 * .properties.name, and ranks matches with a simple exact / prefix / substring
 * / fuzzy hierarchy. New searchable layers (parks, rivers, etc.) become
 * findable automatically the moment they register.
 *
 * A layer can override its indexable text by supplying config.searchText(feat)
 * — return either a string or an array of strings. Falls back to name + name
 * variants otherwise.
 */

import { CONFIG } from './config.js';

export class SearchEngine {
  constructor(atlas) { this.atlas = atlas; }

  /**
   * Rank matches for `q`. Empty query returns [].
   * @param {string} q
   * @param {{limit?:number, layers?:string[]}} [opts]
   * @returns {{feature: AtlasFeature, layer: LayerConfig, score: number}[]}
   */
  search(q, opts = {}) {
    q = (q ?? '').trim().toLowerCase();
    if (q.length < CONFIG.search.minQueryLength) return [];
    const limit  = opts.limit ?? CONFIG.search.maxResults;
    const layers = opts.layers
      ? this.atlas.layers.searchable().filter(c => opts.layers.includes(c.id))
      : this.atlas.layers.searchable();

    const scored = [];
    for (const layerCfg of layers) {
      const rec = this.atlas.layers.get(layerCfg.id);
      if (!rec) continue;
      for (const feat of rec.features) {
        const haystacks = this._haystacks(layerCfg, feat);
        let best = -1;
        for (const h of haystacks) {
          const s = score(h.toLowerCase(), q);
          if (s > best) best = s;
        }
        if (best >= 0) scored.push({ feature: feat, layer: layerCfg, score: best });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  _haystacks(layerCfg, feat) {
    if (typeof layerCfg.searchText === 'function') {
      const out = layerCfg.searchText(feat);
      return Array.isArray(out) ? out : [out];
    }
    const p = feat.properties ?? {};
    const list = [feat.id, p.name, p.headquarters, p.district].filter(Boolean);
    return list.map(String);
  }
}

/** Score: 100 exact, 90 prefix, 50 substring, 30 fuzzy, -1 miss. */
function score(name, q) {
  if (!name || !q) return -1;
  if (name === q) return 100;
  if (name.startsWith(q)) return 90 - (name.length - q.length) * 0.5;
  const idx = name.indexOf(q);
  if (idx !== -1) return 50 - idx;
  // fuzzy — every char of q appears in order in name
  let i = 0;
  for (const ch of name) { if (ch === q[i]) i++; if (i >= q.length) break; }
  if (i >= q.length) return 30 - (name.length - q.length) * 0.2;
  return -1;
}
