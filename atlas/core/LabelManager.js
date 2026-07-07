/**
 * LabelManager — cartographic label placement engine.
 *
 * Responsibilities
 * ----------------
 *   • Collect label candidates from every registered feature source.
 *   • Sort by priority (state > NP/TR > WLS > districts > wetlands).
 *   • Try candidate positions per feature: pole-of-inaccessibility / centroid
 *     first, then eight compass offsets, then external with a short leader line.
 *   • Perform axis-aligned bbox collision detection in SVG space.
 *   • Skip labels that cannot fit at the current zoom without collision.
 *   • Recompute on view change (throttled) and on selection change.
 *
 * Scale behaviour
 * ---------------
 *   Labels are inserted into the SVG at a nominal font-size in SVG units, then
 *   inversely scaled with zoom so they retain a constant screen size.
 *
 *   Zoom-based visibility gating is per-source (`minZoom`, `maxZoom`) so, e.g.,
 *   Wildlife Sanctuaries only surface as labels once the user zooms in past 2×.
 *
 * Integration
 * -----------
 *   Auto-instantiated in AtlasCore.boot(). Renders into
 *   `<g id="atlas-labels">` appended to the host SVG. Feature sources are
 *   registered by callers (e.g. LabelManager auto-registers built-in sources
 *   for districts + every environment layer at boot).
 */

import { CONFIG } from './config.js';
import { svgEl } from './util/dom.js';

/** @typedef {Object} LabelSource
 *  @property {string} layerId
 *  @property {number} priority   higher = placed first
 *  @property {string} cls        SVG class for the <text>
 *  @property {number} [minZoom]  hide labels below this zoom
 *  @property {number} [maxZoom]  hide labels above this zoom
 *  @property {(feat) => string} [text]     extract label text
 *  @property {(feat) => boolean} [filter]
 *  @property {'along'|null} [orient]        'along' rotates label to the local
 *                                           tangent of the feature's polyline
 *                                           (rivers, ranges — atlas convention).
 */

export class LabelManager {
  constructor(atlas) {
    this.atlas   = atlas;
    this._svg    = null;
    this._group  = null;
    this._sources = [];              // LabelSource[]
    this._raf    = null;
    this._selected = null;
    this._tangentCache = new Map();  // feature.id → tangent angle (deg)
  }

  attachTo(svg) {
    this._svg   = svg;
    this._group = svgEl('g', { id: 'atlas-labels' });
    svg.append(this._group);
    // Rerender lazily on view / selection / mode change.
    this.atlas.bus.on('view:changed',     () => this._schedule());
    this.atlas.bus.on('selection:changed', ({ feature }) => {
      this._selected = feature?.id ?? null;
      this._schedule();
    });
    this.atlas.bus.on('layer:mode',       () => this._schedule());
    this.atlas.bus.on('layer:added',      () => this._schedule());
    this.atlas.bus.on('layer:visibility', () => this._schedule());
    this.atlas.bus.on('theme:changed',    () => this._schedule());
  }

  /**
   * Register a source of label candidates. Returns an unregister function.
   * @param {LabelSource} source
   */
  register(source) {
    this._sources.push({
      minZoom:  0,
      maxZoom:  Infinity,
      text:     (f) => f.properties?.name ?? f.id,
      filter:   () => true,
      ...source,
    });
    this._schedule();
    return () => {
      const i = this._sources.indexOf(source);
      if (i >= 0) this._sources.splice(i, 1);
      this._schedule();
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      try { this._render(); }
      catch (err) { console.error('[LabelManager] render failed:', err); }
    });
  }

  _render() {
    if (!this._group) return;
    const zoom = this.atlas.interaction.currentZoom();
    const view = this.atlas.interaction.currentViewBox();
    const viewBBox = [view.x, view.y, view.x + view.w, view.y + view.h];
    const proj = this.atlas.projection;

    // Font sizes are inversely scaled so text stays at a constant screen size.
    const scale = 1 / zoom;

    // 1. Collect candidates in visible zoom range.
    const cands = [];
    for (const src of this._sources) {
      if (zoom < src.minZoom || zoom > src.maxZoom) continue;
      const feats = this.atlas.layers.features(src.layerId);
      if (!feats?.length) continue;
      const layerVisible = this.atlas.layers.get(src.layerId)?.config.visible !== false;
      if (!layerVisible) continue;
      for (const f of feats) {
        if (!src.filter(f)) continue;
        const anchor = f.properties?.labelAnchor ?? f.properties?.centroid;
        if (!anchor) continue;
        const [x, y] = proj.forward(anchor);
        if (!inside(viewBBox, [x, y])) continue;
        const text = src.text(f);
        if (!text) continue;
        cands.push({
          feature: f, source: src, text,
          anchor: { x, y },
          priority: src.priority,
        });
      }
    }

    // 2. Sort — highest priority first; selection wins outright.
    cands.sort((a, b) => {
      const sa = a.feature.id === this._selected ? 1 : 0;
      const sb = b.feature.id === this._selected ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return b.priority - a.priority;
    });

    // 3. Place with collision detection.
    const occupied = [];
    const placed = [];
    for (const c of cands) {
      const font = fontFor(c.source.cls);
      const w = estimateWidth(c.text, font) * scale;
      const h = font.size * scale * 1.15;

      // Tangent-oriented labels sit on-anchor and rotate. Others try the
      // eleven candidate positions.
      const oriented = c.source.orient === 'along';
      const positions = oriented
        ? [{ x: c.anchor.x, y: c.anchor.y }]
        : candidatePositions(c.anchor, w, h, scale);

      let rotation = 0;
      if (oriented) rotation = this._tangentFor(c.feature);

      let picked = null;
      for (const pos of positions) {
        if (!inside(viewBBox, [pos.x, pos.y])) continue;
        // Bounding box — for oriented labels, expand to the axis-aligned
        // hull of the rotated rectangle so collisions are still safe.
        let bw = w, bh = h;
        if (rotation) {
          const a = rotation * Math.PI / 180;
          bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
          bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
        }
        const box = { x: pos.x - bw/2, y: pos.y - bh*0.8, w: bw, h: bh };
        if (rectIntersectsAny(box, occupied)) continue;
        const margin = { x: box.x - 1, y: box.y - 1, w: box.w + 2, h: box.h + 2 };
        picked = { pos, box, margin, leader: pos.leader, rotation };
        break;
      }
      if (!picked) continue;
      occupied.push(picked.margin);
      placed.push({ ...c, ...picked, fontSize: font.size * scale });
    }

    // 4. Emit SVG.
    while (this._group.firstChild) this._group.firstChild.remove();
    for (const p of placed) {
      if (p.leader) {
        const line = svgEl('path', {
          class: 'leader',
          d: `M${p.anchor.x},${p.anchor.y}L${p.pos.x},${p.pos.y}`,
        });
        this._group.append(line);
      }
      const cls = ['lbl', p.source.cls,
                   p.feature.properties?.newDistrict ? 'new' : '',
                   p.feature.id === this._selected ? 'selected' : '']
                  .filter(Boolean).join(' ');
      const attrs = {
        class: cls,
        x: p.pos.x,
        y: p.pos.y,
        'text-anchor': 'middle',
        'font-size': p.fontSize.toFixed(2),
      };
      if (p.rotation) attrs.transform = `rotate(${p.rotation.toFixed(1)} ${p.pos.x} ${p.pos.y})`;
      const text = svgEl('text', attrs);
      text.textContent = p.text;
      this._group.append(text);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Tangent — for orient='along' labels                                */
  /* ------------------------------------------------------------------ */

  /**
   * Compute the tangent angle (in SVG degrees) at the label anchor by finding
   * the nearest line segment to the anchor in the feature's geometry. Result
   * is normalised to keep the text upright (never flipped upside down).
   * Cached per feature.id.
   */
  _tangentFor(feature) {
    const cached = this._tangentCache.get(feature.id);
    if (cached != null) return cached;
    const angle = computeTangentAngle(feature, this.atlas.projection);
    this._tangentCache.set(feature.id, angle);
    return angle;
  }
}

function computeTangentAngle(feature, projection) {
  const g = feature.geometry;
  if (!g) return 0;
  const anchorLonLat = feature.properties?.labelAnchor
                    ?? feature.properties?.centroid;
  if (!anchorLonLat) return 0;
  const [ax, ay] = projection.forward(anchorLonLat);

  const lines = g.type === 'MultiLineString' ? g.coordinates
             : g.type === 'LineString'      ? [g.coordinates]
             : null;
  if (!lines) return 0;

  // Find the segment whose midpoint is closest to the anchor.
  let best = null;
  let bestD = Infinity;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [x1, y1] = projection.forward(line[i]);
      const [x2, y2] = projection.forward(line[i + 1]);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const d = Math.hypot(mx - ax, my - ay);
      if (d < bestD) { bestD = d; best = { x1, y1, x2, y2 }; }
    }
  }
  if (!best) return 0;
  let angle = Math.atan2(best.y2 - best.y1, best.x2 - best.x1) * 180 / Math.PI;
  // Keep text upright.
  if (angle > 90)  angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Nominal font metrics per label class. `size` is base font-size in SVG
 * units at 1× zoom; the render pass scales this by 1/currentZoom to keep
 * on-screen size constant.
 */
function fontFor(cls) {
  switch (cls) {
    case 'lbl-district': return { size: 9.5,  avgChar: 4.6 };
    case 'lbl-np':       return { size: 10.0, avgChar: 6.0 };  // uppercase caps ≈ wider
    case 'lbl-tr':       return { size: 9.8,  avgChar: 5.1 };
    case 'lbl-wls':      return { size: 8.8,  avgChar: 4.6 };
    case 'lbl-ramsar':   return { size: 9.2,  avgChar: 4.8 };
    case 'lbl-wetland':  return { size: 8.6,  avgChar: 4.6 };
    default:             return { size: 9.5,  avgChar: 4.8 };
  }
}

/** Coarse width estimate — good enough for collision avoidance. */
function estimateWidth(text, font) {
  return text.length * font.avgChar;
}

/**
 * Candidate positions for a label, in priority order:
 *   1. On-anchor (centered on the pole-of-inaccessibility / centroid).
 *   2. Eight compass offsets (N first, then NE, E, SE, S, SW, W, NW).
 *   3. Two "leader-line" long offsets (N-far, S-far) that draw a connector.
 */
function candidatePositions(anchor, w, h, scale) {
  const dx = (w * 0.55) + 3 * scale;
  const dy = (h * 1.1)  + 3 * scale;
  const long = 24 * scale;
  return [
    { x: anchor.x,       y: anchor.y + h * 0.35 },              // on anchor
    { x: anchor.x,       y: anchor.y - dy },                    // N
    { x: anchor.x + dx,  y: anchor.y - dy * 0.7 },              // NE
    { x: anchor.x + dx*1.2, y: anchor.y + h * 0.35 },           // E
    { x: anchor.x + dx,  y: anchor.y + dy },                    // SE
    { x: anchor.x,       y: anchor.y + dy * 1.5 },              // S
    { x: anchor.x - dx,  y: anchor.y + dy },                    // SW
    { x: anchor.x - dx*1.2, y: anchor.y + h * 0.35 },           // W
    { x: anchor.x - dx,  y: anchor.y - dy * 0.7 },              // NW
    { x: anchor.x,       y: anchor.y - dy - long, leader: true },   // N-far with leader
    { x: anchor.x,       y: anchor.y + dy * 1.5 + long, leader: true }, // S-far with leader
  ];
}

function rectIntersects(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}
function rectIntersectsAny(rect, others) {
  for (const o of others) if (rectIntersects(rect, o)) return true;
  return false;
}
function inside(box, [x, y]) {
  return x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
}
