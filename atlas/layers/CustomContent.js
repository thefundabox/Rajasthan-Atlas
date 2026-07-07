/**
 * CustomContent — file-based authoring for enrichment + custom layers.
 *
 * Approach 1 from the authoring roadmap: admin-only by nature (git push
 * access is admin). Anyone can view; only committers can add. There is
 * no in-browser editing UI for visitors.
 *
 * Two input files (both optional, both live under atlas/data/):
 *
 *   1. enrichment.json — merge attributes into ANY existing feature by id.
 *      Fields honoured per feature: extraFacts[], images[], yourNotes.
 *      extraFacts are appended to the feature's notes.facts array so the
 *      existing editorial card picks them up automatically.
 *      images[] and yourNotes render as new sections in the detail card.
 *
 *   2. custom/index.json — register user-authored layers. Each entry gets
 *      registered via Atlas.registerLayer() as if it were declared in
 *      atlas.json. Points can carry an emoji `icon`.
 *
 * Also adds a small dev-only overlay when the URL contains ?ids=1 that
 * shows the currently-selected feature's id — useful when authoring to
 * find the right key to use in enrichment.json.
 *
 * Zero engine changes. Additive plug-in.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el, esc } from '../core/util/dom.js';

let enrichment = null;

Atlas.bus.on('atlas:ready', async () => {
  await Promise.all([
    loadEnrichment(),
    loadCustomLayers(),
  ]);

  // Post-render hook to inject images / notes sections.
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature || !enrichment) return;
    setTimeout(() => decorate(feature), 40);
  });

  if (new URLSearchParams(location.search).get('ids') === '1') {
    installIdOverlay();
  }
});

/* ── 1. Enrichment ─────────────────────────────────────────────── */
async function loadEnrichment() {
  try {
    const r = await fetch('atlas/data/enrichment.json');
    if (!r.ok) return;
    enrichment = await r.json();
    if (!enrichment?.features) { enrichment = null; return; }

    // Merge extraFacts into every referenced feature's notes.facts.
    for (const [featId, patch] of Object.entries(enrichment.features)) {
      if (!Array.isArray(patch.extraFacts) || !patch.extraFacts.length) continue;
      const feat = findFeature(featId);
      if (!feat) continue;
      const p = feat.properties = feat.properties || {};
      p.notes = p.notes || {};
      p.notes.facts = [...(p.notes.facts || []), ...patch.extraFacts];
    }
    console.info(`[CustomContent] merged enrichment into ${Object.keys(enrichment.features).length} feature id(s)`);
  } catch (err) {
    console.warn('[CustomContent] enrichment.json not loaded:', err);
  }
}

function findFeature(id) {
  for (const cfg of Atlas.layers.list()) {
    const f = Atlas.data.getFeature(cfg.id, id);
    if (f) return f;
  }
  return null;
}

/**
 * Add Photos / Your Notes sections to the currently-selected feature's
 * detail card. Runs after the base editorial renderer.
 */
function decorate(feature) {
  const patch = enrichment.features[feature.id];
  if (!patch) return;
  const detail = document.querySelector('.detail-slot');
  const card = detail?.querySelector('.ed');
  if (!card) return;

  // Photos
  if (Array.isArray(patch.images) && patch.images.length) {
    if (card.querySelector('.ed-photos')) return;   // already added
    const grid = el('div', { class: 'ed-photos' });
    for (const img of patch.images) {
      const fig = el('figure', { class: 'ed-photo' });
      const a = el('a', {
        href: img.url, target: '_blank', rel: 'noopener',
        title: img.caption || 'Open image',
      });
      a.append(el('img', { src: img.url, alt: img.caption || '' }));
      fig.append(a);
      if (img.caption) fig.append(el('figcaption', {}, [img.caption + (img.credit ? ` — ${img.credit}` : '')]));
      grid.append(fig);
    }
    card.append(section('Photos', grid));
  }

  // Your notes
  if (typeof patch.yourNotes === 'string' && patch.yourNotes.trim()) {
    if (card.querySelector('.ed-your-notes')) return;
    const note = el('div', { class: 'ed-your-notes' });
    note.textContent = patch.yourNotes;
    card.append(section('Your notes', note));
  }
}

function section(title, body) {
  const s = el('div', { class: 'ed-section' });
  s.append(el('h3', { class: 'ed-h' }, [title]));
  s.append(body);
  return s;
}

/* ── 2. Custom layers ──────────────────────────────────────────── */
async function loadCustomLayers() {
  try {
    const r = await fetch('atlas/data/custom/index.json');
    if (!r.ok) return;
    const idx = await r.json();
    if (!Array.isArray(idx?.layers)) return;
    for (const cfg of idx.layers) {
      if (!cfg.id || !cfg.data) continue;
      const layerCfg = {
        category:  cfg.category || 'custom',
        searchable: true,
        visible:   cfg.visible ?? true,
        zIndex:    cfg.zIndex  ?? 74,
        featureType: cfg.featureType || 'custom_point',
        ...cfg,
      };
      try {
        await Atlas.registerLayer(layerCfg);
        console.info(`[CustomContent] registered custom layer "${cfg.id}"`);
      } catch (err) {
        console.warn(`[CustomContent] failed to register "${cfg.id}":`, err);
      }
    }
  } catch (err) {
    // custom/index.json is optional — silent skip.
  }
}

/* ── 3. ?ids=1 developer overlay ───────────────────────────────── */
function installIdOverlay() {
  const overlay = el('div', {
    id: 'cc-id-overlay',
    style: `
      position: fixed; bottom: 12px; left: 12px; z-index: 999;
      background: rgba(30,30,30,0.9); color: #f5e2b5;
      padding: 8px 12px; border-radius: 6px;
      font-family: monospace; font-size: 12px;
      pointer-events: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 320px; word-break: break-all;
    `,
  });
  overlay.textContent = 'Selection id: (none). Click a feature.';
  document.body.append(overlay);

  Atlas.bus.on('selection:changed', ({ layerId, featureId, feature }) => {
    if (!feature) {
      overlay.textContent = 'Selection id: (none). Click a feature.';
      return;
    }
    overlay.innerHTML =
      `<div style="opacity:.7;font-size:10px;text-transform:uppercase;letter-spacing:.1em">` +
      `layer / id — click to copy</div>` +
      `<div style="cursor:pointer" onclick="navigator.clipboard?.writeText('${esc(featureId)}')">` +
      `${esc(layerId)} / <strong>${esc(featureId)}</strong></div>`;
  });
}
