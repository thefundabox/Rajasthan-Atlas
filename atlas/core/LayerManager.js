/**
 * LayerManager — generic layer registry.
 *
 * Every future dataset registers itself as a layer, giving the engine a
 * uniform way to (a) load its data, (b) render it, (c) offer it to search,
 * (d) toggle its visibility, and (e) style it.
 *
 * Layer config:
 *   {
 *     id:          'national-parks',
 *     name:        'National Parks',
 *     type:        'point'|'polygon'|'line',
 *     category:    'environment'|'administrative'|'physical'|'reference',
 *     data:        'atlas/data/national-parks.geojson',
 *     visible:     true,
 *     searchable:  true,
 *     zIndex:      50,
 *     style:       (feature) => ({ classes: [...], attrs: {...} }),
 *     onSelect:    (feature) => void,     // optional
 *   }
 */

import { CONFIG } from './config.js';

const REQUIRED = ['id', 'name', 'type', 'data'];

export class LayerManager {
  constructor(atlas) {
    this.atlas   = atlas;
    /** @type {Map<string, {config, features, spatialIndex}>} */
    this._layers = new Map();
    /** Layer style mode — e.g. 'base', 'division', 'new'. */
    this._mode   = 'base';
    /** Style-mode registry — each mode is a { predicate, className, dimOthers } spec. */
    this._modes  = new Map();
    this.registerMode('base', {
      apply:   () => ({ classes: [] }),
      dimOthers: false,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Registration & loading                                            */
  /* ------------------------------------------------------------------ */

  async register(config) {
    for (const key of REQUIRED) {
      if (config[key] == null) throw new Error(`LayerManager: layer config missing "${key}"`);
    }
    if (this._layers.has(config.id)) throw new Error(`LayerManager: layer "${config.id}" already registered`);
    const merged = {
      visible:    true,
      searchable: true,
      zIndex:     0,
      ...config,
      // Coerce style to a function. Layers may pass a function (dynamic per-feature
      // style), an object (static attrs applied to every feature), or omit it entirely.
      style: coerceStyle(config.style),
    };
    // Load & index.
    const { features } = await this.atlas.data.load(config.id, config.data);
    const bounds = this.atlas.projection.bounds();
    const spatial = new (await import('./SpatialIndex.js')).SpatialIndex(
      [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]);
    for (const f of features) {
      const bb = this._bboxOf(f);
      if (bb) spatial.insert(f.id, bb, f);
    }
    // Render.
    this.atlas.renderer.renderLayer({
      id: merged.id, features,
      style: (feat) => this._composedStyle(merged, feat),
    });
    this.atlas.renderer.setLayerVisible(merged.id, merged.visible);
    this._layers.set(merged.id, { config: merged, features, spatialIndex: spatial });
    this.atlas.bus.emit('layer:added', { id: merged.id });
    return merged;
  }

  unregister(id) {
    const rec = this._layers.get(id);
    if (!rec) return;
    this.atlas.renderer.removeLayer(id);
    this.atlas.data.drop(id);
    this._layers.delete(id);
    this.atlas.bus.emit('layer:removed', { id });
  }

  /* ------------------------------------------------------------------ */
  /*  Query                                                             */
  /* ------------------------------------------------------------------ */

  list()        { return [...this._layers.values()].map(r => r.config); }
  ids()         { return [...this._layers.keys()]; }
  get(id)       { return this._layers.get(id); }
  features(id)  { return this._layers.get(id)?.features ?? []; }
  spatial(id)   { return this._layers.get(id)?.spatialIndex ?? null; }
  searchable()  { return this.list().filter(c => c.searchable); }

  setVisible(id, visible) {
    const rec = this._layers.get(id);
    if (!rec) return;
    rec.config.visible = visible;
    this.atlas.renderer.setLayerVisible(id, visible);
    this.atlas.bus.emit('layer:visibility', { id, visible });
  }

  /* ------------------------------------------------------------------ */
  /*  Style modes                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * A "mode" applies a decorator style to every feature in every layer.
   * Modes let us do choropleth (division colouring) or highlight passes
   * (new-district emphasis) without leaking that logic into the renderer.
   */
  registerMode(id, spec) { this._modes.set(id, spec); }

  setMode(id) {
    if (!this._modes.has(id)) return;
    this._mode = id;
    // Force a re-render pass. Cheap for 41 polygons; if this ever becomes
    // slow (10k+ features), switch to root-CSS-class toggles instead.
    if (this.atlas.renderer?._svg) {
      this.atlas.renderer._svg.classList.remove(
        ...[...this._modes.keys()].map(m => `mode-${m}`));
      this.atlas.renderer._svg.classList.add(`mode-${id}`);
    }
    this.atlas.bus.emit('layer:mode', { mode: id });
  }

  currentMode() { return this._mode; }
  modes()       { return [...this._modes.keys()]; }

  /* ------------------------------------------------------------------ */
  /*  Internals                                                         */
  /* ------------------------------------------------------------------ */

  _composedStyle(layerCfg, feat) {
    const base = layerCfg.style(feat) ?? {};
    const modeSpec = this._modes.get(this._mode);
    const mode = modeSpec?.apply?.(feat) ?? {};
    return {
      classes: [...(base.classes ?? []), ...(mode.classes ?? [])],
      attrs:   { ...(base.attrs   ?? {}), ...(mode.attrs   ?? {}) },
    };
  }

  _bboxOf(feat) {
    const p = feat.properties ?? {};
    if (Array.isArray(p.bbox) && p.bbox.length === 4) return p.bbox;
    // Fallback: compute from geometry.
    return computeBBox(feat.geometry);
  }
}

function coerceStyle(s) {
  if (typeof s === 'function') return s;
  if (s && typeof s === 'object') {
    const attrs = { ...s };
    const classes = attrs.classes ?? [];
    delete attrs.classes;
    return () => ({ classes, attrs });
  }
  return () => ({ classes: [] });
}

function computeBBox(g) {
  if (!g) return null;
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  const eat = ([x, y]) => {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  };
  const walk = (c, depth) => {
    if (typeof c[0] === 'number') { eat(c); return; }
    for (const inner of c) walk(inner, depth + 1);
  };
  walk(g.coordinates, 0);
  return [mnx, mny, mxx, mxy];
}
