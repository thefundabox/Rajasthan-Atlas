/**
 * DataManager — the only module allowed to touch the network or the disk.
 *
 * Loads GeoJSON / JSON, validates it against the unified feature schema,
 * caches by key, and exposes a strict public API:
 *
 *   await Atlas.data.load('districts', 'atlas/data/districts.geojson')
 *   Atlas.data.get('districts')          // → { features: [...] }
 *   Atlas.data.getFeature('districts', 'jaipur')
 *   Atlas.data.has('districts')
 *   Atlas.data.list()                    // → ['districts', ...]
 *
 * Every loaded feature is normalised into the AtlasFeature convenience shape:
 *
 *   {
 *     id, name, type, category, geometry,
 *     properties: { district, division, state, source, lastUpdated,
 *                   notes:{...}, ecology:{...}, governance:{...}, ...rest }
 *   }
 *
 * The on-disk form is standard GeoJSON — this class is the bridge.
 */

import { CONFIG } from './config.js';

export class DataManager {
  constructor(atlas) {
    this.atlas = atlas;
    /** @type {Map<string, {url:string, features:AtlasFeature[], byId:Map<string,AtlasFeature>, meta:Object}>} */
    this._cache = new Map();
    this._schema = null;
  }

  /**
   * Load a dataset. Idempotent — repeated calls return the cached copy.
   * @param {string} key   canonical name registered by a layer, e.g. 'districts'
   * @param {string} url   path to a GeoJSON FeatureCollection
   * @param {{validate?:boolean}} [opts]
   * @returns {Promise<{features:AtlasFeature[]}>}
   */
  async load(key, url, opts = {}) {
    if (this._cache.has(key)) return this._cache.get(key);

    const raw = await this._fetchJson(url);
    if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
      throw new Error(`DataManager: "${key}" at ${url} is not a valid FeatureCollection`);
    }

    const features = raw.features.map((f, i) => this._normalise(f, key, i));
    if (opts.validate !== false) {
      const errs = features.flatMap((f, i) => this._validate(f).map(e => ` [${i}] ${f.id}: ${e}`));
      if (errs.length) throw new Error(`DataManager: "${key}" failed schema validation:\n${errs.join('\n')}`);
    }
    const byId = new Map(features.map(f => [f.id, f]));

    const record = { url, features, byId, meta: raw.metadata ?? {} };
    this._cache.set(key, record);
    this.atlas.bus.emit('data:loaded', { key, count: features.length });
    return record;
  }

  /** Get a cached dataset by key. Throws if not loaded. */
  get(key) {
    if (!this._cache.has(key)) throw new Error(`DataManager: dataset "${key}" not loaded`);
    return this._cache.get(key);
  }
  /** Feature-by-id lookup (O(1)). */
  getFeature(key, id) { return this.get(key).byId.get(id) ?? null; }
  has(key)            { return this._cache.has(key); }
  list()              { return [...this._cache.keys()]; }
  /** Drop a dataset from cache — used by layer un-registration. */
  drop(key)           { this._cache.delete(key); }

  /* --------------------------------------------------------------------- */
  /*  Internals                                                            */
  /* --------------------------------------------------------------------- */

  async _fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`DataManager: fetch ${url} → ${r.status}`);
    return r.json();
  }

  /**
   * Wrap a raw GeoJSON Feature into the atlas convenience shape.
   * The on-disk file keeps standard GeoJSON `{type:"Feature", geometry, properties, id?}`;
   * the wrapper hoists `id`, `name`, `type`, `category` out of `properties` for ergonomic
   * access while leaving the rest of `properties` untouched.
   */
  _normalise(feat, layerKey, idx) {
    const p = feat.properties ?? {};
    const id = feat.id ?? p.id ?? `${layerKey}-${idx}`;
    return {
      type:     'Feature',
      id:       String(id),
      layerKey,
      geometry: feat.geometry,
      // Convenience getters at the top level, mirroring the user's schema shape.
      get name()     { return p.name; },
      get category() { return p.category; },
      get atlasType(){ return p.type; },  // renamed to avoid GeoJSON `.type` collision
      properties: p,
    };
  }

  /**
   * Minimal schema validation. Full JSON Schema draft-07 is overkill for
   * the shape we're checking — a keyword-based check is enough to catch
   * missing fields at boot time.
   */
  _validate(feat) {
    const errs = [];
    const p = feat.properties ?? {};
    if (feat.type !== 'Feature')       errs.push('root "type" must be "Feature"');
    if (!feat.id || typeof feat.id !== 'string') errs.push('missing string "id"');
    if (!feat.geometry?.type)          errs.push('missing geometry.type');
    for (const req of ['name','type','category','state','source','lastUpdated']) {
      if (p[req] == null || p[req] === '') errs.push(`missing properties.${req}`);
    }
    for (const nested of ['notes','ecology','governance']) {
      if (p[nested] != null && typeof p[nested] !== 'object') errs.push(`properties.${nested} must be an object`);
    }
    return errs;
  }
}
