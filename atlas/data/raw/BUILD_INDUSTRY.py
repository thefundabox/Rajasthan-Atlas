"""
BUILD_INDUSTRY.py — Module 7: Industry · SEZs · Handicraft clusters.

Outputs (into atlas/data/):
    industrial-regions.geojson       — 5 planned industrial regions (polygon,
                                       district-approximated)
    industrial-clusters.geojson      — 8 sectoral clusters (polygon,
                                       district-approximated)
    industrial-areas.geojson         — 12 RIICO industrial estates (points)
    major-industries.geojson         — 12 flagship industrial units (points)
    special-economic-zones.geojson   — 4 notified SEZs (points)
    handicraft-clusters.geojson      — 10 GI-tagged / traditional craft
                                       clusters (points)

    knowledge-graph-industry.json    — new typed edges (merged into main graph)

DESIGN CONTRACT
================
* Polygon features (regions, clusters) are district-approximated. Each carries
  `geometryQuality: "generalised (district-approximated)"` + a citation.
* Point features (RIICO estates, flagship units, SEZs, handicraft clusters)
  ship with `geometryQuality: "point"` and coordinates from the cited source.
* Every industrial cluster carries `related_minerals` / `related_crops`
  / `related_stones` fields so the KG can wire the story
  (cement→limestone, textile→cotton, marble→marble belts, salt→Sambhar).
* KG expansion is emitted as a separate file and MERGED into knowledge-graph.json
  non-destructively (mirrors the agriculture + geology pipeline).

SOURCES (documented per layer, cited in DATA_SOURCES.md):
    RIICO   — Rajasthan State Industrial Development & Investment Corporation
    DIPP    — Dept. of Industrial Policy & Promotion (now DPIIT) — DMIC nodes
    DMICDC  — Delhi-Mumbai Industrial Corridor Development Corporation
    RSDPS   — Rajasthan State Directorate of Public Statistics
    DoIC    — Department of Industries & Commerce, GoR
    MoCI    — Ministry of Commerce & Industry — SEZ notifications
    GI-Reg  — Geographical Indications Registry (Chennai)
    OSM     — OpenStreetMap contributors (industrial area polygons where present)
    Company disclosures — Nissan India, Honda, Hero, Shree Cement, JK Cement,
             Ambuja, UltraTech, Wonder, Birla Corp, HPCL-Rajasthan Refinery
"""

import json
import sys
from pathlib import Path

HERE      = Path(__file__).parent
OUT       = HERE.parent
RETRIEVED = '2026-07-07'
STATE     = 'Rajasthan'

def out(name): return OUT / name

# ============================================================================
#  DISTRICT LOAD
# ============================================================================

def load_districts():
    d = json.load(open(OUT / 'districts.geojson'))
    return {f['properties']['name']: f for f in d['features']}

def bbox_of(coords):
    xs, ys = [], []
    def walk(c):
        if isinstance(c[0], (int, float)): xs.append(c[0]); ys.append(c[1])
        else:
            for x in c: walk(x)
    walk(coords)
    return [min(xs), min(ys), max(xs), max(ys)]

def centroid_of(mp):
    a = cx = cy = 0.0
    for poly in mp:
        outer = poly[0]
        ra = 0.0; rx = 0.0; ry = 0.0
        for (x1, y1), (x2, y2) in zip(outer, outer[1:]):
            f = x1 * y2 - x2 * y1
            ra += f; rx += (x1 + x2) * f; ry += (y1 + y2) * f
        if abs(ra) < 1e-12: continue
        rx /= (3 * ra); ry /= (3 * ra); ra /= 2
        cx += rx * ra; cy += ry * ra; a += ra
    if abs(a) < 1e-12: return [0, 0]
    return [cx / a, cy / a]

def merge_districts(names, bym):
    polys = []
    for n in names:
        f = bym.get(n)
        if not f: print(f'!! missing district {n}', file=sys.stderr); continue
        g = f['geometry']
        if g['type'] == 'Polygon': polys.append(g['coordinates'])
        else: polys.extend(g['coordinates'])
    if not polys: return None
    return {'type': 'MultiPolygon', 'coordinates': polys}

# ============================================================================
#  INDUSTRIAL REGIONS — planned / notified investment regions
#  Sourced from DMICDC + DoIC Rajasthan node maps + RIICO annual reports.
# ============================================================================

INDUSTRIAL_REGIONS = {
    'ir-dmic-kbn': {
        'label':      'DMIC — Khushkhera-Bhiwadi-Neemrana Investment Region',
        'corridor':   'Delhi-Mumbai Industrial Corridor (DMIC)',
        'primary_sectors': ['Automobile & auto-components','Electronics','Engineering',
                            'Food processing'],
        'anchors':    ['Nissan India (Neemrana)','Honda Cars India (Tapukara)',
                       'Hero MotoCorp (Neemrana)','Daikin (Neemrana)'],
        'facts':      ['One of the two DMIC "investment regions" notified in Rajasthan '
                       '— the state\'s flagship Japanese-industrial-park zone.',
                       'Neemrana hosts the Japanese Industrial Zone (JIZ), one of only a '
                       'few dedicated country-specific parks in India.',
                       'Tapukara (Bhiwadi) has emerged as the anchor for the '
                       'Honda-Hero automobile axis of Rajasthan.'],
        'districts':  ['Alwar','Khairthal-Tijara','Kotputli-Behror'],
    },
    'ir-ajmer-kishangarh': {
        'label':      'DMIC — Ajmer-Kishangarh Investment Node',
        'corridor':   'Delhi-Mumbai Industrial Corridor (DMIC)',
        'primary_sectors': ['Marble & stone processing','Cement','Logistics','Ceramics'],
        'anchors':    ['Kishangarh Marble Market (Asia\'s largest)',
                       'Shree Cement (Beawar)','Mahindra World City (Ajmer node)'],
        'facts':      ['Second DMIC node notified in Rajasthan, anchored on Ajmer\'s '
                       'position along the Delhi-Ahmedabad-Mumbai freight corridor.',
                       'Kishangarh handles a majority of India\'s marble trade — over '
                       '~1000 processing units and Asia\'s largest marble mandi.'],
        'districts':  ['Ajmer','Beawar','Nagaur','Didwana-Kuchaman'],
    },
    'ir-jodhpur-pali': {
        'label':      'Jodhpur-Pali Marwar Industrial Region',
        'corridor':   'Marwar textile-and-stone belt',
        'primary_sectors': ['Textile dyeing & processing','Sandstone processing',
                            'Wooden furniture','Handicrafts','Guar-gum processing'],
        'anchors':    ['Boranada Industrial Area (Jodhpur)','Pali dyeing cluster',
                       'Jodhpur handicraft exports','Guar-gum industry (Jodhpur-Jalore)'],
        'facts':      ['One of Rajasthan\'s three major traditional industrial belts.',
                       'Pali is India\'s largest suiting-fabric dyeing hub — with '
                       'ongoing environmental pressure from effluent discharge.',
                       'Jodhpur exports the majority of India\'s hand-carved wooden '
                       'furniture and mojari footwear.'],
        'districts':  ['Jodhpur','Pali','Jalore','Balotra'],
    },
    'ir-kota-bundi': {
        'label':      'Kota-Bundi Industrial Region',
        'corridor':   'Chambal industrial axis',
        'primary_sectors': ['Fertilizer & chemicals','Cement','Power','Coaching-education economy'],
        'anchors':    ['Chambal Fertilisers (Gadepan)','DCM Shriram (Kota)',
                       'Instrumentation Ltd. (Kota)','J.K. White Cement (Gotan)',
                       'Wonder Cement (Nimbahera cluster)'],
        'facts':      ['Anchored on Chambal river water and Kota Super Thermal Power.',
                       'Home to Chambal Fertilisers & Chemicals, one of India\'s '
                       'largest urea producers.',
                       'The coaching-education economy has itself grown into a major '
                       'organised service industry.'],
        'districts':  ['Kota','Bundi','Baran'],
    },
    'ir-udaipur-rajsamand': {
        'label':      'Udaipur-Rajsamand Mining-and-Marble Region',
        'corridor':   'Aravalli minerals-processing belt',
        'primary_sectors': ['Zinc-lead smelting','Marble processing',
                            'Phosphate rock','Fertiliser (SSP)'],
        'anchors':    ['Hindustan Zinc smelters (Debari + Chanderiya)',
                       'JK White Cement (Gotan/Nathdwara belt)',
                       'Rajsamand marble cluster','Rockphosphate at Jhamarkotra'],
        'facts':      ['Rajasthan\'s minerals-processing capital — every major zinc '
                       'and lead smelter in India draws from HZL\'s Udaipur assets.',
                       'The Nathdwara-Rajsamand marble corridor supplies dimension '
                       'stone across India.'],
        'districts':  ['Udaipur','Rajsamand','Chittorgarh','Salumbar'],
    },
}

# ============================================================================
#  INDUSTRIAL CLUSTERS — sector-defined groupings
# ============================================================================

INDUSTRIAL_CLUSTERS = {
    'ic-cement': {
        'label':      'Cement Manufacturing Cluster',
        'sector':     'Cement',
        'ranking':    'Rajasthan is India\'s second-largest cement producer (~15 % '
                      'of national capacity), anchored on the state\'s '
                      'Vindhyan and Marwar limestone belts.',
        'anchors':    ['Shree Cement (Beawar HQ)','JK Cement (Nimbahera)',
                       'Ambuja Cement (Rabriyawas, Pali)','UltraTech (Kotputli, Ras)',
                       'Wonder Cement (Nimbahera)','Birla Corp (Chanderia)',
                       'JK Lakshmi (Sirohi)','Binani Cement (Sirohi)'],
        'raw_materials': ['Limestone','Gypsum','Coal (imported / linked)'],
        'related_minerals': ['mineral-belts-limestone','mineral-belts-gypsum'],
        'related_stones':   [],
        'related_rocks':    ['rock-types-sedimentary'],
        'facts':      ['Chittorgarh, Sirohi, Nagaur, Pali and Bundi together host '
                       'over 20 major integrated cement plants.',
                       'Limestone from the Vindhyan and Marwar Supergroups feeds every '
                       'major kiln in the state — the geology and the industry are '
                       'inseparable.'],
        'districts':  ['Chittorgarh','Sirohi','Nagaur','Didwana-Kuchaman','Pali',
                       'Bundi','Jhalawar','Ajmer','Beawar','Kotputli-Behror'],
    },
    'ic-textile': {
        'label':      'Textile & Apparel Cluster',
        'sector':     'Textiles',
        'ranking':    'Rajasthan\'s textile industry is anchored on Bhilwara — the '
                      '"Manchester of Rajasthan" — plus Pali\'s dyeing cluster and '
                      'the Bhiwadi apparel belt.',
        'anchors':    ['Bhilwara suiting mills','Pali dyeing houses',
                       'RSWM / LNJ Bhilwara','Sangam India (Bhilwara)',
                       'Bhiwadi apparel exporters'],
        'raw_materials': ['Cotton (canal-fed)','Polyester yarn','Wool (Bikaner)',
                          'Synthetic filament yarn'],
        'related_crops':  ['major-crops-cotton'],
        'related_minerals': [],
        'facts':      ['Bhilwara is India\'s largest producer of blended suiting '
                       'fabric — second only to Surat within the man-made '
                       'suiting segment (Coimbatore / Ludhiana / Ahmedabad '
                       'lead in other textile categories).',
                       'Pali\'s dyeing units — >800 in number — draw from Bhilwara '
                       'weaving mills and export finished cloth nationally.',
                       'Bikaner is India\'s largest raw-wool trading centre.'],
        'districts':  ['Bhilwara','Pali','Alwar','Khairthal-Tijara',
                       'Kotputli-Behror','Bikaner'],
    },
    'ic-marble-stone': {
        'label':      'Marble & Dimension-Stone Cluster',
        'sector':     'Stone processing',
        'ranking':    'Rajasthan supplies over 90 % of India\'s marble and a majority '
                      'of its sandstone. Kishangarh alone is the largest marble '
                      'market in Asia.',
        'anchors':    ['Kishangarh Marble Market (Asia\'s largest)',
                       'Makrana marble mines','Rajsamand marble belt',
                       'Nathdwara marble cluster','Jodhpur sandstone yards',
                       'Dholpur red sandstone quarries'],
        'raw_materials': ['White marble (Makrana)','Green marble (Rajsamand)',
                          'Beige marble (Kishangarh)','Buff/red sandstone (Jodhpur, Dholpur)'],
        'related_stones':   ['building-stones-marble','building-stones-sandstone',
                             'building-stones-limestone-stone','building-stones-granite'],
        'related_minerals': ['mineral-belts-marble','mineral-belts-granite','mineral-belts-sandstone'],
        'facts':      ['Makrana marble was used in the Taj Mahal and remains the '
                       'benchmark for white marble in India.',
                       'Kishangarh\'s marble trade — over ~1000 gang-saw units and '
                       'thousands of showrooms — reaches every state.',
                       'Jodhpur and Dholpur sandstone are the primary building '
                       'material for Rajasthan\'s heritage architecture.'],
        'districts':  ['Nagaur','Didwana-Kuchaman','Ajmer','Rajsamand',
                       'Udaipur','Jodhpur','Dholpur'],
    },
    'ic-chemical-refinery': {
        'label':      'Chemical, Petrochemical & Fertilizer Cluster',
        'sector':     'Heavy chemicals & petroleum refining',
        'ranking':    'Rajasthan is set to host India\'s only integrated refinery-and-'
                      'petrochemical complex under construction (HRRL, Barmer), '
                      'alongside its existing Kota chemicals base.',
        'anchors':    ['Chambal Fertilisers (Gadepan)','DCM Shriram (Kota)',
                       'HPCL-Rajasthan Refinery (Pachpadra, Barmer — under construction)',
                       'JK Cement (Nimbahera — captive chemicals)',
                       'Instrumentation Ltd. (Kota)'],
        'raw_materials': ['Chambal water','Natural gas (Cairn)','Crude oil (Cairn Mangala)'],
        'related_minerals': [],
        'facts':      ['Chambal Fertilisers at Gadepan is one of India\'s largest urea '
                       'plants (~3.4 MT/year), supplied by Cairn natural gas.',
                       'The HPCL-Rajasthan Refinery (HRRL) under construction at '
                       'Pachpadra will refine Rajasthan\'s own Barmer crude — India\'s '
                       'first integrated refinery-and-petrochemical complex.',
                       'Kota\'s DCM Shriram unit and Instrumentation Limited make '
                       'the city a chemical-and-engineering hub on the Chambal.'],
        'districts':  ['Kota','Baran','Bundi','Barmer','Balotra'],
    },
    'ic-auto-engineering': {
        'label':      'Automobile & Auto-Component Cluster',
        'sector':     'Automotive assembly + tier-1 components',
        'ranking':    'Rajasthan\'s auto-industry is a post-2005 phenomenon centred on '
                      'DMIC-KBN — Nissan\'s Chennai-alternative plant, Honda\'s Tapukara '
                      'complex and Hero\'s Neemrana line together anchor the belt.',
        'anchors':    ['Nissan India — Renault-Nissan Alliance plant (Neemrana)',
                       'Honda Cars India (Tapukara)','Hero MotoCorp (Neemrana)',
                       'Daikin (Neemrana — appliances)','Ashok Leyland (Alwar)'],
        'raw_materials': ['Steel (imported)','Aluminium','Rubber',
                          'Electronic components (imported/tier-1)'],
        'related_minerals': [],
        'facts':      ['The Nissan-Renault plant at Neemrana produces the Datsun redi-GO '
                       'and other alliance vehicles, exporting to over 100 countries.',
                       'Honda Cars India\'s Tapukara plant is one of Honda\'s two '
                       'Indian assembly plants.',
                       'Hero\'s Neemrana plant is one of the world\'s largest two-wheeler '
                       'facilities by volume.'],
        'districts':  ['Alwar','Khairthal-Tijara','Kotputli-Behror'],
    },
    'ic-ceramics-glass': {
        'label':      'Ceramics, Glass & Refractory Cluster',
        'sector':     'Ceramics · sanitaryware · refractories',
        'ranking':    'Rajasthan hosts the second-largest ceramics belt in India '
                      '(after Morbi, Gujarat) — clustered on Bikaner\'s ball-clay '
                      'reserves and Kishangarh\'s tile mills.',
        'anchors':    ['Somany Ceramics (Kishangarh)','H&R Johnson (Karauli)',
                       'Cera (Kishangarh)','Kajaria (Bhiwadi)'],
        'raw_materials': ['Ball clay (Bikaner)','China clay','Feldspar','Silica sand',
                          'Wollastonite (Belka)'],
        'related_minerals': ['mineral-belts-wollastonite'],
        'facts':      ['Bikaner\'s ball-clay reserves are among the largest in India '
                       'and feed the state\'s tile and sanitaryware industry.',
                       'The Kishangarh tile cluster and Bhiwadi\'s Kajaria plant '
                       'together give Rajasthan India\'s second-largest ceramics '
                       'output after Morbi.'],
        'districts':  ['Bikaner','Ajmer','Karauli','Alwar','Khairthal-Tijara'],
    },
    'ic-salt-wool': {
        'label':      'Salt, Wool & Agri-Processing Cluster',
        'sector':     'Traditional resource-based industries',
        'ranking':    'Rajasthan is India\'s largest inland-salt producer '
                      '(contributing ~10 % of national salt output) and the '
                      'country\'s largest raw-wool market.',
        'anchors':    ['Sambhar Salt Ltd. (Sambhar Lake)','Bikaner wool mandi',
                       'Kinnow processing (Sri Ganganagar)','Isabgol processing (Nagaur)',
                       'Guar-gum plants (Jodhpur–Jalore belt)'],
        'raw_materials': ['Salt (Sambhar brine)','Raw wool','Kinnow','Guar','Isabgol'],
        'related_lakes':  [],  # wired via KG separately to sambhar-lake
        'related_crops':  ['major-crops-horticulture','major-crops-pulses'],
        'facts':      ['Sambhar Lake is India\'s largest inland salt lake — Rajasthan '
                       'contributes ~10 % of India\'s salt output, most of it from '
                       'Sambhar plus satellite lakes at Nawa, Kuchaman and Pachpadra.',
                       'Bikaner\'s wool mandi handles most of India\'s raw-wool trade.',
                       'Nagaur produces almost all of India\'s isabgol (Plantago ovata).',
                       'The Jodhpur–Jalore belt hosts India\'s largest guar-gum industry, '
                       'supplying the shale-gas fracking market globally.'],
        'districts':  ['Nagaur','Didwana-Kuchaman','Jaipur','Bikaner',
                       'Sri Ganganagar','Jodhpur','Jalore'],
    },
    'ic-handicraft': {
        'label':      'Handicraft & Traditional Crafts Cluster',
        'sector':     'Handicrafts',
        'ranking':    'Rajasthan is India\'s largest handicraft-exports state, with '
                      '~12 % of the country\'s handicraft output.',
        'anchors':    ['Jaipur gems & jewellery cluster','Sanganer & Bagru printing',
                       'Jodhpur furniture & mojari','Molela terracotta',
                       'Nathdwara Pichwai painters','Kota Doria weaving',
                       'Bikaner Usta artists','Bhawani Mandi bidi cluster'],
        'raw_materials': ['Precious stones (imported)','Cotton (block-printing)',
                          'Sheesham & mango wood','Camel bone (Usta)'],
        'related_stones': [],
        'related_crops':  [],
        'facts':      ['Jaipur\'s Sitapura SEZ is India\'s only dedicated gems-and-'
                       'jewellery SEZ — Jaipur cuts and polishes a large share of '
                       'the world\'s emeralds.',
                       'Sanganer + Bagru together form the epicentre of India\'s hand-'
                       'block-printing tradition — both are GI-tagged.',
                       'Kota Doria (Kaithun), Molela terracotta, Blue Pottery of Jaipur '
                       'and Bikaneri Bhujia are all GI-registered products of the state.'],
        'districts':  ['Jaipur','Jodhpur','Rajsamand','Kota','Bikaner','Ajmer','Alwar'],
    },
}

# ============================================================================
#  RIICO INDUSTRIAL AREAS — points with real coordinates
#  Coordinates: RIICO industrial-area listings + OSM cross-check.
# ============================================================================

INDUSTRIAL_AREAS = [
    {'id':'bhiwadi',      'name':'Bhiwadi Industrial Area',
     'lonlat':[76.8580, 28.2093], 'district':'Khairthal-Tijara',
     'anchor_sector':'Auto components · steel · engineering',
     'notable_units':['Kajaria Ceramics','Saint-Gobain','Havells','Hero MotoCorp (nearby)'],
     'commissioned':'1980s (largest RIICO estate)',
     'source':'RIICO industrial-area listing + OSM'},
    {'id':'neemrana',     'name':'Neemrana Industrial Area (Japanese Zone)',
     'lonlat':[76.3854, 27.9832], 'district':'Kotputli-Behror',
     'anchor_sector':'Japanese OEMs — auto & appliances',
     'notable_units':['Nissan India','Daikin','Mitsui','Hero MotoCorp'],
     'commissioned':'2006 (JIZ notified 2011)',
     'source':'RIICO + DMICDC'},
    {'id':'tapukara',     'name':'Tapukara Industrial Area',
     'lonlat':[76.7480, 28.0122], 'district':'Khairthal-Tijara',
     'anchor_sector':'Automobile assembly',
     'notable_units':['Honda Cars India'],
     'commissioned':'2010s',
     'source':'RIICO + Honda disclosures'},
    {'id':'chopanki',     'name':'Chopanki Industrial Area',
     'lonlat':[76.7860, 28.2130], 'district':'Khairthal-Tijara',
     'anchor_sector':'Engineering · packaging',
     'notable_units':['Multiple tier-2 auto-component suppliers'],
     'commissioned':'2000s',
     'source':'RIICO'},
    {'id':'sitapura-jaipur','name':'Sitapura Industrial Area (Jaipur)',
     'lonlat':[75.8422, 26.7794], 'district':'Jaipur',
     'anchor_sector':'Gems & jewellery · IT · light engineering',
     'notable_units':['Gems & Jewellery SEZ','Genpact','many jewellery ateliers'],
     'commissioned':'1980s',
     'source':'RIICO + Sitapura SEZ notification'},
    {'id':'sanganer-jaipur','name':'Sanganer Industrial Area (Jaipur)',
     'lonlat':[75.7920, 26.8100], 'district':'Jaipur',
     'anchor_sector':'Textile hand printing · handicrafts',
     'notable_units':['Sanganer hand-block printing units','handicraft ateliers'],
     'commissioned':'Traditional cluster; formalised 1970s',
     'source':'RIICO + DoIC'},
    {'id':'boranada-jodhpur','name':'Boranada Industrial Area (Jodhpur)',
     'lonlat':[72.9560, 26.2050], 'district':'Jodhpur',
     'anchor_sector':'Handicraft exports · guar-gum · steel',
     'notable_units':['Jodhpur Handicraft SEZ','Vardhman Special Steels'],
     'commissioned':'1990s',
     'source':'RIICO + Boranada SEZ notification'},
    {'id':'bhilwara-ia',  'name':'Bhilwara Industrial Area',
     'lonlat':[74.6398, 25.3572], 'district':'Bhilwara',
     'anchor_sector':'Textile — spinning · weaving · processing',
     'notable_units':['RSWM Ltd.','Sangam India','Bhilwara Group'],
     'commissioned':'1970s',
     'source':'RIICO + LNJ Bhilwara disclosures'},
    {'id':'pali-ia',      'name':'Pali Industrial Area',
     'lonlat':[73.3234, 25.7723], 'district':'Pali',
     'anchor_sector':'Textile dyeing & processing',
     'notable_units':['Over 800 dyeing houses','Common Effluent Treatment Plant'],
     'commissioned':'1980s',
     'source':'RIICO + Pali District Industry Centre'},
    {'id':'kishangarh-ia','name':'Kishangarh Industrial Area',
     'lonlat':[74.8577, 26.5842], 'district':'Ajmer',
     'anchor_sector':'Marble processing · ceramics · logistics',
     'notable_units':['Kishangarh Marble Market','Somany Ceramics','ICD logistics'],
     'commissioned':'1980s',
     'source':'RIICO + Kishangarh Marble Association'},
    {'id':'kotputli-ia',  'name':'Kotputli Industrial Area',
     'lonlat':[76.2020, 27.7020], 'district':'Kotputli-Behror',
     'anchor_sector':'Cement · beverages · engineering',
     'notable_units':['UltraTech Cement (Adityapuram)','Bisleri'],
     'commissioned':'1990s',
     'source':'RIICO + UltraTech disclosures'},
    {'id':'beawar-ia',    'name':'Beawar Industrial Area',
     'lonlat':[74.3159, 26.1013], 'district':'Beawar',
     'anchor_sector':'Cement · minerals · packaging',
     'notable_units':['Shree Cement (headquarters)'],
     'commissioned':'1970s',
     'source':'RIICO + Shree Cement disclosures'},
]

# ============================================================================
#  MAJOR INDUSTRIES — flagship units as points
# ============================================================================

MAJOR_INDUSTRIES = [
    {'id':'nissan-neemrana','name':'Nissan India — Renault-Nissan Alliance Plant',
     'lonlat':[76.3860, 27.9852], 'district':'Kotputli-Behror','sector':'Automobile',
     'output':'Datsun redi-GO, Renault Kwid, other alliance vehicles — export-focused',
     'commissioned':'2010',
     'source':'Nissan India press release + Renault-Nissan Alliance disclosures'},
    {'id':'honda-tapukara','name':'Honda Cars India — Tapukara Plant',
     'lonlat':[76.7480, 28.0122], 'district':'Khairthal-Tijara','sector':'Automobile',
     'output':'Assembly of Honda passenger cars for the Indian market',
     'commissioned':'2014',
     'source':'Honda Cars India disclosures'},
    {'id':'hero-neemrana','name':'Hero MotoCorp — Neemrana Plant',
     'lonlat':[76.3900, 27.9700], 'district':'Kotputli-Behror','sector':'Two-wheelers',
     'output':'Two-wheeler manufacturing — one of the largest facilities in the world',
     'commissioned':'2014',
     'source':'Hero MotoCorp disclosures'},
    {'id':'shree-beawar','name':'Shree Cement — Beawar Plant (Headquarters)',
     'lonlat':[74.3159, 26.1013], 'district':'Beawar','sector':'Cement',
     'output':'One of India\'s largest cement producers — clinker + grinding',
     'commissioned':'1985',
     'source':'Shree Cement disclosures'},
    {'id':'jk-nimbahera','name':'JK Cement — Nimbahera Plant',
     'lonlat':[74.6800, 24.6212], 'district':'Chittorgarh','sector':'Cement',
     'output':'Grey and white cement — Nimbahera is JK\'s flagship location',
     'commissioned':'1975',
     'source':'JK Cement disclosures'},
    {'id':'wonder-nimbahera','name':'Wonder Cement — Nimbahera Plant',
     'lonlat':[74.6570, 24.6260], 'district':'Chittorgarh','sector':'Cement',
     'output':'Integrated cement plant (~10 MT/year)',
     'commissioned':'2012',
     'source':'Wonder Cement disclosures'},
    {'id':'ambuja-rabriyawas','name':'Ambuja Cements — Rabriyawas Plant',
     'lonlat':[73.6180, 25.6640], 'district':'Pali','sector':'Cement',
     'output':'Integrated cement — one of Ambuja\'s Rajasthan units',
     'commissioned':'1996',
     'source':'Ambuja Cements disclosures'},
    {'id':'birla-chanderia','name':'Birla Corporation — Chanderia Plant',
     'lonlat':[74.6650, 24.9200], 'district':'Chittorgarh','sector':'Cement',
     'output':'Cement and jute unit — one of Birla Corp\'s largest',
     'commissioned':'1967',
     'source':'Birla Corporation disclosures'},
    {'id':'ultratech-adityapuram','name':'UltraTech Cement — Adityapuram (Kotputli)',
     'lonlat':[75.6520, 27.8125], 'district':'Kotputli-Behror','sector':'Cement',
     'output':'Integrated cement plant',
     'commissioned':'2009',
     'source':'UltraTech disclosures'},
    {'id':'chambal-gadepan','name':'Chambal Fertilisers & Chemicals — Gadepan',
     'lonlat':[75.9600, 25.3300], 'district':'Kota','sector':'Fertilizer',
     'output':'One of India\'s largest urea plants — ~3.4 MT/year',
     'commissioned':'1994 (Unit I); 1999 (Unit II)',
     'source':'Chambal Fertilisers disclosures'},
    {'id':'hrrl-pachpadra','name':'HPCL-Rajasthan Refinery — Pachpadra',
     'lonlat':[72.2010, 25.9560], 'district':'Balotra','sector':'Petroleum refining',
     'output':'9 MTPA refinery + integrated petrochemical complex — first refinery '
              'in India with a captive Rajasthan-crude source (under construction)',
     'commissioned':'Under construction — commissioning expected in the late 2020s',
     'source':'HPCL-Rajasthan Refinery Ltd. + PIB'},
    {'id':'sambhar-salt','name':'Sambhar Salts Ltd. — Sambhar Lake Works',
     'lonlat':[75.1980, 26.9080], 'district':'Nagaur','sector':'Salt',
     'output':'~200,000 tonnes/year — largest inland-salt producer in India',
     'commissioned':'1870s (British era; nationalised 1964 as HSL-Sambhar)',
     'source':'Hindustan Salts Ltd. + PIB'},
]

# ============================================================================
#  SPECIAL ECONOMIC ZONES (SEZ) — MoCI-notified
# ============================================================================

SEZS = [
    {'id':'mwc-jaipur',   'name':'Mahindra World City — Jaipur',
     'lonlat':[75.7300, 26.7000], 'district':'Jaipur',
     'sector':'Multi-product IT/ITeS + engineering',
     'notified':'2007 (multi-product SEZ)',
     'facts':['One of India\'s early integrated business-city SEZs.',
              'Hosts Deutsche Bank, Infosys, TCS, Genpact and other majors.'],
     'source':'MoCI SEZ notification + MWC disclosures'},
    {'id':'sez-sitapura', 'name':'Sitapura SEZ (Gems & Jewellery)',
     'lonlat':[75.8500, 26.7800], 'district':'Jaipur',
     'sector':'Gems, jewellery, coloured-stone cutting & polishing',
     'notified':'2003',
     'facts':['India\'s only sector-specific gems-and-jewellery SEZ.',
              'Jaipur cuts a large share of the world\'s emeralds, and Sitapura is '
              'the industry\'s dedicated export enclave.'],
     'source':'MoCI + RIICO'},
    {'id':'sez-boranada', 'name':'Boranada SEZ (Handicraft)',
     'lonlat':[72.9500, 26.2000], 'district':'Jodhpur',
     'sector':'Handicraft exports',
     'notified':'2008',
     'facts':['Dedicated handicraft-and-carpet export SEZ around Jodhpur.',
              'Jodhpur handicraft exports account for a majority of India\'s '
              'wood-craft trade.'],
     'source':'MoCI + Rajasthan SEZ Development Corporation'},
    {'id':'sez-somany',   'name':'Somany Ceramics SEZ — Kishangarh',
     'lonlat':[74.8600, 26.5850], 'district':'Ajmer',
     'sector':'Ceramic tiles & sanitaryware',
     'notified':'2007',
     'facts':['Sector-specific ceramics SEZ adjacent to the Kishangarh marble market.',
              'Uses Bikaner ball clay and Rajasthan feldspar/silica.'],
     'source':'MoCI + Somany Ceramics disclosures'},
]

# ============================================================================
#  HANDICRAFT CLUSTERS — GI-tagged / traditional craft centres
# ============================================================================

HANDICRAFT_CLUSTERS = [
    {'id':'blue-pottery',     'name':'Jaipur Blue Pottery',
     'lonlat':[75.8100, 26.9200], 'district':'Jaipur',
     'craft':'Turquoise-blue quartz pottery',
     'gi_status':'GI-registered (No. 40, 2006 — "Blue Pottery of Jaipur")',
     'facts':['A Persian craft brought to Jaipur under Sawai Ram Singh II.',
              'Made from powdered quartz — the only pottery in India without any clay.'],
     'source':'GI Registry + Rajasthan Tourism'},
    {'id':'sanganeri-printing','name':'Sanganeri Hand Printing',
     'lonlat':[75.7900, 26.8100], 'district':'Jaipur',
     'craft':'Hand-block cotton printing',
     'gi_status':'GI-registered (No. 145, 2010)',
     'facts':['Fine floral motifs printed with vegetable dyes on cotton.',
              'A cottage industry practised by the Chhipa community for centuries.'],
     'source':'GI Registry'},
    {'id':'bagru-printing',   'name':'Bagru Hand Printing',
     'lonlat':[75.5450, 26.8130], 'district':'Jaipur',
     'craft':'Natural-dye hand-block printing',
     'gi_status':'GI-registered (No. 348, 2010)',
     'facts':['Distinctive earth-tone geometric prints in indigo, ochre and madder.',
              'The Bagru palette is defined by its use of iron-mordant dyes.'],
     'source':'GI Registry'},
    {'id':'kota-doria',       'name':'Kota Doria (Kaithun weaving)',
     'lonlat':[76.0250, 25.1750], 'district':'Kota',
     'craft':'Light gauzy cotton-silk weaving with square-check "khat" pattern',
     'gi_status':'GI-registered (No. 22, 2005)',
     'facts':['Named for the Rajput queens who patronised the weave in the 17th c.',
              'Woven with cotton warp and silk weft — unique among Indian handlooms.'],
     'source':'GI Registry + Kaithun Weavers Cooperative'},
    {'id':'molela-terracotta','name':'Molela Terracotta',
     'lonlat':[73.9400, 24.7200], 'district':'Rajsamand',
     'craft':'Votive terracotta plaques of tribal deities',
     'gi_status':'GI-registered (No. 145, 2011)',
     'facts':['A caste-specialised craft of the Kumhars of Molela village.',
              'Plaques of the tribal god Devnarayan and other deities are '
              'commissioned by Bhil and Garasia families across southern Rajasthan.'],
     'source':'GI Registry + Rajasthan Handicraft Development Corporation'},
    {'id':'nathdwara-pichwai','name':'Nathdwara Pichwai Painting',
     'lonlat':[73.8180, 24.9280], 'district':'Rajsamand',
     'craft':'Devotional Pichwai painting of Shrinathji',
     'gi_status':'GI application under review',
     'facts':['Devotional cloth paintings commissioned for the Shrinathji temple.',
              'Practised by the Adi Gaur painter families for over four centuries.'],
     'source':'Rajasthan Handicraft Development Corporation'},
    {'id':'jodhpur-furniture','name':'Jodhpur Wooden Furniture & Mojari',
     'lonlat':[73.0245, 26.2830], 'district':'Jodhpur',
     'craft':'Hand-carved sheesham and mango-wood furniture; mojari footwear',
     'gi_status':'Mojari of Rajasthan GI-registered (No. 30, 2007)',
     'facts':['Jodhpur is India\'s largest hand-crafted-furniture exporter.',
              'The Mojari footwear cluster spans Jodhpur, Jaipur and Bhinmal.'],
     'source':'GI Registry + Jodhpur Handicraft Exporters Federation'},
    {'id':'bikaner-usta',     'name':'Bikaner Usta / Gold Manauti Art',
     'lonlat':[73.3100, 28.0230], 'district':'Bikaner',
     'craft':'Gold-embossed camel-hide painting on ivory ground',
     'gi_status':'GI-registered (No. 43, 2008 — "Bikaner Usta Art")',
     'facts':['Practised by the Usta community; commissioned by Bikaner royal '
              'painters for palace interiors and religious manuscripts.',
              'The gold manauti technique combines miniature painting with '
              'shell-lime gold-embossing.'],
     'source':'GI Registry'},
    {'id':'bikaneri-bhujia',  'name':'Bikaneri Bhujia (Namkeen)',
     'lonlat':[73.3120, 28.0290], 'district':'Bikaner',
     'craft':'Spiced fried-gram-flour snack — origin Bikaner',
     'gi_status':'GI-registered (No. 174, 2009)',
     'facts':['A century-old snack with a modern industry — Haldiram\'s and Bhikharam '
              'Chandmal originated in Bikaner\'s Bhujia manufacturing tradition.',
              'GI-registered specifically for the moth-bean and gram-flour recipe.'],
     'source':'GI Registry'},
    {'id':'makrana-marble-craft','name':'Makrana Marble Craft',
     'lonlat':[74.7290, 27.0480], 'district':'Nagaur',
     'craft':'Marble-carving traditions of Makrana',
     'gi_status':'Application under review',
     'facts':['Makrana\'s marble-carvers built the Taj Mahal, Dilwara Jain temples '
              'and Victoria Memorial.',
              'A living stone-craft tradition tied to the Makrana marble mines.'],
     'source':'Rajasthan Handicraft Development Corporation'},
]

# ============================================================================
#  Emit helpers
# ============================================================================

def emit_polygon_layer(zones, layer_id, feature_type, source_ref, category='industry'):
    bym = load_districts()
    features = []
    for zone_id, meta in zones.items():
        geom = merge_districts(meta['districts'], bym)
        if not geom:
            print(f'!! no geometry for {layer_id}/{zone_id}', file=sys.stderr); continue
        cent = centroid_of(geom['coordinates'])
        bbox = bbox_of(geom['coordinates'])
        props = {
            'name':            meta['label'],
            'type':            feature_type,
            'category':        category,
            'state':           STATE,
            'zone_id':         zone_id,
            'source':          source_ref,
            'lastUpdated':     RETRIEVED,
            'centroid':        [round(cent[0], 5), round(cent[1], 5)],
            'labelAnchor':     [round(cent[0], 5), round(cent[1], 5)],
            'bbox':            [round(v, 5) for v in bbox],
            'districts_included': meta['districts'],
            'geometryQuality': 'generalised (district-approximated)',
            'geometryNote':    ('Boundary is the union of the constituent districts. '
                                'The classification\'s real boundary crosses districts; '
                                'refer to the cited source for the authoritative line.'),
            'notes':           {'facts': meta.get('facts', []), 'mnemonic': '',
                                'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': 'RIICO / DoIC Rajasthan', 'status': 'operational'},
        }
        for k, v in meta.items():
            if k in ('label', 'districts', 'facts'): continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id': f'{layer_id}-{zone_id}',
            'properties': props,
            'geometry': geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')

def emit_point_layer(items, layer_id, feature_type, source_ref, category='industry'):
    features = []
    for d in items:
        geom = {'type': 'Point', 'coordinates': d['lonlat']}
        cent = d['lonlat']
        bbox = bbox_of(geom['coordinates'])
        facts = d.get('facts')
        if not facts:
            # Compose a default one-liner so every point has a fact block
            fact_line = d.get('anchor_sector') or d.get('sector') or d.get('craft') or ''
            facts = [fact_line] if fact_line else []
        props = {
            'name':            d['name'],
            'type':            feature_type,
            'category':        category,
            'state':           STATE,
            'district':        d['district'],
            'source':          d.get('source', source_ref),
            'lastUpdated':     RETRIEVED,
            'centroid':        [round(cent[0], 5), round(cent[1], 5)],
            'labelAnchor':     [round(cent[0], 5), round(cent[1], 5)],
            'bbox':            [round(v, 5) for v in bbox],
            'geometryQuality': 'point',
            'notes':           {'facts': facts, 'mnemonic': '',
                                'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': d.get('authority', 'RIICO / DoIC Rajasthan'),
                                'status':    d.get('status', 'operational')},
        }
        for k, v in d.items():
            if k in ('name', 'lonlat', 'district', 'source', 'facts'): continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id': f'{layer_id}-{d["id"]}',
            'properties': props,
            'geometry': geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')

# ============================================================================
#  KNOWLEDGE GRAPH EXPANSION — link industry to minerals, crops, rocks, water
# ============================================================================

def build_kg_expansion():
    edges = []

    # Industrial clusters → underlying inputs (minerals, crops, stones, rocks)
    for cid, meta in INDUSTRIAL_CLUSTERS.items():
        related = []
        for m in meta.get('related_minerals', []):
            related.append({'target': m, 'type': 'colocated',
                            'explanation': f'{meta["label"]} draws its raw material '
                                           f'from this mineral belt.'})
        for r in meta.get('related_rocks', []):
            related.append({'target': r, 'type': 'colocated',
                            'explanation': f'{meta["label"]} is anchored on this '
                                           f'rock type.'})
        for c in meta.get('related_crops', []):
            related.append({'target': c, 'type': 'colocated',
                            'explanation': f'{meta["label"]} is the downstream '
                                           f'processor of this crop.'})
        for s in meta.get('related_stones', []):
            related.append({'target': s, 'type': 'colocated',
                            'explanation': f'{meta["label"]} processes this '
                                           f'building stone.'})
        if related:
            edges.append({'source': f'industrial-clusters-{cid}', 'related': related})

    # Regions → clusters they contain
    region_to_clusters = {
        'ir-dmic-kbn':         ['ic-auto-engineering','ic-textile'],
        'ir-ajmer-kishangarh': ['ic-marble-stone','ic-cement','ic-ceramics-glass'],
        'ir-jodhpur-pali':     ['ic-textile','ic-marble-stone','ic-handicraft',
                                'ic-salt-wool','ic-chemical-refinery'],
        'ir-kota-bundi':       ['ic-cement','ic-chemical-refinery'],
        'ir-udaipur-rajsamand':['ic-marble-stone','ic-cement','ic-handicraft'],
    }
    for rid, clusters in region_to_clusters.items():
        related = [{'target': f'industrial-clusters-{c}', 'type': 'colocated',
                    'explanation': f'This cluster sits within the {rid} region.'}
                   for c in clusters]
        edges.append({'source': f'industrial-regions-{rid}', 'related': related})

    # Flagship units → sector cluster + input geography
    industry_to_cluster = {
        'nissan-neemrana':    ('ic-auto-engineering', 'ir-dmic-kbn'),
        'honda-tapukara':     ('ic-auto-engineering', 'ir-dmic-kbn'),
        'hero-neemrana':      ('ic-auto-engineering', 'ir-dmic-kbn'),
        'shree-beawar':       ('ic-cement',           'ir-ajmer-kishangarh'),
        'jk-nimbahera':       ('ic-cement',           'ir-udaipur-rajsamand'),
        'wonder-nimbahera':   ('ic-cement',           'ir-udaipur-rajsamand'),
        'ambuja-rabriyawas':  ('ic-cement',           'ir-jodhpur-pali'),
        'birla-chanderia':    ('ic-cement',           'ir-udaipur-rajsamand'),
        'ultratech-adityapuram':('ic-cement',         'ir-dmic-kbn'),
        'chambal-gadepan':    ('ic-chemical-refinery','ir-kota-bundi'),
        'hrrl-pachpadra':     ('ic-chemical-refinery','ir-jodhpur-pali'),
        'sambhar-salt':       ('ic-salt-wool',        'ir-ajmer-kishangarh'),
    }
    for iid, (cluster, region) in industry_to_cluster.items():
        related = [
            {'target': f'industrial-clusters-{cluster}', 'type': 'signature',
             'explanation': 'Flagship unit of this cluster.'},
            {'target': f'industrial-regions-{region}',   'type': 'colocated',
             'explanation': 'Located inside this industrial region.'},
        ]
        edges.append({'source': f'major-industries-{iid}', 'related': related})

    # Cement flagships → limestone belts (their raw-material geology)
    for iid in ['shree-beawar','jk-nimbahera','wonder-nimbahera','ambuja-rabriyawas',
                'birla-chanderia','ultratech-adityapuram']:
        edges.append({'source': f'major-industries-{iid}', 'related': [
            {'target': 'mineral-belts-limestone', 'type': 'defines',
             'explanation': 'Draws its limestone from the Rajasthan limestone belt.'},
            {'target': 'rock-types-sedimentary', 'type': 'colocated',
             'explanation': 'Sedimentary parent rock of the limestone feedstock.'},
        ]})

    # Barmer refinery → Barmer basin oil + Mangala field
    edges.append({'source': 'major-industries-hrrl-pachpadra', 'related': [
        {'target': 'petroleum-gas-barmer-basin', 'type': 'defines',
         'explanation': 'Refines the crude from the Barmer sedimentary basin.'},
        {'target': 'petroleum-gas-mangala-field', 'type': 'signature',
         'explanation': 'Mangala is the principal crude source for HRRL.'},
    ]})

    # Sambhar Salts → cross-links (Sambhar lake is not yet a shipped feature —
    # only the salt-cluster edge is authoritative here).
    edges.append({'source': 'major-industries-sambhar-salt', 'related': [
        {'target': 'industrial-clusters-ic-salt-wool', 'type': 'signature',
         'explanation': 'Flagship unit of the salt-and-wool cluster; draws brine '
                        'from Sambhar Lake (not currently shipped as a feature).'},
    ]})

    # Chambal Fertilisers → Chambal river + Kota barrage
    edges.append({'source': 'major-industries-chambal-gadepan', 'related': [
        {'target': 'chambal-river', 'type': 'defines',
         'explanation': 'Uses Chambal river water for cooling and process.'},
        {'target': 'dam-kota-barrage', 'type': 'colocated',
         'explanation': 'Fed by regulated flow from the Kota Barrage.'},
    ]})

    # SEZs → parent cluster + anchoring industry
    sez_to_cluster = {
        'mwc-jaipur':   ['ic-handicraft'],  # multi-product but Jaipur-anchored
        'sez-sitapura': ['ic-handicraft'],  # gems & jewellery family
        'sez-boranada': ['ic-handicraft','ic-textile'],
        'sez-somany':   ['ic-ceramics-glass','ic-marble-stone'],
    }
    for sid, clusters in sez_to_cluster.items():
        related = [{'target': f'industrial-clusters-{c}', 'type': 'signature',
                    'explanation': 'Dedicated export enclave for this cluster.'}
                   for c in clusters]
        edges.append({'source': f'special-economic-zones-{sid}', 'related': related})

    # Handicraft clusters → parent handicraft cluster + related crops/stones
    hc_common = [{'target': 'industrial-clusters-ic-handicraft', 'type': 'colocated',
                  'explanation': 'Part of Rajasthan\'s handicraft cluster.'}]
    craft_to_extras = {
        'sanganeri-printing': [
            {'target': 'major-crops-cotton', 'type': 'colocated',
             'explanation': 'Prints on cotton fabric.'}],
        'bagru-printing': [
            {'target': 'major-crops-cotton', 'type': 'colocated',
             'explanation': 'Prints on cotton fabric.'}],
        'makrana-marble-craft': [
            {'target': 'mineral-belts-marble', 'type': 'defines',
             'explanation': 'Carves the marble mined at Makrana.'},
            {'target': 'building-stones-marble', 'type': 'defines',
             'explanation': 'Craft based on Makrana white marble.'}],
        'jodhpur-furniture': [
            {'target': 'building-stones-sandstone', 'type': 'colocated',
             'explanation': 'Alongside sandstone, Jodhpur is a wood-crafts hub.'}],
    }
    for hc in HANDICRAFT_CLUSTERS:
        related = list(hc_common) + craft_to_extras.get(hc['id'], [])
        edges.append({'source': f'handicraft-clusters-{hc["id"]}', 'related': related})

    # Industrial areas → parent regions
    area_to_region = {
        'bhiwadi':       'ir-dmic-kbn',
        'neemrana':      'ir-dmic-kbn',
        'tapukara':      'ir-dmic-kbn',
        'chopanki':      'ir-dmic-kbn',
        'sitapura-jaipur':'ir-ajmer-kishangarh',
        'sanganer-jaipur':'ir-ajmer-kishangarh',
        'boranada-jodhpur':'ir-jodhpur-pali',
        'bhilwara-ia':    'ir-udaipur-rajsamand',
        'pali-ia':        'ir-jodhpur-pali',
        'kishangarh-ia':  'ir-ajmer-kishangarh',
        'kotputli-ia':    'ir-dmic-kbn',
        'beawar-ia':      'ir-ajmer-kishangarh',
    }
    for aid, rid in area_to_region.items():
        edges.append({'source': f'industrial-areas-{aid}', 'related': [
            {'target': f'industrial-regions-{rid}', 'type': 'colocated',
             'explanation': 'Sits within this industrial region.'},
        ]})

    # Bhilwara/Pali industrial areas → textile cluster
    edges += [
        {'source': 'industrial-areas-bhilwara-ia', 'related': [
            {'target': 'industrial-clusters-ic-textile', 'type': 'signature'},
            {'target': 'major-crops-cotton', 'type': 'colocated'},
        ]},
        {'source': 'industrial-areas-pali-ia', 'related': [
            {'target': 'industrial-clusters-ic-textile', 'type': 'signature'},
        ]},
        {'source': 'industrial-areas-kishangarh-ia', 'related': [
            {'target': 'industrial-clusters-ic-marble-stone', 'type': 'signature'},
            {'target': 'mineral-belts-marble', 'type': 'defines'},
        ]},
        {'source': 'industrial-areas-boranada-jodhpur', 'related': [
            {'target': 'industrial-clusters-ic-handicraft', 'type': 'signature'},
            {'target': 'building-stones-sandstone', 'type': 'colocated'},
        ]},
        {'source': 'industrial-areas-sitapura-jaipur', 'related': [
            {'target': 'industrial-clusters-ic-handicraft', 'type': 'signature'},
            {'target': 'special-economic-zones-sez-sitapura', 'type': 'defines'},
        ]},
        {'source': 'industrial-areas-beawar-ia', 'related': [
            {'target': 'industrial-clusters-ic-cement', 'type': 'signature'},
            {'target': 'mineral-belts-limestone', 'type': 'defines'},
        ]},
        {'source': 'industrial-areas-kotputli-ia', 'related': [
            {'target': 'industrial-clusters-ic-cement', 'type': 'colocated'},
        ]},
    ]

    return edges


def merge_kg_expansion(new_edges):
    """Merge idempotently — dedupe by (target, type) within each source group so
    re-running the build does not accumulate duplicates."""
    kg_path = OUT / 'knowledge-graph.json'
    kg = json.load(open(kg_path))
    existing_by_source = {g['source']: i for i, g in enumerate(kg['edges'])}
    for group in new_edges:
        if group['source'] in existing_by_source:
            merged = kg['edges'][existing_by_source[group['source']]]['related'] + group['related']
        else:
            merged = list(group['related'])
        seen = set(); unique = []
        for e in merged:
            key = (e['target'], e['type'])
            if key in seen: continue
            seen.add(key); unique.append(e)
        if group['source'] in existing_by_source:
            kg['edges'][existing_by_source[group['source']]]['related'] = unique
        else:
            kg['edges'].append({'source': group['source'], 'related': unique})
    kg_path.write_text(json.dumps(kg, indent=2))
    total = sum(len(g['related']) for g in kg['edges'])
    print(f'knowledge-graph.json: {len(kg["edges"])} source groups · {total} typed edges')


def main():
    emit_polygon_layer(INDUSTRIAL_REGIONS,  'industrial-regions',  'industrial_region',
                       'DMICDC + DoIC Rajasthan node maps; RIICO annual reports')
    emit_polygon_layer(INDUSTRIAL_CLUSTERS, 'industrial-clusters', 'industrial_cluster',
                       'DoIC Rajasthan sectoral studies; industry association reports')
    emit_point_layer(INDUSTRIAL_AREAS,   'industrial-areas',        'industrial_area',
                     'RIICO industrial-area listings')
    emit_point_layer(MAJOR_INDUSTRIES,   'major-industries',        'major_industry',
                     'Company disclosures + press')
    emit_point_layer(SEZS,               'special-economic-zones',  'special_economic_zone',
                     'MoCI SEZ notifications + RIICO')
    emit_point_layer(HANDICRAFT_CLUSTERS,'handicraft-clusters',     'handicraft_cluster',
                     'Geographical Indications Registry + Rajasthan Handicraft Development Corporation')

    new = build_kg_expansion()
    (OUT / 'knowledge-graph-industry.json').write_text(json.dumps({'edges': new}, indent=2))
    print(f'wrote knowledge-graph-industry.json: {len(new)} new edge groups')
    merge_kg_expansion(new)


if __name__ == '__main__':
    main()
