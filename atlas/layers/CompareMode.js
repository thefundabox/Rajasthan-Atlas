/**
 * CompareMode — side-by-side comparison of any two features.
 *
 * Flow:
 *   1. User activates Compare via header button, keyboard 'X', or layers popover.
 *   2. Panel opens along the bottom of the map, prompts to pick two features.
 *   3. Every subsequent map click assigns to slot A → slot B (round-robin
 *      when both are filled).
 *   4. Panel renders a 2-column table: rainfall / temperature / soil /
 *      vegetation / districts / related PAs / diff.
 */

import { Atlas } from '../core/AtlasCore.js';
import { esc, el } from '../core/util/dom.js';
import { t }        from '../core/i18n.js';

let districtDemographics = null;
Atlas.bus.on('atlas:ready', async () => {
  try {
    districtDemographics = await fetch('atlas/data/district-demographics.json').then(r => r.json());
  } catch { /* no-op — compare falls back to zone-only comparison */ }
});

let panel   = null;
let active  = false;
let slotA   = null;
let slotB   = null;
let pending = 'A';   // which slot the next selection fills

Atlas.bus.on('atlas:ready', () => install());

function install() {
  const map = document.querySelector('.a-map');
  if (!map) return;

  panel = el('div', { class: 'compare-panel' });
  map.append(panel);

  const nav = document.querySelector('.a-header .h-nav');
  if (nav) nav.insertBefore(el('button', {
    class: 'h-btn', 'data-action': 'compare',
    title: t('Compare two features (X)'),
    onclick: () => toggle(),
  }, [t('Compare')]), nav.firstChild);

  const modes = document.querySelector('.lp-modes');
  if (modes) modes.append(el('button', {
    class: 'lp-mode', 'data-mode': 'compare',
    title: t('Compare mode'),
    onclick: () => toggle(),
  }, [t('Compare')]));

  Atlas.interaction.registerShortcut('x', () => toggle());
  Atlas.interaction.registerShortcut('X', () => toggle());

  // When compare is active, capture every selection.
  Atlas.bus.on('selection:changed', ({ feature, layerId, featureId }) => {
    if (!active) return;
    if (!feature) return;
    const entry = { feature, layerId, featureId };
    if (pending === 'A') { slotA = entry; pending = 'B'; }
    else                 { slotB = entry; pending = 'A'; }
    render();
  });
}

function toggle() {
  active = !active;
  if (!active) { close(); return; }
  slotA = null; slotB = null; pending = 'A';
  panel.classList.add('open');
  render();
}
function close() {
  active = false;
  panel.classList.remove('open');
}

function render() {
  panel.innerHTML = '';
  panel.append(el('button', {
    class: 'compare-close', title: 'Close (Esc)',
    onclick: () => close(),
  }, ['×']));
  panel.append(el('h3', {}, ['Compare features']));
  panel.append(el('p', { class: 'compare-hint' }, [
    slotA && slotB
      ? 'Click any feature on the map to replace the next slot.'
      : `Click a feature on the map to fill slot ${pending === 'A' ? 'A' : 'B'}.`,
  ]));

  const grid = el('div', { class: 'compare-grid' });
  grid.append(slotCard('A', slotA));
  grid.append(slotCard('B', slotB));
  panel.append(grid);

  if (slotA && slotB) panel.append(renderDiff(slotA, slotB));
}

function slotCard(label, entry) {
  const c = el('div', { class: `compare-slot slot-${label.toLowerCase()}${entry ? ' filled' : ''}` });
  c.append(el('div', { class: 'compare-slot-lbl' }, [`Slot ${label}`]));
  if (!entry) {
    c.append(el('div', { class: 'compare-slot-empty' }, ['(empty — click a feature)']));
    return c;
  }
  const p = entry.feature.properties ?? {};
  c.append(el('div', { class: 'compare-name' }, [p.name]));
  c.append(el('div', { class: 'compare-kind' }, [p.type ?? '']));
  const dl = el('dl', { class: 'compare-dl' });
  const rows = extractRows(p);
  for (const [k, v] of rows) {
    if (v == null || v === '') continue;
    dl.append(el('dt', {}, [k]));
    dl.append(el('dd', {}, [String(v)]));
  }
  c.append(dl);
  return c;
}

function extractRows(p) {
  // Look up per-district demographics if the feature is (or references) a district.
  const districtName = p.district || p.name;
  const demo = districtDemographics?.districts?.[districtName];

  const rows = [
    ['Rainfall',      p.avg_mm ? `${p.avg_mm} mm avg` : (p.range ? `${p.range[0]}–${p.range[1]} mm` : '')],
    ['Temperature',   p.mean_c ? `${p.mean_c} °C mean` : (p.summer_c ? `${p.summer_c[0]}-${p.summer_c[1]} °C summer` : '')],
    ['Köppen',        p.koppen],
    ['Soil texture',  p.texture],
    ['Fertility',     p.fertility],
    ['Crops',         Array.isArray(p.crops)   ? p.crops.join(', ') : p.crops],
    ['Species',       Array.isArray(p.species) ? p.species.slice(0,4).join(' · ') : p.species],
    ['Canopy',        p.canopy],
    ['Districts',     p.districts_included?.length ? `${p.districts_included.length} — ${p.districts_included.slice(0,4).join(', ')}${p.districts_included.length > 4 ? '…' : ''}` : (p.district ?? '')],
    ['Elevation',     p.elevation_m ? `${p.elevation_m} m` : ''],
    ['Length',        p.length_km   ? `${p.length_km} km` : ''],
    ['Area',          p.area        ? `${p.area} km²` : ''],
    ['Basin',         p.basin],
    ['Range',         p.range && typeof p.range === 'string' ? p.range : ''],
  ];

  // Module 9 additions — demographic + administrative attributes.
  if (demo) rows.push(
    ['Population',    `${(demo.population/1e6).toFixed(2)} M`],
    ['Density',       `${demo.density}/km²`],
    ['Literacy',      `${demo.literacy_pct}%`],
    ['Sex ratio',     `${demo.sex_ratio} F/1000M`],
    ['ST %',          `${demo.st_pct}%`],
    ['SC %',          `${demo.sc_pct}%`],
    ['Urban %',       `${demo.urban_pct}%`],
    ['2001–2011 growth', `${demo.growth_pct}%`],
  );
  if (p.headquarters)  rows.push(['Headquarters', p.headquarters]);
  if (p.dialect)       rows.push(['Dialect', p.dialect]);
  if (p.seat)          rows.push(['Historical seat', p.seat]);
  if (p.population_lakh != null) rows.push(['City population', `${p.population_lakh} lakh`]);
  if (p.urban_role)    rows.push(['Urban role', p.urban_role]);
  if (p.border_with)   rows.push(['Border with', p.border_with]);
  if (p.axis)          rows.push(['Development axis', p.axis]);

  return rows;
}

function renderDiff(A, B) {
  const wrap = el('div', { class: 'compare-diff' });
  wrap.append(el('h4', {}, ['Key differences']));
  const list = el('ul', {});

  const pa = A.feature.properties, pb = B.feature.properties;
  const districtsA = new Set(pa.districts_included ?? []);
  const districtsB = new Set(pb.districts_included ?? []);
  const shared    = [...districtsA].filter(d => districtsB.has(d));
  const onlyA     = [...districtsA].filter(d => !districtsB.has(d));
  const onlyB     = [...districtsB].filter(d => !districtsA.has(d));

  if (shared.length) list.append(el('li', {}, [
    `Shared districts: ${shared.slice(0, 6).join(', ')}${shared.length > 6 ? '…' : ''}`,
  ]));
  if (onlyA.length) list.append(el('li', {}, [
    `Unique to A (${pa.name}): ${onlyA.slice(0, 4).join(', ')}${onlyA.length > 4 ? '…' : ''}`,
  ]));
  if (onlyB.length) list.append(el('li', {}, [
    `Unique to B (${pb.name}): ${onlyB.slice(0, 4).join(', ')}${onlyB.length > 4 ? '…' : ''}`,
  ]));
  if (pa.avg_mm != null && pb.avg_mm != null) {
    const diff = pa.avg_mm - pb.avg_mm;
    list.append(el('li', {}, [
      `Rainfall difference: ${Math.abs(diff)} mm (${pa.name} is ${diff > 0 ? 'wetter' : 'drier'})`,
    ]));
  }
  if (pa.mean_c != null && pb.mean_c != null) {
    const diff = pa.mean_c - pb.mean_c;
    list.append(el('li', {}, [
      `Temperature difference: ${Math.abs(diff)} °C (${pa.name} is ${diff > 0 ? 'warmer' : 'cooler'})`,
    ]));
  }
  // Module 9 — demographic diffs
  const dA = districtDemographics?.districts?.[pa.district || pa.name];
  const dB = districtDemographics?.districts?.[pb.district || pb.name];
  if (dA && dB) {
    const diffs = [
      ['population',  'M',        (v) => (v/1e6).toFixed(2)],
      ['density',     '/km²',     (v) => v],
      ['literacy_pct','%',        (v) => v],
      ['sex_ratio',   ' F/1000M', (v) => v],
      ['urban_pct',   '%',        (v) => v],
      ['st_pct',      '%',        (v) => v],
    ];
    for (const [key, unit, fmt] of diffs) {
      if (dA[key] == null || dB[key] == null) continue;
      const delta = dA[key] - dB[key];
      list.append(el('li', {}, [
        `${key.replace('_pct','').replace('_',' ')}: ${fmt(dA[key])}${unit} vs ${fmt(dB[key])}${unit} — ${pa.name} is ${delta > 0 ? 'higher' : 'lower'} by ${fmt(Math.abs(delta))}${unit}.`,
      ]));
    }
  }
  if (pa.type && pb.type && pa.type === pb.type) list.append(el('li', {}, [
    `Same kind of feature (${pa.type}) — compare is comparing like with like.`,
  ]));
  else if (pa.type && pb.type) list.append(el('li', {}, [
    `Different feature types (${pa.type} vs ${pb.type}) — the atlas is showing a cross-layer comparison.`,
  ]));

  wrap.append(list);
  return wrap;
}
