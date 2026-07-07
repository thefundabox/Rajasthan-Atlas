/**
 * UIManager — atlas chrome.
 *
 * Layout philosophy (v2 — editorial):
 *   • The map fills the viewport under a compact header.
 *   • A slide-in right rail delivers the feature detail (opens on selection,
 *     closes on Esc / X).
 *   • Floating map controls (zoom, home) live in a corner column.
 *   • Layer visibility, mode selection, and theme control live inside a
 *     single "Layers" popover (top-left).
 *   • A Statistics dashboard is available via a header button; it opens as
 *     an overlay above the map.
 *   • Overlays: locator (added by LocatorInset.js), north arrow, scale bar,
 *     zoom pill.
 *
 * All of this is UI-only. The core engine is untouched.
 */

import { CONFIG } from './config.js';
import { esc, el } from './util/dom.js';
import { qualityBadgeHTML } from './util/quality.js';

export class UIManager {
  constructor(atlas) {
    this.atlas = atlas;
    this._root = null;
    this._els  = {};
  }

  attachTo(root) {
    this._root = root;
    this._els = {
      header:   root.querySelector('.a-header'),
      map:      root.querySelector('.a-map'),
      right:    root.querySelector('.a-right'),
      status:   root.querySelector('.a-status'),
      detail:   root.querySelector('.detail-slot'),
    };

    this._buildHeader();
    this._buildMapChrome();
    this._buildLayersPopover();
    this._buildStatsOverlay();
    this._buildRightRailCloser();
    this._renderStatus();
    this._renderDetailEmpty();
    this._registerLabelSources();
    this._subscribe();
  }

  /* ------------------------------------------------------------------ */
  /*  Header                                                            */
  /* ------------------------------------------------------------------ */

  _buildHeader() {
    const h = this._els.header;
    if (!h) return;
    // Add nav row with Stats + Theme + Print buttons (search is already in DOM).
    let nav = h.querySelector('.h-nav');
    if (!nav) {
      nav = el('div', { class: 'h-nav' });
      h.append(nav);
    } else {
      nav.innerHTML = '';
    }
    nav.append(el('button', {
      class: 'h-btn', 'data-action': 'stats',
      title: 'By the numbers — atlas statistics',
      onclick: () => this._toggleStats(true),
    }, ['Statistics']));
    nav.append(el('button', {
      class: 'h-btn', 'data-action': 'theme',
      title: 'Cycle theme (D)',
      onclick: () => this._cycleTheme(),
    }, [el('span', { class: 'label' }, [this._themeButtonLabel()])]));
    nav.append(el('button', {
      class: 'h-btn', 'data-action': 'print',
      title: 'Print / save as PDF',
      onclick: () => this.atlas.export.print(),
    }, ['Print']));
  }

  /* ------------------------------------------------------------------ */
  /*  Map chrome (floating controls + overlays)                          */
  /* ------------------------------------------------------------------ */

  _buildMapChrome() {
    const map = this._els.map;
    if (!map) return;

    // Floating zoom / reset controls, top-right.
    const controls = el('div', { class: 'map-controls' });
    controls.append(el('button', { class: 'mc', title: 'Zoom in (+)',
      onclick: () => this.atlas.interaction.zoomBy(CONFIG.zoom.buttonStep) }, ['+']));
    controls.append(el('button', { class: 'mc', title: 'Zoom out (−)',
      onclick: () => this.atlas.interaction.zoomBy(1 / CONFIG.zoom.buttonStep) }, ['−']));
    controls.append(el('div', { class: 'divider' }));
    controls.append(el('button', { class: 'mc', title: 'Reset view (0)',
      onclick: () => this.atlas.interaction.reset() }, ['⌂']));
    map.append(controls);

    // North arrow (svg lives inline, uses currentColor)
    const north = el('div', { class: 'overlay north' });
    north.innerHTML =
      `<svg viewBox="0 0 44 44" aria-hidden="true">
         <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
         <polygon points="22,4 27,24 22,20 17,24" fill="currentColor"/>
         <text x="22" y="37" text-anchor="middle" font-family="Iowan Old Style, serif" font-size="11" font-weight="500" fill="currentColor">N</text>
       </svg>`;
    map.append(north);

    // Scale bar (bottom-center)
    this._els.scale = el('div', { class: 'overlay scale' });
    this._els.scale.innerHTML = `<span class="label">—</span><div class="bar"></div>`;
    map.append(this._els.scale);

    // Zoom pill (bottom-right corner)
    this._els.zoom = el('div', { class: 'overlay zoom' }, ['1.00×']);
    map.append(this._els.zoom);
  }

  _updateOverlays(zoom) {
    if (this._els.zoom) this._els.zoom.textContent = zoom.toFixed(2) + '×';
    if (!this._els.scale) return;
    const svg = this._els.map.querySelector('svg');
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const svgUnitsPer100Px = (vb.width / rect.width) * 100;
    const km = svgUnitsPer100Px * this.atlas.projection.kmPerSvgUnit();
    const nice = niceRound(km);
    const barPx = 100 * (nice / km);
    this._els.scale.querySelector('.label').textContent = `${nice} km`;
    this._els.scale.querySelector('.bar').style.width = `${barPx.toFixed(0)}px`;
  }

  /* ------------------------------------------------------------------ */
  /*  Layers popover (top-left)                                          */
  /* ------------------------------------------------------------------ */

  _buildLayersPopover() {
    const map = this._els.map;
    const wrap = el('div', { class: 'layers-popover' });
    const toggle = el('button', {
      class: 'lp-toggle',
      title: 'Layers, modes, and legend',
      onclick: () => wrap.classList.toggle('open'),
    }, ['☰  Layers']);
    const panel  = el('div', { class: 'lp-panel' });

    // Modes section
    panel.append(el('h4', {}, ['View mode']));
    const modes = el('div', { class: 'lp-modes' });
    for (const m of [
      { id: 'base',     label: 'Base',      key: '1' },
      { id: 'division', label: 'Divisions', key: '2' },
      { id: 'new',      label: 'New (2023)',key: '3' },
      { id: 'env',      label: 'Environment', key: '4' },
      { id: 'reader',   label: 'Reader',    key: 'R' },
    ]) {
      const b = el('button', {
        class: 'lp-mode', 'data-mode': m.id,
        title: `${m.label} (${m.key})`,
        onclick: () => { this.atlas.layers.setMode(m.id); this._syncModeButtons(); },
      }, [m.label]);
      modes.append(b);
    }
    panel.append(modes);

    // Per-category layer list (populated after layers register)
    this._els.layerList = el('div');
    panel.append(this._els.layerList);
    this._renderLayerList();

    wrap.append(toggle);
    wrap.append(panel);
    map.append(wrap);
    this._els.layersPopover = wrap;

    // Register keyboard shortcuts for the modes.
    this.atlas.interaction.registerShortcut('1', () => this.atlas.layers.setMode('base'));
    this.atlas.interaction.registerShortcut('2', () => this.atlas.layers.setMode('division'));
    this.atlas.interaction.registerShortcut('3', () => this.atlas.layers.setMode('new'));
    this.atlas.interaction.registerShortcut('d', () => this._cycleTheme());
    this.atlas.interaction.registerShortcut('D', () => this._cycleTheme());
    this.atlas.interaction.registerShortcut('l', () => wrap.classList.toggle('open'));
    this.atlas.interaction.registerShortcut('L', () => wrap.classList.toggle('open'));
    this.atlas.interaction.registerShortcut('s', () => this._toggleStats(true));

    // Click outside to close.
    document.addEventListener('click', (ev) => {
      if (!wrap.contains(ev.target)) wrap.classList.remove('open');
    });

    this._syncModeButtons();
  }

  _renderLayerList() {
    const box = this._els.layerList;
    if (!box) return;
    box.innerHTML = '';
    const list = this.atlas.layers.list();
    // Group by category.
    const groups = new Map();
    for (const c of list) {
      const g = c.category || 'other';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(c);
    }
    // Divisions summary (still relevant for admin category).
    for (const [g, items] of groups) {
      box.append(el('h4', {}, [g.toUpperCase()]));
      const listEl = el('div');
      for (const c of items) {
        const row = el('label', { class: 'lp-row', title: 'Toggle visibility' });
        const chk = el('input', { type: 'checkbox', checked: c.visible });
        chk.addEventListener('change', () => this.atlas.layers.setVisible(c.id, chk.checked));
        row.append(chk);
        row.append(el('span', {}, [c.name]));
        const sw = el('span', { class: `sw sw-${c.id}` });
        row.append(sw);
        listEl.append(row);
      }
      box.append(listEl);
    }
  }

  _syncModeButtons() {
    const mode = this.atlas.layers.currentMode();
    const wrap = this._els.layersPopover;
    if (!wrap) return;
    wrap.querySelectorAll('button[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Stats overlay                                                     */
  /* ------------------------------------------------------------------ */

  _buildStatsOverlay() {
    const map = this._els.map;
    const overlay = el('div', { class: 'stats-overlay' });
    this._els.statsOverlay = overlay;
    map.append(overlay);
  }

  _toggleStats(open) {
    const overlay = this._els.statsOverlay;
    if (!overlay) return;
    if (open) this._renderStats(overlay);
    overlay.classList.toggle('open', open);
  }

  _renderStats(overlay) {
    const s = this.atlas.stats.compute();
    const km = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 1 });
    overlay.innerHTML = '';
    overlay.append(el('button', {
      class: 'close-btn', title: 'Close (Esc)',
      onclick: () => this._toggleStats(false),
    }, ['×']));
    overlay.append(el('h2', {}, ['Rajasthan by the numbers']));
    overlay.append(el('div', { class: 'stats-lede' },
      ['A live audit of the atlas\'s environment and administrative layers, drawn from the current dataset.']));

    const grid = el('div', { class: 'stats-grid' });
    const card = (label, big, unit, foot) => {
      const c = el('div', { class: 'card' });
      c.append(el('div', { class: 'lbl' }, [label]));
      const b = el('div', { class: 'big' });
      b.textContent = big;
      if (unit) { const u = el('span', { class: 'unit' }); u.textContent = unit; b.append(u); }
      c.append(b);
      if (foot) c.append(el('div', { class: 'foot' }, [foot]));
      grid.append(c);
    };

    card('Districts', s.districts);
    card('Divisions', s.divisions);
    card('National parks',  s.nationalParks);
    card('Tiger reserves',  s.tigerReserves);
    card('Wildlife sanctuaries', s.wildlifeSanctuaries);
    card('Ramsar sites',    s.ramsarSites);
    card('Wetlands (non-Ramsar)', s.wetlands);
    card('Biosphere reserves', s.biosphereReserves,
      null, 'None notified by MoEFCC.');
    card('Total PA area', km(s.totalPAArea), 'km²', 'Sum of NP + TR + WLS areas.');
    card('Coverage of Rajasthan', s.coveragePct.toFixed(1), '%', 'Protected-area extent vs 342,239 km² state area.');
    card('Point-only features', s.pointOnlyCount, null,
      'Features shipped as points because their polygons are unpublished.');
    if (s.largest)  card('Largest PA',   km(s.largest.area),  'km²', s.largest.name);
    if (s.smallest) card('Smallest PA',  km(s.smallest.area), 'km²', s.smallest.name);
    if (s.mostRecent) card('Most recent notification', s.mostRecent.year, null, s.mostRecent.name);
    overlay.append(grid);
  }

  /* ------------------------------------------------------------------ */
  /*  Right rail (slide-in feature panel)                               */
  /* ------------------------------------------------------------------ */

  _buildRightRailCloser() {
    const right = this._els.right;
    if (!right) return;
    // Prepend the close button.
    const closer = el('div', { class: 'close-btn' });
    closer.append(el('button', {
      title: 'Close (Esc)', 'aria-label': 'Close panel',
      onclick: () => this._closeDetail(),
    }, ['×']));
    right.prepend(closer);
    // Esc closes panel too — piggyback on existing interaction shortcut.
    this.atlas.bus.on('selection:changed', ({ feature }) => {
      if (!feature) this._closeDetail();
    });
  }

  _openDetail()  { this._els.right?.classList.add('open'); }
  _closeDetail() { this._els.right?.classList.remove('open'); }

  _renderDetailEmpty() {
    this._els.detail.innerHTML = '';
    this._els.detail.append(el('div', { class: 'ed ed-empty' },
      ['Select a district or protected area from the map to explore.']));
  }

  /**
   * Default renderer for a selected feature — used for districts. Environment
   * features get their own editorial renderer in EnvironmentLayer.js.
   */
  _renderDetail(feat) {
    const p = feat.properties ?? {};
    const wrap = el('div', { class: 'ed' });

    // Hero
    const hero = el('div', { class: 'ed-hero' });
    hero.append(el('div', { class: 'ed-kicker' }, [(p.division ? `${p.division} Division · ` : '') + 'District']));
    const title = el('h2', { class: 'ed-title' }); title.textContent = p.name ?? feat.id; hero.append(title);
    if (p.headquarters) {
      const sub = el('p', { class: 'ed-sub' }); sub.textContent = `Headquartered at ${p.headquarters}`;
      hero.append(sub);
    }
    const tags = el('div', { class: 'ed-tags' });
    if (p.newDistrict) tags.append(el('span', { class: 'ed-tag tag-new' }, ['Retained new district (2023 → 2024)']));
    // Quality badge — districts derive from OSM admin_level=5 relations.
    const badge = el('span');
    badge.innerHTML = qualityBadgeHTML('multipolygon');
    if (badge.firstChild) tags.append(badge.firstChild);
    if (tags.children.length) hero.append(tags);
    wrap.append(hero);

    // Key figures — if we have a bbox, compute rough area indicator using bbox.
    const figures = el('div', { class: 'ed-figures' });
    figures.append(figCard('Division', p.division ?? '—'));
    figures.append(figCard('HQ', p.headquarters ?? '—'));
    if (p.bbox) figures.append(figCard('BBox span', `${(p.bbox[2] - p.bbox[0]).toFixed(2)}°`));
    if (p.centroid) figures.append(figCard('Centre', `${p.centroid[1].toFixed(2)}°N`));
    wrap.append(sectionEl('Key figures', figures));

    // Location dl
    const dl = el('dl', { class: 'ed-row' });
    dl.append(el('dt', {}, ['Division']));         dl.append(el('dd', {}, [p.division ?? '—']));
    dl.append(el('dt', {}, ['Headquarters']));     dl.append(el('dd', {}, [p.headquarters ?? '—']));
    dl.append(el('dt', {}, ['State']));            dl.append(el('dd', {}, ['Rajasthan']));
    if (p.centroid) {
      dl.append(el('dt', {}, ['Centroid']));
      dl.append(el('dd', { class: 'mono' }, [`${p.centroid[1].toFixed(3)}°N, ${p.centroid[0].toFixed(3)}°E`]));
    }
    wrap.append(sectionEl('Location', dl));

    // References
    const src = el('div', { class: 'ed-sources' });
    (p.source ? p.source.split('+').map(s => s.trim()) : [])
      .filter(Boolean).forEach(s => src.append(el('span', { class: 'ed-source' }, [s])));
    if (p.osmRelation) src.append(el('span', { class: 'ed-source' }, [`OSM rel/${p.osmRelation}`]));
    if (src.children.length) wrap.append(sectionEl('References', src));

    this._els.detail.innerHTML = '';
    this._els.detail.append(wrap);
    this._openDetail();
  }

  /* ------------------------------------------------------------------ */
  /*  Status bar                                                        */
  /* ------------------------------------------------------------------ */

  _renderStatus(feature = null) {
    const bar = this._els.status;
    if (!bar) return;
    if (!feature) {
      const districts = this.atlas.layers.get('districts');
      const dcount = districts?.features.length ?? 0;
      const divs   = new Set(districts?.features.map(f => f.properties.division) ?? []).size;
      bar.innerHTML =
        `<div class="s-item"><span class="s-label">Districts</span><span class="s-value">${dcount}</span></div>` +
        `<div class="s-item"><span class="s-label">Divisions</span><span class="s-value">${divs}</span></div>` +
        `<div class="s-item"><span class="s-label">Projection</span><span class="s-value">${esc(this.atlas.projection.meta()?.description ?? 'EPSG:4326')}</span></div>` +
        `<div class="spacer"></div>` +
        `<div class="s-item"><span class="s-label">© OpenStreetMap contributors · ODbL 1.0</span></div>`;
      return;
    }
    const p = feature.properties ?? {};
    bar.innerHTML =
      `<div class="s-item"><span class="s-label">Selected</span><span class="s-value">${esc(p.name)}</span></div>` +
      (p.division    ? `<div class="s-item"><span class="s-label">Division</span><span class="s-value">${esc(p.division)}</span></div>` : '') +
      `<div class="spacer"></div>` +
      (p.source      ? `<div class="s-item"><span class="s-label">Source</span><span class="s-value">${esc(p.source)}</span></div>` : '');
  }

  /* ------------------------------------------------------------------ */
  /*  Theme                                                             */
  /* ------------------------------------------------------------------ */

  _cycleTheme() {
    this.atlas.theme.cycle();
  }
  _themeButtonLabel() {
    const ids = this.atlas.theme.list();
    const active = this.atlas.theme.active();
    const next = ids[(ids.indexOf(active) + 1) % ids.length];
    return this.atlas.theme.meta(next)?.name ?? 'Theme';
  }

  /* ------------------------------------------------------------------ */
  /*  Label sources — districts                                          */
  /* ------------------------------------------------------------------ */

  _registerLabelSources() {
    // Districts labelled at all zooms; small type. New districts get accent.
    this.atlas.labels.register({
      layerId:  'districts',
      priority: 40,
      cls:      'lbl-district',
      text:     (f) => f.properties.name,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Bus subscriptions                                                 */
  /* ------------------------------------------------------------------ */

  _subscribe() {
    const bus = this.atlas.bus;
    bus.on('selection:changed', ({ feature }) => {
      if (feature) {
        // Only render districts here; env features get their own renderer.
        if (feature.properties?.category === 'administrative') this._renderDetail(feature);
        this._renderStatus(feature);
      } else {
        this._renderDetailEmpty();
        this._renderStatus(null);
      }
    });
    bus.on('view:changed',   ({ zoom }) => this._updateOverlays(zoom));
    bus.on('theme:changed',  () => {
      this._updateOverlays(this.atlas.interaction.currentZoom());
      const label = this._els.header?.querySelector('[data-action="theme"] .label');
      if (label) label.textContent = this._themeButtonLabel();
    });
    bus.on('layer:added',    () => this._renderLayerList());
    bus.on('layer:mode',     () => this._syncModeButtons());
    bus.on('atlas:ready',    () => {
      this._renderLayerList();
      this._updateOverlays(this.atlas.interaction.currentZoom());
    });

    // Esc closes stats overlay and detail panel.
    this.atlas.interaction.registerShortcut('Escape', () => {
      if (this._els.statsOverlay?.classList.contains('open')) {
        this._toggleStats(false);
      } else {
        this.atlas.interaction.select(null, null);
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  Small building-block helpers                                              */
/* -------------------------------------------------------------------------- */

function figCard(label, value, unit) {
  const c = el('div', { class: 'ed-fig' });
  const n = el('div', { class: 'n' });
  n.textContent = value;
  if (unit) { const u = el('span', { class: 'unit' }); u.textContent = unit; n.append(u); }
  c.append(n);
  c.append(el('div', { class: 'k' }, [label]));
  return c;
}
function sectionEl(title, body) {
  const s = el('div', { class: 'ed-section' });
  s.append(el('h3', { class: 'ed-h' }, [title]));
  s.append(body);
  return s;
}
function niceRound(n) {
  if (n <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(n));
  const norm = n / pow;
  const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * pow;
}
