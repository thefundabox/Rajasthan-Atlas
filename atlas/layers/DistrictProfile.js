/**
 * DistrictProfile — enrich the detail-panel card when a district is selected.
 *
 * The base districts.geojson has only skeleton properties (name, division,
 * HQ, area, newDistrict flag). This plug-in intercepts district selections
 * and rebuilds the detail card as a synthesised profile aggregating data
 * from EVERY OTHER LAYER where the district appears — plus Census 2011
 * demographics from district-demographics.json.
 *
 * Nothing new is added to the data — this is pure synthesis across layers
 * the atlas already loads.
 *
 * Zero engine changes. Additive plug-in.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el, esc } from '../core/util/dom.js';

let demographicsPayload = null;

Atlas.bus.on('atlas:ready', () => {
  // Register the click subscriber SYNCHRONOUSLY at atlas:ready — before any
  // async work — so the FIRST click a user makes is always caught. If the
  // demographics fetch hasn't resolved yet, renderDistrictProfile falls
  // back to showing everything except the Demographics card; once
  // demographics land it will populate on the next click.
  Atlas.bus.on('selection:changed', ({ layerId, feature }) => {
    if (layerId !== 'districts' || !feature) return;
    // Delay slightly so UIManager's default renderer runs first, then we
    // overwrite the detail slot with our synthesised profile.
    setTimeout(() => renderDistrictProfile(feature), 30);
  });

  // Kick off the fetch in parallel — non-blocking.
  fetch('atlas/data/district-demographics.json')
    .then(r => r.json())
    .then(payload => { demographicsPayload = payload; })
    .catch(err => console.warn('[DistrictProfile] demographics fetch failed', err));

  console.info('[DistrictProfile] ready — click any district for a full profile');
});

/* ── Membership walker ─────────────────────────────────────────── */
/**
 * For a district name D, walk every layer's features and return
 * a map of { layerId: [feature, ...] } for every feature that includes D
 * (via `districts_included` array, `district` scalar, or exact name match
 * on the districts layer itself).
 */
function membershipsFor(name) {
  const out = {};
  for (const cfg of Atlas.layers.list()) {
    if (cfg.id === 'districts') continue;
    const feats = Atlas.layers.features(cfg.id) || [];
    const bucket = [];
    for (const f of feats) {
      const p = f.properties || {};
      const belongs =
        p.district === name ||
        (Array.isArray(p.districts_included) && p.districts_included.includes(name));
      if (belongs) bucket.push(f);
    }
    if (bucket.length) out[cfg.id] = bucket;
  }
  return out;
}

/* ── Records this district holds ───────────────────────────────── */
/**
 * Cross-check district demographics to see if this district is at an
 * extremum (highest/lowest) for any metric. Returns an array of record
 * strings.
 */
function recordsFor(name, demo) {
  if (!demographicsPayload || !demo) return [];
  const all = demographicsPayload.districts;
  const entries = Object.entries(all);
  const extremum = (key, mode, label, unit = '') => {
    entries.sort((a, b) => (a[1][key] ?? 0) - (b[1][key] ?? 0));
    const [d, m] = mode === 'max' ? entries.at(-1) : entries[0];
    if (d === name) return `${label} · ${m[key]}${unit}`;
    return null;
  };
  return [
    extremum('literacy_pct', 'max', 'Highest literacy in Rajasthan', ' %'),
    extremum('literacy_pct', 'min', 'Lowest literacy in Rajasthan',  ' %'),
    extremum('density',      'max', 'Highest population density',    ' /km²'),
    extremum('density',      'min', 'Lowest population density',     ' /km²'),
    extremum('sex_ratio',    'max', 'Highest sex ratio',             ' F/1000M'),
    extremum('sex_ratio',    'min', 'Lowest sex ratio',              ' F/1000M'),
    extremum('st_pct',       'max', 'Highest ST %',                  ' %'),
    extremum('sc_pct',       'max', 'Highest SC %',                  ' %'),
    extremum('urban_pct',    'max', 'Most urbanised',                ' %'),
    extremum('urban_pct',    'min', 'Least urbanised',               ' %'),
    extremum('growth_pct',   'max', 'Highest 2001-2011 growth',      ' %'),
    extremum('population',   'max', 'Highest population'),
    extremum('population',   'min', 'Lowest population'),
    extremum('area_km2',     'max', 'Largest area',                  ' km²'),
    extremum('area_km2',     'min', 'Smallest area',                 ' km²'),
  ].filter(Boolean);
}

/* ── Card renderer ─────────────────────────────────────────────── */
function renderDistrictProfile(district) {
  const detail = document.querySelector('.detail-slot');
  if (!detail) return;
  const p = district.properties || {};
  const name = p.name;
  const demo = demographicsPayload?.districts?.[name] || null;
  const memberships = membershipsFor(name);
  const records = recordsFor(name, demo);

  const wrap = el('div', { class: 'ed dp' });

  /* Hero */
  const hero = el('div', { class: 'ed-hero' });
  hero.append(el('div', { class: 'ed-kicker' }, ['District Profile']));
  hero.append(el('h2', { class: 'ed-title' }, [name]));
  const tags = el('div', { class: 'ed-tags' });
  tags.append(tag(`${p.division ?? '?'} Division`, 'wls'));
  if (p.headquarters) tags.append(tag(`HQ ${p.headquarters}`, 'point'));
  if (p.newDistrict)  tags.append(tag('New 2023', 'ramsar'));
  // Cultural region
  const region = firstRegionFor(memberships);
  if (region) tags.append(tag(`Region ${region}`, 'np'));
  const inherited = demo?.inherited_from_parent;
  if (inherited) tags.append(tag(`Census values from ${inherited}`, 'point'));
  hero.append(tags);
  wrap.append(hero);

  /* Demographics grid */
  if (demo) {
    const grid = el('div', { class: 'dp-grid' });
    grid.append(fig('Population', humanNum(demo.population)));
    grid.append(fig('Density',    `${demo.density} /km²`));
    grid.append(fig('Area',       `${humanNum(demo.area_km2)} km²`));
    grid.append(fig('Literacy',   `${demo.literacy_pct} %`));
    grid.append(fig('Sex ratio',  `${demo.sex_ratio} F/1000M`));
    grid.append(fig('Urban',      `${demo.urban_pct} %`));
    grid.append(fig('ST %',       `${demo.st_pct} %`));
    grid.append(fig('SC %',       `${demo.sc_pct} %`));
    grid.append(fig('Growth (2001-2011)', `${demo.growth_pct} %`));
    wrap.append(section('Demographics · Census 2011', grid));
  }

  /* Records this district holds */
  if (records.length) {
    const box = el('div', { class: 'dp-records' });
    for (const r of records) {
      box.append(el('div', { class: 'dp-record-pill' }, [r]));
    }
    wrap.append(section('Records this district holds', box));
  }

  /* Did you know — enrichment facts merged from atlas/data/enrichment.json */
  const facts = Array.isArray(p.notes?.facts) ? p.notes.facts : [];
  if (facts.length) {
    const list = el('ul', { class: 'dp-facts' });
    for (const f of facts) list.append(el('li', {}, [f]));
    wrap.append(section('Did you know', list));
  }

  /* Physical & climate */
  wrap.append(gatherSection('Physical & climate', memberships, [
    'physiography', 'drainage-basins', 'thar',
    'climate-regions', 'rainfall', 'temperature',
    'soil-types', 'vegetation', 'agro-climatic-zones',
    'desertification', 'drought-vulnerability',
  ]));

  /* Agriculture & water */
  wrap.append(gatherSection('Agriculture & water', memberships, [
    'major-crops', 'cropping-seasons', 'agro-economic-zones',
    'irrigation-sources', 'command-areas', 'groundwater',
    'major-canals', 'dams',
  ]));

  /* Geology & mining */
  wrap.append(gatherSection('Geology · minerals · mining', memberships, [
    'geological-provinces', 'rock-types',
    'mineral-belts', 'building-stones', 'mining-clusters',
    'major-mines', 'petroleum-gas',
  ]));

  /* Industry & energy */
  wrap.append(gatherSection('Industry & energy', memberships, [
    'industrial-regions', 'industrial-clusters', 'industrial-areas',
    'major-industries', 'special-economic-zones', 'handicraft-clusters',
    'energy-mix', 'renewable-zones', 'transmission-corridors',
    'power-plants', 'solar-parks', 'wind-farms',
  ]));

  /* Environment */
  wrap.append(gatherSection('Environment · protected areas', memberships, [
    'national-parks', 'tiger-reserves', 'wildlife-sanctuaries',
    'ramsar-sites', 'wetlands',
  ]));

  /* Human geography */
  wrap.append(gatherSection('Human geography', memberships, [
    'regional-zones', 'border-districts',
    'administrative-divisions', 'scheduled-areas', 'population-corridors',
    'urban-centres', 'municipal-corporations', 'smart-cities',
  ]));

  /* References */
  const src = el('div', { class: 'ed-sources' });
  src.append(el('span', { class: 'ed-source' }, ['Census of India 2011']));
  src.append(el('span', { class: 'ed-source' }, ['Synthesised from all 60+ atlas layers']));
  wrap.append(section('References', src));

  detail.innerHTML = '';
  detail.append(wrap);
  document.querySelector('.a-right')?.classList.add('open');
}

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Given the layer memberships, build a themed section that lists the
 * relevant features per layer as clickable chips.
 * Skips layers with no membership; returns an empty <span> if none of the
 * requested layers matched (so the calling code can filter it out).
 */
function gatherSection(title, memberships, layerIds) {
  const rows = [];
  for (const layerId of layerIds) {
    const feats = memberships[layerId];
    if (!feats?.length) continue;
    const rec = Atlas.layers.get(layerId);
    if (!rec) continue;
    const chips = el('div', { class: 'dp-chip-row' });
    for (const f of feats) {
      const chip = el('button', {
        class: 'dp-chip',
        title: `${rec.config.name} — ${f.properties.name}`,
        onclick: () => Atlas.interaction.select(layerId, f.id),
      });
      chip.append(el('span', { class: 'dp-chip-layer' }, [rec.config.name]));
      chip.append(el('span', { class: 'dp-chip-name' }, [f.properties.name]));
      chips.append(chip);
    }
    rows.push(chips);
  }
  if (!rows.length) return document.createComment(`no matches: ${title}`);
  const body = el('div', {});
  for (const r of rows) body.append(r);
  return section(title, body);
}

function firstRegionFor(memberships) {
  const r = memberships['regional-zones']?.[0];
  return r ? r.properties.name : null;
}

function humanNum(n) {
  if (n == null) return '—';
  if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return n.toLocaleString();
  return String(n);
}

function tag(text, kind) {
  const t = el('span', { class: `ed-tag tag-${kind}` });
  t.textContent = text;
  return t;
}

function fig(label, val) {
  const box = el('div', { class: 'ed-fig' });
  box.append(el('div', { class: 'n' }, [String(val)]));
  box.append(el('div', { class: 'k' }, [label]));
  return box;
}

function section(title, body) {
  const s = el('div', { class: 'ed-section' });
  s.append(el('h3', { class: 'ed-h' }, [title]));
  s.append(body);
  return s;
}
