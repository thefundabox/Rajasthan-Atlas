/**
 * InteractionManager — everything that happens because the user touches the map.
 *
 * Owns:
 *   - hover state    (tooltip follow, path .hovered class)
 *   - selection state(single-select for now — extend to multi later)
 *   - zoom / pan     (wheel + drag, delegated to a small helper here)
 *   - keyboard       (shortcuts)
 *   - tooltip DOM
 *
 * Emits via EventBus:
 *   - `selection:changed`      { layerId, featureId, feature|null }
 *   - `hover:changed`          { layerId, featureId, feature|null }
 *   - `view:changed`           { zoom, viewBox }
 */

import { CONFIG } from './config.js';
import { esc, el } from './util/dom.js';

export class InteractionManager {
  constructor(atlas) {
    this.atlas   = atlas;
    this._svg    = null;
    this._home   = null;       // baseline viewBox
    this._view   = null;       // current viewBox
    this._sel    = null;       // { layerId, featureId }
    this._hover  = null;
    this._tt     = null;
    this._shortcuts = new Map();
    this._registerDefaultShortcuts();
  }

  attachTo(svg) {
    this._svg = svg;
    const vb = svg.viewBox.baseVal;
    this._home = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    this._view = { ...this._home };
    this._buildTooltip();
    this._bindPointer();
    this._bindWheel();
    this._bindDelegatedFeatureEvents();
    this._bindKeyboard();
    this._commit();
  }

  /* ------------------------------------------------------------------ */
  /*  Public — selection                                                */
  /* ------------------------------------------------------------------ */

  select(layerId, featureId, { zoom = false } = {}) {
    if (this._sel) {
      this.atlas.renderer.updateFeatureStyle(this._sel.layerId, this._sel.featureId, { removeClass: 'selected' });
    }
    if (!featureId) {
      this._sel = null;
      this.atlas.bus.emit('selection:changed', { layerId: null, featureId: null, feature: null });
      return;
    }
    this._sel = { layerId, featureId };
    this.atlas.renderer.updateFeatureStyle(layerId, featureId, { addClass: 'selected' });
    const feature = this.atlas.data.getFeature(layerId, featureId);
    this.atlas.bus.emit('selection:changed', { layerId, featureId, feature });
    if (zoom && feature) this._zoomToFeature(feature);
  }

  /* Pick the best available geometry hint and frame the view around it.
   * Point features (and features with a degenerate bbox like [x,y,x,y])
   * use a fixed-radius pan-and-zoom; polygons/lines with a real bbox
   * use zoomToBBox as before. */
  _zoomToFeature(feature) {
    const bbox = feature.properties?.bbox;
    const geom = feature.geometry;
    const validBBox = Array.isArray(bbox) && bbox.length === 4
      && bbox[2] > bbox[0] && bbox[3] > bbox[1];
    if (validBBox) {
      this.zoomToBBox(bbox);
      return;
    }
    // Fall back to point / centroid.
    const pt = (geom?.type === 'Point' && geom.coordinates)
      || feature.properties?.centroid
      || feature.properties?.labelAnchor;
    if (Array.isArray(pt) && pt.length >= 2) {
      this.zoomToPoint(pt[0], pt[1]);
    }
  }

  /* Frame a fixed lon/lat window centred on a point — used for point
   * features that don't have a natural bounding box. Default half-side
   * (0.55°) gives ~55 km at Rajasthan's latitudes: a city-scale view
   * that still shows the neighbouring district border. */
  zoomToPoint(lon, lat, halfSide = 0.55) {
    this.zoomToBBox([lon - halfSide, lat - halfSide, lon + halfSide, lat + halfSide]);
  }
  currentSelection() { return this._sel; }

  /* ------------------------------------------------------------------ */
  /*  Public — view                                                     */
  /* ------------------------------------------------------------------ */

  currentZoom()      { return this._home.w / this._view.w; }
  currentViewBox()   { return { ...this._view }; }
  reset()            { this._view = { ...this._home }; this._commit(); }

  zoomBy(factor, cx, cy) {
    const cur = this.currentZoom();
    const next = clamp(cur * factor, CONFIG.zoom.min, CONFIG.zoom.max);
    const scale = cur / next;
    const anchor = (cx == null || cy == null)
      ? { x: this._view.x + this._view.w / 2, y: this._view.y + this._view.h / 2 }
      : this._clientToSvg(cx, cy);
    this._view.x = anchor.x - (anchor.x - this._view.x) * scale;
    this._view.y = anchor.y - (anchor.y - this._view.y) * scale;
    this._view.w = this._view.w * scale;
    this._view.h = this._view.h * scale;
    this._clamp();
    this._commit();
  }

  zoomToBBox(lonLatBBox, pad = CONFIG.zoom.fitPadding) {
    const p = this.atlas.projection;
    const [x1, y1] = p.forward([lonLatBBox[0], lonLatBBox[3]]);
    const [x2, y2] = p.forward([lonLatBBox[2], lonLatBBox[1]]);
    const sx = Math.min(x1, x2), sy = Math.min(y1, y2);
    const sw = Math.abs(x2 - x1), sh = Math.abs(y2 - y1);
    const px = sw * pad, py = sh * pad;
    let w = sw + 2 * px, h = sh + 2 * py;
    const ratio = this._home.w / this._home.h;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    this._view.x = sx + sw / 2 - w / 2;
    this._view.y = sy + sh / 2 - h / 2;
    this._view.w = w;
    this._view.h = h;
    this._clamp();
    this._commit();
  }

  /* ------------------------------------------------------------------ */
  /*  Public — keyboard                                                 */
  /* ------------------------------------------------------------------ */

  registerShortcut(key, handler) { this._shortcuts.set(key, handler); }

  /* ------------------------------------------------------------------ */
  /*  Internal — viewBox math                                           */
  /* ------------------------------------------------------------------ */

  _commit() {
    this._svg.setAttribute('viewBox',
      `${this._view.x} ${this._view.y} ${this._view.w} ${this._view.h}`);
    this.atlas.bus.emit('view:changed', { zoom: this.currentZoom(), viewBox: { ...this._view } });
  }
  _clamp() {
    if (this._view.w > this._home.w) this._view.w = this._home.w;
    if (this._view.h > this._home.h) this._view.h = this._home.h;
    if (this._view.x < this._home.x) this._view.x = this._home.x;
    if (this._view.y < this._home.y) this._view.y = this._home.y;
    if (this._view.x + this._view.w > this._home.x + this._home.w)
      this._view.x = this._home.x + this._home.w - this._view.w;
    if (this._view.y + this._view.h > this._home.y + this._home.h)
      this._view.y = this._home.y + this._home.h - this._view.h;
  }
  _clientToSvg(cx, cy) {
    const r = this._svg.getBoundingClientRect();
    return {
      x: this._view.x + (cx - r.left) / r.width  * this._view.w,
      y: this._view.y + (cy - r.top)  / r.height * this._view.h,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Internal — pointer & wheel                                        */
  /* ------------------------------------------------------------------ */

  _bindPointer() {
    // Threshold-gated pointer capture. Capturing on pointerdown retargets the
    // subsequent `click` event to the SVG root regardless of pixel, so feature
    // clicks (districts, points) never reach InteractionManager's delegated
    // click handler. Instead we track pointerdown coords, and only start a
    // drag + capture the pointer once movement exceeds DRAG_THRESHOLD_PX. A
    // still click never captures, so the click reaches the underlying path.
    const DRAG_THRESHOLD_PX = 4;
    let start = null, dragging = false, captured = false;
    this._svg.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      start = { cx: ev.clientX, cy: ev.clientY, vx: this._view.x, vy: this._view.y, id: ev.pointerId };
      dragging = false;
      captured = false;
    });
    this._svg.addEventListener('pointermove', (ev) => {
      if (!start) return;
      if (!dragging) {
        const dx = ev.clientX - start.cx, dy = ev.clientY - start.cy;
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        dragging = true;
        try { this._svg.setPointerCapture(start.id); captured = true; } catch (_) {}
        this._svg.classList.add('dragging');
      }
      const r = this._svg.getBoundingClientRect();
      this._view.x = start.vx - (ev.clientX - start.cx) / r.width  * this._view.w;
      this._view.y = start.vy - (ev.clientY - start.cy) / r.height * this._view.h;
      this._clamp(); this._commit();
    });
    const stop = (ev) => {
      if (!start) return;
      if (dragging) {
        this._svg.classList.remove('dragging');
        if (captured) { try { this._svg.releasePointerCapture(ev.pointerId); } catch (_) {} }
      }
      start = null; dragging = false; captured = false;
    };
    this._svg.addEventListener('pointerup',     stop);
    this._svg.addEventListener('pointercancel', stop);
  }
  _bindWheel() {
    this._svg.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const f = ev.deltaY < 0 ? CONFIG.zoom.wheelStep : 1 / CONFIG.zoom.wheelStep;
      this.zoomBy(f, ev.clientX, ev.clientY);
    }, { passive: false });
  }

  /* ------------------------------------------------------------------ */
  /*  Internal — delegated feature events                                */
  /* ------------------------------------------------------------------ */

  _bindDelegatedFeatureEvents() {
    const parsePath = (evTarget) => {
      const path = evTarget?.closest?.('path.feature');
      if (!path) return null;
      return { layerId: path.dataset.layer, featureId: path.dataset.feature };
    };

    this._svg.addEventListener('mousemove', (ev) => {
      const info = parsePath(ev.target);
      if (!info) { this._setHover(null); this._hideTooltip(); return; }
      const changed = !this._hover || this._hover.featureId !== info.featureId;
      if (changed) this._setHover(info);
      const feat = this.atlas.data.getFeature(info.layerId, info.featureId);
      if (feat) this._showTooltip(feat, ev.clientX, ev.clientY);
    });
    this._svg.addEventListener('mouseleave', () => {
      this._setHover(null); this._hideTooltip();
    });
    this._svg.addEventListener('click', (ev) => {
      const info = parsePath(ev.target);
      if (info) { ev.stopPropagation(); this.select(info.layerId, info.featureId); }
      else      { this.select(null, null); }
    });
    this._svg.addEventListener('dblclick', (ev) => {
      const info = parsePath(ev.target);
      if (info) { ev.stopPropagation(); this.select(info.layerId, info.featureId, { zoom: true }); }
    });
  }

  _setHover(info) {
    if (this._hover) this.atlas.renderer.updateFeatureStyle(this._hover.layerId, this._hover.featureId, { removeClass: 'hovered' });
    this._hover = info;
    if (info) this.atlas.renderer.updateFeatureStyle(info.layerId, info.featureId, { addClass: 'hovered' });
    const feature = info ? this.atlas.data.getFeature(info.layerId, info.featureId) : null;
    this.atlas.bus.emit('hover:changed', { layerId: info?.layerId ?? null, featureId: info?.featureId ?? null, feature });
  }

  /* ------------------------------------------------------------------ */
  /*  Internal — tooltip                                                */
  /* ------------------------------------------------------------------ */

  _buildTooltip() {
    this._tt = el('div', { class: 'tooltip' });
    document.body.append(this._tt);
  }
  _showTooltip(feat, x, y) {
    const p = feat.properties ?? {};
    const rows = [`<div class="tt-name">${esc(p.name ?? feat.id)}</div>`];

    // Meta line — the most useful one-line context for this feature.
    const meta = [];
    if (p.division)     meta.push(`${esc(p.division)} div`);
    if (p.headquarters) meta.push(`HQ ${esc(p.headquarters)}`);
    if (p.type && !p.division) meta.push(esc(String(p.type).replace(/_/g, ' ')));
    if (p.year_established || p.established) meta.push(`Est. ${esc(p.year_established ?? p.established)}`);
    if (p.area_km2)     meta.push(`${p.area_km2.toLocaleString('en-IN')} km²`);
    if (p.district && !p.division) meta.push(`in ${esc(p.district)}`);
    if (meta.length) rows.push(`<div class="tt-meta">${meta.join(' · ')}</div>`);

    // Metric value line — for choropleth / classification layers.
    if (p.unit && (p.class_min != null || p.class_max != null)) {
      const rng = p.class_min === p.class_max
        ? `${p.class_min}${p.unit}`
        : `${p.class_min}–${p.class_max}${p.unit}`;
      const metric = p.metric_key ? `${esc(p.metric_key.replace(/_/g, ' '))} ${rng}` : rng;
      rows.push(`<div class="tt-meta tt-metric">${metric}</div>`);
    }

    // First key fact — the strongest single sentence of context.
    const fact = p.notes?.facts?.[0] ?? p.facts?.[0] ?? p.significance ?? p.description;
    if (fact) rows.push(`<div class="tt-fact">${esc(String(fact))}</div>`);

    if (p.newDistrict) rows.push('<div class="tt-tag">Retained new district</div>');

    this._tt.innerHTML = rows.join('');
    this._tt.style.left = x + 'px';
    this._tt.style.top  = y + 'px';
    this._tt.classList.add('on');
  }
  _hideTooltip() { this._tt.classList.remove('on'); }

  /* ------------------------------------------------------------------ */
  /*  Internal — keyboard                                                */
  /* ------------------------------------------------------------------ */

  _registerDefaultShortcuts() {
    this._shortcuts.set('/', () => document.querySelector('.search input')?.focus());
    this._shortcuts.set('+', () => this.zoomBy(CONFIG.zoom.buttonStep));
    this._shortcuts.set('=', () => this.zoomBy(CONFIG.zoom.buttonStep));
    this._shortcuts.set('-', () => this.zoomBy(1 / CONFIG.zoom.buttonStep));
    this._shortcuts.set('_', () => this.zoomBy(1 / CONFIG.zoom.buttonStep));
    this._shortcuts.set('0', () => this.reset());
    this._shortcuts.set('r', () => this.reset());
    this._shortcuts.set('Escape', () => this.select(null, null));
  }
  _bindKeyboard() {
    document.addEventListener('keydown', (ev) => {
      if (ev.target?.tagName === 'INPUT' || ev.target?.tagName === 'TEXTAREA') return;
      const h = this._shortcuts.get(ev.key);
      if (h) { ev.preventDefault(); h(ev); }
    });
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
