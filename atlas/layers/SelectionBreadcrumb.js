/**
 * SelectionBreadcrumb — top-of-map pill showing "Layer · Feature name"
 * whenever a feature is selected.
 *
 * Answers the "which layer am I looking at?" question at a glance
 * without needing to open the detail panel or the layers popover.
 * Anchored top-CENTER inside the map so it doesn't collide with the
 * top-left Layers button, the (moved) top-left compass, or the
 * right-side detail panel.
 */

let pill = null;

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  mount();
  Atlas.bus.on('selection:changed', ({ layerId, feature }) => {
    if (!feature) {
      hide();
      return;
    }
    const cfg = Atlas.layers.list().find(l => l.id === layerId);
    const layerName = cfg?.name || layerId || 'Feature';
    const layerIcon = cfg?.icon || '';
    const featureName = feature.properties?.name || feature.id || '';
    show(layerIcon, layerName, featureName);
  });
});

function mount() {
  const map = document.querySelector('.a-map');
  if (!map) return;
  pill = document.createElement('div');
  pill.className = 'overlay selection-breadcrumb';
  pill.hidden = true;
  map.append(pill);
}

function show(icon, layerName, featureName) {
  if (!pill) return;
  const iconHtml = icon ? `<span class="sb-icon">${escapeHtml(icon)}</span>` : '';
  pill.innerHTML = `${iconHtml}<span class="sb-layer">${escapeHtml(layerName)}</span><span class="sb-sep">·</span><span class="sb-feature">${escapeHtml(featureName)}</span>`;
  pill.hidden = false;
}

function hide() {
  if (!pill) return;
  pill.hidden = true;
  pill.innerHTML = '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function injectStyles() {
  if (document.getElementById('selection-breadcrumb-styles')) return;
  const s = document.createElement('style');
  s.id = 'selection-breadcrumb-styles';
  s.textContent = `
    .a-map .overlay.selection-breadcrumb {
      position: absolute;
      top: var(--sp-4);
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      max-width: min(560px, 60vw);
      background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
      backdrop-filter: blur(6px);
      border: 1px solid var(--hair, rgba(0,0,0,0.12));
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(15,23,42,0.06);
      font-family: var(--sans, "Inter", system-ui, sans-serif);
      font-size: 12.5px;
      line-height: 1;
      color: var(--ink-1, #3d2f10);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .a-map .overlay.selection-breadcrumb[hidden] { display: none; }
    .a-map .overlay.selection-breadcrumb .sb-icon { font-size: 14px; line-height: 1; }
    .a-map .overlay.selection-breadcrumb .sb-layer {
      color: var(--ink-3, #6d6558);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
    }
    .a-map .overlay.selection-breadcrumb .sb-sep {
      color: var(--ink-4, #948a7d);
      opacity: 0.6;
    }
    .a-map .overlay.selection-breadcrumb .sb-feature {
      color: var(--ink, #2d2823);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }
    /* Hide on very narrow viewports where it would fight the header. */
    @media (max-width: 640px) {
      .a-map .overlay.selection-breadcrumb { display: none !important; }
    }
  `;
  document.head.append(s);
}
