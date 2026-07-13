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
let sikhwalRoot     = null;  // zero-size container in <body> — holds leader-line SVGs
let sikhwalColLeft  = null;  // scrollable column pinned to the map's left edge
let sikhwalColRight = null;  // scrollable column pinned to the map's right edge

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  buildOverlays();
  // Hide the small India locator inset — the sikhwal edge-column
  // callout view is the whole story; the mini-map only competes for
  // attention on the same map area.
  const locator = document.querySelector('.overlay.locator');
  if (locator) locator.style.display = 'none';
  // The × close button on the detail sidebar only removes the "open"
  // class — it does NOT clear the selection, so our selection:changed
  // listener never fires and the callouts stay hidden. Delegate a click
  // listener that also clears selection.
  document.addEventListener('click', (ev) => {
    const btn = ev.target?.closest?.('.close-btn button');
    if (btn) {
      try { Atlas.interaction.select(null, null); } catch (_) {}
    }
  });
  refreshEverything();

  Atlas.bus.on('layer:visibility', () => refreshEverything());
  Atlas.bus.on('view:changed',     () => { positionIcons(); repositionSikhwal(); });
  Atlas.bus.on('selection:changed', ({ feature }) => {
    // Hide the whole callout apparatus (columns + leader lines) while a
    // feature is selected so it doesn't compete with the detail card
    // slide-in. Returns when the selection is cleared (either by
    // clicking the map background or by the delegated × handler).
    const hide = !!feature;
    if (sikhwalRoot)     sikhwalRoot.classList.toggle('hidden', hide);
    if (sikhwalColLeft)  sikhwalColLeft.classList.toggle('hidden', hide);
    if (sikhwalColRight) sikhwalColRight.classList.toggle('hidden', hide);
  });
  window.addEventListener('resize', () => repositionSikhwal());
});

/* ── Overlay & panel scaffolding ─────────────────────────────────── */

function buildOverlays() {
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  iconOverlay = el('div', { class: 'point-icon-overlay' });
  mapEl.append(iconOverlay);
  // Sikhwal preview layout: two scrollable column DIVs pinned to the
  // map's left / right edges, plus a zero-size root for the leader-line
  // mini-SVGs. Boxes flow inside their column with position:relative,
  // so users can scroll to all features — no more +N more truncation.
  // sikhwal-root stays for the leader-line SVGs, computed against each
  // box's live screen rect on every reposition.
  sikhwalRoot     = el('div', { class: 'sikhwal-root' });
  sikhwalColLeft  = el('div', { class: 'sikhwal-col sikhwal-col-left' });
  sikhwalColRight = el('div', { class: 'sikhwal-col sikhwal-col-right' });
  document.body.append(sikhwalRoot);
  document.body.append(sikhwalColLeft);
  document.body.append(sikhwalColRight);
  sikhwalColLeft.addEventListener('scroll',  () => repositionSikhwal());
  sikhwalColRight.addEventListener('scroll', () => repositionSikhwal());
}

/* ── Refresh — called when layer visibility changes ──────────────── */

function refreshEverything() {
  const activeLayers = eligibleLayers().filter(l => Atlas.layers.list().find(x => x.id === l.id));
  renderIcons(activeLayers);
  // Chronology-timeline layers have their own accordion UI in the
  // respective plug-ins. When the plug-in is mounted, skip that layer's
  // edge callouts (icons still paint at each point's location on the map).
  const w = typeof window !== 'undefined' ? window : null;
  const skip = new Set();
  if (w?.__integrationTimelineActive?.()) skip.add('rajasthan-integration');
  if (w?.__dynastiesTimelineActive?.())   skip.add('rajput-dynasties');
  const forCallouts = skip.size
    ? activeLayers.filter(l => !skip.has(l.id))
    : activeLayers;
  renderSikhwal(forCallouts);
}

// Polygon layers eligible for edge callouts. Point layers with an icon
// are always eligible; polygons need to be either in a callout-friendly
// category (environment / climate / agriculture / etc.) or have an
// explicit `calloutable: true` in their config. Icons for polygons
// without one in atlas.json come from POLYGON_CALLOUT_ICONS below.
const POLYGON_CALLOUT_CATEGORIES = new Set([
  'environment',
  'climate',
  'agriculture',
  'demographic',
]);

const POLYGON_CALLOUT_ICONS = {
  'wildlife-sanctuaries':   '🦌',
  'ramsar-sites':           '🦩',
  'wetlands':               '💧',
  'biosphere-reserves':     '🌿',
  'conservation-reserves':  '🌿',
  'national-parks':         '🌲',
  'tiger-reserves':         '🐅',
  'rainfall':               '🌧',
  'temperature':            '🌡',
  'climate-regions':        '🌤',
  'agro-climatic-zones':    '🌾',
  'soil-types':             '🟤',
  'vegetation':             '🌳',
  'desertification':        '🏜',
  'drought-vulnerability':  '☀️',
  'major-crops':            '🌾',
  'cropping-seasons':       '📆',
  'agro-economic-zones':    '🚜',
  'irrigation-sources':     '💧',
  'command-areas':          '🚰',
  'groundwater':            '⛲',
  'population-density':     '👥',
  'population-growth':      '📈',
  'literacy':               '📖',
  'sex-ratio':              '⚖️',
  'urbanisation':           '🏙',
  'scheduled-tribes':       '🪶',
  'scheduled-castes':       '🪶',
};

function eligibleLayers() {
  const out = [];
  for (const cfg of Atlas.layers.list()) {
    if (!cfg.visible) continue;
    const feats = Atlas.layers.features(cfg.id) || [];
    if (!feats.length) continue;

    if (cfg.type === 'point') {
      if (!cfg.icon) continue;            // legacy point-layer rule preserved
      out.push({ id: cfg.id, name: cfg.name, icon: cfg.icon, color: cfg.color, features: feats });
      continue;
    }

    // Polygon opt-in: category-based OR explicit calloutable flag.
    const inCategory = cfg.category && POLYGON_CALLOUT_CATEGORIES.has(cfg.category);
    if (!inCategory && !cfg.calloutable) continue;

    // Only include features that have a centroid or labelAnchor — without one,
    // the callout leader-line has nowhere to point.
    const anchored = feats.filter(f => f.properties?.centroid || f.properties?.labelAnchor);
    if (!anchored.length) continue;

    const icon = cfg.icon || POLYGON_CALLOUT_ICONS[cfg.id] || '◆';
    out.push({ id: cfg.id, name: cfg.name, icon, color: cfg.color, features: anchored });
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
  // Clear previous callouts + leader-lines from all containers.
  sikhwalRoot.innerHTML = '';
  if (sikhwalColLeft)  sikhwalColLeft.innerHTML  = '';
  if (sikhwalColRight) sikhwalColRight.innerHTML = '';
  sikhwalSlots.length = 0;
  if (!activeLayers.length) return;

  // Build every eligible callout — no per-layer cap since columns now
  // scroll. First stage: create the boxes and collect their lat/lon;
  // second stage (in repositionSikhwal) sorts them into the appropriate
  // column and draws leader lines.
  for (const layer of activeLayers) {
    for (const feat of layer.features) {
      const c = feat.properties?.centroid
        || feat.properties?.labelAnchor
        || (feat.geometry?.type === 'Point' ? feat.geometry.coordinates : null);
      if (!c) continue;
      const facts = Array.isArray(feat.properties?.notes?.facts)
        ? feat.properties.notes.facts : [];
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
      // Not appended to DOM yet — repositionSikhwal will attach to the
      // correct column based on the feature's longitude relative to the
      // map centre.
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
  // sikhwal-root is in <body> now, so all positions are in VIEWPORT
  // (page) coordinates, not .a-map-local coordinates.
  const rect = mapEl.getBoundingClientRect();
  const proj = Atlas.projection;
  const ctm  = svg.getScreenCTM();
  if (!ctm) return;

  const svgRect = svg.getBoundingClientRect();
  // Map centre in viewport coords (used as the axis-split threshold).
  const cx = svgRect.left + svgRect.width / 2;

  // Clear any old per-box leader SVGs + previous "+N more" tags.
  sikhwalRoot.querySelectorAll('.sikhwal-line, .sikhwal-more').forEach(n => n.remove());

  /* Compute each slot's on-screen anchor point in viewport coords. */
  const slots = sikhwalSlots.map(slot => {
    const [xs, ys] = proj.forward([slot.lon, slot.lat]);
    const pt = svg.createSVGPoint();
    pt.x = xs; pt.y = ys;
    const scr = pt.matrixTransform(ctm);
    return {
      ...slot,
      ax: scr.x,
      ay: scr.y,
    };
  });

  /* Edge-column layout — split features by longitude into LEFT / RIGHT.
   * Each column is a scrollable container appended to <body>; boxes
   * inside use position:relative and flow with normal margin. The
   * leader-line SVG for each box is drawn from the box's LIVE screen
   * rect (getBoundingClientRect) to the feature centroid, so lines
   * follow the column as the user scrolls it.
   */
  // When the Integration timeline occupies the left side, funnel every
  // callout into the right column so nothing gets hidden.
  const timelineActive = document.body.classList.contains('itl-active');
  const leftCol  = timelineActive ? [] : slots.filter(s => s.ax <  cx).sort((a, b) => a.ay - b.ay);
  const rightCol = timelineActive
    ? [...slots].sort((a, b) => a.ay - b.ay)
    : slots.filter(s => s.ax >= cx).sort((a, b) => a.ay - b.ay);

  // Attach boxes into their columns in order (only if not already there
  // — repositionSikhwal may be called on scroll, when the DOM is stable).
  leftCol.forEach(s => {
    if (s.div.parentNode !== sikhwalColLeft) sikhwalColLeft.append(s.div);
  });
  rightCol.forEach(s => {
    if (s.div.parentNode !== sikhwalColRight) sikhwalColRight.append(s.div);
  });

  /* Draw one small SVG per box, from its live screen rect to the
   * feature's on-map anchor. Boxes whose rect falls outside the map's
   * vertical band are still valid — the line just runs off-screen and
   * the SVG clips itself. */
  for (const slot of [...leftCol, ...rightCol]) {
    const br = slot.div.getBoundingClientRect();
    if (br.width === 0 || br.height === 0) continue;   // hidden / offscreen
    const rightSide = br.left + br.width / 2 > cx;
    const bcy = br.top + br.height / 2;
    // Line origin: inner edge of the box, halfway down.
    const ox = rightSide ? br.left : br.right;
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
    s.style.position = 'fixed';
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

    /* Callout root: a ZERO-SIZE container appended to <body>.
     * Overflow: visible so children (boxes + mini-SVGs) can render
     * outside its bounds. Because the root has 0x0 size and is not a
     * child of .a-map, nothing at all covers the map SVG — the map
     * paints normally, and only thin leader lines from the mini-SVGs
     * intrude into the map area.
     */
    .sikhwal-root {
      position: fixed;
      top: 0; left: 0;
      width: 0; height: 0;
      overflow: visible;
      pointer-events: none;
      z-index: 10;
      color: var(--ink-2, #6b5030);
    }
    /* Per-box mini SVGs — sized to just the leader-line bounding box. */
    .sikhwal-line { pointer-events: none; }
    /* Scrollable columns pinned to the map's left / right edges. Boxes
     * flow inside with normal margin — user can wheel or drag to reach
     * every feature; nothing gets truncated any more. */
    .sikhwal-col {
      position: fixed;
      /* Start below the header + Layers button so we never obscure them. */
      top: 165px;
      bottom: 12px;
      width: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 10;
      padding: 4px;
      box-sizing: border-box;
      /* pointer-events auto lets the wheel scroll the column; children
       * still get their own auto/none as needed. */
      pointer-events: auto;
      /* Transparent — only the child .sikhwal-box tiles are visible;
       * the rest of the column area lets the map peek through. */
      background: transparent;
    }
    .sikhwal-col-left  { left: 12px; }
    .sikhwal-col-right { right: 12px; }
    /* When the Integration timeline is mounted on the left side, hide
     * the left Sikhwal column to avoid overlap; other-layer callouts
     * remain on the right column, which scrolls. */
    body.itl-active .sikhwal-col-left { display: none; }
    .sikhwal-col::-webkit-scrollbar { width: 6px; }
    .sikhwal-col::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--ink-3, #ba9863) 55%, transparent);
      border-radius: 3px;
    }
    .sikhwal-box {
      position: relative;
      width: 100%;
      max-height: 96px;
      margin-bottom: 10px;
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
    .sikhwal-root.hidden,
    .sikhwal-col.hidden { display: none; }

    /* No CSS overrides on district paths — the base map renders exactly
     * as it would without Sikhwal mode. */
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
