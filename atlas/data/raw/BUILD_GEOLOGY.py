"""
BUILD_GEOLOGY.py — Geology · Minerals · Mining pipeline.

Outputs (into atlas/data/):
    geological-provinces.geojson  — 8 tectono-stratigraphic provinces (GSI)
    rock-types.geojson            — 5 rock-type groups
    mineral-belts.geojson         — 10 major mineral provinces
    major-mines.geojson           — 18 major mines (points, cited)
    building-stones.geojson       — 6 building-stone belts
    petroleum-gas.geojson         — Barmer basin polygon + 4 field points
    mining-clusters.geojson       — 6 major mining-cluster districts

    knowledge-graph-geo.json      — 50+ new typed edges merged into main graph

SOURCES (documented in DATA_SOURCES.md):
    GSI  — Geological Survey of India (province boundaries, ages, lithology)
    DMG  — Directorate of Mines & Geology, Rajasthan (belt district assignments)
    IBM  — Indian Bureau of Mines (production statistics)
    MoM  — Ministry of Mines, Government of India
    HZL  — Hindustan Zinc Ltd. (public disclosures — Zawar, Rampura Agucha etc.)
    HCL  — Hindustan Copper Ltd. (public disclosures — Khetri)
    RSMDC — Rajasthan State Mineral Development Corporation
    OGDC — ONGC (Oil & Natural Gas Corporation) public field register

Every polygon = union of constituent districts, marked
`geometryQuality: "generalised (district-approximated)"`. Mines are point
features with `geometryQuality: "point"`.
"""

import json
import math
import sys
from pathlib import Path

HERE      = Path(__file__).parent
OUT       = HERE.parent
RETRIEVED = '2026-07-07'
STATE     = 'Rajasthan'

def out(name): return OUT / name

def load_districts():
    d = json.load(open(OUT / 'districts.geojson'))
    return {f['properties']['name']: f for f in d['features']}

def signed_area(r):
    s = 0.0
    for (x1,y1),(x2,y2) in zip(r, r[1:]): s += (x2-x1)*(y2+y1)
    return -s / 2.0

def bbox_of(coords):
    xs,ys = [],[]
    def walk(c):
        if isinstance(c[0], (int, float)): xs.append(c[0]); ys.append(c[1])
        else:
            for x in c: walk(x)
    walk(coords)
    return [min(xs), min(ys), max(xs), max(ys)]

def centroid_of(mp):
    a=cx=cy=0.0
    for poly in mp:
        outer = poly[0]
        ra=0.0; rx=0.0; ry=0.0
        for (x1,y1),(x2,y2) in zip(outer, outer[1:]):
            f = x1*y2 - x2*y1; ra += f; rx += (x1+x2)*f; ry += (y1+y2)*f
        if abs(ra)<1e-12: continue
        rx /= (3*ra); ry /= (3*ra); ra /= 2
        cx += rx*ra; cy += ry*ra; a += ra
    if abs(a)<1e-12: return [0,0]
    return [cx/a, cy/a]

def merge_districts(names, bym):
    polys = []
    for n in names:
        f = bym.get(n)
        if not f: print(f'!! missing district {n}', file=sys.stderr); continue
        g = f['geometry']
        if g['type'] == 'Polygon': polys.append(g['coordinates'])
        else: polys.extend(g['coordinates'])
    return {'type':'MultiPolygon','coordinates':polys} if polys else None

# ============================================================================
#  GEOLOGICAL PROVINCES — after GSI stratigraphy of Rajasthan
# ============================================================================

GEOLOGICAL_PROVINCES = {
    'archaean-bhilwara': {
        'label':      'Bhilwara Supergroup (Archaean craton)',
        'age':        '~3.3–2.5 Ga (Archaean to Palaeoproterozoic)',
        'lithology':  'Banded Gneissic Complex (BGC), granulites, metabasites',
        'formation':  'Oldest exposed rocks in Rajasthan — the basement of the shield',
        'significance':'The floor on which every younger sequence rests. Uranium prospects.',
        'districts':  ['Bhilwara','Rajsamand','Ajmer','Beawar'],
    },
    'aravalli-sg': {
        'label':      'Aravalli Supergroup',
        'age':        '~2.5–1.6 Ga (Palaeoproterozoic)',
        'lithology':  'Metasediments — dolomites, phosphorites, quartzites, phyllites',
        'formation':  'The lower fold-belt sequence of the Aravalli–Delhi Orogen',
        'significance':'Hosts the world-class Zawar and Rajpura Dariba lead-zinc deposits, and Jhamarkotra phosphorite.',
        'districts':  ['Udaipur','Salumbar','Rajsamand','Chittorgarh','Bhilwara','Dungarpur'],
    },
    'delhi-sg': {
        'label':      'Delhi Supergroup',
        'age':        '~1.4–1.0 Ga (Mesoproterozoic)',
        'lithology':  'Metasediments + calc-silicates + granites; the main Aravalli ridge',
        'formation':  'Upper fold-belt sequence of the Aravalli–Delhi Orogen',
        'significance':'Hosts the Rampura Agucha zinc mine (world\'s largest) and Khetri copper belt.',
        'districts':  ['Sirohi','Ajmer','Beawar','Sikar','Jhunjhunu','Alwar','Khairthal-Tijara','Jaipur','Kotputli-Behror'],
    },
    'malani-igneous': {
        'label':      'Malani Igneous Suite',
        'age':        '~750 Ma (Neoproterozoic)',
        'lithology':  'Rhyolites, granites, tuffs — anorogenic acid volcano-plutonic',
        'formation':  'Post-tectonic anorogenic magmatism — 3rd-largest such suite globally',
        'significance':'Sources Jalore and Sirohi granite; underlies the western desert.',
        'districts':  ['Jalore','Sirohi','Barmer','Balotra','Pali'],
    },
    'marwar-sg': {
        'label':      'Marwar Supergroup',
        'age':        '~800–500 Ma (Ediacaran)',
        'lithology':  'Sandstones, limestones, evaporites, halite',
        'formation':  'Shallow-marine platform sediments post-Malani',
        'significance':'Nagaur–Ganganagar gypsum + halite (rock salt); Jodhpur sandstone.',
        'districts':  ['Nagaur','Didwana-Kuchaman','Bikaner','Sri Ganganagar','Hanumangarh','Churu','Jaisalmer','Jodhpur','Phalodi'],
    },
    'vindhyan-basin': {
        'label':      'Vindhyan Supergroup',
        'age':        '~1.4–0.6 Ga (Meso- to Neoproterozoic)',
        'lithology':  'Sandstones (Bhander, Kaimur), limestones (Kota Stone), shales',
        'formation':  'Vast intracratonic sedimentary basin unfolded over the shield',
        'significance':'Kota Stone (world-known dimension stone); high-grade limestone for cement.',
        'districts':  ['Kota','Bundi','Baran','Karauli','Sawai Madhopur','Dholpur','Chittorgarh','Bhilwara'],
    },
    'deccan-edge': {
        'label':      'Deccan Trap (SE edge)',
        'age':        '~65 Ma (Cretaceous-Palaeogene boundary)',
        'lithology':  'Basalt flows',
        'formation':  'Distal edge of the Deccan Volcanic Province mostly in MP',
        'significance':'Weathers into black cotton soils — the Hadoti Vertisols.',
        'districts':  ['Jhalawar','Baran'],
    },
    'quaternary-desert': {
        'label':      'Quaternary Alluvium + Aeolian Cover',
        'age':        '~10 000 years and younger',
        'lithology':  'River alluvium (eastern), sand dunes and aeolian sheets (western)',
        'formation':  'Youngest sedimentary cover',
        'significance':'Aquifers, agricultural soils, palaeontological horizons.',
        'districts':  ['Barmer','Bikaner','Jaisalmer','Phalodi','Balotra','Alwar','Khairthal-Tijara','Bharatpur','Deeg','Dholpur','Sri Ganganagar','Hanumangarh','Jaipur','Dausa','Tonk','Sawai Madhopur','Karauli','Kotputli-Behror'],
    },
}

# ============================================================================
#  ROCK TYPES — five broad groups
# ============================================================================

ROCK_TYPES = {
    'igneous': {
        'label':      'Igneous',
        'major_examples':'Malani rhyolite; Erinpura granite; Jalore-Siwana granite',
        'engineering':'High compressive strength; excellent building & dimension stone',
        'weathering': 'Exfoliation and joint-controlled boulder fields',
        'districts':  ['Jalore','Sirohi','Barmer','Pali','Balotra','Ajmer','Beawar','Chittorgarh'],
    },
    'metamorphic': {
        'label':      'Metamorphic',
        'major_examples':'Aravalli phyllite & schist; Delhi quartzite; Makrana marble; Alwar slate',
        'engineering':'Variable — marble is soft, quartzite very hard',
        'weathering': 'Schistosity- and foliation-controlled parting',
        'districts':  ['Udaipur','Salumbar','Rajsamand','Chittorgarh','Bhilwara','Sirohi','Ajmer','Beawar','Nagaur','Alwar','Khairthal-Tijara','Sikar','Jhunjhunu','Dungarpur'],
    },
    'sedimentary': {
        'label':      'Sedimentary',
        'major_examples':'Vindhyan sandstone; Kota Stone limestone; Jodhpur sandstone; Marwar evaporites',
        'engineering':'Layered — bedding-parallel strength; excellent dimension stone',
        'weathering': 'Bedding-controlled cliff retreat',
        'districts':  ['Kota','Bundi','Baran','Karauli','Sawai Madhopur','Dholpur','Nagaur','Didwana-Kuchaman','Jodhpur','Jaisalmer','Phalodi','Bikaner','Sri Ganganagar','Hanumangarh','Chittorgarh'],
    },
    'alluvial': {
        'label':      'Alluvial (Quaternary river-borne)',
        'major_examples':'Banas–Chambal alluvium; Yamuna sub-basin sands',
        'engineering':'Loose to medium-dense; needs foundation care',
        'weathering': 'Reworked by seasonal flow',
        'districts':  ['Alwar','Khairthal-Tijara','Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur','Jaipur','Kotputli-Behror','Dausa','Tonk','Kota','Baran','Bundi'],
    },
    'aeolian': {
        'label':      'Aeolian (Wind-borne desert)',
        'major_examples':'Barchans, longitudinal dunes, sand sheets of the Thar',
        'engineering':'Uncemented — mobile in high wind; requires stabilisation',
        'weathering': 'Continuous wind reworking; interdune palaeosols',
        'districts':  ['Jaisalmer','Barmer','Bikaner','Churu','Sri Ganganagar','Hanumangarh','Jodhpur','Phalodi','Balotra','Nagaur'],
    },
}

# ============================================================================
#  MINERAL BELTS
# ============================================================================

MINERAL_BELTS = {
    'lead-zinc': {
        'label':      'Lead-Zinc Belt',
        'genesis':    'SEDEX-type mineralisation in Aravalli Supergroup carbonates',
        'economic':   'Rajasthan produces ~99 % of India\'s lead and zinc.',
        'districts':  ['Udaipur','Rajsamand','Bhilwara','Chittorgarh','Salumbar'],
    },
    'copper': {
        'label':      'Copper Belt',
        'genesis':    'Volcanogenic + shear-hosted in Delhi Supergroup',
        'economic':   'Khetri belt is India\'s largest primary copper source.',
        'districts':  ['Sikar','Jhunjhunu','Khairthal-Tijara'],
    },
    'marble': {
        'label':      'Marble Belt',
        'genesis':    'Contact + regional metamorphism of Aravalli carbonates',
        'economic':   'Rajasthan hosts ~90 % of India\'s marble reserves. Makrana marble was quarried for the Taj Mahal.',
        'districts':  ['Nagaur','Rajsamand','Ajmer','Beawar','Sirohi','Udaipur','Salumbar'],
    },
    'granite': {
        'label':      'Granite Belt',
        'genesis':    'Malani Igneous Suite + Erinpura granite intrusions',
        'economic':   'Jalore–Sirohi is India\'s premier granite export cluster.',
        'districts':  ['Jalore','Sirohi','Barmer','Pali','Balotra'],
    },
    'limestone': {
        'label':      'Limestone Belt',
        'genesis':    'Vindhyan and Marwar platform sediments; some Aravalli metasediment',
        'economic':   'Feeds the cement industry — Rajasthan is a top-3 cement-producing state.',
        'districts':  ['Chittorgarh','Kota','Bundi','Nagaur','Jodhpur','Sirohi','Jaisalmer','Baran','Jhalawar'],
    },
    'gypsum': {
        'label':      'Gypsum Belt',
        'genesis':    'Marwar Supergroup evaporite horizons',
        'economic':   'Rajasthan produces ~99 % of India\'s gypsum — feeds cement + fertiliser (SSP) industries.',
        'districts':  ['Nagaur','Didwana-Kuchaman','Bikaner','Barmer','Jaisalmer','Jodhpur','Balotra'],
    },
    'lignite': {
        'label':      'Lignite Belt',
        'genesis':    'Palaeogene sedimentary basin coals — Kapurdi, Jalipa, Palana',
        'economic':   'Fuels the Barmer + Bikaner lignite-based thermal power plants.',
        'districts':  ['Barmer','Balotra','Bikaner','Nagaur'],
    },
    'phosphate': {
        'label':      'Phosphate Belt',
        'genesis':    'Stromatolitic phosphorite in Aravalli Supergroup (Jhamarkotra)',
        'economic':   'Jhamarkotra is India\'s largest rock-phosphate mine — feeds fertiliser plants.',
        'districts':  ['Udaipur','Salumbar','Jaisalmer'],
    },
    'wollastonite': {
        'label':      'Wollastonite Belt',
        'genesis':    'Contact-metamorphic aureoles around Malani + Delhi granites',
        'economic':   'Rajasthan produces ~100 % of India\'s wollastonite — ceramics + paints + welding electrodes.',
        'districts':  ['Sirohi','Sikar','Ajmer','Beawar'],
    },
    'sandstone': {
        'label':      'Sandstone Belt',
        'genesis':    'Vindhyan + Marwar sandstones — Kota, Dholpur, Karauli, Jodhpur',
        'economic':   'Kota Stone + Dholpur beige sandstone + Jodhpur red sandstone — heritage & modern building material.',
        'districts':  ['Kota','Bundi','Karauli','Dholpur','Nagaur','Jodhpur','Chittorgarh'],
    },
}

# ============================================================================
#  MAJOR MINES — points with cited coordinates
# ============================================================================

MAJOR_MINES = [
    {'id':'rampura-agucha','name':'Rampura Agucha Mine',
     'lonlat':[74.750, 25.847], 'mineral':'Zinc + Lead + Silver', 'operator':'Hindustan Zinc Ltd.',
     'district':'Bhilwara','status':'Operational',
     'source':'HZL public disclosures + IBM',
     'production':'~4 million tonnes ore/yr; world\'s largest single zinc mine',
     'facts':['World\'s largest single zinc mine.','Discovered by GSI in 1977; commercial production from 1991.','Underground mine since 2016 (previously open-pit).']},
    {'id':'zawar','name':'Zawar Mines Complex',
     'lonlat':[73.708, 24.352], 'mineral':'Zinc + Lead', 'operator':'Hindustan Zinc Ltd.',
     'district':'Udaipur','status':'Operational',
     'source':'HZL public disclosures',
     'production':'~1.4 million tonnes ore/yr; ancient workings (~2 500 years)',
     'facts':['One of the world\'s oldest zinc-smelting sites — Zawar zinc was smelted here in the 12th century CE.','Cluster of 4 underground mines: Baroi, Balaria, Mochia, Zawarmala.','Zawar contains the earliest known evidence of retort smelting.']},
    {'id':'rajpura-dariba','name':'Rajpura Dariba Mine',
     'lonlat':[73.930, 24.898], 'mineral':'Zinc + Lead + Silver', 'operator':'Hindustan Zinc Ltd.',
     'district':'Rajsamand','status':'Operational',
     'source':'HZL public disclosures',
     'facts':['SEDEX-type deposit hosted in Aravalli Supergroup dolomite.','Also produced silver as by-product.']},
    {'id':'sindesar-khurd','name':'Sindesar Khurd Mine',
     'lonlat':[73.983, 24.850], 'mineral':'Zinc + Lead + Silver', 'operator':'Hindustan Zinc Ltd.',
     'district':'Rajsamand','status':'Operational',
     'source':'HZL public disclosures',
     'facts':['Largest silver-producing mine of Hindustan Zinc.','One of the largest primary silver mines in the world.']},
    {'id':'kayad','name':'Kayad Mine',
     'lonlat':[74.663, 26.505], 'mineral':'Zinc + Lead', 'operator':'Hindustan Zinc Ltd.',
     'district':'Ajmer','status':'Operational',
     'source':'HZL public disclosures',
     'facts':['Underground zinc-lead mine near Ajmer city.','Newest of the HZL cluster (production from 2013).']},
    {'id':'khetri','name':'Khetri Copper Complex',
     'lonlat':[75.784, 27.980], 'mineral':'Copper', 'operator':'Hindustan Copper Ltd.',
     'district':'Jhunjhunu','status':'Operational',
     'source':'HCL public disclosures',
     'facts':['India\'s largest primary copper source.','Comprises Kolihan + Khetri underground mines + a concentrator + smelter.','Hosted in Delhi Supergroup metasediments.']},
    {'id':'makrana','name':'Makrana Marble Quarries',
     'lonlat':[74.727, 27.041], 'mineral':'White marble', 'operator':'Private lessees',
     'district':'Nagaur','status':'Operational — 5 blocks in production',
     'source':'DMG Rajasthan + IBM',
     'facts':['Source of the marble for the Taj Mahal (1632–1653).','Also supplied the Victoria Memorial (Kolkata) and Sabarmati Ashram interiors.','A UNESCO Global Geopark aspirant.']},
    {'id':'kishangarh-marble','name':'Kishangarh Marble Cluster',
     'lonlat':[74.860, 26.583], 'mineral':'Coloured & imported marble processing',
     'operator':'Private','district':'Ajmer','status':'Operational — Asia\'s largest marble mandi',
     'source':'DMG Rajasthan',
     'facts':['Kishangarh houses Asia\'s largest marble trading mandi (market).','Imports raw marble from Italy, Turkey, Egypt and re-cuts + polishes for Indian market.']},
    {'id':'jhamarkotra','name':'Jhamarkotra Rock-Phosphate Mine',
     'lonlat':[73.898, 24.457], 'mineral':'Rock phosphate', 'operator':'Rajasthan State Mines & Minerals Ltd.',
     'district':'Udaipur','status':'Operational — India\'s largest',
     'source':'RSMDC + IBM',
     'facts':['India\'s largest rock-phosphate mine.','Hosted in stromatolitic phosphorite of the Aravalli Supergroup (~1.6 Ga).','Feeds Rajasthan\'s SSP fertiliser plants.']},
    {'id':'kapurdi-jalipa','name':'Kapurdi–Jalipa Lignite Mines',
     'lonlat':[71.520, 25.694], 'mineral':'Lignite', 'operator':'Barmer Lignite Mining Company (JV RSMDC + Raj West Power)',
     'district':'Barmer','status':'Operational',
     'source':'RSMDC + Central Electricity Authority',
     'facts':['Fuels the 1080 MW Raj West lignite thermal power plant.','Palaeogene lignite in Barmer Basin sediments.']},
    {'id':'palana-gurha','name':'Palana + Gurha Lignite Mines',
     'lonlat':[73.318, 27.911], 'mineral':'Lignite', 'operator':'RSMDC + Rajasthan Rajya Vidyut Utpadan Nigam',
     'district':'Bikaner','status':'Operational',
     'source':'RSMDC',
     'facts':['Feeds the 250 MW Barsingsar lignite thermal power plant.','Bikaner lignite is one of the oldest identified lignite reserves in India (mid-19th century).']},
    {'id':'mangala-field','name':'Mangala Oil Field',
     'lonlat':[71.331, 26.017], 'mineral':'Crude oil', 'operator':'Cairn Oil & Gas (Vedanta)',
     'district':'Barmer','status':'Operational',
     'source':'Cairn/ONGC public disclosures',
     'facts':['Largest onshore oil discovery in India since 1985 (discovered 2004).','Peak production ~150 000 barrels/day.','Feeds via the Salaya–Mathura pipeline network.']},
    {'id':'bhagyam-aishwariya','name':'Bhagyam + Aishwariya Fields',
     'lonlat':[71.350, 26.220], 'mineral':'Crude oil', 'operator':'Cairn Oil & Gas',
     'district':'Barmer','status':'Operational',
     'source':'Cairn/ONGC public disclosures',
     'facts':['Two secondary Cairn Rajasthan fields alongside Mangala.']},
    {'id':'raageshwari-gas','name':'Raageshwari Gas Field',
     'lonlat':[71.480, 26.360], 'mineral':'Natural gas + condensate', 'operator':'Cairn Oil & Gas',
     'district':'Barmer','status':'Operational',
     'source':'Cairn/ONGC public disclosures',
     'facts':['Gas complements the Cairn oil operation in Barmer Basin.']},
    {'id':'jaisalmer-gas','name':'Jaisalmer Basin Gas Fields',
     'lonlat':[71.400, 27.000], 'mineral':'Natural gas', 'operator':'ONGC',
     'district':'Jaisalmer','status':'Operational — Manihari Tibba + others',
     'source':'ONGC public register',
     'facts':['Small-scale gas production; supplies local power stations.']},
    {'id':'nagaur-gypsum','name':'Nagaur Gypsum Belt',
     'lonlat':[73.783, 27.161], 'mineral':'Gypsum', 'operator':'Multiple lessees',
     'district':'Nagaur','status':'Operational — many small pits',
     'source':'DMG Rajasthan + IBM',
     'facts':['Nagaur is India\'s largest gypsum-producing district.','Feeds cement + SSP fertiliser plants nationwide.']},
    {'id':'jalore-granite','name':'Jalore Granite Cluster',
     'lonlat':[72.617, 25.348], 'mineral':'Pink & grey granite', 'operator':'Private',
     'district':'Jalore','status':'Operational',
     'source':'DMG Rajasthan',
     'facts':['One of India\'s primary granite-export clusters.','Sourced from the Malani Igneous Suite.']},
    {'id':'kota-stone','name':'Kota Stone Quarries',
     'lonlat':[75.803, 25.183], 'mineral':'Limestone (dimension stone)', 'operator':'Private',
     'district':'Kota','status':'Operational — Ramganj Mandi is a hub',
     'source':'DMG Rajasthan',
     'facts':['Vindhyan-basin limestone — Kota Stone is a world-known dimension stone.','Ramganj Mandi + Suket are the principal quarry towns.']},
]

# ============================================================================
#  BUILDING STONES
# ============================================================================

BUILDING_STONES = {
    'marble': {
        'label':      'Marble',
        'flagship':   'Makrana white; Rajsamand green; Kishangarh trading hub',
        'colours':    'White · pink · green · black · yellow',
        'heritage':   'Taj Mahal · Victoria Memorial · Dilwara temples',
        'districts':  ['Nagaur','Rajsamand','Ajmer','Beawar','Sirohi','Udaipur','Salumbar'],
    },
    'granite': {
        'label':      'Granite',
        'flagship':   'Jalore pink; Barmer grey; Sirohi rose',
        'colours':    'Pink · grey · rose · black',
        'heritage':   'Modern export cluster',
        'districts':  ['Jalore','Sirohi','Barmer','Pali','Balotra'],
    },
    'sandstone': {
        'label':      'Sandstone',
        'flagship':   'Dholpur beige; Karauli red; Jodhpur red; Kota Stone',
        'colours':    'Red · beige · pink · brown',
        'heritage':   'Red Fort Delhi · Umaid Bhawan Palace · countless havelis',
        'districts':  ['Dholpur','Karauli','Jodhpur','Nagaur','Bharatpur','Deeg'],
    },
    'slate': {
        'label':      'Slate',
        'flagship':   'Alwar slate; Chittorgarh slate',
        'colours':    'Grey · green · black',
        'heritage':   'Roofing + flooring',
        'districts':  ['Alwar','Khairthal-Tijara','Chittorgarh'],
    },
    'quartzite': {
        'label':      'Quartzite',
        'flagship':   'Delhi Supergroup ridges',
        'colours':    'White · pink · buff',
        'heritage':   'Construction aggregate',
        'districts':  ['Alwar','Khairthal-Tijara','Sikar','Jhunjhunu','Ajmer','Beawar','Jaipur'],
    },
    'limestone-stone': {
        'label':      'Limestone (dimension)',
        'flagship':   'Kota Stone; Jaisalmer yellow limestone',
        'colours':    'Cream · grey · yellow',
        'heritage':   'Sonar Fort (Jaisalmer) built of local limestone',
        'districts':  ['Kota','Bundi','Jaisalmer','Nagaur','Sirohi','Chittorgarh'],
    },
}

# ============================================================================
#  MINING CLUSTERS
# ============================================================================

MINING_CLUSTERS = {
    'udaipur-zinc': {
        'label':      'Udaipur Zinc-Phosphate Cluster',
        'dominant':   ['Zinc-lead','Rock phosphate','Marble'],
        'employment': 'HZL + RSMDC — largest formal-sector mineral employer in the state',
        'issues':     'Tailings management; groundwater quality',
        'districts':  ['Udaipur','Salumbar','Rajsamand','Chittorgarh','Bhilwara'],
    },
    'nagaur-marble': {
        'label':      'Nagaur–Ajmer Marble Cluster',
        'dominant':   ['Marble','Gypsum','Limestone'],
        'employment': 'Thousands of small quarries + Kishangarh mandi',
        'issues':     'Marble slurry disposal; land-use change',
        'districts':  ['Nagaur','Ajmer','Beawar','Didwana-Kuchaman'],
    },
    'khetri-copper': {
        'label':      'Khetri Copper Cluster',
        'dominant':   ['Copper','Limestone'],
        'employment': 'HCL smelter + concentrator township',
        'issues':     'Tailings; smelter emissions',
        'districts':  ['Jhunjhunu','Sikar'],
    },
    'barmer-oil-lignite': {
        'label':      'Barmer Oil–Lignite Cluster',
        'dominant':   ['Crude oil','Natural gas','Lignite','Granite'],
        'employment': 'Cairn Vedanta + RSMDC + granite quarries',
        'issues':     'Water use; dune stabilisation around lignite pits',
        'districts':  ['Barmer','Balotra'],
    },
    'kota-limestone': {
        'label':      'Kota Limestone–Sandstone Cluster',
        'dominant':   ['Kota Stone','Limestone (cement)'],
        'employment': 'Ramganj Mandi + Suket quarry towns; cement plants at Chittorgarh + Kota',
        'issues':     'Silica dust; overburden disposal',
        'districts':  ['Kota','Bundi','Chittorgarh','Baran'],
    },
    'jodhpur-sandstone': {
        'label':      'Jodhpur–Dholpur Sandstone Cluster',
        'dominant':   ['Red sandstone','Marble processing (small)'],
        'employment': 'Traditional quarrying towns of Marwar',
        'issues':     'Overburden; groundwater',
        'districts':  ['Jodhpur','Dholpur','Karauli'],
    },
}

# ============================================================================
#  PETROLEUM & GAS — Barmer basin polygon + field points
# ============================================================================

def build_petroleum_gas():
    bym = load_districts()
    features = []
    # Barmer basin as generalised polygon (union of Barmer + Balotra districts)
    geom = merge_districts(['Barmer','Balotra'], bym)
    cent = centroid_of(geom['coordinates']); bbox = bbox_of(geom['coordinates'])
    features.append({
        'type':'Feature','id':'petroleum-gas-barmer-basin',
        'properties':{
            'name':'Barmer Basin (Rajasthan block)',
            'type':'oil_basin', 'category':'geology', 'state':STATE,
            'source':'Cairn/ONGC public disclosures + DGH',
            'lastUpdated':RETRIEVED,
            'centroid':[round(cent[0],5),round(cent[1],5)],
            'labelAnchor':[round(cent[0],5),round(cent[1],5)],
            'bbox':[round(v,5) for v in bbox],
            'geometryQuality':'generalised (district-approximated)',
            'geometryNote':'Basin extent approximated by Barmer + Balotra districts.',
            'age':'Palaeogene',
            'lithology':'Fatehgarh & Barmer Hill sandstones — reservoir units',
            'operator':'Cairn Oil & Gas (Vedanta) + Government of India (revenue share)',
            'significance':'India\'s largest onshore oil discovery since 1985; peak production ~200 000 barrels/day.',
            'districts_included':['Barmer','Balotra'],
            'notes':{'facts':[
                'The Rajasthan Block RJ-ON-90/1 is the largest onshore oil-producing block in India.',
                'Discovered by Cairn Energy in 2004; commercial production from 2009.',
                'Contributes ~25 % of India\'s domestic crude production.',
            ], 'mnemonic':'', 'significance':'very-high','confusedWith':[]},
            'ecology':{'flora':[],'fauna':[],'ecosystem':''},
            'governance':{'authority':'Directorate General of Hydrocarbons','status':'operational'},
        },
        'geometry':geom,
    })
    # Field points
    for f in ['mangala-field','bhagyam-aishwariya','raageshwari-gas','jaisalmer-gas']:
        for m in MAJOR_MINES:
            if m['id'] == f:
                features.append({
                    'type':'Feature','id':f'petroleum-gas-{f}',
                    'properties':{
                        'name': m['name'], 'type':'oil_field' if 'gas' not in m['id'] else 'gas_field',
                        'category':'geology','state':STATE,
                        'operator':m['operator'], 'mineral':m['mineral'],
                        'district':m['district'], 'status':m['status'],
                        'source':m['source'],
                        'lastUpdated':RETRIEVED,
                        'centroid':m['lonlat'], 'labelAnchor':m['lonlat'],
                        'bbox':m['lonlat']+m['lonlat'],
                        'geometryQuality':'point',
                        'notes':{'facts': m.get('facts',[]),'mnemonic':'','significance':'high','confusedWith':[]},
                        'ecology':{'flora':[],'fauna':[],'ecosystem':''},
                        'governance':{'authority':'Directorate General of Hydrocarbons','status':m['status']},
                    },
                    'geometry':{'type':'Point','coordinates':m['lonlat']},
                })
                break
    (OUT / 'petroleum-gas.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote petroleum-gas.geojson: {len(features)} features')

# ============================================================================
#  Emit + KG expansion
# ============================================================================

def emit_layer(zones, layer_id, feature_type, source_ref, category='geology'):
    bym = load_districts()
    features = []
    for zid, meta in zones.items():
        geom = merge_districts(meta['districts'], bym)
        if not geom: continue
        cent = centroid_of(geom['coordinates']); bbox = bbox_of(geom['coordinates'])
        props = {
            'name': meta['label'], 'type': feature_type, 'category': category,
            'state': STATE, 'zone_id': zid,
            'source': source_ref, 'lastUpdated': RETRIEVED,
            'centroid':[round(cent[0],5),round(cent[1],5)],
            'labelAnchor':[round(cent[0],5),round(cent[1],5)],
            'bbox':[round(v,5) for v in bbox],
            'districts_included': meta['districts'],
            'geometryQuality': 'generalised (district-approximated)',
            'geometryNote': 'Union of constituent districts; the geological boundary is a mapped contact that crosses districts. See cited source.',
            'notes': {'facts': meta.get('facts', []), 'mnemonic': '', 'significance': 'high', 'confusedWith': []},
            'ecology':{'flora':[],'fauna':[],'ecosystem':''},
            'governance':{'authority':'','status':''},
        }
        for k, v in meta.items():
            if k in ('label','districts','facts'): continue
            if k == 'notes' and not isinstance(v, dict): props['remark'] = v; continue
            props[k] = v
        features.append({'type':'Feature','id':f'{layer_id}-{zid}','properties':props,'geometry':geom})
    (OUT / f'{layer_id}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')


def build_major_mines():
    features = []
    for m in MAJOR_MINES:
        if 'gas' in m['id'] or 'field' in m['id']:
            continue   # petroleum/gas emitted separately
        features.append({
            'type':'Feature','id':f'mine-{m["id"]}',
            'properties':{
                'name':m['name'], 'type':'mine', 'category':'mining',
                'state':STATE,
                'mineral':m['mineral'], 'operator':m['operator'],
                'district':m['district'], 'status':m['status'],
                'source':m['source'],
                'production': m.get('production',''),
                'lastUpdated':RETRIEVED,
                'centroid':m['lonlat'], 'labelAnchor':m['lonlat'],
                'bbox':m['lonlat']+m['lonlat'],
                'geometryQuality':'point',
                'notes':{'facts':m.get('facts',[]),'mnemonic':'','significance':'very-high','confusedWith':[]},
                'ecology':{'flora':[],'fauna':[],'ecosystem':''},
                'governance':{'authority':'DMG Rajasthan','status':m['status']},
            },
            'geometry':{'type':'Point','coordinates':m['lonlat']},
        })
    (OUT / 'major-mines.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote major-mines.geojson: {len(features)} features')


# ============================================================================
#  KG EXPANSION
# ============================================================================

def build_kg_expansion():
    edges = []
    # Provinces → hosted mineral belts + signature mines + rock type
    edges += [
        {'source':'geological-provinces-aravalli-sg','related':[
            {'target':'mineral-belts-lead-zinc',  'type':'defines',
             'explanation':'SEDEX Zn-Pb hosted in Aravalli SG carbonates.'},
            {'target':'mineral-belts-phosphate',  'type':'defines',
             'explanation':'Stromatolitic phosphorite in Aravalli SG at Jhamarkotra.'},
            {'target':'mineral-belts-marble',     'type':'colocated',
             'explanation':'Aravalli carbonates metamorphose to marble.'},
            {'target':'rock-types-metamorphic',   'type':'defines'},
            {'target':'mine-zawar',               'type':'signature'},
            {'target':'mine-rajpura-dariba',      'type':'signature'},
            {'target':'mine-jhamarkotra',         'type':'signature'},
            {'target':'physiography-aravalli-hills-region','type':'colocated'},
        ]},
        {'source':'geological-provinces-delhi-sg','related':[
            {'target':'mineral-belts-copper',     'type':'defines'},
            {'target':'mine-rampura-agucha',      'type':'signature'},
            {'target':'mine-khetri',              'type':'signature'},
            {'target':'rock-types-metamorphic',   'type':'defines'},
            {'target':'aravalli-main-axis',       'type':'defines'},
        ]},
        {'source':'geological-provinces-malani-igneous','related':[
            {'target':'mineral-belts-granite',    'type':'defines'},
            {'target':'rock-types-igneous',       'type':'defines'},
            {'target':'mine-jalore-granite',      'type':'signature'},
            {'target':'building-stones-granite',  'type':'signature'},
        ]},
        {'source':'geological-provinces-marwar-sg','related':[
            {'target':'mineral-belts-gypsum',     'type':'defines'},
            {'target':'rock-types-sedimentary',   'type':'defines'},
            {'target':'mine-nagaur-gypsum',       'type':'signature'},
            {'target':'building-stones-sandstone','type':'colocated',
             'explanation':'Jodhpur red sandstone is the Marwar SG dimension stone.'},
        ]},
        {'source':'geological-provinces-vindhyan-basin','related':[
            {'target':'mineral-belts-limestone',  'type':'defines'},
            {'target':'mineral-belts-sandstone',  'type':'defines'},
            {'target':'rock-types-sedimentary',   'type':'defines'},
            {'target':'mine-kota-stone',          'type':'signature'},
            {'target':'building-stones-limestone-stone','type':'signature'},
            {'target':'building-stones-sandstone','type':'signature'},
        ]},
        {'source':'geological-provinces-quaternary-desert','related':[
            {'target':'rock-types-alluvial',      'type':'defines'},
            {'target':'rock-types-aeolian',       'type':'defines'},
            {'target':'thar-main',                'type':'colocated'},
            {'target':'soil-types-desert',        'type':'colocated'},
        ]},
        {'source':'geological-provinces-deccan-edge','related':[
            {'target':'rock-types-igneous',       'type':'defines'},
            {'target':'soil-types-black',         'type':'defines',
             'explanation':'Basalt weathering produces the Hadoti Vertisols.'},
            {'target':'physiography-southeastern-plateau-region','type':'colocated'},
        ]},
        {'source':'geological-provinces-archaean-bhilwara','related':[
            {'target':'rock-types-metamorphic',   'type':'defines'},
            {'target':'geological-provinces-aravalli-sg','type':'proximity'},
        ]},
    ]

    # Mineral belts → signature mines + downstream industry
    edges += [
        {'source':'mineral-belts-lead-zinc','related':[
            {'target':'mine-rampura-agucha','type':'signature'},
            {'target':'mine-zawar','type':'signature'},
            {'target':'mine-rajpura-dariba','type':'signature'},
            {'target':'mine-sindesar-khurd','type':'signature'},
            {'target':'mine-kayad','type':'signature'},
            {'target':'mining-clusters-udaipur-zinc','type':'signature'},
            {'target':'geological-provinces-aravalli-sg','type':'defines'},
        ]},
        {'source':'mineral-belts-copper','related':[
            {'target':'mine-khetri','type':'signature'},
            {'target':'mining-clusters-khetri-copper','type':'signature'},
            {'target':'geological-provinces-delhi-sg','type':'defines'},
        ]},
        {'source':'mineral-belts-marble','related':[
            {'target':'mine-makrana','type':'signature'},
            {'target':'mine-kishangarh-marble','type':'signature'},
            {'target':'mining-clusters-nagaur-marble','type':'signature'},
            {'target':'rock-types-metamorphic','type':'defines'},
            {'target':'building-stones-marble','type':'defines'},
        ]},
        {'source':'mineral-belts-granite','related':[
            {'target':'mine-jalore-granite','type':'signature'},
            {'target':'building-stones-granite','type':'defines'},
            {'target':'geological-provinces-malani-igneous','type':'defines'},
            {'target':'rock-types-igneous','type':'defines'},
        ]},
        {'source':'mineral-belts-limestone','related':[
            {'target':'mine-kota-stone','type':'colocated'},
            {'target':'mining-clusters-kota-limestone','type':'signature'},
            {'target':'geological-provinces-vindhyan-basin','type':'defines'},
        ]},
        {'source':'mineral-belts-gypsum','related':[
            {'target':'mine-nagaur-gypsum','type':'signature'},
            {'target':'geological-provinces-marwar-sg','type':'defines'},
            {'target':'mining-clusters-nagaur-marble','type':'colocated'},
        ]},
        {'source':'mineral-belts-lignite','related':[
            {'target':'mine-kapurdi-jalipa','type':'signature'},
            {'target':'mine-palana-gurha','type':'signature'},
            {'target':'mining-clusters-barmer-oil-lignite','type':'signature'},
        ]},
        {'source':'mineral-belts-phosphate','related':[
            {'target':'mine-jhamarkotra','type':'signature'},
            {'target':'geological-provinces-aravalli-sg','type':'defines'},
            {'target':'mining-clusters-udaipur-zinc','type':'colocated'},
        ]},
        {'source':'mineral-belts-wollastonite','related':[
            {'target':'geological-provinces-delhi-sg','type':'defines'},
            {'target':'geological-provinces-malani-igneous','type':'colocated'},
        ]},
        {'source':'mineral-belts-sandstone','related':[
            {'target':'mine-kota-stone','type':'signature'},
            {'target':'building-stones-sandstone','type':'defines'},
            {'target':'mining-clusters-jodhpur-sandstone','type':'signature'},
            {'target':'geological-provinces-vindhyan-basin','type':'defines'},
        ]},
    ]

    # Mines → their mineral belt + district context
    mine_to_belt = {
        'rampura-agucha':'lead-zinc','zawar':'lead-zinc','rajpura-dariba':'lead-zinc',
        'sindesar-khurd':'lead-zinc','kayad':'lead-zinc',
        'khetri':'copper',
        'makrana':'marble','kishangarh-marble':'marble',
        'jhamarkotra':'phosphate',
        'kapurdi-jalipa':'lignite','palana-gurha':'lignite',
        'nagaur-gypsum':'gypsum',
        'jalore-granite':'granite',
        'kota-stone':'sandstone',
    }
    for m in MAJOR_MINES:
        if 'gas' in m['id'] or 'field' in m['id']: continue
        r = []
        belt = mine_to_belt.get(m['id'])
        if belt: r.append({'target': f'mineral-belts-{belt}', 'type':'colocated'})
        # Every mine also participates in a mining cluster
        mine_to_cluster = {
            'rampura-agucha':'udaipur-zinc','zawar':'udaipur-zinc',
            'rajpura-dariba':'udaipur-zinc','sindesar-khurd':'udaipur-zinc',
            'kayad':'nagaur-marble','jhamarkotra':'udaipur-zinc',
            'makrana':'nagaur-marble','kishangarh-marble':'nagaur-marble',
            'nagaur-gypsum':'nagaur-marble',
            'khetri':'khetri-copper',
            'kapurdi-jalipa':'barmer-oil-lignite','palana-gurha':'barmer-oil-lignite',
            'jalore-granite':'barmer-oil-lignite',
            'kota-stone':'kota-limestone',
        }
        cluster = mine_to_cluster.get(m['id'])
        if cluster: r.append({'target': f'mining-clusters-{cluster}', 'type':'colocated'})
        if r: edges.append({'source': f'mine-{m["id"]}', 'related': r})

    # Petroleum → refinery + downstream + oil/gas fields
    edges += [
        {'source':'petroleum-gas-barmer-basin','related':[
            {'target':'petroleum-gas-mangala-field','type':'signature'},
            {'target':'petroleum-gas-bhagyam-aishwariya','type':'signature'},
            {'target':'petroleum-gas-raageshwari-gas','type':'signature'},
            {'target':'mining-clusters-barmer-oil-lignite','type':'signature'},
            {'target':'geological-provinces-marwar-sg','type':'proximity'},
            {'target':'rock-types-sedimentary','type':'colocated'},
        ]},
    ]
    # Building stones → belt + heritage-anchor
    edges += [
        {'source':'building-stones-marble','related':[
            {'target':'mineral-belts-marble','type':'defines'},
            {'target':'mine-makrana','type':'signature'},
            {'target':'rock-types-metamorphic','type':'defines'},
        ]},
        {'source':'building-stones-granite','related':[
            {'target':'mineral-belts-granite','type':'defines'},
            {'target':'geological-provinces-malani-igneous','type':'defines'},
        ]},
        {'source':'building-stones-sandstone','related':[
            {'target':'mineral-belts-sandstone','type':'defines'},
            {'target':'geological-provinces-vindhyan-basin','type':'defines'},
        ]},
        {'source':'building-stones-limestone-stone','related':[
            {'target':'mine-kota-stone','type':'signature'},
            {'target':'geological-provinces-vindhyan-basin','type':'defines'},
        ]},
    ]

    return edges


def merge_kg_expansion(new_edges):
    kg_path = OUT / 'knowledge-graph.json'
    kg = json.load(open(kg_path))
    existing_by_source = {g['source']: i for i, g in enumerate(kg['edges'])}
    for group in new_edges:
        if group['source'] in existing_by_source:
            kg['edges'][existing_by_source[group['source']]]['related'] += group['related']
        else:
            kg['edges'].append(group)
    kg_path.write_text(json.dumps(kg, indent=2))
    total = sum(len(g['related']) for g in kg['edges'])
    print(f'knowledge-graph.json: {len(kg["edges"])} source groups · {total} typed edges')


def main():
    emit_layer(GEOLOGICAL_PROVINCES,'geological-provinces','geological_province',
               'GSI stratigraphy of Rajasthan; DMG Rajasthan geological memoir', category='geology')
    emit_layer(ROCK_TYPES,          'rock-types',         'rock_type',
               'GSI + DMG classification', category='geology')
    emit_layer(MINERAL_BELTS,       'mineral-belts',      'mineral_belt',
               'DMG Rajasthan + IBM Indian Mineral Yearbook', category='mining')
    emit_layer(BUILDING_STONES,     'building-stones',    'building_stone',
               'DMG Rajasthan dimension-stone register', category='mining')
    emit_layer(MINING_CLUSTERS,     'mining-clusters',    'mining_cluster',
               'DMG Rajasthan + IBM state mineral profile', category='mining')
    build_major_mines()
    build_petroleum_gas()

    new = build_kg_expansion()
    (OUT / 'knowledge-graph-geo.json').write_text(json.dumps({'edges':new}, indent=2))
    print(f'wrote knowledge-graph-geo.json: {len(new)} new edge groups')
    merge_kg_expansion(new)


if __name__ == '__main__':
    main()
