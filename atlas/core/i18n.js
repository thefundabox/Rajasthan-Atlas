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
  'Mono':                     'Mono',
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
  'Key figures':              'मुख्य आँकड़े',
  'Location':                 'स्थिति',
  'References':               'संदर्भ',
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
   * ('Key figures' / 'Location' / 'References' above are section headers, so
   * they are translated — not UI verbs, which stay English per the register.) */
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

  /* Thematic detail card (ThematicEditorial.js) — KIND_LABEL kickers */
  'Rainfall zone':                    'वर्षा क्षेत्र',
  'Temperature zone':                 'तापमान क्षेत्र',
  'Climate region':                   'जलवायु क्षेत्र',
  'Agro-climatic zone':               'कृषि-जलवायु क्षेत्र',
  'Soil type':                        'मृदा प्रकार',
  'Vegetation type':                  'वनस्पति प्रकार',
  'Desertification zone':             'मरुस्थलीकरण क्षेत्र',
  'Drought vulnerability':            'सूखा-संवेदनशीलता',
  'Major crop':                       'प्रमुख फ़सल',
  'Cropping season':                  'फ़सल-ऋतु',
  'Agro-economic zone':               'कृषि-आर्थिक क्षेत्र',
  'Irrigation source':                'सिंचाई-स्रोत',
  'Canal':                            'नहर',
  'Dam':                              'बाँध',
  'Groundwater status':               'भूजल स्थिति',
  'Command area':                     'कमांड क्षेत्र',
  'Geological province':              'भूगर्भीय क्षेत्र',
  'Rock type':                        'चट्टान प्रकार',
  'Mineral belt':                     'खनिज पेटी',
  'Mine':                             'खान',
  'Building stone':                   'निर्माण-पत्थर',
  'Mining cluster':                   'खनन क्लस्टर',
  'Oil basin':                        'तेल द्रोणी',
  'Oil field':                        'तेल-क्षेत्र',
  'Gas field':                        'गैस-क्षेत्र',
  'Industrial region':                'औद्योगिक क्षेत्र',
  'Industrial cluster':               'औद्योगिक क्लस्टर',
  'Industrial area':                  'औद्योगिक क्षेत्र',
  'Major industry':                   'प्रमुख उद्योग',
  'Special Economic Zone':            'विशेष आर्थिक क्षेत्र',
  'Handicraft cluster':               'हस्तशिल्प क्लस्टर',
  'Energy mix zone':                  'ऊर्जा-मिश्रण क्षेत्र',
  'Renewable-energy zone':            'नवीकरणीय-ऊर्जा क्षेत्र',
  'Transmission corridor':            'पारेषण गलियारा',
  'Power plant':                      'ऊर्जा संयंत्र',
  'Solar park':                       'सौर पार्क',
  'Wind farm':                        'पवन क्षेत्र',
  'Population density':               'जनसंख्या घनत्व',
  'Population growth':                'जनसंख्या वृद्धि',
  'Sex ratio':                        'लिंग-अनुपात',
  'Urbanisation':                     'नगरीकरण',
  'Scheduled Area':                   'अनुसूचित क्षेत्र',
  'Revenue division':                 'संभाग',
  'Cultural region':                  'सांस्कृतिक क्षेत्र',
  'Border districts':                 'सीमावर्ती जिले',
  'Municipal corporation':            'नगर निगम',
  'Smart City':                       'स्मार्ट सिटी',
  'Urban centre':                     'प्रमुख नगर',
  'Population corridor':              'जनसंख्या गलियारा',

  /* Thematic — figure labels */
  'Avg rainfall':                     'औसत वर्षा',
  'Rainfall range':                   'वर्षा सीमा',
  'Mean':                             'औसत',
  'Summer':                           'ग्रीष्म',
  'Winter':                           'शीत',

  /* Thematic — characteristics row labels */
  'Characteristics':                  'विशेषताएँ',
  'Monsoon dependence':               'मानसून-निर्भरता',
  'Variability':                      'परिवर्तनशीलता',
  'Climate notes':                    'जलवायु टिप्पणी',
  'Texture':                          'गठन',
  'Fertility':                        'उर्वरता',
  'Nutrients':                        'पोषक तत्त्व',
  'Crop suitability':                 'फ़सल-उपयुक्तता',
  'Erosion risk':                     'अपरदन-जोखिम',
  'Canopy':                           'वितान',
  'Threats':                          'संकट',
  'Dominant species':                 'प्रमुख प्रजातियाँ',
  'Champion & Seth':                  'चैंपियन एवं सेठ',
  'Major crops':                      'प्रमुख फ़सलें',
  'Irrigation':                       'सिंचाई',
  'Constraints':                      'बाधाएँ',
  'Causes':                           'कारण',
  'Wind erosion':                     'वायु-अपरदन',
  'Water erosion':                    'जल-अपरदन',
  'Salinity':                         'लवणता',
  'Frequency':                        'आवृत्ति',
  'Historical events':                'ऐतिहासिक घटनाएँ',
  'Corridor':                         'गलियारा',
  'Sector':                           'क्षेत्र',
  'Anchor sector':                    'आधार क्षेत्र',
  'Output':                           'उत्पादन',
  'Craft':                            'शिल्प',
  'GI status':                        'GI दर्जा',
  'Notified':                         'अधिसूचित',
  'Commissioned':                     'चालू किया',
  'Ranking':                          'रैंकिंग',
  'Primary sectors':                  'प्रमुख क्षेत्र',
  'Anchors':                          'आधार-इकाइयाँ',
  'Notable units':                    'उल्लेखनीय इकाइयाँ',
  'Raw materials':                    'कच्चा माल',
  'Fuel':                             'ईंधन',
  'Installed capacity':               'स्थापित क्षमता',
  'Operator':                         'संचालक',
  'Developer':                        'विकासकर्ता',
  'Dominant source':                  'प्रमुख स्रोत',
  'Resource':                         'संसाधन',
  'Classification':                   'वर्गीकरण',
  'Corridor type':                    'गलियारा प्रकार',
  'Purpose':                          'उद्देश्य',
  'Historical seat':                  'ऐतिहासिक केंद्र',
  'Cultural core':                    'सांस्कृतिक केंद्र',
  'Dialect':                          'बोली',
  'Physical setting':                 'भौतिक स्थिति',
  'Economy':                          'अर्थव्यवस्था',
  'Border with':                      'सीमा किससे',
  'Border length':                    'सीमा-लंबाई',
  'Notification':                     'अधिसूचना',
  'Anchor project':                   'आधार परियोजना',
  'Urban role':                       'नगरीय भूमिका',
  'Population rank':                  'जनसंख्या रैंक',
  'Population':                       'जनसंख्या',
  'Axis':                             'अक्ष',
  'Class range':                      'श्रेणी-सीमा',
  'Metric':                           'मापक',
  'density':'घनत्व','growth_pct':'वृद्धि %','literacy_pct':'साक्षरता %','sex_ratio':'लिंग-अनुपात','urban_pct':'नगरीय %','st_pct':'ST %','sc_pct':'SC %',

  /* District profile card (DistrictProfile.js) */
  'District Profile':                 'जिला प्रोफ़ाइल',
  'New 2023':                         'नया 2023',
  'Census values from':               'जनगणना मान — स्रोत',
  'Density':                          'घनत्व',
  'Sex ratio':                        'लिंग-अनुपात',
  'Urban':                            'नगरीय',
  'ST %':                             'ST %',
  'SC %':                             'SC %',
  'Growth (2001-2011)':               'वृद्धि (2001-2011)',
  'Demographics · Census 2011':       'जनांकिकी · जनगणना 2011',
  'Records this district holds':      'इस जिले के कीर्तिमान',
  'Physical & climate':               'भौतिक और जलवायु',
  'Agriculture · water · livestock':  'कृषि · जल · पशुधन',
  'Geology · minerals · mining':      'भूविज्ञान · खनिज · खनन',
  'Industry · energy · infrastructure':'उद्योग · ऊर्जा · अवसंरचना',
  'Environment · protected areas':    'पर्यावरण · संरक्षित क्षेत्र',
  'Culture · heritage · faith':       'संस्कृति · विरासत · आस्था',
  'History & freedom struggle':       'इतिहास और स्वतंत्रता संग्राम',
  'Human geography':                  'मानव भूगोल',
  'Census of India 2011':            'भारत की जनगणना 2011',
  'Synthesised from all 60+ atlas layers':'सभी 60+ एटलस लेयरों से संकलित',
  /* records-this-district-holds labels */
  'Highest literacy in Rajasthan':   'राजस्थान में सर्वाधिक साक्षरता',
  'Lowest literacy in Rajasthan':    'राजस्थान में न्यूनतम साक्षरता',
  'Highest population density':      'सर्वाधिक जनसंख्या घनत्व',
  'Lowest population density':       'न्यूनतम जनसंख्या घनत्व',
  'Highest sex ratio':              'सर्वाधिक लिंग-अनुपात',
  'Lowest sex ratio':               'न्यूनतम लिंग-अनुपात',
  'Highest ST %':                    'सर्वाधिक ST %',
  'Highest SC %':                    'सर्वाधिक SC %',
  'Most urbanised':                  'सर्वाधिक नगरीकृत',
  'Least urbanised':                 'न्यूनतम नगरीकृत',
  'Highest 2001-2011 growth':        'सर्वाधिक 2001-2011 वृद्धि',
  'Highest population':              'सर्वाधिक जनसंख्या',
  'Lowest population':               'न्यूनतम जनसंख्या',
  'Largest area':                    'सर्वाधिक क्षेत्रफल',
  'Smallest area':                   'न्यूनतम क्षेत्रफल',
  'Signature':                        'विशिष्टता',
  'Notes':                            'टिप्पणी',

  /* Thematic — section titles + misc */
  'Distribution':                     'वितरण',
  'Demographic Characteristics':      'जनांकिकीय विशेषताएँ',
  'Administrative Context':           'प्रशासनिक संदर्भ',
  'Regional Identity':                'क्षेत्रीय पहचान',
  'Physical Setting':                 'भौतिक स्थिति',
  'Economic Connections':             'आर्थिक संबंध',
  'Development Profile':               'विकास प्रोफ़ाइल',
  'Zone':                             'क्षेत्र',
  'Point coordinate':                 'बिंदु निर्देशांक',
  'Point':                            'बिंदु',
  'Generalised':                      'सामान्यीकृत',
  'Compiled':                         'संकलित',
  'lakh':                             'लाख',
  'district':                         'जिला',
  'districts':                        'जिले',
  'Role':                             'भूमिका',
  'Development axis':                 'विकास अक्ष',
  'Rank':                             'रैंक',

  /* District names — used for district_values keys, related chips, and
   * any t(district) call across the thematic/physical cards. */
  'Ajmer':'अजमेर','Alwar':'अलवर','Balotra':'बालोतरा','Banswara':'बांसवाड़ा','Baran':'बारां',
  'Barmer':'बाड़मेर','Beawar':'ब्यावर','Bharatpur':'भरतपुर','Bhilwara':'भीलवाड़ा','Bikaner':'बीकानेर',
  'Bundi':'बूँदी','Chittorgarh':'चित्तौड़गढ़','Churu':'चूरू','Dausa':'दौसा','Deeg':'डीग',
  'Dholpur':'धौलपुर','Didwana-Kuchaman':'डीडवाना-कुचामन','Dungarpur':'डूंगरपुर','Hanumangarh':'हनुमानगढ़',
  'Jaipur':'जयपुर','Jaisalmer':'जैसलमेर','Jalore':'जालोर','Jhalawar':'झालावाड़','Jhunjhunu':'झुंझुनूँ',
  'Jodhpur':'जोधपुर','Karauli':'करौली','Khairthal-Tijara':'खैरथल-तिजारा','Kota':'कोटा',
  'Kotputli-Behror':'कोटपूतली-बहरोड़','Nagaur':'नागौर','Pali':'पाली','Phalodi':'फलोदी',
  'Pratapgarh':'प्रतापगढ़','Rajsamand':'राजसमंद','Salumbar':'सलूम्बर','Sawai Madhopur':'सवाई माधोपुर',
  'Sikar':'सीकर','Sirohi':'सिरोही','Sri Ganganagar':'श्रीगंगानगर','Tonk':'टोंक','Udaipur':'उदयपुर',

  /* Landing page (index.html + StudyHome.js) */
  'A study companion for Rajasthan geography, economy and people': 'राजस्थान के भूगोल, अर्थव्यवस्था और लोगों का एक अध्ययन साथी',
  'Study':                            'अध्ययन',
  'Map':                              'मानचित्र',
  'RAJASTHAN, MAPPED':                'राजस्थान, मानचित्रित',
  'Where would you like to start?':   'आप कहाँ से शुरू करना चाहेंगे?',
  'Pick one of four ways in. Everything else is a click away.': 'चार तरीकों में से एक चुनें। बाकी सब एक क्लिक दूर है।',
  'Open the map':                     'मानचित्र खोलें',
  'Interactive atlas — 90+ layers, tick what you want to see.': 'इंटरैक्टिव एटलस — 90+ लेयर, जो देखना हो उसे चुनें।',
  'Open →':                           'खोलें →',
  'Browse districts':                 'जिले देखें',
  'Walk through all 41 districts across 7 divisions with full profiles.': '7 संभागों के सभी 41 जिलों को पूर्ण प्रोफ़ाइल के साथ देखें।',
  'Browse →':                         'देखें →',
  'Commonly confused':                'सामान्यतः भ्रमित',
  '25 curated pairs with a one-line rule that separates the two.': '25 चयनित जोड़े, प्रत्येक के साथ एक-पंक्ति का नियम जो दोनों को अलग करता है।',
  'Drill in →':                       'गहराई में →',
  'Study by topic':                   'विषय अनुसार अध्ययन',
  '17 curated topics — physical geography, culture, history, more.': '17 चयनित विषय — भौतिक भूगोल, संस्कृति, इतिहास, और अधिक।',
  'Explore →':                        'खोजें →',
  'Records & extremes':               'कीर्तिमान और चरम',
  'State symbols':                    'राज्य प्रतीक',
  'Concept chains':                   'अवधारणा शृंखलाएँ',
  '← Back':                           '← वापस',
  "Pick a theme — opens the map with just that layer's colours plus a legend.": 'एक विषय चुनें — मानचित्र केवल उसी लेयर के रंगों और एक लेजेंड के साथ खुलता है।',
  'Districts':                        'जिले',
  'Click any district to open its full profile — 9 Census 2011 metrics, cultural region, records it holds, and every related feature across all layers.': 'किसी भी जिले पर क्लिक करके उसकी पूर्ण प्रोफ़ाइल खोलें — जनगणना 2011 के 9 मापदंड, सांस्कृतिक क्षेत्र, उसके कीर्तिमान, और सभी लेयरों में हर संबंधित फ़ीचर।',
  'Auto-computed from Census 2011 and operator disclosures. Click a card to jump to the map.': 'जनगणना 2011 और संचालक-प्रकटन से स्वतः-गणित। मानचित्र पर जाने के लिए कार्ड पर क्लिक करें।',
  'The eight official symbols of Rajasthan — declared by the state government at various dates.': 'राजस्थान के आठ आधिकारिक प्रतीक — राज्य सरकार द्वारा विभिन्न तिथियों पर घोषित।',
  'Pairs that trip up almost every learner. Each card ends with a one-line rule that separates the two.': 'ऐसे जोड़े जो लगभग हर विद्यार्थी को उलझाते हैं। प्रत्येक कार्ड एक-पंक्ति के नियम पर समाप्त होता है जो दोनों को अलग करता है।',
  'Follow a chain from cause to effect. Each stop is a feature on the map.': 'कारण से प्रभाव तक एक शृंखला का अनुसरण करें। प्रत्येक पड़ाव मानचित्र पर एक फ़ीचर है।',
  'Open the atlas':                   'एटलस खोलें',
  'Source on GitHub':                 'GitHub पर स्रोत',
  'License':                          'लाइसेंस',
  'Licensed under':                   'लाइसेंस:',
  'free for non-commercial use with attribution.': 'श्रेय के साथ ग़ैर-वाणिज्यिक उपयोग हेतु निःशुल्क।',
  /* StudyHome dynamic */
  'vs':                               'बनाम',
  'Rule:':                            'नियम:',
  'All':                             'सभी',
  'Physical':                        'भौतिक',
  'Environment':                     'पर्यावरण',
  'History':                         'इतिहास',
  'Culture':                         'संस्कृति',
  'Administrative':                  'प्रशासनिक',
  'lit.':                            'साक्षरता',
  'map layer':                       'मानचित्र लेयर',
  'map layers':                      'मानचित्र लेयर',
  /* record labels + bigs + foots (StudyHome.renderRecords) */
  'Highest literacy':                'सर्वाधिक साक्षरता',
  'Lowest literacy':                 'न्यूनतम साक्षरता',
  'Highest density':                 'सर्वाधिक घनत्व',
  'Lowest density':                  'न्यूनतम घनत्व',
  'Highest ST %':                    'सर्वाधिक ST %',
  'Highest SC %':                    'सर्वाधिक SC %',
  'Highest peak':                    'सर्वोच्च शिखर',
  'Longest river in state':          'राज्य की सबसे लंबी नदी',
  'Largest single-site solar park':  'सबसे बड़ा एकल-स्थल सौर पार्क',
  'Largest thermal (state-owned)':   'सबसे बड़ा ताप (राज्य-स्वामित्व)',
  'Oldest nuclear complex':          'सबसे पुराना नाभिकीय परिसर',
  'Largest inland salt lake':        'सबसे बड़ी अंतःस्थलीय लवण झील',
  'Longest international border':     'सबसे लंबी अंतरराष्ट्रीय सीमा',
  'Guru Shikhar':                    'गुरु शिखर',
  'Chambal':                         'चंबल',
  'Bhadla Solar Park':               'भादला सौर पार्क',
  'Suratgarh STPS':                  'सूरतगढ़ STPS',
  'RAPS Rawatbhata':                 'RAPS रावतभाटा',
  'Sambhar Lake':                    'सांभर झील',
  'Pakistan':                        'पाकिस्तान',
  "≈9 % of India's salt":            'भारत के नमक का ≈9%',
  'Coaching-education economy':      'कोचिंग-शिक्षा अर्थव्यवस्था',
  'Rural Marwar / Vagad belt':       'ग्रामीण मारवाड़ / वागड़ पेटी',
  'Only district with >500/km²':     '>500/km² वाला एकमात्र जिला',
  'Deep Thar':                       'गहरा थार',
  'Vagad Fifth-Schedule area':       'वागड़ पाँचवीं-अनुसूची क्षेत्र',
  'Canal-command labour communities':'नहर-कमांड श्रमिक समुदाय',
  'Coaching + chemicals city':       'कोचिंग + रसायन नगर',
  'Tribal-belt district':            'जनजातीय-पेटी जिला',
  'Southern Aravalli tribal belt':   'दक्षिणी अरावली जनजातीय पेटी',
  'Bharatpur–Karauli belt':          'भरतपुर–करौली पेटी',
  'Aravalli, Sirohi':                'अरावली, सिरोही',
  'Chambal basin':                   'चंबल बेसिन',
  'Nagaur / Jaipur':                 'नागौर / जयपुर',
  'across 4 districts':              '4 जिलों में',

  /* Revise page (RevisionDashboard.js + ConceptChains.js) */
  'Revision Dashboard':               'रिवीज़न डैशबोर्ड',
  'Revision Dashboard — study cards + concept chains (V)': 'रिवीज़न डैशबोर्ड — अध्ययन कार्ड + अवधारणा शृंखलाएँ (V)',
  "Every card below is computed live from the current dataset. Click any card to open its feature.":
    'नीचे का हर कार्ड वर्तमान डेटासेट से लाइव गणना होता है। किसी भी कार्ड पर क्लिक कर उसकी विशेषता खोलें।',
  'Human Geography':                  'मानव भूगोल',
  "Live from Census 2011 · Registrar General of India. Click any card to open the underlying district or classification zone.":
    'जनगणना 2011 · भारत के महारजिस्ट्रार से लाइव। किसी भी कार्ड पर क्लिक कर संबंधित जिला या वर्गीकरण क्षेत्र खोलें।',
  'Concept Chains':                   'अवधारणा शृंखलाएँ',
  "Follow a chain from climate through soil and vegetation to the protected areas it produces. Every step is a live feature — click to open it.":
    'जलवायु से मृदा और वनस्पति होते हुए उन संरक्षित क्षेत्रों तक शृंखला का अनुसरण करें जो वह उत्पन्न करती है। हर चरण एक लाइव विशेषता है — खोलने के लिए क्लिक करें।',
  'Quick Revision':                   'त्वरित रिवीज़न',
  'Quick revision mode':              'त्वरित रिवीज़न मोड',
  'Lowest rainfall':                  'न्यूनतम वर्षा',
  'Highest rainfall':                 'अधिकतम वर्षा',
  'Coldest zone':                     'सबसे ठंडा क्षेत्र',
  'Hottest zone':                     'सबसे गर्म क्षेत्र',
  'Dominant soil type':               'प्रमुख मृदा प्रकार',
  'Dominant vegetation':              'प्रमुख वनस्पति',
  'Most drought-prone':               'सर्वाधिक सूखा-प्रवण',
  'Desertification hotspot':          'मरुस्थलीकरण हॉटस्पॉट',
  'Climate coverage':                 'जलवायु कवरेज',
  'Highest population':               'सर्वाधिक जनसंख्या',
  'Lowest population':                'न्यूनतम जनसंख्या',
  'Highest density':                  'सर्वाधिक घनत्व',
  'Lowest density':                   'न्यूनतम घनत्व',
  'Highest literacy':                 'सर्वाधिक साक्षरता',
  'Lowest literacy':                  'न्यूनतम साक्षरता',
  'Highest ST %':                     'सर्वाधिक ST %',
  'Highest SC %':                     'सर्वाधिक SC %',
  'Most urbanised':                   'सर्वाधिक नगरीकृत',
  'Least urbanised':                  'न्यूनतम नगरीकृत',
  'Highest sex ratio':                'सर्वाधिक लिंग-अनुपात',
  'Lowest sex ratio':                 'न्यूनतम लिंग-अनुपात',
  'Highest population growth':        'सर्वाधिक जनसंख्या वृद्धि',
  'Largest Municipal Corporation':    'सबसे बड़ा नगर निगम',
  'Revenue divisions':                'राजस्व संभाग',
  'vulnerability':                    'असुरक्षा',
  'signature PA':                     'प्रमुख संरक्षित क्षेत्र',
  'Only district with >500/km² in Rajasthan': 'राजस्थान का >500/km² वाला एकमात्र जिला',
  'Thar desert · Census 2011':        'थार मरुस्थल · जनगणना 2011',
  'Coaching-education economy':       'कोचिंग-शिक्षा अर्थव्यवस्था',
  'Rural Marwar / Vagad belt':        'ग्रामीण मारवाड़ / वागड़ पेटी',
  'Vagad Fifth-Schedule area':        'वागड़ पाँचवीं-अनुसूची क्षेत्र',
  'Canal-command labour communities': 'नहर-कमांड श्रमिक समुदाय',
  'Coaching-industry / capital city': 'कोचिंग-उद्योग / राजधानी शहर',
  'Tribal-belt district':             'जनजातीय-पेटी जिला',
  'Southern Aravalli tribal belt':    'दक्षिणी अरावली जनजातीय पेटी',
  'Chronic skew (Bharatpur-Karauli belt)': 'दीर्घकालिक विषमता (भरतपुर-करौली पेटी)',
  'Oil-and-gas driven in-migration':  'तेल-और-गैस चालित आप्रवास',
  'International (Pakistan) + 5 states': 'अंतरराष्ट्रीय (पाकिस्तान) + 5 राज्य',
  'Scheduled Tribes':                 'अनुसूचित जनजाति',
  'Scheduled Castes':                 'अनुसूचित जाति',
  'Mean':                             'औसत',
  'mm avg':                           'mm औसत',
  'districts':                        'जिले',
  'of Rajasthan by district':         'राजस्थान का (जिलेवार)',
  'lakh':                             'लाख',
  'million':                          'मिलियन',
  'Census 2011':                      'जनगणना 2011',
  'urban':                            'नगरीय',
  'signature PA of the':              'का प्रमुख संरक्षित क्षेत्र',

  /* Panch Gaurav layer (custom/panch-gaurav.geojson) */
  'Panch Gaurav':                     'पंच गौरव',

  /* Landing hero (index.html .study-hero-lead) */
  'The Rajasthan Atlas':              'राजस्थान एटलस',
  'Start here':                       'यहाँ से शुरू करें',
  'Every district,':                  'हर जिला,',
  'mapped in depth.':                 'गहराई से मानचित्रित।',
  'Forty-one districts, ninety-plus data layers and five hundred features — rivers, forts, crops, minerals, tiger reserves and the Panch Gaurav of every district. In English and हिंदी.':
    'इकतालीस जिले, नब्बे से अधिक डेटा लेयर और पाँच सौ विशेषताएँ — नदियाँ, दुर्ग, फसलें, खनिज, टाइगर रिज़र्व और हर जिले का पंच गौरव। अंग्रेज़ी और हिंदी में।',
  'Open the map →':                   'मानचित्र खोलें →',
  '▶ Take a 60-second tour':          '▶ 60-सेकंड का टूर लें',
  'Map layers':                       'मानचित्र लेयर',
  'Features':                         'विशेषताएँ',
  'Bilingual':                        'द्विभाषी',
  'Toggle any of 90+ layers':         '90+ लेयर में से कोई भी चालू करें',
  'Click a district for its full profile': 'पूरी प्रोफ़ाइल के लिए किसी जिले पर क्लिक करें',
  'Study in English or हिंदी':        'अंग्रेज़ी या हिंदी में अध्ययन करें',

  /* Take a tour (TourGuide.js) */
  'Take a tour':                      'टूर लें',
  'Skip':                             'छोड़ें',
  'Back':                             'पीछे',
  'Next':                             'आगे',
  'Done':                             'हो गया',

  /* Statistics overlay + district detail (UIManager.js) */
  'None notified by MoEFCC.':         'MoEFCC द्वारा कोई अधिसूचित नहीं।',
  'Sum of NP + TR + WLS areas.':      'राष्ट्रीय उद्यान + टाइगर रिज़र्व + अभयारण्य क्षेत्रफल का योग।',
  'Protected-area extent vs 342,239 km² state area.': 'संरक्षित-क्षेत्र विस्तार बनाम 342,239 km² राज्य क्षेत्रफल।',
  'Features shipped as points because their polygons are unpublished.': 'विशेषताएँ बिंदुओं के रूप में दी गईं क्योंकि उनके बहुभुज अप्रकाशित हैं।',
  'BBox span':                        'BBox विस्तार',
  'Centre':                           'केंद्र',

  /* Compare page (CompareMode.js) */
  'Compare features':                 'विशेषताओं की तुलना',
  'Compare two features (X)':         'दो विशेषताओं की तुलना (X)',
  'Compare mode':                     'तुलना मोड',
  'Click any feature on the map to replace the next slot.': 'अगला स्लॉट बदलने के लिए मानचित्र पर किसी भी विशेषता पर क्लिक करें।',
  'Slot':                             'स्लॉट',
  '(empty — click a feature)':        '(खाली — किसी विशेषता पर क्लिक करें)',
  'Key differences':                  'मुख्य अंतर',
  'Köppen':                           'कोपेन',
  'Soil texture':                     'मृदा बनावट',
  'Fertility':                        'उर्वरता',
  'Crops':                            'फसलें',
  'Species':                          'प्रजातियाँ',
  'Canopy':                           'वितान',
  'Historical seat':                  'ऐतिहासिक राजधानी',
  'City population':                  'नगर जनसंख्या',
  'Urban role':                       'नगरीय भूमिका',
  'Border with':                      'सीमा किससे',
  'Development axis':                  'विकास अक्ष',
  'Urban %':                          'नगरीय %',
  'ST %':                             'ST %',
  'SC %':                             'SC %',
  '2001–2011 growth':                 '2001–2011 वृद्धि',
  'mean':                             'औसत',
  'summer':                           'ग्रीष्म',

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
