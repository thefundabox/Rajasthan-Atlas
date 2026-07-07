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

// Map of mode-id → the layer(s) that should appear in the legend when
// that mode is active.  A mode may drive multiple layers.
const LEGEND_FOR_MODE = {
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
  agriculture:          ['agro-economic-zones', 'major-crops'],
  irrigation:           ['irrigation-sources'],
  groundwater:          ['groundwater'],
  water:                ['irrigation-sources'],

  // Geology · Minerals · Mining
  geology:              ['geological-provinces'],
  provinces:            ['geological-provinces'],
  rocks:                ['rock-types'],
  minerals:             ['mineral-belts'],
  'mineral-belts':      ['mineral-belts'],
  'building-stones':    ['building-stones'],
  mining:               ['mining-clusters'],
  petroleum:            ['petroleum-gas'],

  // Industry
  industry:             ['industrial-regions', 'industrial-clusters'],

  // Energy
  energy:               ['energy-mix', 'renewable-zones'],
  'energy-mix':         ['energy-mix'],
  renewables:           ['renewable-zones'],
  transmission:         ['transmission-corridors'],

  // Human Geography · Demographics
  demographics:         ['population-density'],
  'population-density': ['population-density'],
  literacy:             ['literacy'],
  urbanisation:         ['urbanisation'],
  'sex-ratio':          ['sex-ratio'],
  'st-sc':              ['scheduled-tribes'],
  regions:              ['regional-zones'],
  'border-districts':   ['border-districts'],
  'population-corridors': ['population-corridors'],
  'scheduled-areas':    ['scheduled-areas'],
};

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
  Atlas.bus.on('layer:mode',       update);
  Atlas.bus.on('layer:visibility', update);
  update();
});

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
