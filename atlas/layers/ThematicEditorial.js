/**
 * ThematicEditorial — shared editorial renderer for climate / soils /
 * vegetation / desertification / drought features. Consistent structure across
 * every classified zone: hero → tags → overview → distribution → key figures
 * → characteristics → related (Knowledge Graph) → references.
 */

import { Atlas }             from '../core/AtlasCore.js';
import { esc, el, svgEl }    from '../core/util/dom.js';
import { t, tf, getLang }    from '../core/i18n.js';

const KIND_LABEL = {
  rainfall_zone:        'Rainfall zone',
  temperature_zone:     'Temperature zone',
  climate_region:       'Climate region',
  agro_climatic_zone:   'Agro-climatic zone',
  soil_type:            'Soil type',
  vegetation_type:      'Vegetation type',
  desertification_zone: 'Desertification zone',
  drought_zone:         'Drought vulnerability',
  crop:                 'Major crop',
  cropping_season:      'Cropping season',
  agro_economic_zone:   'Agro-economic zone',
  irrigation_source:    'Irrigation source',
  canal:                'Canal',
  dam:                  'Dam',
  groundwater_zone:     'Groundwater status',
  command_area:         'Command area',
  geological_province:  'Geological province',
  rock_type:            'Rock type',
  mineral_belt:         'Mineral belt',
  mine:                 'Mine',
  building_stone:       'Building stone',
  mining_cluster:       'Mining cluster',
  oil_basin:            'Oil basin',
  oil_field:            'Oil field',
  gas_field:            'Gas field',
  industrial_region:    'Industrial region',
  industrial_cluster:   'Industrial cluster',
  industrial_area:      'Industrial area',
  major_industry:       'Major industry',
  special_economic_zone:'Special Economic Zone',
  handicraft_cluster:   'Handicraft cluster',
  energy_mix_zone:      'Energy mix zone',
  renewable_zone:       'Renewable-energy zone',
  transmission_corridor:'Transmission corridor',
  power_plant:          'Power plant',
  solar_park:           'Solar park',
  wind_farm:            'Wind farm',
  population_density_class:  'Population density',
  population_growth_class:   'Population growth',
  literacy_class:            'Literacy',
  sex_ratio_class:           'Sex ratio',
  urbanisation_class:        'Urbanisation',
  st_class:                  'Scheduled Tribes',
  sc_class:                  'Scheduled Castes',
  scheduled_area:            'Scheduled Area',
  administrative_division:   'Revenue division',
  regional_cultural_zone:    'Cultural region',
  border_district_zone:      'Border districts',
  municipal_corporation:     'Municipal corporation',
  smart_city:                'Smart City',
  urban_centre:              'Urban centre',
  population_corridor:       'Population corridor',
};

const CROSS_HIGHLIGHT_CLS = 'related-highlight';

/* -------------------------------------------------------------------------- */
/*  Public entry — install a subscriber that renders + cross-highlights.      */
/* -------------------------------------------------------------------------- */

export function installThematicEditorial() {
  Atlas.bus.on('atlas:ready', () => {
    const detailSlot = document.querySelector('.detail-slot');
    const right      = document.querySelector('.a-right');
    if (!detailSlot) return;

    let lastHighlight = [];

    Atlas.bus.on('selection:changed', ({ layerId, featureId, feature }) => {
      // Clear the prior highlight regardless.
      clearHighlight(lastHighlight);
      lastHighlight = [];

      if (!feature) return;
      const t = feature.properties?.type;
      if (!Object.prototype.hasOwnProperty.call(KIND_LABEL, t)) return;

      // Render the editorial card.
      detailSlot.innerHTML = '';
      detailSlot.append(renderCard(feature, layerId));
      right?.classList.add('open');

      // Cross-highlight the knowledge-graph cluster.
      const cluster = Atlas.knowledge?.cluster(feature) ?? [];
      lastHighlight = applyHighlight(cluster);
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  Editorial card                                                            */
/* -------------------------------------------------------------------------- */

function renderCard(feat, layerId) {
  const p = feat.properties ?? {};
  const kind = t(KIND_LABEL[p.type]);
  const wrap = el('div', { class: 'ed' });

  // Hero
  const hero = el('div', { class: 'ed-hero' });
  hero.append(el('div', { class: 'ed-kicker' }, [kind]));
  const title = el('h2', { class: 'ed-title' }); title.textContent = tf(p, 'name');
  hero.append(title);

  // Tags
  const tags = el('div', { class: 'ed-tags' });
  if (p.koppen)   tags.append(tagEl(p.koppen, 'ramsar'));
  if (p.zone_id?.length <= 3) tags.append(tagEl(`${t('Zone')} ${p.zone_id.toUpperCase()}`, 'wls'));
  const isPoint = p.geometryQuality === 'point';
  tags.append(tagEl(isPoint ? t('Point coordinate') : t('Generalised boundary'), 'point'));
  const quality = el('span', {
    class: `ed-quality ${isPoint ? 'q4' : 'q3'}`,
    title: isPoint ? 'Point coordinate — cited source per feature' : 'District-approximated boundary',
  });
  quality.innerHTML = isPoint
    ? `<span class="stars">★★★★<span class="empty">☆</span></span> <span class="lbl">${esc(t('Point'))}</span>`
    : `<span class="stars">★★★<span class="empty">☆☆</span></span> <span class="lbl">${esc(t('Generalised'))}</span>`;
  tags.append(quality);
  hero.append(tags);
  wrap.append(hero);

  // Overview
  const overview = composeOverview(p, kind);
  if (overview) {
    const s = el('div', { class: 'ed-section' });
    s.append(el('h3', { class: 'ed-h' }, [t('Overview')]));
    const para = el('p', { class: 'ed-overview' });
    para.innerHTML = overview;
    s.append(para);
    wrap.append(s);
  }

  // Distribution — small figures per zone type
  const figures = el('div', { class: 'ed-figures' });
  if (p.avg_mm != null)      figures.append(figEl(t('Avg rainfall'), p.avg_mm, 'mm'));
  if (p.range)               figures.append(figEl(t('Rainfall range'), `${p.range[0]}–${p.range[1]}`, 'mm'));
  if (p.mean_c != null)      figures.append(figEl(t('Mean'), p.mean_c, '°C'));
  if (p.summer_c)            figures.append(figEl(t('Summer'), `${p.summer_c[0]}–${p.summer_c[1]}`, '°C'));
  if (p.winter_c)            figures.append(figEl(t('Winter'), `${p.winter_c[0]}–${p.winter_c[1]}`, '°C'));
  if (p.districts_included?.length) figures.append(figEl(t('Districts'), p.districts_included.length));
  if (figures.children.length) wrap.append(section(t('Key figures'), figures));

  // Characteristics — [label, value] pairs; string/array values run through
  // tf() so a feature's `<field>_hi` (or joined `<field>_hi[]`) wins in Hindi.
  const arr = (field) => { const v = tf(p, field); return Array.isArray(v) ? v : (v == null ? v : [v]); };
  const dl = el('dl', { class: 'ed-row' });
  const rows = [
    ['Köppen',            p.koppen],
    ['Characteristics',   tf(p, 'characteristics')],
    ['Monsoon dependence',tf(p, 'monsoon_dependence')],
    ['Variability',       tf(p, 'variability')],
    ['Climate notes',     tf(p, 'climate_notes')],
    ['Texture',           tf(p, 'texture')],
    ['Fertility',         tf(p, 'fertility')],
    ['Nutrients',         tf(p, 'nutrients')],
    ['Crop suitability',  tf(p, 'crop_suit')],
    ['Erosion risk',      tf(p, 'erosion')],
    ['Canopy',            tf(p, 'canopy')],
    ['Threats',           p.threats ? arr('threats').join('; ') : null],
    ['Dominant species',  p.species ? arr('species').join(', ') : null],
    ['Champion & Seth',   tf(p, 'champion_id')],
    ['Major crops',       p.crops ? arr('crops').join(', ') : null],
    ['Irrigation',        tf(p, 'irrigation')],
    ['Constraints',       tf(p, 'constraints')],
    ['Causes',            tf(p, 'causes')],
    ['Wind erosion',      tf(p, 'wind')],
    ['Water erosion',     tf(p, 'water')],
    ['Salinity',          tf(p, 'salinity')],
    ['Frequency',         tf(p, 'frequency')],
    ['Historical events', tf(p, 'historical')],
    ['Corridor',          tf(p, 'corridor')],
    ['Sector',            tf(p, 'sector')],
    ['Anchor sector',     tf(p, 'anchor_sector')],
    ['Output',            tf(p, 'output')],
    ['Craft',             tf(p, 'craft')],
    ['GI status',         tf(p, 'gi_status')],
    ['Notified',          tf(p, 'notified')],
    ['Commissioned',      tf(p, 'commissioned')],
    ['Ranking',           tf(p, 'ranking')],
    ['Primary sectors',   p.primary_sectors ? arr('primary_sectors').join(', ') : null],
    ['Anchors',           p.anchors ? arr('anchors').join(', ') : null],
    ['Notable units',     p.notable_units ? arr('notable_units').join(', ') : null],
    ['Raw materials',     p.raw_materials ? arr('raw_materials').join(', ') : null],
    ['Fuel',              tf(p, 'fuel')],
    ['Installed capacity',p.capacity_mw != null ? `${p.capacity_mw} MW` : null],
    ['Operator',          tf(p, 'owner')],
    ['Developer',         tf(p, 'developer')],
    ['Dominant source',   tf(p, 'dominant')],
    ['Resource',          tf(p, 'resource')],
    ['Classification',    tf(p, 'classification')],
    ['Corridor type',     tf(p, 'corridor_type')],
    ['Purpose',           tf(p, 'purpose')],
    ['Headquarters',      tf(p, 'headquarters')],
    ['Historical seat',   tf(p, 'seat')],
    ['Cultural core',     tf(p, 'core')],
    ['Dialect',           tf(p, 'dialect')],
    ['Physical setting',  tf(p, 'physical')],
    ['Economy',           tf(p, 'economy')],
    ['Border with',       tf(p, 'border_with')],
    ['Border length',     p.border_km],
    ['Notification',      tf(p, 'notification')],
    ['Anchor project',    tf(p, 'anchor_project')],
    ['Urban role',        tf(p, 'urban_role')],
    ['Population rank',    p.rank != null ? `#${p.rank}` : null],
    ['Population',         p.population_lakh != null ? `${p.population_lakh} ${t('lakh')}` : null],
    ['Axis',              tf(p, 'axis')],
    ['Class range',       (p.class_min != null && p.class_max != null && p.unit)
                          ? `${p.class_min}–${p.class_max}${p.unit}` : null],
    ['Metric',            t(p.metric_key)],
    ['Signature',         p.signature ? arr('signature').join(' · ') : null],
    ['Notes',             tf(p, 'remark')],
  ];
  for (const [k, v] of rows) {
    if (v == null || v === '' || typeof v === 'object') continue;
    dl.append(el('dt', {}, [t(k)]));
    dl.append(el('dd', {}, [String(v)]));
  }
  if (dl.children.length) wrap.append(section(t('Characteristics'), dl));

  // Module 9 — Editorial sections for human-geography features.
  renderHumanGeographySections(wrap, p);

  // Districts included — map each name through t() so it localises even for
  // layers that don't carry a districts_included_hi array (all 41 in DICT).
  if (p.districts_included?.length) {
    const dincl = tf(p, 'districts_included').map((x) => t(x));
    const box = el('div', {});
    box.append(el('p', { class: 'ed-overview' }, [
      dincl.join(', ') +
      ` — ${dincl.length} ${dincl.length > 1 ? t('districts') : t('district')}`,
    ]));
    wrap.append(section(t('Distribution'), box));
  }

  // Per-district demographic values (choropleth zones)
  if (p.district_values && typeof p.district_values === 'object') {
    const dl2 = el('dl', { class: 'ed-row' });
    for (const [d, v] of Object.entries(p.district_values)) {
      dl2.append(el('dt', {}, [t(d)]));
      dl2.append(el('dd', {}, [`${v}${p.unit ?? ''}`]));
    }
    if (dl2.children.length) wrap.append(section(t('Demographic Characteristics'), dl2));
  }

  // Related features — knowledge graph
  const cluster = Atlas.knowledge?.cluster(feat) ?? [];
  if (cluster.length) wrap.append(section(t('Related features'), renderRelated(cluster)));

  // Locator
  const loc = renderLocator(feat);
  if (loc) wrap.append(section(t('Locator'), loc));

  // References
  const src = el('div', { class: 'ed-sources' });
  (p.source ? p.source.split(/[;+]/).map(s => s.trim()) : [])
    .filter(Boolean).forEach(s => src.append(el('span', { class: 'ed-source' }, [s])));
  if (p.lastUpdated) src.append(el('span', { class: 'ed-source' }, [`${t('Compiled')} ${p.lastUpdated}`]));
  if (src.children.length) wrap.append(section(t('References'), src));

  if (p.geometryNote)
    wrap.append(el('div', { class: 'ed-note' }, [tf(p, 'geometryNote')]));

  return wrap;
}

/* -------------------------------------------------------------------------- */

function composeOverview(p, kind) {
  const bits = [];
  const hi = getLang() === 'hi';
  const name = (tf(p, 'name') ?? '').replace(/\s*\(.*?\)/g, '');
  const dcount = p.districts_included?.length ?? 0;
  const cropsStr = p.crops ? esc((Array.isArray(tf(p, 'crops')) ? tf(p, 'crops') : [tf(p, 'crops')]).join(', ')) : '';

  // --- Climate sub-tier: bilingual (falls through to English below for the rest) ---
  if (hi) {
    switch (p.type) {
      case 'rainfall_zone':
        bits.push(`${esc(name)} राजस्थान के ${dcount} जिलों को समेटता है, जहाँ औसत वार्षिक वर्षा लगभग ${p.avg_mm} मिमी है।`);
        if (p.climate_notes) bits.push(esc(tf(p, 'climate_notes')));
        return bits.join(' ');
      case 'temperature_zone':
        bits.push(`${esc(name)} ${dcount} जिलों में फैला है; औसत वार्षिक तापमान ~${p.mean_c} °C।`);
        if (p.notes && typeof p.notes === 'string') bits.push(esc(tf(p, 'notes')));
        return bits.join(' ');
      case 'climate_region':
        bits.push(`${esc(name)} — कोपेन <em>${esc(p.koppen ?? '')}</em>। ${esc(tf(p, 'characteristics') ?? '')}`);
        return bits.join(' ');
      case 'agro_climatic_zone':
        bits.push(`राजस्थान कृषि विश्वविद्यालय के दस-क्षेत्र वर्गीकरण का आधिकारिक रूप से अधिसूचित क्षेत्र ${p.zone_id?.toUpperCase()}।`);
        if (p.crops) bits.push(`विशिष्ट फ़सलें: ${cropsStr}।`);
        return bits.join(' ');
      case 'soil_type':
        bits.push(`${esc(name)} राजस्थान के ${dcount} जिलों में फैली है।`);
        if (p.crop_suit) bits.push(`सर्वाधिक उपयुक्त: ${esc(tf(p, 'crop_suit'))}।`);
        return bits.join(' ');
      case 'vegetation_type': {
        bits.push(`${esc(name)} — ${esc(tf(p, 'champion_id') ?? '')}, ${dcount} जिलों में फैला।`);
        const sp = tf(p, 'species');
        if (sp) bits.push(`विशिष्ट प्रजातियाँ: <em>${esc((Array.isArray(sp) ? sp : [sp]).slice(0,3).join(', '))}</em>।`);
        return bits.join(' ');
      }
      case 'desertification_zone':
        bits.push(`${esc(name)} मरुस्थलीकरण ${dcount} जिलों को प्रभावित करता है।`);
        if (p.causes) bits.push(`मुख्य कारक: ${esc(tf(p, 'causes'))}।`);
        return bits.join(' ');
      case 'drought_zone':
        bits.push(`${esc(name)} सूखा-संवेदनशीलता — पुनरावृत्ति लगभग ${esc(tf(p, 'frequency') ?? '?')}।`);
        return bits.join(' ');
      case 'industrial_region': {
        bits.push(`${esc(name)} ${esc(tf(p, 'corridor') ?? '')} के साथ ${dcount} जिलों में फैला है।`);
        const ps = tf(p, 'primary_sectors');
        if (Array.isArray(ps)) bits.push(`विशिष्ट क्षेत्र: ${esc(ps.join(', '))}।`);
        return bits.join(' ');
      }
      case 'industrial_cluster':
        bits.push(`${esc(name)} — ${dcount} जिलों में ${esc(tf(p, 'sector') ?? 'क्षेत्रीय क्लस्टर')}।`);
        if (p.ranking) bits.push(esc(tf(p, 'ranking')));
        return bits.join(' ');
      case 'industrial_area':
        bits.push(`${esc(name)} — आधार क्षेत्र: <em>${esc(tf(p, 'anchor_sector') ?? '')}</em>। जिला: ${esc(tf(p, 'district') ?? '')}।`);
        if (p.commissioned) bits.push(`${esc(tf(p, 'commissioned'))} में चालू।`);
        return bits.join(' ');
      case 'major_industry':
        bits.push(`${esc(name)} — क्षेत्र: <em>${esc(tf(p, 'sector') ?? '')}</em>। ${esc(tf(p, 'district') ?? '')} में स्थित।`);
        if (p.output) bits.push(esc(tf(p, 'output')) + '।');
        return bits.join(' ');
      case 'special_economic_zone':
        bits.push(`${esc(name)} — ${esc(tf(p, 'notified') ?? '?')} में अधिसूचित। क्षेत्र: <em>${esc(tf(p, 'sector') ?? '')}</em>।`);
        return bits.join(' ');
      case 'handicraft_cluster':
        bits.push(`${esc(name)} — ${esc(tf(p, 'craft') ?? '')}। जिला: ${esc(tf(p, 'district') ?? '')}।`);
        if (p.gi_status) bits.push(esc(tf(p, 'gi_status')) + '।');
        return bits.join(' ');
      case 'energy_mix_zone':
        bits.push(`${esc(name)} — प्रमुख स्रोत: <em>${esc(tf(p, 'dominant') ?? '')}</em>। ${dcount} जिलों में फैला।`);
        if (p.headline) bits.push(esc(tf(p, 'headline')));
        return bits.join(' ');
      case 'renewable_zone':
        bits.push(`${esc(name)} — संसाधन: ${esc(tf(p, 'resource') ?? '')}। ${esc(tf(p, 'classification') ?? '')}।`);
        return bits.join(' ');
      case 'transmission_corridor':
        bits.push(`${esc(name)} — ${esc(tf(p, 'corridor_type') ?? '')}। ${esc(tf(p, 'purpose') ?? '')}।`);
        if (p.commissioned) bits.push(`${esc(tf(p, 'commissioned'))} में चालू।`);
        return bits.join(' ');
      case 'power_plant':
        bits.push(`${esc(name)} — ईंधन: <em>${esc(tf(p, 'fuel') ?? '')}</em>। स्थापित क्षमता ${esc(String(p.capacity_mw ?? '?'))} MW। संचालक ${esc(p.owner ?? '')}।`);
        if (p.output) bits.push(esc(tf(p, 'output')) + '।');
        return bits.join(' ');
      case 'solar_park':
        bits.push(`${esc(name)} — ${esc(String(p.capacity_mw ?? '?'))} MW स्थापित। विकासकर्ता: ${esc(p.developer ?? '')}।`);
        if (p.commissioned) bits.push(`${esc(tf(p, 'commissioned'))} में चालू।`);
        return bits.join(' ');
      case 'wind_farm':
        bits.push(`${esc(name)} — ${esc(String(p.capacity_mw ?? '?'))} MW। विकासकर्ता: ${esc(p.developer ?? '')}।`);
        if (p.commissioned) bits.push(`${esc(tf(p, 'commissioned'))} में चालू।`);
        return bits.join(' ');
      case 'population_density_class':
      case 'population_growth_class':
      case 'literacy_class':
      case 'sex_ratio_class':
      case 'urbanisation_class':
      case 'st_class':
      case 'sc_class':
        bits.push(`${esc(name)} — राजस्थान के ${dcount} जिले।`);
        if (p.class_min != null && p.class_max != null && p.unit) {
          bits.push(`श्रेणी-सीमा: ${p.class_min}–${p.class_max}${esc(p.unit)}।`);
        }
        return bits.join(' ');
      case 'scheduled_area':
        bits.push(`${esc(name)} — ${esc(tf(p, 'notification') ?? '')}। ${dcount} जिलों में फैला।`);
        return bits.join(' ');
    }
  }

  switch (p.type) {
    case 'rainfall_zone':
      bits.push(`${esc(name)} covers ${dcount} Rajasthan districts with an average annual rainfall around ${p.avg_mm} mm.`);
      if (p.climate_notes) bits.push(esc(p.climate_notes));
      break;
    case 'temperature_zone':
      bits.push(`${esc(name)} spans ${dcount} districts; mean annual temperature ~${p.mean_c} °C.`);
      if (p.notes) bits.push(esc(p.notes));
      break;
    case 'climate_region':
      bits.push(`${esc(name)} — Köppen <em>${esc(p.koppen ?? '')}</em>. ${esc(p.characteristics ?? '')}`);
      break;
    case 'agro_climatic_zone':
      bits.push(`Officially notified zone ${p.zone_id?.toUpperCase()} of Rajasthan Agricultural University's ten-zone classification.`);
      if (p.crops) bits.push(`Signature crops: ${esc(Array.isArray(p.crops) ? p.crops.join(', ') : p.crops)}.`);
      break;
    case 'soil_type':
      bits.push(`${esc(name)} covers ${p.districts_included?.length ?? 0} districts of Rajasthan.`);
      if (p.crop_suit) bits.push(`Best suited to: ${esc(p.crop_suit)}.`);
      break;
    case 'vegetation_type':
      bits.push(`${esc(name)} — ${esc(p.champion_id ?? '')}, spanning ${p.districts_included?.length ?? 0} districts.`);
      if (p.species) bits.push(`Signature species: <em>${esc((Array.isArray(p.species) ? p.species : [p.species]).slice(0,3).join(', '))}</em>.`);
      break;
    case 'desertification_zone':
      bits.push(`${esc(name)} desertification affects ${p.districts_included?.length ?? 0} districts.`);
      if (p.causes) bits.push(`Primary drivers: ${esc(p.causes)}.`);
      break;
    case 'drought_zone':
      bits.push(`${esc(name)} drought vulnerability — recurrence around ${esc(p.frequency ?? '?')}.`);
      if (p.notes) bits.push(esc(p.notes));
      break;
    case 'industrial_region':
      bits.push(`${esc(name)} spans ${p.districts_included?.length ?? 0} districts along the ${esc(p.corridor ?? '')}.`);
      if (Array.isArray(p.primary_sectors)) bits.push(`Signature sectors: ${esc(p.primary_sectors.join(', '))}.`);
      break;
    case 'industrial_cluster':
      bits.push(`${esc(name)} — ${esc(p.sector ?? 'sectoral cluster')} across ${p.districts_included?.length ?? 0} districts.`);
      if (p.ranking) bits.push(esc(p.ranking));
      break;
    case 'industrial_area':
      bits.push(`${esc(name)} — anchor sector: <em>${esc(p.anchor_sector ?? '')}</em>. District: ${esc(p.district ?? '')}.`);
      if (p.commissioned) bits.push(`Commissioned ${esc(p.commissioned)}.`);
      break;
    case 'major_industry':
      bits.push(`${esc(name)} — sector: <em>${esc(p.sector ?? '')}</em>. Located in ${esc(p.district ?? '')}.`);
      if (p.output) bits.push(esc(p.output) + '.');
      break;
    case 'special_economic_zone':
      bits.push(`${esc(name)} — notified ${esc(p.notified ?? '?')}. Sector: <em>${esc(p.sector ?? '')}</em>.`);
      break;
    case 'handicraft_cluster':
      bits.push(`${esc(name)} — ${esc(p.craft ?? '')}. District: ${esc(p.district ?? '')}.`);
      if (p.gi_status) bits.push(esc(p.gi_status) + '.');
      break;
    case 'energy_mix_zone':
      bits.push(`${esc(name)} — dominant source: <em>${esc(p.dominant ?? '')}</em>. Covers ${p.districts_included?.length ?? 0} districts.`);
      if (p.headline) bits.push(esc(p.headline));
      break;
    case 'renewable_zone':
      bits.push(`${esc(name)} — resource: ${esc(p.resource ?? '')}. ${esc(p.classification ?? '')}.`);
      break;
    case 'transmission_corridor':
      bits.push(`${esc(name)} — ${esc(p.corridor_type ?? '')}. ${esc(p.purpose ?? '')}.`);
      if (p.commissioned) bits.push(`Commissioned ${esc(p.commissioned)}.`);
      break;
    case 'power_plant':
      bits.push(`${esc(name)} — fuel: <em>${esc(p.fuel ?? '')}</em>. Installed capacity ${esc(String(p.capacity_mw ?? '?'))} MW. Operator ${esc(p.owner ?? '')}.`);
      if (p.output) bits.push(esc(p.output) + '.');
      break;
    case 'solar_park':
      bits.push(`${esc(name)} — ${esc(String(p.capacity_mw ?? '?'))} MW installed. Developer: ${esc(p.developer ?? '')}.`);
      if (p.commissioned) bits.push(`Commissioned ${esc(p.commissioned)}.`);
      break;
    case 'wind_farm':
      bits.push(`${esc(name)} — ${esc(String(p.capacity_mw ?? '?'))} MW. Developer: ${esc(p.developer ?? '')}.`);
      if (p.commissioned) bits.push(`Commissioned ${esc(p.commissioned)}.`);
      break;
    case 'population_density_class':
    case 'population_growth_class':
    case 'literacy_class':
    case 'sex_ratio_class':
    case 'urbanisation_class':
    case 'st_class':
    case 'sc_class':
      bits.push(`${esc(name)} — ${p.districts_included?.length ?? 0} districts of Rajasthan.`);
      if (p.class_min != null && p.class_max != null && p.unit) {
        bits.push(`Class range: ${p.class_min}–${p.class_max}${esc(p.unit)}.`);
      }
      break;
    case 'scheduled_area':
      bits.push(`${esc(name)} — ${esc(p.notification ?? '')}. Covers ${p.districts_included?.length ?? 0} districts.`);
      break;
    case 'administrative_division':
      bits.push(`${esc(name)} — HQ: ${esc(p.headquarters ?? '')}. ${p.districts_included?.length ?? 0} districts.`);
      break;
    case 'regional_cultural_zone':
      bits.push(`${esc(name)} — historical seat: ${esc(p.seat ?? '')}. Dialect: <em>${esc(p.dialect ?? '')}</em>.`);
      if (p.core) bits.push(esc(p.core) + '.');
      break;
    case 'border_district_zone':
      bits.push(`${esc(name)} — ${esc(p.border_with ?? '')}. ${esc(p.border_km ?? '')}.`);
      break;
    case 'municipal_corporation':
      bits.push(`${esc(name)} — district: ${esc(p.district ?? '')}. Population ~${esc(String(p.population_lakh ?? '?'))} lakh.`);
      break;
    case 'smart_city':
      bits.push(`${esc(name)} — notified ${esc(p.notified ?? '?')}. Anchor project: <em>${esc(p.anchor_project ?? '')}</em>.`);
      break;
    case 'urban_centre':
      bits.push(`${esc(name)} — rank #${esc(String(p.rank ?? '?'))} by 2011 population (~${esc(String(p.population_lakh ?? '?'))} lakh).`);
      if (p.urban_role) bits.push(esc(p.urban_role) + '.');
      break;
    case 'population_corridor':
      bits.push(`${esc(name)} — axis: <em>${esc(p.axis ?? '')}</em>. Combined population ~${esc(String(p.population_lakh ?? '?'))} lakh.`);
      break;
  }
  return bits.join(' ');
}

/* -------------------------------------------------------------------------- */

function renderRelated(cluster) {
  const wrap = el('div', { class: 'ed-related' });
  for (const r of cluster) {
    const p = r.feature.properties ?? {};
    const relName = tf(p, 'name');
    const btn = el('button', {
      class: `ed-related-chip chip-${r.layerId}`,
      title: `${relName} — ${r.type}`,
      onclick: () => Atlas.interaction.select(r.layerId, r.featureId),
    });
    btn.append(el('span', { class: 'ed-related-kind' }, [t(r.type).toUpperCase()]));
    btn.append(el('span', { class: 'ed-related-name' }, [relName]));
    wrap.append(btn);
  }
  return wrap;
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Human-geography editorial sections (Module 9)                             */
/* -------------------------------------------------------------------------- */

function renderHumanGeographySections(wrap, p) {
  // Administrative Context — for divisions, scheduled areas, border zones
  if (['administrative_division','scheduled_area','border_district_zone',
       'municipal_corporation','smart_city'].includes(p.type)) {
    const dl = el('dl', { class: 'ed-row' });
    const rows = {
      'Type':          KIND_LABEL[p.type] ? t(KIND_LABEL[p.type]) : p.type?.replace(/_/g,' '),
      'Authority':     tf(p.governance ?? {}, 'authority'),
      'Status':        p.governance?.status ? t(tf(p.governance, 'status')) : null,
      'Headquarters':  tf(p, 'headquarters'),
      'Notification':  tf(p, 'notification'),
      'Border with':   tf(p, 'border_with'),
      'Border length': p.border_km,
    };
    for (const [k, v] of Object.entries(rows)) {
      if (!v || typeof v === 'object') continue;
      dl.append(el('dt', {}, [t(k)]));
      dl.append(el('dd', {}, [String(v)]));
    }
    if (dl.children.length) wrap.append(section(t('Administrative Context'), dl));
  }

  // Regional Identity — for cultural regions
  if (p.type === 'regional_cultural_zone') {
    const dl = el('dl', { class: 'ed-row' });
    const sig = tf(p, 'signature');
    const rows = {
      'Historical seat':  tf(p, 'seat'),
      'Cultural core':    tf(p, 'core'),
      'Dialect':          tf(p, 'dialect'),
      'Signature':        Array.isArray(sig) ? sig.join(' · ') : sig,
    };
    for (const [k, v] of Object.entries(rows)) {
      if (!v) continue;
      dl.append(el('dt', {}, [t(k)]));
      dl.append(el('dd', {}, [String(v)]));
    }
    if (dl.children.length) wrap.append(section(t('Regional Identity'), dl));
  }

  // Physical Setting — for cultural regions + border zones
  if (p.physical) {
    wrap.append(section(t('Physical Setting'),
      el('p', { class: 'ed-overview' }, [tf(p, 'physical')])));
  }

  // Economic Connections — for cultural regions + urban centres + corridors
  if (p.economy || p.urban_role || p.axis) {
    const box = el('div', {});
    if (p.economy)    box.append(el('p', { class: 'ed-overview' }, [`${t('Economy')} — ${tf(p, 'economy')}.`]));
    if (p.urban_role) box.append(el('p', { class: 'ed-overview' }, [`${t('Role')} — ${tf(p, 'urban_role')}.`]));
    if (p.axis)       box.append(el('p', { class: 'ed-overview' }, [`${t('Development axis')} — ${tf(p, 'axis')}.`]));
    if (p.population_lakh != null) box.append(el('p', { class: 'ed-overview' }, [
      `${t('Population')} — ~${p.population_lakh} ${t('lakh')}.`]));
    wrap.append(section(t('Economic Connections'), box));
  }

  // Development Profile — for smart cities + urban centres + corridors
  if (['smart_city','urban_centre','population_corridor'].includes(p.type)) {
    const dl = el('dl', { class: 'ed-row' });
    const rows = {
      'Rank':             p.rank ? `#${p.rank}` : null,
      'Population':       p.population_lakh != null ? `${p.population_lakh} ${t('lakh')}` : null,
      'Notified':         p.notified,
      'Anchor project':   tf(p, 'anchor_project'),
      'Development axis': tf(p, 'axis'),
    };
    for (const [k, v] of Object.entries(rows)) {
      if (!v) continue;
      dl.append(el('dt', {}, [t(k)]));
      dl.append(el('dd', {}, [String(v)]));
    }
    if (dl.children.length) wrap.append(section(t('Development Profile'), dl));
  }
}

/* -------------------------------------------------------------------------- */

function tagEl(text, kind) {
  const t = el('span', { class: `ed-tag tag-${kind}` });
  t.textContent = text;
  return t;
}
function figEl(label, val, unit) {
  const c = el('div', { class: 'ed-fig' });
  const n = el('div', { class: 'n' });
  n.textContent = String(val);
  if (unit) { const u = el('span', { class: 'unit' }); u.textContent = unit; n.append(u); }
  c.append(n);
  c.append(el('div', { class: 'k' }, [label]));
  return c;
}
function section(title, body) {
  const s = el('div', { class: 'ed-section' });
  s.append(el('h3', { class: 'ed-h' }, [title]));
  s.append(body);
  return s;
}

/* -------------------------------------------------------------------------- */
/*  Cross-highlighting on the map                                             */
/* -------------------------------------------------------------------------- */

function applyHighlight(cluster) {
  const applied = [];
  for (const r of cluster) {
    Atlas.renderer.updateFeatureStyle(r.layerId, r.featureId,
      { addClass: CROSS_HIGHLIGHT_CLS });
    applied.push({ layerId: r.layerId, featureId: r.featureId });
  }
  return applied;
}
function clearHighlight(list) {
  for (const r of list) {
    Atlas.renderer.updateFeatureStyle(r.layerId, r.featureId,
      { removeClass: CROSS_HIGHLIGHT_CLS });
  }
}

/* -------------------------------------------------------------------------- */
/*  Locator mini-map                                                          */
/* -------------------------------------------------------------------------- */

function renderLocator(feat) {
  const districts = Atlas.layers.features('districts');
  if (!districts?.length) return null;
  const proj = Atlas.projection;
  const vb = proj.viewBox();
  const scale = 320 / vb[2];

  const wrap = el('div', { class: 'ed-locator' });
  const svg = svgEl('svg', {
    viewBox: `0 0 ${vb[2] * scale} ${vb[3] * scale}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  for (const d of districts) {
    const g = d.geometry;
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates;
    let dPath = '';
    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]).map(v => v * scale));
      if (!pts.length) continue;
      dPath += `M${pts[0][0]},${pts[0][1]}` +
               pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + 'Z';
    }
    svg.append(svgEl('path', { class: 'state', d: dPath }));
  }
  const g = feat.geometry;
  if (g?.type === 'MultiPolygon' || g?.type === 'Polygon') {
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates;
    let d = '';
    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]).map(v => v * scale));
      if (!pts.length) continue;
      d += `M${pts[0][0]},${pts[0][1]}` +
           pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + 'Z';
    }
    svg.append(svgEl('path', { class: 'feat', d }));
  }
  wrap.append(svg);
  return wrap;
}
