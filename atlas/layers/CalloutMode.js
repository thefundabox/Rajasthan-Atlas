/**
 * CalloutMode — Sikhwal-style layer callout panel + point-icon overlay.
 *
 * Two responsibilities:
 *
 * 1. Layer-aware callout panel — auto-triggered.
 *    When any point-based layer (fairs, forts, deity shrines, palaces …)
 *    is toggled on, a floating panel appears in the right-side whitespace
 *    of the map. Every visible point layer contributes a section with its
 *    icon + name + feature list. Each callout row shows the feature name,
 *    district, and a one-line teaser; clicking selects the feature and
 *    opens its full detail card. Panel auto-hides when a feature is
 *    selected (avoids overlap with the detail slide-in), and re-appears
 *    when the detail closes. Panel disappears if no point layer is on.
 *
 * 2. Distinct-icon overlay for point features.
 *    Every point on the map used to render as an identical circle, so a
 *    fair, a research centre and a battle site were indistinguishable
 *    once you turned multiple layers on. This overlay paints each
 *    layer's emoji icon at every point's screen position — visible on
 *    top of the base dot. Falls back to a coloured dot when the layer
 *    has no icon defined. Repositions on view:changed (zoom / pan).
 *
 * Both are additive: no engine changes, works via bus events and DOM
 * overlays on the existing .a-map container.
 */

import { el } from '../core/util/dom.js';

/* ── Which layers this plug-in speaks to ─────────────────────────
 * Point layers eligible for callouts + icon overlay. We restrict to
 * layers with an emoji icon so the overlay is meaningful; polygon /
 * line layers (rivers, districts, wetlands) are handled by the atlas
 * label / labelling system already.
 */

let iconOverlay = null;   // <div> HTML overlay holding per-point icons
let panel       = null;   // <aside> panel holding layer callout sections
let panelHidden = false;  // true while a feature is selected

// Sikhwal-style radial callouts around the map perimeter (preview mode).
// Enabled via ?callouts=sikhwal — otherwise the compact right-side panel
// (mode above) stays default.
let sikhwalRoot   = null;  // <div> container for radial boxes + leader-line SVG
let sikhwalSVG    = null;  // SVG overlay for leader lines
const sikhwalMode = new URLSearchParams(location.search).get('callouts') === 'sikhwal';

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  buildOverlays();
  refreshEverything();

  Atlas.bus.on('layer:visibility', () => refreshEverything());
  Atlas.bus.on('view:changed',    () => {
    positionIcons();
    if (sikhwalMode) repositionSikhwal();
  });
  Atlas.bus.on('selection:changed', ({ feature }) => {
    setPanelHidden(!!feature);
  });
  window.addEventListener('resize', () => {
    if (sikhwalMode) repositionSikhwal();
  });
});

/* ── Overlay & panel scaffolding ─────────────────────────────────── */

function buildOverlays() {
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  iconOverlay = el('div', { class: 'point-icon-overlay' });
  mapEl.append(iconOverlay);
  if (sikhwalMode) {
    // Radial preview: a container that holds the callout boxes and an
    // SVG layer for the leader lines behind them.
    sikhwalRoot = el('div', { class: 'sikhwal-root' });
    sikhwalSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sikhwalSVG.setAttribute('class', 'sikhwal-svg');
    sikhwalRoot.append(sikhwalSVG);
    mapEl.append(sikhwalRoot);
  } else {
    panel = el('aside', { class: 'layer-callout-panel', role: 'complementary' });
    mapEl.append(panel);
  }
}

function setPanelHidden(hidden) {
  panelHidden = hidden;
  if (panel) panel.classList.toggle('hidden', hidden);
}

/* ── Refresh — called when layer visibility changes ──────────────── */

function refreshEverything() {
  const activeLayers = eligibleLayers().filter(l => Atlas.layers.list().find(x => x.id === l.id));
  renderIcons(activeLayers);
  if (sikhwalMode) renderSikhwal(activeLayers);
  else renderPanel(activeLayers);
}

function eligibleLayers() {
  // Return every point-type layer that is currently visible AND has an
  // icon defined in its config. We look up the private `_layers` map on
  // LayerManager to get the visibility bit (LayerManager.list() returns
  // configs but they all read `visible` from the same source).
  const out = [];
  for (const cfg of Atlas.layers.list()) {
    if (cfg.type !== 'point') continue;
    if (!cfg.visible) continue;
    if (!cfg.icon) continue;              // skip layers without an emoji icon
    const feats = Atlas.layers.features(cfg.id) || [];
    if (!feats.length) continue;
    out.push({ id: cfg.id, name: cfg.name, icon: cfg.icon, color: cfg.color, features: feats });
  }
  return out;
}

/* ── 1. Point-icon overlay ───────────────────────────────────────── */

function renderIcons(activeLayers) {
  if (!iconOverlay) return;
  iconOverlay.innerHTML = '';
  for (const layer of activeLayers) {
    for (const feat of layer.features) {
      // Determine anchor point. Use centroid if present, otherwise the
      // first coordinate of the geometry.
      const c = feat.properties?.centroid
        || (feat.geometry?.type === 'Point' ? feat.geometry.coordinates : null);
      if (!c) continue;
      const icon = feat.properties?.icon || layer.icon;
      const dot = el('div', {
        class: 'point-icon',
        'data-layer': layer.id,
        'data-feature': feat.id,
        title: feat.properties?.name || feat.id,
        onclick: () => Atlas.interaction.select(layer.id, feat.id, { zoom: false }),
      });
      dot.textContent = icon;
      dot.dataset.lon = c[0];
      dot.dataset.lat = c[1];
      iconOverlay.append(dot);
    }
  }
  positionIcons();
}

function positionIcons() {
  if (!iconOverlay) return;
  const svg   = document.getElementById('atlas-map');
  const mapEl = document.querySelector('.a-map');
  if (!svg || !mapEl) return;
  const mapRect = mapEl.getBoundingClientRect();
  const proj = Atlas.projection;
  // Convert each icon's lat/lon to screen coords via SVG matrix.
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const pt = svg.createSVGPoint();
  for (const dot of iconOverlay.querySelectorAll('.point-icon')) {
    const lon = parseFloat(dot.dataset.lon);
    const lat = parseFloat(dot.dataset.lat);
    if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
    const [xs, ys] = proj.forward([lon, lat]);
    pt.x = xs; pt.y = ys;
    const scr = pt.matrixTransform(ctm);
    dot.style.left = `${scr.x - mapRect.left}px`;
    dot.style.top  = `${scr.y - mapRect.top}px`;
  }
}

/* ── 2b. Sikhwal-style radial callouts (preview) ─────────────────
 * Scatter small fact-boxes around the map perimeter, outside the
 * Rajasthan state outline, with dashed leader lines pointing to
 * each feature's centroid — like a printed atlas page. Angular
 * placement based on feature position relative to the map centre;
 * radial offset pushes each box out to the map's edge margin.
 *
 * Rendering:
 *   sikhwalRoot > sikhwal-svg (leader lines)
 *              > .sikhwal-box × N (fact boxes)
 * Positions are recomputed on view:changed and window resize.
 */

// Radial slots collected during renderSikhwal so repositionSikhwal
// can re-run without reparsing feature data. Each slot: { div, lon, lat }.
const sikhwalSlots = [];

function renderSikhwal(activeLayers) {
  if (!sikhwalRoot) return;
  // Clear previous callouts.
  sikhwalRoot.querySelectorAll('.sikhwal-box').forEach(n => n.remove());
  sikhwalSlots.length = 0;
  if (sikhwalSVG) sikhwalSVG.innerHTML = '';
  if (!activeLayers.length) return;

  // Cap per-layer callouts so the perimeter doesn't drown in text.
  const MAX_PER_LAYER = 12;

  for (const layer of activeLayers) {
    const feats = [...layer.features].slice(0, MAX_PER_LAYER);
    for (const feat of feats) {
      const c = feat.properties?.centroid
        || (feat.geometry?.type === 'Point' ? feat.geometry.coordinates : null);
      if (!c) continue;
      const facts = Array.isArray(feat.properties?.notes?.facts)
        ? feat.properties.notes.facts : [];
      const teaser = facts[0]
        ? (facts[0].length > 105 ? facts[0].slice(0, 103).trimEnd() + '…' : facts[0])
        : '';
      const box = el('div', {
        class: `sikhwal-box`,
        'data-layer': layer.id,
        'data-feature': feat.id,
        onclick: () => Atlas.interaction.select(layer.id, feat.id, { zoom: true }),
      });
      const icon = feat.properties?.icon || layer.icon;
      const header = el('div', { class: 'sikhwal-title' }, [
        el('span', { class: 'sikhwal-icon' }, [icon]),
        el('span', { class: 'sikhwal-name' }, [feat.properties?.name || feat.id]),
      ]);
      box.append(header);
      if (teaser) box.append(el('div', { class: 'sikhwal-body' }, [teaser]));
      sikhwalRoot.append(box);
      sikhwalSlots.push({ div: box, lon: c[0], lat: c[1] });
    }
  }
  repositionSikhwal();
}

function repositionSikhwal() {
  if (!sikhwalRoot || !sikhwalSVG) return;
  const svg   = document.getElementById('atlas-map');
  const mapEl = document.querySelector('.a-map');
  if (!svg || !mapEl) return;
  const rect = mapEl.getBoundingClientRect();
  const proj = Atlas.projection;
  const ctm  = svg.getScreenCTM();
  if (!ctm) return;

  // Map centre in .a-map local coords.
  const svgRect = svg.getBoundingClientRect();
  const cx = svgRect.left + svgRect.width / 2 - rect.left;
  const cy = svgRect.top  + svgRect.height / 2 - rect.top;
  // Bring boxes to just outside the state outline. Rajasthan roughly
  // fills the vertical extent; push to ~48% width and ~48% height.
  const rx = svgRect.width  * 0.48;
  const ry = svgRect.height * 0.48;

  sikhwalSVG.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  sikhwalSVG.setAttribute('width',   rect.width);
  sikhwalSVG.setAttribute('height',  rect.height);
  sikhwalSVG.innerHTML = '';

  // Sort by angle so nearby-angle boxes get resolved deterministically.
  const slotsWithAngle = sikhwalSlots.map(slot => {
    const [xs, ys] = proj.forward([slot.lon, slot.lat]);
    const pt = svg.createSVGPoint();
    pt.x = xs; pt.y = ys;
    const scr = pt.matrixTransform(ctm);
    const ax = scr.x - rect.left;
    const ay = scr.y - rect.top;
    const dx = ax - cx, dy = ay - cy;
    const angle = Math.atan2(dy, dx);       // 0 = east, +y = down
    return { ...slot, ax, ay, angle };
  });
  slotsWithAngle.sort((a, b) => a.angle - b.angle);

  // Nudge boxes so they don't overlap tangentially. Track occupied
  // (angle, band) pairs; if a slot would collide, offset radially
  // outward into a second band.
  const angleStep = (Math.PI * 2) / Math.max(slotsWithAngle.length, 16);
  const used = new Map(); // "band|slot" -> true
  for (const slot of slotsWithAngle) {
    let band = 0;
    let key;
    // Snap to the nearest angular slot within its band, spilling to
    // outer bands if the slot is already taken.
    while (true) {
      const snapIdx = Math.round(slot.angle / angleStep);
      key = `${band}|${snapIdx}`;
      if (!used.has(key)) break;
      band++;
      if (band > 3) break;    // give up after 4 bands (safety valve)
    }
    used.set(key, true);
    // Convert back to screen position.
    const r = 1 + band * 0.08;
    const bx = cx + Math.cos(slot.angle) * rx * r;
    const by = cy + Math.sin(slot.angle) * ry * r;
    // Box is ~180x40; centre it, but clamp to viewport with 6 px margin.
    const w = 180, h = 44;
    let x = bx - w / 2;
    let y = by - h / 2;
    x = Math.max(6, Math.min(rect.width  - w - 6, x));
    y = Math.max(6, Math.min(rect.height - h - 6, y));
    slot.div.style.left = `${x}px`;
    slot.div.style.top  = `${y}px`;

    // Anchor point where the leader line meets the box (nearest edge).
    const bcx = x + w / 2, bcy = y + h / 2;
    const dxA = slot.ax - bcx, dyA = slot.ay - bcy;
    const inv = Math.max(Math.abs(dxA) / (w / 2), Math.abs(dyA) / (h / 2)) || 1;
    const ex = bcx + dxA / inv;
    const ey = bcy + dyA / inv;

    // Leader line + anchor dot.
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', ex); line.setAttribute('y1', ey);
    line.setAttribute('x2', slot.ax); line.setAttribute('y2', slot.ay);
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '0.7');
    line.setAttribute('stroke-dasharray', '4 3');
    line.setAttribute('opacity', '0.6');
    sikhwalSVG.append(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', slot.ax); dot.setAttribute('cy', slot.ay);
    dot.setAttribute('r', 2.4);
    dot.setAttribute('fill', 'currentColor'); dot.setAttribute('opacity', '0.8');
    sikhwalSVG.append(dot);
  }
}

/* ── 2. Layer callout panel (right whitespace) ───────────────────── */

function renderPanel(activeLayers) {
  if (!panel) return;
  panel.innerHTML = '';
  if (!activeLayers.length) {
    panel.classList.add('hidden');
    return;
  }
  if (!panelHidden) panel.classList.remove('hidden');

  const header = el('div', { class: 'lcp-header' }, [
    el('div', { class: 'lcp-title' }, [`Callouts · ${activeLayers.length} layer${activeLayers.length > 1 ? 's' : ''}`]),
    el('div', { class: 'lcp-sub' },   ['Tap a name to open its full profile.']),
  ]);
  panel.append(header);

  for (const layer of activeLayers) {
    const section = el('section', { class: 'lcp-section' });
    section.append(el('h3', { class: 'lcp-h' }, [
      el('span', { class: 'lcp-h-icon' }, [layer.icon]),
      el('span', { class: 'lcp-h-name' }, [layer.name]),
      el('span', { class: 'lcp-h-count' }, [`${layer.features.length}`]),
    ]));
    const list = el('ul', { class: 'lcp-list' });
    for (const feat of layer.features) {
      list.append(makeCalloutRow(layer, feat));
    }
    section.append(list);
    panel.append(section);
  }
}

function makeCalloutRow(layer, feat) {
  const p = feat.properties || {};
  const facts = Array.isArray(p.notes?.facts) ? p.notes.facts : [];
  const teaser = facts[0]
    ? (facts[0].length > 140 ? facts[0].slice(0, 138).trimEnd() + '…' : facts[0])
    : '';
  const row = el('li', {
    class: 'lcp-row',
    onclick: () => {
      Atlas.interaction.select(layer.id, feat.id, { zoom: true });
    },
  });
  const line1 = el('div', { class: 'lcp-name' }, [p.name || feat.id]);
  if (p.district) {
    line1.append(el('span', { class: 'lcp-district' }, [` · ${p.district}`]));
  }
  row.append(line1);
  if (teaser) row.append(el('div', { class: 'lcp-teaser' }, [teaser]));
  return row;
}

/* ── Styles ─────────────────────────────────────────────────────── */

function injectStyles() {
  if (document.getElementById('callout-mode-styles')) return;
  const s = document.createElement('style');
  s.id = 'callout-mode-styles';
  s.textContent = `
    /* ── Point-icon overlay ────────────────────────────── */
    .point-icon-overlay {
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 3;
    }
    .point-icon {
      position: absolute;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.35));
      transition: transform 0.1s;
    }
    .point-icon:hover {
      transform: translate(-50%, -50%) scale(1.35);
      z-index: 4;
    }

    /* ── Layer callout panel ───────────────────────────── */
    .layer-callout-panel {
      position: absolute;
      top: 60px;
      right: 12px;
      width: 280px;
      max-height: calc(100% - 100px);
      overflow-y: auto;
      z-index: 5;
      padding: 10px 12px;
      background: color-mix(in srgb, var(--bg-1, #f5efe0) 96%, transparent);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.14);
      font-family: var(--sans);
      color: var(--ink-1, #3d2f10);
      pointer-events: auto;
    }
    .layer-callout-panel.hidden { display: none; }
    .layer-callout-panel::-webkit-scrollbar { width: 6px; }
    .layer-callout-panel::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--ink-3, #ba9863) 60%, transparent);
      border-radius: 3px;
    }

    .lcp-header {
      padding-bottom: 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--ink-3, #ba9863) 40%, transparent);
      margin-bottom: 8px;
    }
    .lcp-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-2, #6b5030);
      font-weight: 600;
    }
    .lcp-sub {
      font-size: 10.5px;
      color: var(--ink-2, #6b5030);
      opacity: 0.75;
      margin-top: 2px;
    }

    .lcp-section { margin-bottom: 12px; }
    .lcp-section:last-child { margin-bottom: 4px; }
    .lcp-h {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--ink-1, #3d2f10);
      margin: 0 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1px dotted color-mix(in srgb, var(--ink-3, #ba9863) 55%, transparent);
    }
    .lcp-h-icon { font-size: 15px; }
    .lcp-h-name { flex: 1; }
    .lcp-h-count {
      font-size: 10.5px;
      background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 15%, transparent);
      padding: 1px 6px;
      border-radius: 10px;
      color: var(--sym-tr, #7a5a2a);
    }

    .lcp-list {
      list-style: none;
      margin: 0; padding: 0;
    }
    .lcp-row {
      padding: 6px 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .lcp-row:hover { background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 8%, transparent); }
    .lcp-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--ink-1, #3d2f10);
    }
    .lcp-district {
      font-weight: 400;
      color: var(--ink-2, #6b5030);
      font-size: 11px;
    }
    .lcp-teaser {
      font-size: 10.5px;
      color: var(--ink-2, #6b5030);
      line-height: 1.4;
      margin-top: 2px;
    }
    @media (max-width: 900px) {
      .layer-callout-panel { display: none; }
    }

    /* ── Sikhwal radial preview ─────────────────────────────── */
    .sikhwal-root {
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 4;
      color: var(--ink-2, #6b5030);
    }
    .sikhwal-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .sikhwal-box {
      position: absolute;
      width: 180px;
      pointer-events: auto;
      padding: 5px 8px;
      background: color-mix(in srgb, var(--bg-1, #f5efe0) 96%, transparent);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 4px;
      box-shadow: 0 1.5px 4px rgba(0,0,0,0.12);
      font-family: var(--sans);
      font-size: 10.5px;
      line-height: 1.35;
      color: var(--ink-1, #3d2f10);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .sikhwal-box:hover {
      transform: scale(1.05);
      box-shadow: 0 3px 8px rgba(0,0,0,0.18);
      z-index: 5;
    }
    .sikhwal-title {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;
      font-size: 11px;
      color: var(--sym-tr, #7a5a2a);
      margin-bottom: 1px;
    }
    .sikhwal-icon { font-size: 12px; }
    .sikhwal-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sikhwal-body { color: var(--ink-1, #3d2f10); }
    @media (max-width: 900px) {
      .sikhwal-root { display: none; }
    }
  `;
  document.head.append(s);
}
