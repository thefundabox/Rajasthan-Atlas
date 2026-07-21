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
import { t, tf, getLang } from '../core/i18n.js';

const isHi = () => getLang() === 'hi';

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
    class: 'compare-close', title: t('Close (Esc)'),
    onclick: () => close(),
  }, ['×']));
  panel.append(el('h3', {}, [t('Compare features')]));
  panel.append(el('p', { class: 'compare-hint' }, [
    slotA && slotB
      ? t('Click any feature on the map to replace the next slot.')
      : (isHi()
          ? `स्लॉट ${pending} भरने के लिए मानचित्र पर किसी विशेषता पर क्लिक करें।`
          : `Click a feature on the map to fill slot ${pending === 'A' ? 'A' : 'B'}.`),
  ]));

  const grid = el('div', { class: 'compare-grid' });
  grid.append(slotCard('A', slotA));
  grid.append(slotCard('B', slotB));
  panel.append(grid);

  if (slotA && slotB) panel.append(renderDiff(slotA, slotB));
}

function slotCard(label, entry) {
  const c = el('div', { class: `compare-slot slot-${label.toLowerCase()}${entry ? ' filled' : ''}` });
  c.append(el('div', { class: 'compare-slot-lbl' }, [`${t('Slot')} ${label}`]));
  if (!entry) {
    c.append(el('div', { class: 'compare-slot-empty' }, [t('(empty — click a feature)')]));
    return c;
  }
  const p = entry.feature.properties ?? {};
  c.append(el('div', { class: 'compare-name' }, [tf(p, 'name')]));
  c.append(el('div', { class: 'compare-kind' }, [tf(p, 'type') ?? '']));
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

  const crops   = tf(p, 'crops');
  const species = tf(p, 'species');
  const dList   = (p.districts_included ?? []).slice(0, 4).map(x => t(x)).join(', ');

  const rows = [
    [t('Rainfall'),      p.avg_mm ? `${p.avg_mm} ${t('mm avg')}` : (p.range ? `${p.range[0]}–${p.range[1]} mm` : '')],
    [t('Temperature'),   p.mean_c ? `${p.mean_c} °C ${t('mean')}` : (p.summer_c ? `${p.summer_c[0]}-${p.summer_c[1]} °C ${t('summer')}` : '')],
    [t('Köppen'),        p.koppen],
    [t('Soil texture'),  tf(p, 'texture')],
    [t('Fertility'),     tf(p, 'fertility')],
    [t('Crops'),         Array.isArray(crops)   ? crops.join(', ') : crops],
    [t('Species'),       Array.isArray(species) ? species.slice(0,4).join(' · ') : species],
    [t('Canopy'),        tf(p, 'canopy')],
    [t('Districts'),     p.districts_included?.length ? `${p.districts_included.length} — ${dList}${p.districts_included.length > 4 ? '…' : ''}` : (t(p.district) ?? '')],
    [t('Elevation'),     p.elevation_m ? `${p.elevation_m} m` : ''],
    [t('Length'),        p.length_km   ? `${p.length_km} km` : ''],
    [t('Area'),          p.area        ? `${p.area} km²` : ''],
    [t('Basin'),         tf(p, 'basin')],
    [t('Range'),         p.range && typeof p.range === 'string' ? tf(p, 'range') : ''],
  ];

  // Module 9 additions — demographic + administrative attributes.
  if (demo) rows.push(
    [t('Population'),    `${(demo.population/1e6).toFixed(2)} M`],
    [t('Density'),       `${demo.density}/km²`],
    [t('Literacy'),      `${demo.literacy_pct}%`],
    [t('Sex ratio'),     `${demo.sex_ratio} F/1000M`],
    [t('ST %'),          `${demo.st_pct}%`],
    [t('SC %'),          `${demo.sc_pct}%`],
    [t('Urban %'),       `${demo.urban_pct}%`],
    [t('2001–2011 growth'), `${demo.growth_pct}%`],
  );
  if (p.headquarters)  rows.push([t('Headquarters'), t(p.headquarters)]);
  if (p.dialect)       rows.push([t('Dialect'), tf(p, 'dialect')]);
  if (p.seat)          rows.push([t('Historical seat'), tf(p, 'seat')]);
  if (p.population_lakh != null) rows.push([t('City population'), `${p.population_lakh} ${t('lakh')}`]);
  if (p.urban_role)    rows.push([t('Urban role'), tf(p, 'urban_role')]);
  if (p.border_with)   rows.push([t('Border with'), tf(p, 'border_with')]);
  if (p.axis)          rows.push([t('Development axis'), tf(p, 'axis')]);

  return rows;
}

function renderDiff(A, B) {
  const wrap = el('div', { class: 'compare-diff' });
  wrap.append(el('h4', {}, [t('Key differences')]));
  const list = el('ul', {});

  const pa = A.feature.properties, pb = B.feature.properties;
  const nameA = tf(pa, 'name'), nameB = tf(pb, 'name');
  const tD = (arr, n) => arr.slice(0, n).map(x => t(x)).join(', ');
  const districtsA = new Set(pa.districts_included ?? []);
  const districtsB = new Set(pb.districts_included ?? []);
  const shared    = [...districtsA].filter(d => districtsB.has(d));
  const onlyA     = [...districtsA].filter(d => !districtsB.has(d));
  const onlyB     = [...districtsB].filter(d => !districtsA.has(d));

  if (shared.length) list.append(el('li', {}, [
    `${isHi() ? 'साझा जिले' : 'Shared districts'}: ${tD(shared, 6)}${shared.length > 6 ? '…' : ''}`,
  ]));
  if (onlyA.length) list.append(el('li', {}, [
    `${isHi() ? `केवल A में (${nameA})` : `Unique to A (${nameA})`}: ${tD(onlyA, 4)}${onlyA.length > 4 ? '…' : ''}`,
  ]));
  if (onlyB.length) list.append(el('li', {}, [
    `${isHi() ? `केवल B में (${nameB})` : `Unique to B (${nameB})`}: ${tD(onlyB, 4)}${onlyB.length > 4 ? '…' : ''}`,
  ]));
  if (pa.avg_mm != null && pb.avg_mm != null) {
    const diff = pa.avg_mm - pb.avg_mm;
    list.append(el('li', {}, [
      isHi()
        ? `वर्षा अंतर: ${Math.abs(diff)} mm (${nameA} ${diff > 0 ? 'अधिक आर्द्र' : 'अधिक शुष्क'} है)`
        : `Rainfall difference: ${Math.abs(diff)} mm (${nameA} is ${diff > 0 ? 'wetter' : 'drier'})`,
    ]));
  }
  if (pa.mean_c != null && pb.mean_c != null) {
    const diff = pa.mean_c - pb.mean_c;
    list.append(el('li', {}, [
      isHi()
        ? `तापमान अंतर: ${Math.abs(diff)} °C (${nameA} ${diff > 0 ? 'अधिक गर्म' : 'अधिक ठंडा'} है)`
        : `Temperature difference: ${Math.abs(diff)} °C (${nameA} is ${diff > 0 ? 'warmer' : 'cooler'})`,
    ]));
  }
  // Module 9 — demographic diffs
  const dA = districtDemographics?.districts?.[pa.district || pa.name];
  const dB = districtDemographics?.districts?.[pb.district || pb.name];
  if (dA && dB) {
    const diffs = [
      ['population',  'M',        (v) => (v/1e6).toFixed(2), 'जनसंख्या'],
      ['density',     '/km²',     (v) => v,                  'घनत्व'],
      ['literacy_pct','%',        (v) => v,                  'साक्षरता'],
      ['sex_ratio',   ' F/1000M', (v) => v,                  'लिंग-अनुपात'],
      ['urban_pct',   '%',        (v) => v,                  'नगरीय'],
      ['st_pct',      '%',        (v) => v,                  'ST'],
    ];
    for (const [key, unit, fmt, hiLabel] of diffs) {
      if (dA[key] == null || dB[key] == null) continue;
      const delta = dA[key] - dB[key];
      const label = isHi() ? hiLabel : key.replace('_pct','').replace('_',' ');
      list.append(el('li', {}, [
        isHi()
          ? `${label}: ${fmt(dA[key])}${unit} बनाम ${fmt(dB[key])}${unit} — ${nameA} ${delta > 0 ? 'अधिक' : 'कम'} है, ${fmt(Math.abs(delta))}${unit} से।`
          : `${label}: ${fmt(dA[key])}${unit} vs ${fmt(dB[key])}${unit} — ${nameA} is ${delta > 0 ? 'higher' : 'lower'} by ${fmt(Math.abs(delta))}${unit}.`,
      ]));
    }
  }
  if (pa.type && pb.type && pa.type === pb.type) list.append(el('li', {}, [
    isHi()
      ? `एक ही प्रकार की विशेषता (${tf(pa, 'type')}) — तुलना समान से समान की हो रही है।`
      : `Same kind of feature (${pa.type}) — compare is comparing like with like.`,
  ]));
  else if (pa.type && pb.type) list.append(el('li', {}, [
    isHi()
      ? `भिन्न विशेषता प्रकार (${tf(pa, 'type')} बनाम ${tf(pb, 'type')}) — एटलस एक क्रॉस-लेयर तुलना दिखा रहा है।`
      : `Different feature types (${pa.type} vs ${pb.type}) — the atlas is showing a cross-layer comparison.`,
  ]));

  wrap.append(list);
  return wrap;
}
