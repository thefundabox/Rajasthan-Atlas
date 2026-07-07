/**
 * LegendPanel — a floating map-corner legend for the currently-active
 * classification view mode.
 *
 * When the user activates a mode like Soils / Rainfall / Population Density,
 * a small panel in the bottom-right shows a colour swatch + short name for
 * every zone in that classification. The swatch colour is read straight
 * from the DOM (getComputedStyle().fill of the actual painted <path>), so
 * the legend always matches what's on the map — no colour duplication.
 *
 * Zero AtlasCore changes. Purely additive plug-in.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';

// Map of mode-id → the layer(s) driven by that mode.
// LegendPanel uses this to (a) auto-enable those layers when the mode is set
// (and disable everything else that isn't a base layer), and (b) build the
// legend key of colour swatches for the currently-painted layers.
const MODE_TO_LAYERS = {
  // Built-in
  env:                  ['national-parks','tiger-reserves','wildlife-sanctuaries','ramsar-sites','wetlands','biosphere-reserves'],

  // Physical
  physical:             ['physiography','drainage-basins'],
  hydrology:            [],
  relief:               [],
  physiography:         ['physiography'],

  // Climate · Soils · Vegetation
  soils:                ['soil-types'],
  desertification:      ['desertification'],
  drought:              ['drought-vulnerability'],
  vegetation:           ['vegetation'],
  rainfall:             ['rainfall'],
  temperature:          ['temperature'],
  climate:              ['climate-regions'],
  'agro-zones':         ['agro-climatic-zones'],

  // Agriculture · Water
  crops:                ['major-crops'],
  'cropping-seasons':   ['cropping-seasons'],
  agriculture:          ['agro-economic-zones','major-crops'],
  irrigation:           ['irrigation-sources','major-canals'],
  canals:               ['major-canals','command-areas'],
  water:                ['irrigation-sources','major-canals','dams','command-areas'],
  dams:                 ['dams'],
  groundwater:          ['groundwater'],

  // Geology · Minerals · Mining
  geology:              ['geological-provinces'],
  provinces:            ['geological-provinces'],
  rocks:                ['rock-types'],
  minerals:             ['mineral-belts','major-mines'],
  'mineral-belts':      ['mineral-belts'],
  'building-stones':    ['building-stones'],
  mining:               ['mining-clusters','major-mines'],
  petroleum:            ['petroleum-gas'],

  // Industry
  industry:             ['industrial-regions','industrial-clusters','industrial-areas','major-industries','special-economic-zones','handicraft-clusters'],
  'industrial-areas':   ['industrial-areas','major-industries'],
  sez:                  ['special-economic-zones'],
  handicrafts:          ['handicraft-clusters'],

  // Energy
  energy:               ['energy-mix','renewable-zones','transmission-corridors','power-plants','solar-parks','wind-farms'],
  'energy-mix':         ['energy-mix'],
  renewables:           ['renewable-zones','solar-parks','wind-farms'],
  transmission:         ['transmission-corridors'],
  'power-plants':       ['power-plants'],
  solar:                ['solar-parks'],
  wind:                 ['wind-farms'],

  // Human Geography · Demographics
  demographics:         ['population-density'],
  'population-density': ['population-density'],
  literacy:             ['literacy'],
  urbanisation:         ['urbanisation'],
  'sex-ratio':          ['sex-ratio'],
  'st-sc':              ['scheduled-tribes','scheduled-castes'],
  regions:              ['regional-zones'],
  administrative:       ['administrative-divisions','scheduled-areas'],
  divisions:            ['administrative-divisions'],
  'scheduled-areas':    ['scheduled-areas'],
  'border-districts':   ['border-districts'],
  urban:                ['urban-centres','municipal-corporations','smart-cities'],
  'municipal-corporations': ['municipal-corporations'],
  'smart-cities':       ['smart-cities'],
  'urban-centres':      ['urban-centres'],
  'population-corridors':['population-corridors'],
};

// Layers that are always on regardless of mode — the base map.
const ALWAYS_VISIBLE = new Set(['districts','rivers','lakes','aravalli','peaks','thar']);
// Kept for back-compat with the old name used elsewhere in this file.
const LEGEND_FOR_MODE = MODE_TO_LAYERS;

let panel = null;

Atlas.bus.on('atlas:ready', () => {
  const map = document.querySelector('.a-map');
  if (!map) return;

  const wrap = el('div', { class: 'legend-panel' });
  const header = el('div', { class: 'legend-header' });
  header.append(el('span', { class: 'legend-title' }, ['Legend']));
  header.append(el('button', {
    class: 'legend-close', title: 'Close legend',
    onclick: () => wrap.classList.remove('open'),
  }, ['×']));
  wrap.append(header);
  const body = el('div', { class: 'legend-body' });
  wrap.append(body);
  map.append(wrap);
  panel = { wrap, body };

  const update = () => refresh();
  Atlas.bus.on('layer:mode',       () => { applyModeVisibility(); update(); });
  Atlas.bus.on('layer:visibility', update);
  update();
});

/**
 * Enforce single-preset visibility on mode change.
 * Layers in ALWAYS_VISIBLE are untouched. Every other layer is turned OFF
 * unless it's in the current mode's target list — then it's turned ON.
 * This is why picking Presets → Soils cleanly shows only the soil layer,
 * and picking Presets → Base shows only the geographic base.
 */
function applyModeVisibility() {
  const mode = Atlas.layers.currentMode?.();
  const targets = new Set(MODE_TO_LAYERS[mode] || []);
  for (const cfg of Atlas.layers.list()) {
    if (ALWAYS_VISIBLE.has(cfg.id)) continue;
    const want = targets.has(cfg.id);
    if (!!cfg.visible === want) continue;
    Atlas.layers.setVisible?.(cfg.id, want);
  }
}

function refresh() {
  if (!panel) return;
  const { wrap, body } = panel;
  body.innerHTML = '';

  const mode = Atlas.layers.currentMode?.();
  const layerIds = LEGEND_FOR_MODE[mode] || [];

  const boxes = [];
  for (const layerId of layerIds) {
    const layerRec = Atlas.layers.get(layerId);
    if (!layerRec) continue;
    if (layerRec.config.visible === false) continue;
    const feats = layerRec.features || [];
    if (!feats.length) continue;

    const box = el('div', { class: 'legend-box' });
    box.append(el('h5', {}, [layerRec.config.name]));
    const list = el('ul', { class: 'legend-list' });
    for (const f of feats) {
      // Renderer emits paths with data-feature="<feature-id>" — the id attr is
      // double-prefixed and awkward to query, but data-feature is the clean
      // canonical handle.
      const painted = document.querySelector(
        `.layer-${layerId} path[data-feature="${cssEscape(f.id)}"]`
      );
      // Skip zero-size / hidden features
      const cs = painted ? getComputedStyle(painted) : null;
      const fill  = cs?.fill  || '#888';
      const opacity = parseFloat(cs?.fillOpacity ?? '0');
      const stroke = cs?.stroke || 'transparent';
      // If neither fill nor stroke is visible, skip.
      if ((opacity === 0 || fill === 'rgba(0, 0, 0, 0)') &&
          (stroke === 'none' || stroke === 'rgba(0, 0, 0, 0)')) continue;

      const li = el('li', { title: f.properties?.name || '' });
      const sw = el('span', { class: 'legend-swatch' });
      // Prefer painted fill; if transparent, use stroke as a border only
      if (opacity > 0.05) {
        sw.style.background = fill;
      } else {
        sw.style.background = 'transparent';
        sw.style.borderColor = stroke;
        sw.style.borderWidth = '2px';
      }
      li.append(sw);
      const label = f.properties?.name || f.id;
      // Short label: strip parenthetical suffix, keep the primary name.
      const shortLabel = label.split(/[·(]/)[0].trim();
      li.append(el('span', { class: 'legend-name' }, [shortLabel]));
      list.append(li);
    }
    if (list.children.length) {
      box.append(list);
      boxes.push(box);
    }
  }

  if (boxes.length === 0) {
    wrap.classList.remove('open');
    return;
  }
  for (const b of boxes) body.append(b);
  wrap.classList.add('open');
}

/** CSS.escape polyfill for older Safari — feature ids can contain hyphens
    but occasionally other chars, so be safe. */
function cssEscape(str) {
  return (window.CSS && CSS.escape) ? CSS.escape(str) : String(str).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}
