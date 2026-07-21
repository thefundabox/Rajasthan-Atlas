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

import { t, getLang, setLang } from '../core/i18n.js';

/** getLang()==='hi' ? hi : en — for this page's inline bilingual data. */
const pick = (en, hi) => (getLang() === 'hi' && hi != null) ? hi : en;

// ── Topic taxonomy — the 17 curated study modules ─────────────────
const TOPICS = [
  { id: 'physical', icon: '🏔', name: 'Physical Geography', name_hi: 'भौतिक भूगोल',
    blurb: 'Aravalli · Thar · rivers · lakes · peaks · basins',
    blurb_hi: 'अरावली · थार · नदियाँ · झीलें · शिखर · बेसिन',
    preset: 'physical', layerCount: 7 },
  { id: 'environment', icon: '🌿', name: 'Environment & Protected Areas', name_hi: 'पर्यावरण और संरक्षित क्षेत्र',
    blurb: 'NPs · Tiger Reserves · WLS · Ramsar · Wetlands',
    blurb_hi: 'राष्ट्रीय उद्यान · टाइगर रिज़र्व · अभयारण्य · रामसर · आर्द्रभूमि',
    preset: 'env', layerCount: 6 },
  { id: 'climate', icon: '☀️', name: 'Climate & Weather', name_hi: 'जलवायु और मौसम',
    blurb: 'Rainfall · Temperature · Köppen · Agro-climatic',
    blurb_hi: 'वर्षा · तापमान · कोपेन · कृषि-जलवायु',
    preset: 'climate', layerCount: 4 },
  { id: 'soils-vegetation', icon: '🌾', name: 'Soils & Vegetation', name_hi: 'मृदा और वनस्पति',
    blurb: 'Aridisols · Vertisols · Champion & Seth · Desertification · Drought',
    blurb_hi: 'Aridisols · Vertisols · चैंपियन एवं सेठ · मरुस्थलीकरण · सूखा',
    preset: 'soils', layerCount: 4 },
  { id: 'agriculture', icon: '🌱', name: 'Agriculture', name_hi: 'कृषि',
    blurb: 'Major crops · Cropping seasons · Agro-economic zones',
    blurb_hi: 'प्रमुख फ़सलें · फ़सल-ऋतुएँ · कृषि-आर्थिक क्षेत्र',
    preset: 'crops', layerCount: 3 },
  { id: 'water', icon: '💧', name: 'Water Resources', name_hi: 'जल संसाधन',
    blurb: 'IGNP · Gang Canal · Chambal cascade · Dams · Groundwater',
    blurb_hi: 'IGNP · गंग नहर · चंबल कैस्केड · बाँध · भूजल',
    preset: 'water', layerCount: 5 },
  { id: 'geology', icon: '⛏', name: 'Geology & Minerals', name_hi: 'भूविज्ञान और खनिज',
    blurb: 'Aravalli SG · Vindhyan · Malani · Lead-Zinc · Marble · Petroleum',
    blurb_hi: 'अरावली SG · विंध्यन · मालाणी · सीसा-जस्ता · संगमरमर · पेट्रोलियम',
    preset: 'geology', layerCount: 7 },
  { id: 'industry', icon: '🏭', name: 'Industry & SEZs', name_hi: 'उद्योग और SEZ',
    blurb: 'DMIC · Cement · Textile · Marble · Auto · Handicrafts',
    blurb_hi: 'DMIC · सीमेंट · वस्त्र · संगमरमर · ऑटो · हस्तशिल्प',
    preset: 'industry', layerCount: 6 },
  { id: 'energy', icon: '⚡', name: 'Energy & Power', name_hi: 'ऊर्जा और विद्युत',
    blurb: 'RAPS · Bhadla solar · Jaisalmer wind · Chambal hydel',
    blurb_hi: 'RAPS · भादला सौर · जैसलमेर पवन · चंबल जल-विद्युत',
    preset: 'energy', layerCount: 6 },
  { id: 'demographics', icon: '👥', name: 'Demographics', name_hi: 'जनसांख्यिकी',
    blurb: 'Density · Literacy · Sex ratio · Urbanisation · ST / SC %',
    blurb_hi: 'घनत्व · साक्षरता · लिंग-अनुपात · नगरीकरण · ST / SC %',
    preset: 'population-density', layerCount: 7 },
  { id: 'administrative', icon: '🏛', name: 'Administrative', name_hi: 'प्रशासनिक',
    blurb: '7 divisions · Scheduled Areas · Border districts',
    blurb_hi: '7 संभाग · अनुसूचित क्षेत्र · सीमावर्ती जिले',
    preset: 'divisions', layerCount: 4 },
  { id: 'cultural', icon: '🎭', name: 'Cultural Regions', name_hi: 'सांस्कृतिक क्षेत्र',
    blurb: 'Marwar · Mewar · Hadoti · Shekhawati · Dhundhar · Vagad · Matsya · Godwar · Mewat',
    blurb_hi: 'मारवाड़ · मेवाड़ · हाड़ौती · शेखावाटी · ढूँढाड़ · वागड़ · मत्स्य · गोडवाड़ · मेवात',
    preset: 'regions', layerCount: 2 },
  { id: 'urban', icon: '🏙', name: 'Urban', name_hi: 'नगरीय',
    blurb: 'Urban centres · Municipal corps · Smart Cities · Population corridors',
    blurb_hi: 'नगर · नगर निगम · स्मार्ट सिटी · जनसंख्या गलियारे',
    preset: 'urban', layerCount: 4 },
  { id: 'history-heritage', icon: '🏰', name: 'History & Heritage', name_hi: 'इतिहास और विरासत',
    blurb: 'Forts · Dynasties · Ancient civilizations · Battle sites · Prashastis · Integration · 1857 revolt',
    blurb_hi: 'दुर्ग · राजवंश · प्राचीन सभ्यताएँ · युद्ध-स्थल · प्रशस्तियाँ · एकीकरण · 1857 विद्रोह',
    layers: 'heritage-forts,rajput-dynasties,ancient-civilizations,battle-sites,major-prashastis,rajasthan-integration,revolt-sites-1857',
    layerCount: 7 },
  { id: 'culture-faith', icon: '🛕', name: 'Culture & Faith', name_hi: 'संस्कृति और आस्था',
    blurb: 'Palaces · Havelis · Major fairs · Folk deities · Folk goddesses',
    blurb_hi: 'महल · हवेलियाँ · प्रमुख मेले · लोकदेव · लोक-देवियाँ',
    layers: 'palaces,havelis,major-fairs,folk-deity-shrines,folk-goddesses',
    layerCount: 5 },
  { id: 'research-institutions', icon: '🔬', name: 'Research & Institutions', name_hi: 'शोध और संस्थान',
    blurb: 'CAZRI · AFRI · CSWRI · IIT · IIM · NLU · KVK · Camel research · SEVAR',
    blurb_hi: 'CAZRI · AFRI · CSWRI · IIT · IIM · NLU · KVK · ऊँट अनुसंधान · SEVAR',
    layers: 'research-centers',
    layerCount: 1 },
  { id: 'arts-crafts', icon: '🎨', name: 'Arts & Crafts', name_hi: 'कला और शिल्प',
    blurb: 'Mewar · Kishangarh · Bundi-Kota painting · Thewa · Kundan-Meena · Kavad · Bandhej · Blue Pottery',
    blurb_hi: 'मेवाड़ · किशनगढ़ · बूँदी-कोटा चित्रकला · थेवा · कुंदन-मीना · कावड़ · बंधेज · ब्लू पॉटरी',
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
  { icon: '🦆', label: 'State bird', label_hi: 'राज्य पक्षी', name: 'Godawan', name_hi: 'गोडावण', sub: 'Great Indian Bustard', sub_hi: 'ग्रेट इंडियन बस्टर्ड', year: 1981,
    foot: 'Critically endangered — largest population in Desert National Park, Jaisalmer.',
    foot_hi: 'अति-संकटग्रस्त — सबसे बड़ी आबादी मरु राष्ट्रीय उद्यान, जैसलमेर में।' },
  { icon: '🦌', label: 'State animal (wild)', label_hi: 'राज्य पशु (वन्य)', name: 'Chinkara', name_hi: 'चिंकारा', sub: 'Indian gazelle', sub_hi: 'भारतीय चिंकारा', year: 1981,
    foot: 'Best sighted at Ranthambhore, Sariska and Desert National Park.',
    foot_hi: 'रणथंभौर, सरिस्का और मरु राष्ट्रीय उद्यान में सर्वोत्तम दिखता है।' },
  { icon: '🐪', label: 'State animal (domestic)', label_hi: 'राज्य पशु (घरेलू)', name: 'Camel', name_hi: 'ऊँट', sub: 'Camelus dromedarius', year: 2014,
    foot: 'Rajasthan holds ~85% of India\'s camel population; Bikaner, Jaisalmer, Barmer heartland.',
    foot_hi: 'राजस्थान में भारत के ~85% ऊँट हैं; बीकानेर, जैसलमेर, बाड़मेर हृदयस्थल।' },
  { icon: '🌳', label: 'State tree', label_hi: 'राज्य वृक्ष', name: 'Khejri', name_hi: 'खेजड़ी', sub: 'Prosopis cineraria', year: 1983,
    foot: 'Sacred to the Bishnoi; the 1730 Khejarli sacrifice defended it before the Chipko movement.',
    foot_hi: 'विश्नोइयों के लिए पवित्र; 1730 का खेजड़ली बलिदान चिपको आंदोलन से पहले इसकी रक्षा में हुआ।' },
  { icon: '🌼', label: 'State flower', label_hi: 'राज्य पुष्प', name: 'Rohira', name_hi: 'रोहिड़ा', sub: 'Tecomella undulata', year: 1983,
    foot: 'The "desert teak" of Marwar — golden-yellow flowers, drought-hardy Aravalli-Thar tree.',
    foot_hi: 'मारवाड़ का "मरु सागवान" — स्वर्ण-पीले पुष्प, सूखा-सहिष्णु अरावली-थार वृक्ष।' },
  { icon: '💃', label: 'State dance', label_hi: 'राज्य नृत्य', name: 'Ghoomar', name_hi: 'घूमर', sub: 'Bhil-origin whirl dance', sub_hi: 'भील-मूल का घूर्णन नृत्य', year: null,
    foot: 'Adopted from the Bhils by Rajput women; hallmark of Mewar-Marwar weddings and Teej.',
    foot_hi: 'राजपूत महिलाओं ने भीलों से अपनाया; मेवाड़-मारवाड़ के विवाहों और तीज की पहचान।' },
  { icon: '🎵', label: 'State song', label_hi: 'राज्य गीत', name: 'Kesariya Balam', name_hi: 'केसरिया बालम', sub: 'Padharo Maare Des', sub_hi: 'पधारो म्हारे देस', year: null,
    foot: 'A Mand-genre folk song, most famously sung by Allah Jilai Bai of Bikaner.',
    foot_hi: 'एक मांड-शैली लोकगीत, सबसे प्रसिद्ध रूप से बीकानेर की अल्लाह जिलाई बाई द्वारा गाया गया।' },
  { icon: '🏀', label: 'State game', label_hi: 'राज्य खेल', name: 'Basketball', name_hi: 'बास्केटबॉल', sub: 'Declared before India\'s national', sub_hi: 'भारत के राष्ट्रीय खेल से पहले घोषित', year: 1948,
    foot: 'Rajasthan is one of the few Indian states whose official game is not a native folk sport.',
    foot_hi: 'राजस्थान उन गिने-चुने भारतीय राज्यों में से एक है जिसका आधिकारिक खेल एक देशी लोक-खेल नहीं है।' },
];

// ── Landing-page bilingual lookups (chains + records) ─────────────
const CHAIN_TITLE_HI = {
  'Arid → Bajra → Rain-fed → Low density': 'शुष्क → बाजरा → वर्षा-आधारित → निम्न घनत्व',
  'Aravalli → Metamorphic → Lead-Zinc → HZL': 'अरावली → कायांतरित → सीसा-जस्ता → HZL',
  'Chambal → Kota → Cement + Chemicals': 'चंबल → कोटा → सीमेंट + रसायन',
  'Vagad → Bhil → Mahi Bajaj Sagar → Scheduled Area': 'वागड़ → भील → माही बजाज सागर → अनुसूचित क्षेत्र',
  'Bhadla → Solar Zone A → Green Energy Corridor': 'भादला → सौर क्षेत्र A → ग्रीन एनर्जी कॉरिडोर',
  'Barmer → Border → Oil → Solar → Refinery': 'बाड़मेर → सीमा → तेल → सौर → रिफ़ाइनरी',
  'IGNP → Sri Ganganagar → Cotton + Wheat': 'IGNP → श्रीगंगानगर → कपास + गेहूँ',
  'Aravalli → Marble → Kishangarh → Handicrafts': 'अरावली → संगमरमर → किशनगढ़ → हस्तशिल्प',
  'Mewar → Udaipur → Lakes → Tourism': 'मेवाड़ → उदयपुर → झीलें → पर्यटन',
  'DMIC → Neemrana → Nissan → Auto cluster': 'DMIC → नीमराना → निसान → ऑटो क्लस्टर',
};
const CHAIN_STOP_HI = {
  'Arid climate': 'शुष्क जलवायु', 'Bajra': 'बाजरा', 'Rain-fed': 'वर्षा-आधारित', 'Very low density': 'अति निम्न घनत्व',
  'Aravalli SG': 'अरावली SG', 'Metamorphic': 'कायांतरित', 'Lead-Zinc belt': 'सीसा-जस्ता पेटी', 'Rampura Agucha': 'रामपुरा अगुचा',
  'Chambal River': 'चंबल नदी', 'Kota Barrage': 'कोटा बैराज', 'Chambal Fertilisers': 'चंबल फर्टिलाइज़र्स', 'Chemical cluster': 'रासायनिक क्लस्टर',
  'Vagad region': 'वागड़ क्षेत्र', 'Mahi River': 'माही नदी', 'Mahi Bajaj Sagar': 'माही बजाज सागर', 'TSP Scheduled Area': 'TSP अनुसूचित क्षेत्र',
  'Bhadla Solar Park': 'भादला सौर पार्क', 'Solar Zone A': 'सौर क्षेत्र A', 'Green Energy Corr.': 'ग्रीन एनर्जी कॉरिडोर', 'Solar West Zone': 'पश्चिमी सौर क्षेत्र',
  'Barmer district': 'बाड़मेर जिला', 'Pakistan border': 'पाकिस्तान सीमा', 'Barmer Basin': 'बाड़मेर द्रोणी', 'HRRL Refinery': 'HRRL रिफ़ाइनरी',
  'Indira Gandhi Canal': 'इंदिरा गांधी नहर', 'IGNP Command': 'IGNP कमांड', 'Cotton': 'कपास', 'Wheat': 'गेहूँ',
  'Marble belt': 'संगमरमर पेटी', 'Ajmer-Kishangarh': 'अजमेर-किशनगढ़', 'Makrana craft': 'मकराना शिल्प',
  'Mewar Region': 'मेवाड़ क्षेत्र', 'Udaipur': 'उदयपुर', 'Pichola Lake': 'पिछोला झील', 'Fateh Sagar Lake': 'फतेह सागर झील',
  'DMIC KBN Region': 'DMIC KBN क्षेत्र', 'Neemrana Industrial': 'नीमराना औद्योगिक', 'Nissan Plant': 'निसान संयंत्र', 'Auto cluster': 'ऑटो क्लस्टर',
};

// ── Static-label i18n sweep + language toggle ────────────────────
function applyStaticI18n() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  document.documentElement.setAttribute('lang', getLang());
}
function wireLangToggle() {
  const btn = document.getElementById('study-lang-toggle');
  if (!btn) return;
  const isHi = getLang() === 'hi';
  btn.textContent = isHi ? 'EN' : 'हिं';
  btn.title = isHi ? 'Switch to English' : 'हिंदी में देखें';
  btn.addEventListener('click', () => setLang(isHi ? 'en' : 'hi'));  // persists + reloads
}

// Hero preview — cycle the 3 scenes on #hl-stage (toggle a layer → open a
// district → switch language). Respects reduced-motion; pauses on hidden tab.
function wireDemo() {
  const stage = document.getElementById('hl-stage');
  if (!stage) return;
  const set = (n) => { stage.dataset.scene = String(n); };
  set(0);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { set(1); return; }
  let n = 0, timer = null;
  const tick = () => { n = (n + 1) % 3; set(n); };
  const run  = () => { if (!timer) timer = setInterval(tick, 2800); };
  const stop = () => { clearInterval(timer); timer = null; };
  run();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
}

// ── Boot ──────────────────────────────────────────────────────────
(async function boot() {
  try {
    applyStaticI18n();
    wireLangToggle();
    wireDemo();
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
  const suffix = ' — Rajasthan Atlas';
  const titleMap = {
    home:       'Rajasthan Atlas — Study Companion',
    topics:     t('Study by topic') + suffix,
    districts:  t('Districts') + suffix,
    records:    t('Records & extremes') + suffix,
    symbols:    t('State symbols') + suffix,
    confusions: t('Commonly confused') + suffix,
    chains:     t('Concept chains') + suffix,
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
// category id (as stored in confusions.json) → Title-case DICT label
const CONFUSION_CAT_LABEL = Object.fromEntries(
  CONFUSION_CATEGORIES.filter(c => c.id !== 'all').map(c => [c.id, c.label]));

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
    btn.innerHTML = `${t(cat.label)} <span class="confusion-filter-count">${count}</span>`;
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
    const lName = pick(c.left.name,  c.left.name_hi);
    const rName = pick(c.right.name, c.right.name_hi);
    const leftLink  = c.left.featureId  ? `map.html?feature=${encodeURIComponent(c.left.featureId)}`  : null;
    const rightLink = c.right.featureId ? `map.html?feature=${encodeURIComponent(c.right.featureId)}` : null;
    const leftName  = leftLink  ? `<a href="${leftLink}">${lName}</a>`  : lName;
    const rightName = rightLink ? `<a href="${rightLink}">${rName}</a>` : rName;
    card.innerHTML = `
      <div class="confusion-head">
        <span class="confusion-cat">${t(CONFUSION_CAT_LABEL[c.category] ?? c.category)}</span>
      </div>
      <div class="confusion-body">
        <div class="confusion-side">
          <div class="confusion-name">${leftName}</div>
          <p class="confusion-dist">${pick(c.left.distinguisher, c.left.distinguisher_hi)}</p>
        </div>
        <div class="confusion-vs">${t('vs')}</div>
        <div class="confusion-side">
          <div class="confusion-name">${rightName}</div>
          <p class="confusion-dist">${pick(c.right.distinguisher, c.right.distinguisher_hi)}</p>
        </div>
      </div>
      <div class="confusion-key"><strong>${t('Rule:')}</strong> ${pick(c.key, c.key_hi)}</div>
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
        <div class="symbol-label">${pick(s.label, s.label_hi)}${s.year ? ` <span class="symbol-year">${s.year}</span>` : ''}</div>
        <div class="symbol-name">${pick(s.name, s.name_hi)}</div>
        <div class="symbol-sub">${pick(s.sub, s.sub_hi)}</div>
        <div class="symbol-foot">${pick(s.foot, s.foot_hi)}</div>
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
    head.innerHTML = `<span class="division-name">${t(div)} ${t('Division')}</span> <span class="division-count">${rows.length} ${t('districts')}</span>`;
    group.append(head);

    const grid = document.createElement('div');
    grid.className = 'district-grid';
    for (const d of rows) {
      const chip = document.createElement('a');
      chip.className = 'district-chip' + (d.isNew ? ' district-new' : '');
      chip.href = `map.html?feature=${encodeURIComponent(d.id)}`;
      chip.innerHTML = `
        <span class="district-name">${t(d.name)}${d.isNew ? ' <span class="district-new-tag">2023</span>' : ''}</span>
        ${d.metric ? `<span class="district-meta">${humanNum(d.metric.population)} · ${d.metric.density}/km² · ${d.metric.literacy_pct}% ${t('lit.')}</span>` : ''}
      `;
      grid.append(chip);
    }
    group.append(grid);
    container.append(group);
  }
}

function humanNum(n) {
  if (n == null) return '—';
  const hi = getLang() === 'hi';
  if (n >= 1e7) return (n / 1e7).toFixed(2) + (hi ? ' करोड़' : ' Cr');
  if (n >= 1e5) return (n / 1e5).toFixed(2) + (hi ? ' लाख' : ' L');
  return n.toLocaleString(hi ? 'en-IN' : 'en');
}

// ── Topics ────────────────────────────────────────────────────────
function renderTopics() {
  const grid = document.getElementById('topic-grid');
  for (const topic of TOPICS) {
    const card = document.createElement('a');
    card.className = 'topic-card';
    // Support both preset-mode tiles and layer-list tiles (the new
    // history/culture/research topics don't map to a preset mode).
    card.href = topic.preset
      ? `map.html?preset=${encodeURIComponent(topic.preset)}`
      : `map.html?layers=${encodeURIComponent(topic.layers)}`;
    card.innerHTML = `
      <span class="topic-icon">${topic.icon}</span>
      <div class="topic-body">
        <h3 class="topic-title">${pick(topic.name, topic.name_hi)}</h3>
        <p class="topic-blurb">${pick(topic.blurb, topic.blurb_hi)}</p>
        <div class="topic-meta">${topic.layerCount} ${topic.layerCount > 1 ? t('map layers') : t('map layer')}</div>
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
      <div class="record-label">${t(c.label)}</div>
      <div class="record-big">${t(c.big)}</div>
      <div class="record-sub">${t(c.sub)}</div>
      ${c.foot ? `<div class="record-foot">${t(c.foot)}</div>` : ''}
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
    title.textContent = pick(chain.title, CHAIN_TITLE_HI[chain.title]);
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
      pill.textContent = pick(stop.label, CHAIN_STOP_HI[stop.label]);
      strip.append(pill);
    });
    wrap.append(strip);
    list.append(wrap);
  }
}
