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

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  buildOverlays();
  refreshEverything();

  Atlas.bus.on('layer:visibility', () => refreshEverything());
  Atlas.bus.on('view:changed',    () => positionIcons());
  Atlas.bus.on('selection:changed', ({ feature }) => {
    setPanelHidden(!!feature);
  });
});

/* ── Overlay & panel scaffolding ─────────────────────────────────── */

function buildOverlays() {
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  iconOverlay = el('div', { class: 'point-icon-overlay' });
  mapEl.append(iconOverlay);
  panel = el('aside', { class: 'layer-callout-panel', role: 'complementary' });
  mapEl.append(panel);
}

function setPanelHidden(hidden) {
  panelHidden = hidden;
  if (panel) panel.classList.toggle('hidden', hidden);
}

/* ── Refresh — called when layer visibility changes ──────────────── */

function refreshEverything() {
  const activeLayers = eligibleLayers().filter(l => Atlas.layers.list().find(x => x.id === l.id));
  renderIcons(activeLayers);
  renderPanel(activeLayers);
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
  `;
  document.head.append(s);
}
