/**
 * StudyHome — landing page for the Rajasthan Atlas study companion.
 *
 * Fetches district-demographics.json (for auto-computed records) and
 * atlas.json (for feature counts). Renders three sections:
 *
 *   1. Study by topic — 13 icon-led cards, each linking into the map
 *      with the appropriate preset activated.
 *   2. Records & extremes — auto-computed from Census 2011 + operator
 *      disclosures. Clickable → deep-links into the map.
 *   3. Concept chains — curated cause-and-effect walkthroughs.
 *
 * Zero atlas-engine dependency — this page loads in ~200 ms even on
 * mobile because it doesn't pull the 60+ GeoJSONs the map does.
 */

// ── Topic taxonomy — the 13 curated study modules ─────────────────
const TOPICS = [
  { id: 'physical', icon: '🏔', name: 'Physical Geography',
    blurb: 'Aravalli · Thar · rivers · lakes · peaks · basins',
    preset: 'physical', layerCount: 7 },
  { id: 'environment', icon: '🌿', name: 'Environment & Protected Areas',
    blurb: 'NPs · Tiger Reserves · WLS · Ramsar · Wetlands',
    preset: 'env', layerCount: 6 },
  { id: 'climate', icon: '☀️', name: 'Climate & Weather',
    blurb: 'Rainfall · Temperature · Köppen · Agro-climatic',
    preset: 'climate', layerCount: 4 },
  { id: 'soils-vegetation', icon: '🌾', name: 'Soils & Vegetation',
    blurb: 'Aridisols · Vertisols · Champion & Seth · Desertification · Drought',
    preset: 'soils', layerCount: 4 },
  { id: 'agriculture', icon: '🌱', name: 'Agriculture',
    blurb: 'Major crops · Cropping seasons · Agro-economic zones',
    preset: 'crops', layerCount: 3 },
  { id: 'water', icon: '💧', name: 'Water Resources',
    blurb: 'IGNP · Gang Canal · Chambal cascade · Dams · Groundwater',
    preset: 'water', layerCount: 5 },
  { id: 'geology', icon: '⛏', name: 'Geology & Minerals',
    blurb: 'Aravalli SG · Vindhyan · Malani · Lead-Zinc · Marble · Petroleum',
    preset: 'geology', layerCount: 7 },
  { id: 'industry', icon: '🏭', name: 'Industry & SEZs',
    blurb: 'DMIC · Cement · Textile · Marble · Auto · Handicrafts',
    preset: 'industry', layerCount: 6 },
  { id: 'energy', icon: '⚡', name: 'Energy & Power',
    blurb: 'RAPS · Bhadla solar · Jaisalmer wind · Chambal hydel',
    preset: 'energy', layerCount: 6 },
  { id: 'demographics', icon: '👥', name: 'Demographics',
    blurb: 'Density · Literacy · Sex ratio · Urbanisation · ST / SC %',
    preset: 'population-density', layerCount: 7 },
  { id: 'administrative', icon: '🏛', name: 'Administrative',
    blurb: '7 divisions · Scheduled Areas · Border districts',
    preset: 'divisions', layerCount: 4 },
  { id: 'cultural', icon: '🎭', name: 'Cultural Regions',
    blurb: 'Marwar · Mewar · Hadoti · Shekhawati · Dhundhar · Vagad · Matsya · Godwar · Mewat',
    preset: 'regions', layerCount: 2 },
  { id: 'urban', icon: '🏙', name: 'Urban',
    blurb: 'Urban centres · Municipal corps · Smart Cities · Population corridors',
    preset: 'urban', layerCount: 4 },
  { id: 'history-heritage', icon: '🏰', name: 'History & Heritage',
    blurb: 'Forts · Dynasties · Ancient civilizations · Battle sites · Prashastis · Integration · 1857 revolt',
    layers: 'heritage-forts,rajput-dynasties,ancient-civilizations,battle-sites,major-prashastis,rajasthan-integration,revolt-sites-1857',
    layerCount: 7 },
  { id: 'culture-faith', icon: '🛕', name: 'Culture & Faith',
    blurb: 'Palaces · Havelis · Major fairs · Folk deities · Folk goddesses',
    layers: 'palaces,havelis,major-fairs,folk-deity-shrines,folk-goddesses',
    layerCount: 5 },
  { id: 'research-institutions', icon: '🔬', name: 'Research & Institutions',
    blurb: 'CAZRI · AFRI · CSWRI · IIT · IIM · NLU · KVK · Camel research · SEVAR',
    layers: 'research-centers',
    layerCount: 1 },
  { id: 'arts-crafts', icon: '🎨', name: 'Arts & Crafts',
    blurb: 'Mewar · Kishangarh · Bundi-Kota painting · Thewa · Kundan-Meena · Kavad · Bandhej · Blue Pottery',
    layers: 'painting-schools,handicraft-clusters',
    layerCount: 2 },
];

// ── Curated concept chains ────────────────────────────────────────
const CHAINS = [
  { title: 'Arid → Bajra → Rain-fed → Low density',
    stops: [
      { label: 'Arid climate',      layer: 'climate-regions',        id: 'climate-regions-arid' },
      { label: 'Bajra',             layer: 'major-crops',            id: 'major-crops-bajra' },
      { label: 'Rain-fed',          layer: 'irrigation-sources',     id: 'irrigation-sources-irr-rainfed' },
      { label: 'Very low density',  layer: 'population-density',     id: 'population-density-very-low' },
    ]},
  { title: 'Aravalli → Metamorphic → Lead-Zinc → HZL',
    stops: [
      { label: 'Aravalli SG',       layer: 'geological-provinces',   id: 'geological-provinces-aravalli-sg' },
      { label: 'Metamorphic',       layer: 'rock-types',             id: 'rock-types-metamorphic' },
      { label: 'Lead-Zinc belt',    layer: 'mineral-belts',          id: 'mineral-belts-lead-zinc' },
      { label: 'Rampura Agucha',    layer: 'major-mines',            id: 'mine-rampura-agucha' },
    ]},
  { title: 'Chambal → Kota → Cement + Chemicals',
    stops: [
      { label: 'Chambal River',     layer: 'rivers',                 id: 'chambal-river' },
      { label: 'Kota Barrage',      layer: 'dams',                   id: 'dam-kota-barrage' },
      { label: 'Chambal Fertilisers',layer: 'major-industries',      id: 'major-industries-chambal-gadepan' },
      { label: 'Chemical cluster',  layer: 'industrial-clusters',    id: 'industrial-clusters-ic-chemical-refinery' },
    ]},
  { title: 'Vagad → Bhil → Mahi Bajaj Sagar → Scheduled Area',
    stops: [
      { label: 'Vagad region',      layer: 'regional-zones',         id: 'regional-zones-vagad' },
      { label: 'Mahi River',        layer: 'rivers',                 id: 'mahi-river' },
      { label: 'Mahi Bajaj Sagar',  layer: 'dams',                   id: 'dam-mahi-bajaj-sagar' },
      { label: 'TSP Scheduled Area',layer: 'scheduled-areas',        id: 'scheduled-areas-tsp-vagad' },
    ]},
  { title: 'Bhadla → Solar Zone A → Green Energy Corridor',
    stops: [
      { label: 'Bhadla Solar Park', layer: 'solar-parks',            id: 'solar-parks-bhadla-solar-park' },
      { label: 'Solar Zone A',      layer: 'renewable-zones',        id: 'renewable-zones-rez-solar-a' },
      { label: 'Green Energy Corr.',layer: 'transmission-corridors', id: 'transmission-corridors-tc-green-energy-corridor' },
      { label: 'Solar West Zone',   layer: 'energy-mix',             id: 'energy-mix-em-solar-west' },
    ]},
  { title: 'Barmer → Border → Oil → Solar → Refinery',
    stops: [
      { label: 'Barmer district',   layer: 'districts',              id: 'barmer' },
      { label: 'Pakistan border',   layer: 'border-districts',       id: 'border-districts-international-pakistan' },
      { label: 'Barmer Basin',      layer: 'petroleum-gas',          id: 'petroleum-gas-barmer-basin' },
      { label: 'HRRL Refinery',     layer: 'major-industries',       id: 'major-industries-hrrl-pachpadra' },
    ]},
  { title: 'IGNP → Sri Ganganagar → Cotton + Wheat',
    stops: [
      { label: 'Indira Gandhi Canal',layer: 'major-canals',          id: 'canal-ignp' },
      { label: 'IGNP Command',       layer: 'command-areas',         id: 'command-areas-cmd-ignp' },
      { label: 'Cotton',             layer: 'major-crops',           id: 'major-crops-cotton' },
      { label: 'Wheat',              layer: 'major-crops',           id: 'major-crops-wheat' },
    ]},
  { title: 'Aravalli → Marble → Kishangarh → Handicrafts',
    stops: [
      { label: 'Aravalli SG',       layer: 'geological-provinces',   id: 'geological-provinces-aravalli-sg' },
      { label: 'Marble belt',       layer: 'mineral-belts',          id: 'mineral-belts-marble' },
      { label: 'Ajmer-Kishangarh',  layer: 'industrial-regions',     id: 'industrial-regions-ir-ajmer-kishangarh' },
      { label: 'Makrana craft',     layer: 'handicraft-clusters',    id: 'handicraft-clusters-makrana-marble-craft' },
    ]},
  { title: 'Mewar → Udaipur → Lakes → Tourism',
    stops: [
      { label: 'Mewar Region',      layer: 'regional-zones',         id: 'regional-zones-mewar' },
      { label: 'Udaipur',           layer: 'urban-centres',          id: 'urban-centres-uc-udaipur' },
      { label: 'Pichola Lake',      layer: 'lakes',                  id: 'pichola-lake' },
      { label: 'Fateh Sagar Lake',  layer: 'lakes',                  id: 'fateh-sagar-lake' },
    ]},
  { title: 'DMIC → Neemrana → Nissan → Auto cluster',
    stops: [
      { label: 'DMIC KBN Region',   layer: 'industrial-regions',     id: 'industrial-regions-ir-dmic-kbn' },
      { label: 'Neemrana Industrial',layer: 'industrial-areas',      id: 'industrial-areas-neemrana' },
      { label: 'Nissan Plant',      layer: 'major-industries',       id: 'major-industries-nissan-neemrana' },
      { label: 'Auto cluster',      layer: 'industrial-clusters',    id: 'industrial-clusters-ic-auto-engineering' },
    ]},
];

// ── State symbols (declared by the Rajasthan government) ──────────
const STATE_SYMBOLS = [
  { icon: '🦆', label: 'State bird',           name: 'Godawan',    sub: 'Great Indian Bustard',       year: 1981,
    foot: 'Critically endangered — largest population in Desert National Park, Jaisalmer.' },
  { icon: '🦌', label: 'State animal (wild)',   name: 'Chinkara',   sub: 'Indian gazelle',              year: 1981,
    foot: 'Best sighted at Ranthambhore, Sariska and Desert National Park.' },
  { icon: '🐪', label: 'State animal (domestic)', name: 'Camel',    sub: 'Camelus dromedarius',          year: 2014,
    foot: 'Rajasthan holds ~85% of India\'s camel population; Bikaner, Jaisalmer, Barmer heartland.' },
  { icon: '🌳', label: 'State tree',            name: 'Khejri',     sub: 'Prosopis cineraria',          year: 1983,
    foot: 'Sacred to the Bishnoi; the 1730 Khejarli sacrifice defended it before the Chipko movement.' },
  { icon: '🌼', label: 'State flower',          name: 'Rohira',     sub: 'Tecomella undulata',           year: 1983,
    foot: 'The "desert teak" of Marwar — golden-yellow flowers, drought-hardy Aravalli-Thar tree.' },
  { icon: '💃', label: 'State dance',           name: 'Ghoomar',    sub: 'Bhil-origin whirl dance',      year: null,
    foot: 'Adopted from the Bhils by Rajput women; hallmark of Mewar-Marwar weddings and Teej.' },
  { icon: '🎵', label: 'State song',            name: 'Kesariya Balam', sub: 'Padharo Maare Des',        year: null,
    foot: 'A Mand-genre folk song, most famously sung by Allah Jilai Bai of Bikaner.' },
  { icon: '🏀', label: 'State game',            name: 'Basketball', sub: 'Declared before India\'s national', year: 1948,
    foot: 'Rajasthan is one of the few Indian states whose official game is not a native folk sport.' },
];

// ── Boot ──────────────────────────────────────────────────────────
(async function boot() {
  try {
    const [demo, districts, confusions] = await Promise.all([
      fetch('atlas/data/district-demographics.json').then(r => r.json()),
      fetch('atlas/data/districts.geojson').then(r => r.json()),
      fetch('atlas/data/confusions.json').then(r => r.json()).catch(() => null),
    ]);
    renderTopics();
    renderDistricts(districts, demo);
    renderRecords(demo);
    renderSymbols();
    if (confusions) renderConfusions(confusions);
    renderChains();
    setupRouter();
  } catch (err) {
    console.error('[StudyHome] boot failed:', err);
  }
})();

// ── Hash router for Option A landing ──────────────────────────────
// URL hash → which sub-view (topics / districts / etc.) is visible.
// Empty / '#' hash = home (role cards + secondary nav).
const KNOWN_VIEWS = new Set(['topics', 'districts', 'records', 'symbols', 'confusions', 'chains']);

function currentView() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '').trim();
  return KNOWN_VIEWS.has(raw) ? raw : 'home';
}

function applyView() {
  const v = currentView();
  document.body.classList.remove('view-home', 'view-sub');
  document.body.classList.add(v === 'home' ? 'view-home' : 'view-sub');
  for (const el of document.querySelectorAll('.study-view')) {
    el.classList.toggle('is-active', el.dataset.view === v);
  }
  // Reset scroll on navigation so the sub-view starts at the top.
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Update page title so the browser tab reflects the current view.
  const titleMap = {
    home:       'Rajasthan Atlas — Study Companion',
    topics:     'Study by topic — Rajasthan Atlas',
    districts:  'Districts — Rajasthan Atlas',
    records:    'Records & extremes — Rajasthan Atlas',
    symbols:    'State symbols — Rajasthan Atlas',
    confusions: 'Commonly confused — Rajasthan Atlas',
    chains:     'Concept chains — Rajasthan Atlas',
  };
  document.title = titleMap[v] || titleMap.home;
}

function setupRouter() {
  window.addEventListener('hashchange', applyView);
  applyView(); // initial
}

// ── Commonly confused pairs ───────────────────────────────────────
const CONFUSION_CATEGORIES = [
  { id: 'all',            label: 'All' },
  { id: 'physical',       label: 'Physical' },
  { id: 'environment',    label: 'Environment' },
  { id: 'history',        label: 'History' },
  { id: 'culture',        label: 'Culture' },
  { id: 'administrative', label: 'Administrative' },
];

function renderConfusions(payload) {
  const grid = document.getElementById('confusion-grid');
  const filters = document.getElementById('confusion-filters');
  if (!grid || !payload?.confusions) return;
  const items = payload.confusions;

  for (const cat of CONFUSION_CATEGORIES) {
    const count = cat.id === 'all' ? items.length : items.filter(c => c.category === cat.id).length;
    if (!count) continue;
    const btn = document.createElement('button');
    btn.className = 'confusion-filter' + (cat.id === 'all' ? ' is-active' : '');
    btn.dataset.category = cat.id;
    btn.innerHTML = `${cat.label} <span class="confusion-filter-count">${count}</span>`;
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.confusion-filter').forEach(b => b.classList.toggle('is-active', b === btn));
      grid.querySelectorAll('.confusion-card').forEach(card => {
        card.style.display = (cat.id === 'all' || card.dataset.category === cat.id) ? '' : 'none';
      });
    });
    filters.append(btn);
  }

  for (const c of items) {
    const card = document.createElement('div');
    card.className = 'confusion-card';
    card.dataset.category = c.category;
    const leftLink  = c.left.featureId  ? `map.html?feature=${encodeURIComponent(c.left.featureId)}`  : null;
    const rightLink = c.right.featureId ? `map.html?feature=${encodeURIComponent(c.right.featureId)}` : null;
    const leftName  = leftLink  ? `<a href="${leftLink}">${c.left.name}</a>`   : c.left.name;
    const rightName = rightLink ? `<a href="${rightLink}">${c.right.name}</a>` : c.right.name;
    card.innerHTML = `
      <div class="confusion-head">
        <span class="confusion-cat">${c.category}</span>
      </div>
      <div class="confusion-body">
        <div class="confusion-side">
          <div class="confusion-name">${leftName}</div>
          <p class="confusion-dist">${c.left.distinguisher}</p>
        </div>
        <div class="confusion-vs">vs</div>
        <div class="confusion-side">
          <div class="confusion-name">${rightName}</div>
          <p class="confusion-dist">${c.right.distinguisher}</p>
        </div>
      </div>
      <div class="confusion-key"><strong>Rule:</strong> ${c.key}</div>
    `;
    grid.append(card);
  }
}

function renderSymbols() {
  const grid = document.getElementById('symbol-grid');
  if (!grid) return;
  for (const s of STATE_SYMBOLS) {
    const card = document.createElement('div');
    card.className = 'symbol-card';
    card.innerHTML = `
      <span class="symbol-icon">${s.icon}</span>
      <div class="symbol-body">
        <div class="symbol-label">${s.label}${s.year ? ` <span class="symbol-year">${s.year}</span>` : ''}</div>
        <div class="symbol-name">${s.name}</div>
        <div class="symbol-sub">${s.sub}</div>
        <div class="symbol-foot">${s.foot}</div>
      </div>
    `;
    grid.append(card);
  }
}

// ── Districts directory (grouped by division) ────────────────────
const DIVISIONS = ['Jaipur','Jodhpur','Ajmer','Bikaner','Bharatpur','Kota','Udaipur'];

function renderDistricts(districtsGeoJson, demoPayload) {
  const container = document.getElementById('district-directory');
  if (!container) return;
  const demo = demoPayload?.districts ?? {};

  // Group districts by division from the GeoJSON properties.
  const byDivision = {};
  for (const f of districtsGeoJson.features) {
    const p = f.properties || {};
    const div = p.division || 'Other';
    if (!byDivision[div]) byDivision[div] = [];
    byDivision[div].push({
      id: f.id,
      name: p.name,
      hq: p.headquarters,
      isNew: !!p.newDistrict,
      metric: demo[p.name] || null,
    });
  }

  // Render each division as a titled cluster of chips.
  for (const div of DIVISIONS) {
    const rows = byDivision[div];
    if (!rows?.length) continue;
    rows.sort((a, b) => a.name.localeCompare(b.name));

    const group = document.createElement('div');
    group.className = 'division-group';

    const head = document.createElement('div');
    head.className = 'division-head';
    head.innerHTML = `<span class="division-name">${div} Division</span> <span class="division-count">${rows.length} districts</span>`;
    group.append(head);

    const grid = document.createElement('div');
    grid.className = 'district-grid';
    for (const d of rows) {
      const chip = document.createElement('a');
      chip.className = 'district-chip' + (d.isNew ? ' district-new' : '');
      chip.href = `map.html?feature=${encodeURIComponent(d.id)}`;
      chip.innerHTML = `
        <span class="district-name">${d.name}${d.isNew ? ' <span class="district-new-tag">2023</span>' : ''}</span>
        ${d.metric ? `<span class="district-meta">${humanNum(d.metric.population)} · ${d.metric.density}/km² · ${d.metric.literacy_pct}% lit.</span>` : ''}
      `;
      grid.append(chip);
    }
    group.append(grid);
    container.append(group);
  }
}

function humanNum(n) {
  if (n == null) return '—';
  if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
  return n.toLocaleString();
}

// ── Topics ────────────────────────────────────────────────────────
function renderTopics() {
  const grid = document.getElementById('topic-grid');
  for (const t of TOPICS) {
    const card = document.createElement('a');
    card.className = 'topic-card';
    // Support both preset-mode tiles and layer-list tiles (the new
    // history/culture/research topics don't map to a preset mode).
    card.href = t.preset
      ? `map.html?preset=${encodeURIComponent(t.preset)}`
      : `map.html?layers=${encodeURIComponent(t.layers)}`;
    card.innerHTML = `
      <span class="topic-icon">${t.icon}</span>
      <div class="topic-body">
        <h3 class="topic-title">${t.name}</h3>
        <p class="topic-blurb">${t.blurb}</p>
        <div class="topic-meta">${t.layerCount} map layer${t.layerCount > 1 ? 's' : ''}</div>
      </div>
      <span class="topic-arrow">→</span>
    `;
    grid.append(card);
  }
}

// ── Records & extremes ────────────────────────────────────────────
function renderRecords(demoPayload) {
  const grid = document.getElementById('record-grid');
  const districts = demoPayload?.districts ?? {};

  const rank = (key, mode = 'max') => {
    const entries = Object.entries(districts);
    entries.sort((a, b) => (a[1][key] ?? 0) - (b[1][key] ?? 0));
    return mode === 'max' ? entries.at(-1) : entries[0];
  };

  const cards = [];

  // Demographic extremes (from Census 2011)
  {
    const [d, m] = rank('literacy_pct', 'max');
    cards.push({ label: 'Highest literacy', big: d, sub: `${m.literacy_pct} %`, foot: 'Coaching-education economy', href: `map.html?preset=literacy&feature=literacy-very-high` });
  }
  {
    const [d, m] = rank('literacy_pct', 'min');
    cards.push({ label: 'Lowest literacy', big: d, sub: `${m.literacy_pct} %`, foot: 'Rural Marwar / Vagad belt', href: `map.html?preset=literacy&feature=literacy-very-low` });
  }
  {
    const [d, m] = rank('density', 'max');
    cards.push({ label: 'Highest density', big: d, sub: `${m.density}/km²`, foot: 'Only district with >500/km²', href: `map.html?preset=population-density&feature=population-density-very-high` });
  }
  {
    const [d, m] = rank('density', 'min');
    cards.push({ label: 'Lowest density', big: d, sub: `${m.density}/km²`, foot: 'Deep Thar', href: `map.html?preset=population-density&feature=population-density-very-low` });
  }
  {
    const [d, m] = rank('st_pct', 'max');
    cards.push({ label: 'Highest ST %', big: d, sub: `${m.st_pct} %`, foot: 'Vagad Fifth-Schedule area', href: `map.html?preset=st-sc&feature=scheduled-tribes-very-high` });
  }
  {
    const [d, m] = rank('sc_pct', 'max');
    cards.push({ label: 'Highest SC %', big: d, sub: `${m.sc_pct} %`, foot: 'Canal-command labour communities', href: `map.html?preset=st-sc&feature=scheduled-castes-very-high` });
  }
  {
    const [d, m] = rank('urban_pct', 'max');
    cards.push({ label: 'Most urbanised', big: d, sub: `${m.urban_pct} %`, foot: 'Coaching + chemicals city', href: `map.html?preset=urbanisation&feature=urbanisation-very-high` });
  }
  {
    const [d, m] = rank('urban_pct', 'min');
    cards.push({ label: 'Least urbanised', big: d, sub: `${m.urban_pct} %`, foot: 'Tribal-belt district', href: `map.html?preset=urbanisation&feature=urbanisation-very-low` });
  }
  {
    const [d, m] = rank('sex_ratio', 'max');
    cards.push({ label: 'Highest sex ratio', big: d, sub: `${m.sex_ratio} F/1000M`, foot: 'Southern Aravalli tribal belt', href: `map.html?preset=sex-ratio&feature=sex-ratio-very-high` });
  }
  {
    const [d, m] = rank('sex_ratio', 'min');
    cards.push({ label: 'Lowest sex ratio', big: d, sub: `${m.sex_ratio} F/1000M`, foot: 'Bharatpur–Karauli belt', href: `map.html?preset=sex-ratio&feature=sex-ratio-very-low` });
  }

  // Non-demographic records (hardcoded — from live data audit)
  const facts = [
    { label: 'Highest peak',           big: 'Guru Shikhar',           sub: '1,722 m', foot: 'Aravalli, Sirohi',   href: 'map.html?feature=peak-guru-shikhar' },
    { label: 'Longest river in state', big: 'Chambal',                sub: '1,024 km', foot: 'Chambal basin',      href: 'map.html?feature=chambal-river' },
    { label: 'Largest single-site solar park', big: 'Bhadla Solar Park', sub: '2,245 MW', foot: 'Jodhpur',      href: 'map.html?feature=solar-parks-bhadla-solar-park' },
    { label: 'Largest thermal (state-owned)',  big: 'Suratgarh STPS',    sub: '2,820 MW', foot: 'Sri Ganganagar', href: 'map.html?feature=power-plants-suratgarh-stps' },
    { label: 'Oldest nuclear complex',         big: 'RAPS Rawatbhata',   sub: '1,180 MW', foot: 'Chittorgarh',    href: 'map.html?feature=power-plants-raps-rawatbhata' },
    { label: 'Largest inland salt lake',       big: 'Sambhar Lake',      sub: '≈9 % of India\'s salt', foot: 'Nagaur / Jaipur', href: 'map.html?feature=sambhar-ramsar' },
    { label: 'Longest international border',   big: 'Pakistan',          sub: '~1070 km', foot: 'across 4 districts', href: 'map.html?feature=border-districts-international-pakistan' },
  ];
  cards.push(...facts);

  for (const c of cards) {
    const link = document.createElement('a');
    link.className = 'record-card';
    link.href = c.href;
    link.innerHTML = `
      <div class="record-label">${c.label}</div>
      <div class="record-big">${c.big}</div>
      <div class="record-sub">${c.sub}</div>
      ${c.foot ? `<div class="record-foot">${c.foot}</div>` : ''}
    `;
    grid.append(link);
  }
}

// ── Concept chains ────────────────────────────────────────────────
function renderChains() {
  const list = document.getElementById('chain-list');
  for (const chain of CHAINS) {
    const wrap = document.createElement('div');
    wrap.className = 'chain-wrap';

    const title = document.createElement('h3');
    title.className = 'chain-title';
    title.textContent = chain.title;
    wrap.append(title);

    const strip = document.createElement('div');
    strip.className = 'chain-strip';
    chain.stops.forEach((stop, i) => {
      if (i > 0) {
        const arr = document.createElement('span');
        arr.className = 'chain-arrow';
        arr.textContent = '→';
        strip.append(arr);
      }
      const pill = document.createElement('a');
      pill.className = 'chain-pill';
      pill.href = `map.html?feature=${encodeURIComponent(stop.id)}`;
      pill.textContent = stop.label;
      strip.append(pill);
    });
    wrap.append(strip);
    list.append(wrap);
  }
}
