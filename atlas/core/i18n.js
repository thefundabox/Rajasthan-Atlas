/**
 * i18n — lightweight English ↔ Hindi UI-string layer.
 *
 * SCOPE: Tier-1 UI chrome only — header buttons, layer names + categories,
 * sidebar section labels, tooltip labels, breadcrumb text. Feature content
 * (fact lines, names, districts) STAYS in English at this stage.
 *
 * MECHANISM:
 *   • Preference persisted in localStorage under 'atlas-lang' ('en'|'hi').
 *   • getLang() → returns 'en' (default) or 'hi'.
 *   • setLang(lang) → persists + reloads the page. Reload is deliberate:
 *     the atlas boot builds DOM imperatively, so a fresh render is more
 *     reliable than surgical re-translation.
 *   • t(str) → returns the Hindi translation if getLang() === 'hi' AND the
 *     string is in the DICT; otherwise passes str through unchanged.
 *
 * ADDING TRANSLATIONS: append to DICT below. Missing keys silently fall
 * back to English — never crashes, never blocks the render.
 */

const DICT = {

  /* Header + subtitle */
  'Study Home':               'अध्ययन गृह',
  '← Study Home':             '← अध्ययन गृह',
  'Interactive Map':          'इंटरैक्टिव मानचित्र',
  '41 Districts':             '41 जिले',
  '7 Divisions':              '7 संभाग',
  'RAS Only, CC BY-NC-SA 4.0':'RAS Only, CC BY-NC-SA 4.0',
  /* UI action buttons — English is the naturally-used form even in Hindi.
   * Everyone says "Print", "Search", "Compare", not their translations. */
  'Search (press / to focus)…': 'Search (/ दबाएँ)…',
  'Revise':                   'Revise',
  'Compare':                  'Compare',
  'Statistics':               'Statistics',
  'Print':                    'Print',
  'Light':                    'Light',
  'Dark':                     'Dark',
  'Sepia':                    'Sepia',
  'High Contrast':            'High Contrast',
  'Revision Dashboard — study cards + concept chains (V)': 'Revision Dashboard — अध्ययन कार्ड + concept chains (V)',
  'Compare two features (X)': 'दो फ़ीचर Compare करें (X)',
  'Compare mode':             'Compare mode',
  'By the numbers — atlas statistics': 'Atlas के आँकड़े',
  'Print / save as PDF':      'Print / PDF में सहेजें',
  'Cycle theme (D)':          'Theme बदलें (D)',

  /* Layers popover */
  '☰  Layers':                '☰  Layers',
  'Layers':                   'Layers',
  'Layers, modes, and legend':'Layers, modes और legend',
  'Tick a dataset to show or hide it on the map.': 'नक़्शे पर दिखाने या छिपाने के लिए dataset चुनें।',
  'Toggle visibility':         'दिखाएँ / छिपाएँ',

  /* Layer-popover CATEGORY headers */
  'ADMINISTRATIVE':           'प्रशासनिक',
  'PHYSICAL':                 'भौतिक',
  'ENVIRONMENT':              'पर्यावरण',
  'CLIMATE':                  'जलवायु',
  'WATER':                    'जल',
  'AGRICULTURE':              'कृषि',
  'GEOLOGY':                  'भू-विज्ञान',
  'MINING':                   'खनन',
  'INDUSTRY':                 'उद्योग',
  'ENERGY':                   'ऊर्जा',
  'DEMOGRAPHIC':              'जनसांख्यिकीय',
  'HUMAN':                    'मानव भूगोल',
  'CUSTOM':                   'कस्टम',
  'OTHER':                    'अन्य',

  /* Sidebar section labels (DistrictProfile + UIManager) */
  'Key figures':              'Key figures',
  'Location':                 'Location',
  'References':               'References',
  'District':                 'जिला',
  'Division':                 'संभाग',
  'Headquarters':             'मुख्यालय',
  'State':                    'राज्य',
  'Centroid':                 'केंद्र-बिंदु',
  'HQ':                       'मु.',
  'DISTRICT PROFILE':         'जिला प्रोफ़ाइल',
  'DEMOGRAPHICS · CENSUS 2011':'जनांकिकी · जनगणना 2011',
  'RECORDS THIS DISTRICT HOLDS':'इस जिले के कीर्तिमान',
  'DID YOU KNOW':             'क्या आप जानते हैं',
  'CULTURE & HERITAGE':       'संस्कृति और विरासत',
  'HISTORY & FREEDOM':        'इतिहास और स्वतंत्रता',
  'ENVIRONMENT & LANDSCAPE':  'पर्यावरण और भूदृश्य',
  'ECONOMY & INDUSTRY':       'अर्थव्यवस्था और उद्योग',
  'INFRASTRUCTURE':           'बुनियादी ढाँचा',
  'ADMINISTRATION':           'प्रशासन',

  /* Statistics overlay */
  'Rajasthan by the numbers': 'आँकड़ों में राजस्थान',
  "A live audit of the atlas's environment and administrative layers, drawn from the current dataset.": 'एटलस के पर्यावरण और प्रशासनिक लेयरों की जीवंत समीक्षा — वर्तमान डेटासेट से।',
  'Districts':                'जिले',
  'Divisions':                'संभाग',
  'National parks':           'राष्ट्रीय उद्यान',
  'Tiger reserves':           'टाइगर रिज़र्व',
  'Wildlife sanctuaries':     'वन्यजीव अभयारण्य',
  'Ramsar sites':             'रामसर स्थल',
  'Wetlands (non-Ramsar)':    'आर्द्रभूमियाँ (रामसर के अलावा)',
  'Biosphere reserves':       'जीवमंडल आरक्षण',
  'Total PA area':            'कुल संरक्षित क्षेत्र',
  'Coverage of Rajasthan':    'राजस्थान का कवरेज़',
  'Point-only features':      'केवल-बिंदु फ़ीचर',
  'Largest PA':               'सबसे बड़ा संरक्षित क्षेत्र',
  'Smallest PA':              'सबसे छोटा संरक्षित क्षेत्र',
  'Most recent notification': 'सबसे नई अधिसूचना',

  /* Status bar */
  'Projection':               'प्रक्षेप',
  'Selected':                 'चयनित',
  'Source':                   'स्रोत',
  '© OpenStreetMap contributors · ODbL 1.0': '© OpenStreetMap योगदानकर्ता · ODbL 1.0',

  /* Selection breadcrumb */
  'DISTRICTS':                'जिले',

  /* Tooltip labels + close */
  'Close (Esc)':              'बंद करें (Esc)',
  'Close panel':              'पैनल बंद करें',
  'Select a district or protected area from the map to explore.': 'खोजने के लिए मानचित्र से कोई जिला या संरक्षित क्षेत्र चुनें।',
  'Est.':                     'स्थापित',
  'Built by':                 'निर्माता:',
  'Built by ':                'निर्माता: ',
  'in':                       'में',
  'div':                      'संभाग',
  'Retained new district':    'रखा गया नया जिला (2023 → 2024)',
  'Retained new district (2023 → 2024)': 'रखा गया नया जिला (2023 → 2024)',

  /* Map chrome controls */
  'Zoom in (+)':              'ज़ूम बढ़ाएँ (+)',
  'Zoom out (−)':             'ज़ूम घटाएँ (−)',
  'Reset view (0)':           'दृश्य रीसेट करें (0)',

  /* Header search input */
  'See full details →':       'पूरा विवरण देखें →',

  /* Layer names — the big list */
  'Districts':                        'जिले',
  'Revenue Divisions':                'संभाग',
  'New Districts (2023)':             'नए जिले (2023)',
  'Scheduled Areas (TSP)':            'अनुसूचित क्षेत्र (TSP)',
  'National Parks':                   'राष्ट्रीय उद्यान',
  'Tiger Reserves':                   'टाइगर रिज़र्व',
  'Wildlife Sanctuaries':             'वन्यजीव अभयारण्य',
  'Ramsar Sites':                     'रामसर स्थल',
  'Wetlands (non-Ramsar)':            'आर्द्रभूमियाँ (रामसर के अलावा)',
  'Biosphere Reserves':               'जीवमंडल आरक्षण',
  'Conservation Reserves':            'संरक्षण आरक्षण',
  'Thar Desert':                      'थार मरुस्थल',
  'Aravalli Range':                   'अरावली श्रेणी',
  'Physiographic Regions':            'भौगोलिक क्षेत्र',
  'Drainage Basins':                  'अपवाह प्रणालियाँ',
  'Lakes':                            'झीलें',
  'Peaks':                            'पर्वत शिखर',
  'Rivers':                           'नदियाँ',
  'Aravalli Passes':                  'अरावली दर्रे',
  'Sand-Dune Types (Thar)':           'बालुका-स्तूप प्रकार (थार)',
  'Rainfall':                         'वर्षा',
  'Temperature':                      'तापमान',
  'Climate Regions':                  'जलवायु क्षेत्र',
  'Agro-Climatic Zones':              'कृषि-जलवायु क्षेत्र',
  'Soil Types':                       'मृदा प्रकार',
  'Natural Vegetation':               'प्राकृतिक वनस्पति',
  'Desertification':                  'मरुस्थलीकरण',
  'Drought Vulnerability':            'सूखा-संवेदनशीलता',
  'Major Crops':                      'प्रमुख फ़सलें',
  'Cropping Seasons':                 'फ़सल-ऋतुएँ',
  'Agro-Economic Zones':              'कृषि-आर्थिक क्षेत्र',
  'Irrigation Sources':               'सिंचाई-स्रोत',
  'Canals & Command Areas':           'नहरें और कमांड क्षेत्र',
  'Dams':                             'बाँध',
  'Groundwater Status':               'भूजल स्थिति',
  'Traditional Water Harvesting':     'पारंपरिक जल-संचयन',
  'Command Areas':                    'कमांड क्षेत्र',
  'Geological Provinces':             'भूगर्भीय क्षेत्र',
  'Rock Types':                       'चट्टान प्रकार',
  'Mineral Belts':                    'खनिज पेटियाँ',
  'Building Stones':                  'निर्माण-पत्थर',
  'Mining Clusters':                  'खनन क्लस्टर',
  'Petroleum & Gas':                  'पेट्रोलियम और गैस',
  'All Industry':                     'सभी उद्योग',
  'Industrial Regions':               'औद्योगिक क्षेत्र',
  'Sectoral Clusters':                'क्षेत्र-वार क्लस्टर',
  'SEZs':                             'विशेष आर्थिक क्षेत्र (SEZs)',
  'Handicrafts (GI)':                 'हस्तशिल्प (GI)',
  'Handicraft Clusters':              'हस्तशिल्प क्लस्टर',
  'Energy Mix':                       'ऊर्जा मिश्रण',
  'Renewables':                       'नवीकरणीय स्रोत',
  'Power Plants':                     'ऊर्जा संयंत्र',
  'Solar Parks':                      'सौर पार्क',
  'Wind Farms':                       'पवन क्षेत्र',
  'Transmission':                     'पारेषण',
  'Transmission Corridors':           'पारेषण गलियारे',
  'Population Density':               'जनसंख्या घनत्व',
  'Population Growth':                'जनसंख्या वृद्धि',
  'Literacy':                         'साक्षरता',
  'Sex Ratio':                        'लिंग-अनुपात',
  'Urbanisation':                     'नगरीकरण',
  'ST / SC %':                        'ST / SC %',
  'Scheduled Tribes':                 'अनुसूचित जनजाति',
  'Scheduled Castes':                 'अनुसूचित जाति',
  'Cultural Regions':                 'सांस्कृतिक क्षेत्र',
  'Border Districts':                 'सीमावर्ती जिले',
  'Major Urban Centres':              'प्रमुख नगर',
  'Municipal Corps':                  'नगर निगम',
  'Municipal Corporations':           'नगर निगम',
  'Smart Cities':                     'स्मार्ट सिटी',
  'Population Corridors':             'जनसंख्या गलियारे',
  'Major Fairs & Melas':              'प्रमुख मेले',
  'Heritage Forts':                   'ऐतिहासिक किले',
  'Folk Deity Shrines':               'लोकदेव तीर्थ',
  '1857 Revolt Sites':                '1857 विद्रोह स्थल',
  'Integration of Rajasthan':         'राजस्थान का एकीकरण',
  'Research & Higher Institutions':   'शोध और उच्च संस्थान',
  'Prashastis & Inscriptions':        'प्रशस्ति और शिलालेख',
  'Historic Palaces':                 'ऐतिहासिक महल',
  'Historic Temples':                 'ऐतिहासिक मंदिर',
  'Historic Havelis':                 'ऐतिहासिक हवेली',
  'Historic Battle Sites':            'ऐतिहासिक युद्ध-स्थल',
  'Folk Goddesses':                   'लोक-देवियाँ',
  'Rajput Painting Schools':          'राजपूत चित्र-शैलियाँ',
  'Rajput Dynasties':                 'राजपूत राजवंश',
  'Airports':                         'हवाई अड्डे',
  'National Highways':                'राष्ट्रीय राजमार्ग',
  'Livestock Breeds':                 'पशु नस्लें',
  'Language / Dialect Regions':       'भाषा / बोली क्षेत्र',
  'Tribal Groups':                    'जनजातीय समूह',
  'Salt Production':                  'नमक उत्पादन',
  'Jain Pilgrimage':                  'जैन तीर्थ',
  'Sufi Shrines':                     'सूफ़ी दरगाहें',
  'Ashokan & Buddhist Heritage':      'अशोक और बौद्ध विरासत',
  'Ancient Civilizations':            'प्राचीन सभ्यताएँ',
  'Freedom Movement & Praja Mandal':  'स्वतंत्रता आंदोलन और प्रजा मंडल',
  'Environmental Hotspots':           'पर्यावरण हॉटस्पॉट',
  'Folk Arts (Dances, Dramas, Instruments)': 'लोक-कला (नृत्य, नाटक, वाद्य)',
  'Medieval Administrative System':   'मध्यकालीन प्रशासनिक व्यवस्था',
  'Literary Rajasthan (Writers & Works)': 'साहित्यिक राजस्थान (लेखक और रचनाएँ)',
  'Archaeological Sites':             'पुरातत्व स्थल',

  /* Legends / class names — common ones */
  'Low':                              'न्यून',
  'Moderate':                         'मध्यम',
  'High':                             'उच्च',
  'Very High':                        'अति उच्च',
  'Very Low':                         'अति न्यून',
  'Severe':                           'गंभीर',
  'Mild':                             'हल्का',
  'Stable':                           'स्थिर',

  /* Environment detail card (EnvironmentLayer.js) — section headers.
   * 'Key figures' / 'Location' / 'References' are deliberately left in
   * English above, matching the Hinglish register used elsewhere. */
  'Overview':                         'सिंहावलोकन',
  'Ecology':                          'पारिस्थितिकी',
  'Conservation':                     'संरक्षण',
  'Key Facts':                        'मुख्य तथ्य',
  'Timeline':                         'कालक्रम',
  'Related features':                 'संबंधित फ़ीचर',
  'Locator':                          'स्थिति-मानचित्र',

  /* Detail card — field labels */
  'Area':                             'क्षेत्रफल',
  'Notified':                         'अधिसूचित',
  'IUCN category':                    'IUCN श्रेणी',
  'IUCN':                             'IUCN',
  'Authority':                        'प्राधिकरण',
  'Programme':                        'कार्यक्रम',
  'Status':                           'स्थिति',
  'Key fauna':                        'प्रमुख जीव',
  'Key flora':                        'प्रमुख वनस्पति',
  'Also: ':                           'अन्य नाम: ',
  'Remember':                         'याद रखें',
  'Common Confusion: ':               'सामान्य भ्रम: ',
  'Why It Matters':                   'क्यों महत्त्वपूर्ण है',
  'Retrieved ':                       'लिया गया ',
  'Commissionerate':                  'संभाग',
  'Rajasthan':                        'राजस्थान',

  /* Custom-layer detail card (CustomContent.js) */
  'Did you know':                     'क्या आप जानते हैं',
  'Custom feature':                   'कस्टम फ़ीचर',
  /* prettyKicker labels — cultural/historic tier types */
  'Palace':                           'महल',
  'Temple':                           'मंदिर',
  'Haveli':                           'हवेली',
  'Sufi Shrine':                      'सूफ़ी दरगाह',
  'Jain Pilgrimage':                  'जैन तीर्थ',
  'Folk Deity Shrine':                'लोकदेव तीर्थ',
  'Folk Goddess':                     'लोकदेवी',
  'Buddhist Heritage':                'बौद्ध विरासत',
  'Painting School':                  'चित्रकला शैली',
  'Airport':                          'हवाई अड्डा',
  'Aravalli Pass':                    'अरावली दर्रा',
  'National Highway':                 'राष्ट्रीय राजमार्ग',
  'Salt Production':                  'नमक उत्पादन',
  'Sand Dune':                        'बालुका-स्तूप',
  'Language Region':                  'भाषा क्षेत्र',
  'Livestock Breed':                  'पशु नस्ल',
  'Tribal Group':                     'जनजातीय समूह',
  'Water Harvesting':                 'जल-संचयन',
  'Research Center':                  'शोध संस्थान',
  'Folk Art':                         'लोक-कला',
  'Rajput Dynasty':                   'राजपूत राजवंश',
  'Battle Site':                      'युद्ध-स्थल',
  'Ancient Civilization':             'प्राचीन सभ्यता',
  'Medieval Admin':                   'मध्यकालीन प्रशासन',
  'Literary Figure':                  'साहित्यकार',
  'Prashasti':                        'प्रशस्ति',
  'Integration Stage':                'एकीकरण चरण',

  /* Integration timeline strip (IntegrationTimeline.js) */
  'States: ':                         'रियासतें: ',

  /* Detail card — feature kind labels */
  'National Park':                    'राष्ट्रीय उद्यान',
  'Tiger Reserve':                    'टाइगर रिज़र्व',
  'Wildlife Sanctuary':               'वन्यजीव अभयारण्य',
  'Ramsar Site':                      'रामसर स्थल',
  'Wetland':                          'आर्द्रभूमि',
  'Biosphere Reserve':                'जीवमंडल आरक्षण',
  'Feature':                          'फ़ीचर',

  /* Detail card — badge tags */
  'New (2023)':                       'नया (2023)',
  'Point-only geometry':              'केवल-बिंदु ज्यामिति',

  /* Detail card — "Why It Matters" prose */
  "This feature is one of Rajasthan's cornerstone landmarks — often the first mentioned in state geography and biodiversity contexts.":
    'यह राजस्थान के आधारस्तंभ स्थलों में से एक है — राज्य के भूगोल और जैव-विविधता के संदर्भ में प्रायः सबसे पहले इसी का उल्लेख होता है।',
  "This feature is a widely cited landmark in Rajasthan's environmental fabric.":
    'यह राजस्थान के पर्यावरणीय ताने-बाने में व्यापक रूप से उद्धृत स्थल है।',

  /* Related-feature chip kinds (LAYER_LABEL) */
  'Region':                           'क्षेत्र',
  'Basin':                            'बेसिन',
  'River':                            'नदी',
  'Lake':                             'झील',
  'Desert':                           'मरुस्थल',
  'Range':                            'श्रेणी',
  'Peak':                             'शिखर',
  'Biosphere':                        'जीवमंडल',

  /* Physical detail card (PhysicalEditorial.js) */
  'Mountain Range':                   'पर्वत श्रेणी',
  'Physiographic Region':             'भौगोलिक क्षेत्र',
  'Drainage Basin':                   'अपवाह बेसिन',
  'Physical feature':                 'भौतिक फ़ीचर',
  'basin':                            'बेसिन',
  'Perennial':                        'बारहमासी',
  'Seasonal':                         'मौसमी',
  'Saline':                           'खारी',
  'Natural':                          'प्राकृतिक',
  'Artificial':                       'कृत्रिम',
  'Generalised boundary':             'सामान्यीकृत सीमा',
  'Point feature':                    'बिंदु फ़ीचर',
  'Length':                           'लंबाई',
  'Elevation':                        'ऊँचाई',
  'Trend':                            'दिशा',
  'Highest':                          'सर्वोच्च',
  'Built':                            'निर्मित',
  'Physical characteristics':         'भौतिक विशेषताएँ',
  /* 'Source' intentionally omitted — reuses the existing status-bar
   * 'Source' → स्रोत, which reads correctly as a river source too. */
  'Outlet':                           'मुहाना',
  'Tributaries':                      'सहायक नदियाँ',
  'Sub-regions':                      'उप-क्षेत्र',
  'Segments':                         'खंड',
  'Governance':                       'प्रशासन',
  'within Rajasthan':                 'राजस्थान में',
  'active':                           'सक्रिय',
  'seasonal':                         'मौसमी',

  /* Language toggle button labels */
  'Switch to Hindi':                  'हिंदी में देखें',
  'Switch to English':                'Switch to English',
  'हिंदी':                            'हिंदी',
  'EN':                               'EN',
  'हि':                               'हि',
};


const KEY = 'atlas-lang';

/** Read the persisted language preference. Defaults to 'en'. */
export function getLang() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'hi' ? 'hi' : 'en';
  } catch (_) { return 'en'; }
}

/**
 * Persist the language and reload — the atlas builds its DOM
 * imperatively at boot, so a full reload is more reliable than trying
 * to surgically re-translate every rendered node.
 */
export function setLang(lang) {
  try { localStorage.setItem(KEY, lang === 'hi' ? 'hi' : 'en'); } catch (_) {}
  // Preserve any hash / query so deep-links aren't dropped.
  window.location.reload();
}

/**
 * Translate a UI string. Returns the Hindi form when preference is 'hi'
 * AND the string is in the dictionary; otherwise returns the input
 * unchanged. Callers can safely wrap any user-facing English string:
 *
 *   const button = el('button', {}, [t('Statistics')]);
 */
export function t(s) {
  if (getLang() !== 'hi') return s;
  if (typeof s !== 'string') return s;
  return DICT[s] || s;
}

/** Bulk-translate an object's string values (used for layer configs). */
export function tObj(obj, keys) {
  if (getLang() !== 'hi' || !obj) return obj;
  for (const k of keys) if (typeof obj[k] === 'string') obj[k] = t(obj[k]);
  return obj;
}

/**
 * Pick the localised value of a feature property. Returns `obj[field + '_hi']`
 * when the language is Hindi AND that key exists; otherwise `obj[field]`.
 * Gracefully falls back to English when a Hindi variant hasn't been written
 * yet for a given feature — so partial coverage is safe.
 *
 *   tf(feat.properties, 'name')            // "Pushkar Camel Fair" or "पुष्कर ऊँट मेला"
 *   tf(feat.properties, 'fortType')        // "Giri Durg" or its Hindi form
 */
export function tf(obj, field) {
  if (!obj) return '';
  if (getLang() === 'hi' && obj[field + '_hi'] != null) return obj[field + '_hi'];
  return obj[field];
}

/**
 * Return the localised facts[] array for a feature. Looks for
 * `notes.facts_hi` under Hindi, falls back to `notes.facts`. Always returns
 * an array (never null) so callers can `.map()` / `.[0]` without guarding.
 */
export function tfacts(props) {
  if (getLang() === 'hi' && Array.isArray(props?.notes?.facts_hi)) return props.notes.facts_hi;
  return props?.notes?.facts || [];
}

/* Expose on window for easy debugging + non-module scripts. */
if (typeof window !== 'undefined') {
  window.AtlasI18n = { t, getLang, setLang };
  document.documentElement.setAttribute('lang', getLang());
}
