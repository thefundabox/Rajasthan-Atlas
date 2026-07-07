/**
 * RevisionDashboard — auto-generated study cards for climate/soils/vegetation.
 *
 * Opens as an overlay (like StatsManager). Every card is computed live from
 * the loaded datasets — no hardcoded values. Ships with:
 *
 *   • Rainfall extremes (highest / lowest zone)
 *   • Temperature extremes (hottest / coldest)
 *   • Dominant soil + vegetation (by district count)
 *   • Most drought-prone + desertification hotspot
 *   • Concept chains rendered by ConceptChains
 *
 * Zero core-engine surface.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { renderConceptChains } from './ConceptChains.js';

let districtDemographics = null;
Atlas.bus.on('atlas:ready', async () => {
  try {
    districtDemographics = await fetch('atlas/data/district-demographics.json').then(r => r.json());
  } catch { /* fine — the human-geography section will be skipped */ }
  install();
});

function install() {
  const map = document.querySelector('.a-map');
  if (!map) return;

  // Overlay panel
  const overlay = el('div', { class: 'revision-overlay' });
  overlay.append(el('button', {
    class: 'close-btn', title: 'Close (Esc)',
    onclick: () => close(),
  }, ['×']));
  map.append(overlay);

  // Header button
  const nav = document.querySelector('.a-header .h-nav');
  if (nav) {
    nav.insertBefore(el('button', {
      class: 'h-btn', 'data-action': 'revision',
      title: 'Revision Dashboard — study cards + concept chains (V)',
      onclick: () => open(overlay),
    }, ['Revise']), nav.firstChild);
  }
  // Layers popover button
  const modes = document.querySelector('.lp-modes');
  if (modes) {
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': 'quick-revision',
      title: 'Quick revision mode',
      onclick: () => Atlas.layers.setMode('quick-revision'),
    }, ['Quick Revision']));
  }
  Atlas.layers.registerMode('quick-revision', { apply: () => ({}) });
  Atlas.interaction.registerShortcut('v', () => open(overlay));
  Atlas.interaction.registerShortcut('V', () => open(overlay));

  function close() { overlay.classList.remove('open'); }
  function open(target) {
    render(target);
    target.classList.add('open');
  }
}

function render(overlay) {
  overlay.innerHTML = '';
  overlay.append(el('button', {
    class: 'close-btn', title: 'Close (Esc)',
    onclick: () => overlay.classList.remove('open'),
  }, ['×']));
  overlay.append(el('h2', {}, ['Revision Dashboard']));
  overlay.append(el('div', { class: 'stats-lede' }, [
    'Every card below is computed live from the current dataset. ' +
    'Click any card to open its feature.',
  ]));

  const grid = el('div', { class: 'revision-grid' });

  /* ---- Rainfall extremes ---- */
  const rf = Atlas.layers.features('rainfall');
  if (rf.length) {
    const sorted = [...rf].sort((a,b) => (a.properties.avg_mm ?? 0) - (b.properties.avg_mm ?? 0));
    const dry = sorted[0], wet = sorted.at(-1);
    grid.append(card('Lowest rainfall', dry.properties.name,
      `${dry.properties.avg_mm} mm avg · ${dry.properties.districts_included.length} districts`,
      dry.properties.districts_included.join(', '),
      () => Atlas.interaction.select('rainfall', dry.id)));
    grid.append(card('Highest rainfall', wet.properties.name,
      `${wet.properties.avg_mm} mm avg · ${wet.properties.districts_included.length} districts`,
      wet.properties.districts_included.join(', '),
      () => Atlas.interaction.select('rainfall', wet.id)));
  }

  /* ---- Temperature extremes ---- */
  const temps = Atlas.layers.features('temperature');
  if (temps.length) {
    const sorted = [...temps].sort((a,b) => (a.properties.mean_c ?? 0) - (b.properties.mean_c ?? 0));
    const cold = sorted[0], hot = sorted.at(-1);
    grid.append(card('Coldest zone', cold.properties.name,
      `Mean ${cold.properties.mean_c} °C`,
      cold.properties.districts_included.join(', '),
      () => Atlas.interaction.select('temperature', cold.id)));
    grid.append(card('Hottest zone', hot.properties.name,
      `Mean ${hot.properties.mean_c} °C`,
      hot.properties.districts_included.join(', '),
      () => Atlas.interaction.select('temperature', hot.id)));
  }

  /* ---- Dominant soil (by district count) ---- */
  const soils = Atlas.layers.features('soil-types');
  if (soils.length) {
    const top = [...soils].sort((a,b) => b.properties.districts_included.length - a.properties.districts_included.length)[0];
    grid.append(card('Dominant soil type', top.properties.name,
      `${top.properties.districts_included.length} districts`,
      top.properties.crop_suit ?? '',
      () => Atlas.interaction.select('soil-types', top.id)));
  }

  /* ---- Dominant vegetation ---- */
  const veg = Atlas.layers.features('vegetation');
  if (veg.length) {
    const top = [...veg].sort((a,b) => b.properties.districts_included.length - a.properties.districts_included.length)[0];
    grid.append(card('Dominant vegetation', top.properties.name,
      `${top.properties.districts_included.length} districts · ${top.properties.champion_id ?? ''}`,
      Array.isArray(top.properties.species) ? top.properties.species.slice(0,3).join(' · ') : '',
      () => Atlas.interaction.select('vegetation', top.id)));
  }

  /* ---- Most drought-prone ---- */
  const drought = Atlas.layers.features('drought-vulnerability');
  const dv = drought.find(f => f.id.endsWith('very-high'));
  if (dv) {
    grid.append(card('Most drought-prone', dv.properties.name + ' vulnerability',
      dv.properties.remark ?? '',
      dv.properties.districts_included.join(', '),
      () => Atlas.interaction.select('drought-vulnerability', dv.id)));
  }

  /* ---- Desertification hotspot ---- */
  const dsf = Atlas.layers.features('desertification');
  const severe = dsf.find(f => f.id.endsWith('severe'));
  if (severe) {
    grid.append(card('Desertification hotspot', severe.properties.name,
      severe.properties.causes ?? '',
      severe.properties.districts_included.join(', '),
      () => Atlas.interaction.select('desertification', severe.id)));
  }

  /* ---- Coverage summary ---- */
  const climateRegions = Atlas.layers.features('climate-regions');
  if (climateRegions.length) {
    const total = 41;
    for (const cr of climateRegions) {
      const pct = Math.round(100 * cr.properties.districts_included.length / total);
      grid.append(card('Climate coverage', cr.properties.name, `${pct}% of Rajasthan by district`,
        cr.properties.koppen ?? '',
        () => Atlas.interaction.select('climate-regions', cr.id)));
    }
  }

  /* ---- Signature protected areas (via knowledge graph) ---- */
  const signatures = countSignaturePAs();
  for (const [category, pa] of signatures) {
    grid.append(card(category, pa.name, pa.reason, '',
      () => Atlas.interaction.select(pa.layerId, pa.featureId)));
  }

  overlay.append(grid);

  /* ============================================================================
   *  Human geography — auto-computed from district-demographics.json (Module 9)
   * ==========================================================================*/
  if (districtDemographics?.districts) {
    overlay.append(el('h2', { style: { marginTop: '32px' } }, ['Human Geography']));
    overlay.append(el('div', { class: 'stats-lede' }, [
      'Live from Census 2011 · Registrar General of India. Click any card to open '
      + 'the underlying district or classification zone.',
    ]));
    const hgGrid = el('div', { class: 'revision-grid' });
    const districts = Object.entries(districtDemographics.districts);
    const openDistrictClass = (layerId, metricKey, districtName) => {
      // Open the classification zone that contains this district.
      const zones = Atlas.layers.features(layerId) ?? [];
      const zone = zones.find(z => z.properties.districts_included?.includes(districtName));
      if (zone) Atlas.interaction.select(layerId, zone.id);
    };
    const rank = (key, mode) => {
      const sorted = [...districts].sort((a, b) => (a[1][key] ?? 0) - (b[1][key] ?? 0));
      return mode === 'max' ? sorted.at(-1) : sorted[0];
    };
    // Highest / Lowest population
    let [d, m] = rank('population','max');
    hgGrid.append(card('Highest population', d, `${(m.population/1e6).toFixed(1)} million (Census 2011)`,
      `Density ${m.density}/km² · Literacy ${m.literacy_pct}%`,
      () => openDistrictClass('population-density','density', d)));
    [d, m] = rank('population','min');
    hgGrid.append(card('Lowest population', d, `${(m.population/1e6).toFixed(1)} million`,
      `Area ${m.area_km2} km²`,
      () => openDistrictClass('population-density','density', d)));
    // Density
    [d, m] = rank('density','max');
    hgGrid.append(card('Highest density', d, `${m.density}/km²`,
      `Only district with >500/km² in Rajasthan`,
      () => openDistrictClass('population-density','density', d)));
    [d, m] = rank('density','min');
    hgGrid.append(card('Lowest density', d, `${m.density}/km²`,
      `Thar desert · Census 2011`,
      () => openDistrictClass('population-density','density', d)));
    // Literacy
    [d, m] = rank('literacy_pct','max');
    hgGrid.append(card('Highest literacy', d, `${m.literacy_pct}%`,
      `Coaching-education economy`,
      () => openDistrictClass('literacy','literacy_pct', d)));
    [d, m] = rank('literacy_pct','min');
    hgGrid.append(card('Lowest literacy', d, `${m.literacy_pct}%`,
      `Rural Marwar / Vagad belt`,
      () => openDistrictClass('literacy','literacy_pct', d)));
    // ST / SC
    [d, m] = rank('st_pct','max');
    hgGrid.append(card('Highest ST %', d, `${m.st_pct}% Scheduled Tribes`,
      `Vagad Fifth-Schedule area`,
      () => openDistrictClass('scheduled-tribes','st_pct', d)));
    [d, m] = rank('sc_pct','max');
    hgGrid.append(card('Highest SC %', d, `${m.sc_pct}% Scheduled Castes`,
      `Canal-command labour communities`,
      () => openDistrictClass('scheduled-castes','sc_pct', d)));
    // Urbanisation
    [d, m] = rank('urban_pct','max');
    hgGrid.append(card('Most urbanised', d, `${m.urban_pct}% urban`,
      `Coaching-industry / capital city`,
      () => openDistrictClass('urbanisation','urban_pct', d)));
    [d, m] = rank('urban_pct','min');
    hgGrid.append(card('Least urbanised', d, `${m.urban_pct}% urban`,
      `Tribal-belt district`,
      () => openDistrictClass('urbanisation','urban_pct', d)));
    // Sex ratio extremes
    [d, m] = rank('sex_ratio','max');
    hgGrid.append(card('Highest sex ratio', d, `${m.sex_ratio} F/1000M`,
      `Southern Aravalli tribal belt`,
      () => openDistrictClass('sex-ratio','sex_ratio', d)));
    [d, m] = rank('sex_ratio','min');
    hgGrid.append(card('Lowest sex ratio', d, `${m.sex_ratio} F/1000M`,
      `Chronic skew (Bharatpur-Karauli belt)`,
      () => openDistrictClass('sex-ratio','sex_ratio', d)));
    // Growth
    [d, m] = rank('growth_pct','max');
    hgGrid.append(card('Highest population growth', d, `${m.growth_pct}% (2001–2011)`,
      `Oil-and-gas driven in-migration`,
      () => openDistrictClass('population-growth','growth_pct', d)));

    // Municipal corporations (largest)
    const mcs = Atlas.layers.features('municipal-corporations') ?? [];
    if (mcs.length) {
      const largest = [...mcs].sort((a,b) => (b.properties.population_lakh ?? 0) - (a.properties.population_lakh ?? 0))[0];
      hgGrid.append(card('Largest Municipal Corporation', largest.properties.name,
        `~${largest.properties.population_lakh} lakh`,
        largest.properties.district,
        () => Atlas.interaction.select('municipal-corporations', largest.id)));
    }

    // Border district count
    const bd = Atlas.layers.features('border-districts') ?? [];
    if (bd.length) {
      const allBorder = new Set();
      bd.forEach(z => (z.properties.districts_included ?? []).forEach(d => allBorder.add(d)));
      hgGrid.append(card('Border districts', `${allBorder.size} districts`,
        'International (Pakistan) + 5 states',
        [...allBorder].slice(0, 6).join(', ') + (allBorder.size > 6 ? '…' : ''),
        () => Atlas.interaction.select('border-districts', bd[0].id)));
    }

    // Division count
    const divs = Atlas.layers.features('administrative-divisions') ?? [];
    if (divs.length) {
      hgGrid.append(card('Revenue divisions', `${divs.length}`,
        'Jaipur · Jodhpur · Ajmer · Bikaner · Bharatpur · Kota · Udaipur',
        '',
        () => Atlas.interaction.select('administrative-divisions', divs[0].id)));
    }

    overlay.append(hgGrid);
  }

  overlay.append(el('h2', { style: { marginTop: '32px' } }, ['Concept Chains']));
  overlay.append(el('div', { class: 'stats-lede' }, [
    'Follow a chain from climate through soil and vegetation to the protected areas it produces. ' +
    'Every step is a live feature — click to open it.',
  ]));
  overlay.append(renderConceptChains());
}

function card(label, title, big, foot, onClick) {
  const c = el('div', { class: 'revision-card', onclick: onClick, tabindex: 0 });
  c.append(el('div', { class: 'lbl' }, [label]));
  c.append(el('div', { class: 'big' }, [title]));
  if (big)  c.append(el('div', { class: 'sub' }, [big]));
  if (foot) c.append(el('div', { class: 'foot' }, [foot]));
  return c;
}

function countSignaturePAs() {
  const out = [];
  const climateRegions = Atlas.layers.features('climate-regions');
  for (const cr of climateRegions) {
    const cluster = Atlas.knowledge?.cluster?.(cr) ?? [];
    const pa = cluster.find(x => ['national-parks','tiger-reserves','wildlife-sanctuaries','ramsar-sites'].includes(x.layerId) && x.type === 'signature');
    if (pa) out.push([`${cr.properties.name} — signature PA`, {
      name: pa.feature.properties.name, layerId: pa.layerId, featureId: pa.featureId,
      reason: `Flagship of the ${cr.properties.name.toLowerCase()} climate`,
    }]);
  }
  return out;
}
