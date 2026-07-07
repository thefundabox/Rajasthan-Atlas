/**
 * RelationsGraph — cross-layer semantic relationships.
 *
 * At `atlas:ready` we scan every registered layer and index features by
 * basin, district(s), division, physiographic region, and by name-root
 * ("Ranthambore" links NP ↔ TR ↔ nearby WLSs). The graph is then used by the
 * editorial detail renderer to show a Related Features chip row.
 *
 * Zero engine surface: just a small class instantiated in AtlasCore. Reads
 * data via the public Atlas.layers / Atlas.data API.
 */

export class RelationsGraph {
  constructor(atlas) {
    this.atlas = atlas;
    this._byBasin      = new Map();  // basin string   → Set<key>
    this._byDistrict   = new Map();  // district name  → Set<key>
    this._byDivision   = new Map();  // division name  → Set<key>
    this._byRegion     = new Map();  // physiographic region id → Set<key>
    this._byNameRoot   = new Map();  // name root      → Set<key>
    this._featureByKey = new Map();  // key → { layerId, featureId, feature }
    this._built = false;
    atlas.bus.on('atlas:ready', () => this._build());
  }

  /* ------------------------------------------------------------------ */
  /*  Build                                                             */
  /* ------------------------------------------------------------------ */

  _build() {
    if (this._built) return;
    const layers = this.atlas.layers.list();
    for (const cfg of layers) {
      const feats = this.atlas.layers.features(cfg.id);
      for (const feat of feats) {
        const key = `${cfg.id}::${feat.id}`;
        this._featureByKey.set(key, { layerId: cfg.id, featureId: feat.id, feature: feat });
        const p = feat.properties ?? {};
        // Basin
        addTo(this._byBasin, normBasin(p.basin), key);
        // District(s)
        const dists = p.districts ?? (p.district ? [p.district] : []);
        for (const d of dists) addTo(this._byDistrict, d, key);
        // Division
        if (p.division) addTo(this._byDivision, p.division, key);
        // Districts_included (for physiographic regions and basins)
        for (const d of p.districts_included ?? []) addTo(this._byDistrict, d, key);
        // Name root — first significant word of the feature's name.
        for (const root of nameRoots(p.name ?? feat.id)) addTo(this._byNameRoot, root, key);
      }
    }
    this._built = true;
    this.atlas.bus.emit('relations:built', { size: this._featureByKey.size });
  }

  /* ------------------------------------------------------------------ */
  /*  Query                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * @returns {Array<{layerId, featureId, feature, reason, weight}>}
   *   Grouped by reason and sorted by weight (higher = more relevant).
   */
  relationsFor(feature, ownLayer) {
    if (!this._built) this._build();
    const p = feature.properties ?? {};
    const own = `${ownLayer}::${feature.id}`;
    const scored = new Map();

    const add = (key, reason, weight) => {
      if (key === own) return;
      if (!this._featureByKey.has(key)) return;
      const cur = scored.get(key) || { reasons: [], weight: 0 };
      if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
      cur.weight += weight;
      scored.set(key, cur);
    };

    // Same basin (strong)
    for (const key of this._byBasin.get(normBasin(p.basin)) ?? []) add(key, 'same basin', 4);
    // Same district(s)
    const dists = p.districts ?? (p.district ? [p.district] : []);
    for (const d of dists)
      for (const key of this._byDistrict.get(d) ?? []) add(key, 'same district', 2);
    // Districts_included overlap (for regions/basins)
    for (const d of p.districts_included ?? [])
      for (const key of this._byDistrict.get(d) ?? []) add(key, 'shared district', 1);
    // Same division
    if (p.division)
      for (const key of this._byDivision.get(p.division) ?? []) add(key, 'same division', 0.5);
    // Name root
    for (const root of nameRoots(p.name ?? feature.id))
      for (const key of this._byNameRoot.get(root) ?? []) add(key, 'shared name', 5);

    // Turn into ranked list.
    const out = [];
    for (const [key, s] of scored) {
      const entry = this._featureByKey.get(key);
      out.push({
        layerId:   entry.layerId,
        featureId: entry.featureId,
        feature:   entry.feature,
        reasons:   s.reasons,
        weight:    s.weight,
      });
    }
    out.sort((a, b) => b.weight - a.weight);
    return out.slice(0, 12);   // cap for UI
  }
}

/* -------------------------------------------------------------------------- */

function addTo(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

/** Strip parenthetical qualifiers so 'Chambal' and 'Chambal (via Banas)' merge. */
function normBasin(basin) {
  if (!basin) return null;
  return String(basin).split('(')[0].trim();
}

/**
 * A feature's name can meaningfully link to any other feature that shares its
 * *root* (e.g., "Ranthambore National Park", "Ranthambore Tiger Reserve", the
 * Kailadevi WLS which forms Ranthambore's buffer). We extract the leading
 * proper nouns before the type suffix.
 */
function nameRoots(name) {
  if (!name) return [];
  const clean = String(name)
    .replace(/\s+(River|Lake|Wetland|extent|Site|Ramsar|WLS|Wildlife Sanctuary|National Park|Tiger Reserve|main axis|Range)\b.*/i, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[·–—-]/g, ' ')
    .trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  const roots = new Set();
  if (tokens[0])                       roots.add(tokens[0].toLowerCase());
  if (tokens.length >= 2)              roots.add(tokens.slice(0, 2).join(' ').toLowerCase());
  return [...roots];
}
