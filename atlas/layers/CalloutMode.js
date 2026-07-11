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
let sikhwalRoot   = null;  // <div> container for boxes + per-box leader-line SVGs
const sikhwalMode = new URLSearchParams(location.search).get('callouts') === 'sikhwal';

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  buildOverlays();
  // In Sikhwal preview mode, mark the SVG root so we can strengthen
  // district fill / stroke in CSS. Do NOT force setMode('division') —
  // LegendPanel's mode-visibility rule would then turn off whatever
  // point layer the user just enabled (the mode-list has no entry for
  // 'division', so it treats the target set as empty).
  if (sikhwalMode) {
    const svg = document.getElementById('atlas-map');
    if (svg) {
      svg.classList.add('sikhwal-active');
      // Apply division-mode fills WITHOUT going through LayerManager.setMode,
      // which would fire layer:mode → LegendPanel.applyModeVisibility →
      // turn off the point layer the user just enabled. We only want the
      // CSS effect (coloured district fills), not the visibility side-effect.
      svg.classList.add('mode-division');
    }
  }
  refreshEverything();

  Atlas.bus.on('layer:visibility', () => refreshEverything());
  Atlas.bus.on('view:changed',    () => {
    positionIcons();
    if (sikhwalMode) repositionSikhwal();
  });
  Atlas.bus.on('selection:changed', ({ feature }) => {
    setPanelHidden(!!feature);
    // In Sikhwal mode, hide the whole callout root while a feature is
    // selected so it doesn't overlap the detail card slide-in. Returns
    // when the selection is cleared.
    if (sikhwalRoot) sikhwalRoot.classList.toggle('hidden', !!feature);
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
    // Sikhwal preview: only a container for boxes. Leader lines live
    // inside a per-box mini-SVG (created in renderSikhwal) so there is
    // never a full-viewport overlay that could visually shadow the base
    // map SVG — earlier design used a single big SVG which caused the
    // map to blank out in Safari as soon as the callouts rendered.
    sikhwalRoot = el('div', { class: 'sikhwal-root' });
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
  // Clear previous callouts (boxes + any per-box leader-line SVGs).
  sikhwalRoot.innerHTML = '';
  sikhwalSlots.length = 0;
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
      // Tight teaser — keeps every box to 2-3 lines so the edge columns
      // pack predictably. Long facts get truncated with an ellipsis; the
      // full fact reads in the detail card on click.
      const teaser = facts[0]
        ? (facts[0].length > 90 ? facts[0].slice(0, 88).trimEnd() + '…' : facts[0])
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
  if (!sikhwalRoot) return;
  const svg   = document.getElementById('atlas-map');
  const mapEl = document.querySelector('.a-map');
  if (!svg || !mapEl) return;
  const rect = mapEl.getBoundingClientRect();
  const proj = Atlas.projection;
  const ctm  = svg.getScreenCTM();
  if (!ctm) return;

  const svgRect = svg.getBoundingClientRect();
  // Map centre in .a-map-local coords (used as the axis-split threshold).
  const cx = svgRect.left + svgRect.width / 2 - rect.left;

  // Clear any old per-box leader SVGs — boxes stay, only lines redrawn.
  sikhwalRoot.querySelectorAll('.sikhwal-line').forEach(n => n.remove());

  /* Compute each slot's on-screen anchor point. */
  const slots = sikhwalSlots.map(slot => {
    const [xs, ys] = proj.forward([slot.lon, slot.lat]);
    const pt = svg.createSVGPoint();
    pt.x = xs; pt.y = ys;
    const scr = pt.matrixTransform(ctm);
    return {
      ...slot,
      ax: scr.x - rect.left,
      ay: scr.y - rect.top,
    };
  });

  /* Edge-column layout — no more angular collisions.
   * Assign each feature to the LEFT column (feature west of map centre)
   * or the RIGHT column (east of map centre). Within each column, sort
   * by the feature's Y coordinate and distribute along the edge with a
   * fixed vertical stride. This guarantees no vertical overlap, and
   * leader lines run monotonically inward.
   */
  const W = 190, H = 96;            // Box dimensions — matches .sikhwal-box CSS.
  const STRIDE_Y = H + 12;          // Vertical spacing — guarantees a visible gap between stacked boxes.
  const EDGE_MARGIN = 12;           // Distance from viewport edge to box outer edge.
  const TOP_MARGIN  = 76;           // Reserve top area for zoom controls, search, etc.

  const leftCol  = slots.filter(s => s.ax <  cx).sort((a, b) => a.ay - b.ay);
  const rightCol = slots.filter(s => s.ax >= cx).sort((a, b) => a.ay - b.ay);

  const usable = rect.height - TOP_MARGIN - EDGE_MARGIN;
  const packColumn = (col, rightSide) => {
    if (!col.length) return;
    // Distribute evenly across usable height so columns of ≤6 look
    // balanced and columns of many use the minimum stride.
    const stride = col.length > 1
      ? Math.max(STRIDE_Y, (usable - H) / (col.length - 1))
      : 0;
    // Centre the column vertically inside usable band when it doesn't
    // fill the whole height — pins nicely to the Rajasthan silhouette.
    const totalHeight = (col.length - 1) * stride + H;
    const startY = TOP_MARGIN + Math.max(0, (usable - totalHeight) / 2);
    const x = rightSide ? (rect.width - W - EDGE_MARGIN) : EDGE_MARGIN;
    col.forEach((slot, idx) => {
      const y = startY + idx * stride;
      slot.div.style.left = `${x}px`;
      slot.div.style.top  = `${y}px`;
      slot.boxX = x; slot.boxY = y;
    });
  };
  packColumn(leftCol,  false);
  packColumn(rightCol, true);

  /* Draw one small SVG per box, sized to just the leader-line bounding
   * box + anchor dot. This keeps every SVG tiny and never spans the
   * whole map — so nothing shadows the base map SVG behind. */
  for (const slot of [...leftCol, ...rightCol]) {
    const rightSide = slot.boxX + W / 2 > cx;
    const bcy = slot.boxY + H / 2;
    // Line origin: inner edge of the box, halfway down.
    const ox = rightSide ? slot.boxX : slot.boxX + W;
    const oy = bcy;
    // Elbow: short horizontal, then diagonal.
    const elbowX = ox + (rightSide ? -22 : 22);
    const elbowY = oy;
    const tx = slot.ax;
    const ty = slot.ay;
    // Compute bounding box for the mini-SVG.
    const pad = 8;
    const minX = Math.min(ox, elbowX, tx) - pad;
    const minY = Math.min(oy, elbowY, ty) - pad;
    const maxX = Math.max(ox, elbowX, tx) + pad;
    const maxY = Math.max(oy, elbowY, ty) + pad;
    const w = maxX - minX;
    const h = maxY - minY;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'sikhwal-line');
    s.setAttribute('width',  w);
    s.setAttribute('height', h);
    s.setAttribute('viewBox', `0 0 ${w} ${h}`);
    s.style.position = 'absolute';
    s.style.left = `${minX}px`;
    s.style.top  = `${minY}px`;
    s.style.pointerEvents = 'none';
    // Local coordinates inside the mini-SVG.
    const lox = ox - minX,      loy = oy - minY;
    const lex = elbowX - minX,  ley = elbowY - minY;
    const ltx = tx - minX,      lty = ty - minY;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${lox},${loy} L${lex},${ley} L${ltx},${lty}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#7a5a2a');
    path.setAttribute('stroke-width', '0.9');
    path.setAttribute('stroke-dasharray', '4 3');
    path.setAttribute('opacity', '0.65');
    s.append(path);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', ltx); dot.setAttribute('cy', lty);
    dot.setAttribute('r', 2.6);
    dot.setAttribute('fill', '#7a5a2a'); dot.setAttribute('opacity', '0.85');
    s.append(dot);
    sikhwalRoot.append(s);
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

    /* Sikhwal radial preview: sikhwal-root is a transparent child of
     * .a-map that only carries the callout boxes and per-box mini-SVGs.
     * pointer-events none on the root keeps pans and clicks flowing to
     * the map SVG behind; isolation isolate prevents Safari from
     * failing to composite the SVG underneath the overlay, which was
     * the visual cause of "map disappears when callouts appear".
     */
    .sikhwal-root {
      position: absolute; inset: 0;
      pointer-events: none;
      background: transparent;
      isolation: isolate;
      z-index: 4;
      color: var(--ink-2, #6b5030);
    }
    /* Per-box mini SVGs — sized to just the leader-line bounding box. */
    .sikhwal-line { pointer-events: none; }
    .sikhwal-box {
      position: absolute;
      width: 190px;
      max-height: 96px;
      overflow: hidden;
      pointer-events: auto;
      padding: 6px 9px;
      background: color-mix(in srgb, var(--bg-1, #f5efe0) 97%, transparent);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 4px;
      box-shadow: 0 1.5px 4px rgba(0,0,0,0.14);
      font-family: var(--sans);
      font-size: 11px;
      line-height: 1.38;
      color: var(--ink-1, #3d2f10);
      cursor: pointer;
      transition: max-height 0.18s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }
    .sikhwal-box:hover {
      /* Expand on hover so the full teaser is readable without click */
      max-height: 260px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.22);
      z-index: 6;
    }
    .sikhwal-root.hidden { display: none; }

    /* Emphasise district strokes so the base map reads clearly in
     * Sikhwal mode. Just stroke — no fill override — so we don't
     * fight with theme fills or the paint pipeline.
     */
    .a-map svg.sikhwal-active .layer-districts path.feature {
      stroke: #7a5a2a;
      stroke-width: 0.8;
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
