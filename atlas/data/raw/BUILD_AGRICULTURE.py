"""
BUILD_AGRICULTURE.py — Agriculture · Irrigation · Water Resources assembly.

Outputs (into atlas/data/):
    major-crops.geojson           — 12 crops × dominant districts
    cropping-seasons.geojson      — 3 seasons (Kharif / Rabi / Zaid)
    agro-economic-zones.geojson   — 7 farming-system zones
    irrigation-sources.geojson    — 6 irrigation-source types × dominant districts
    major-canals.geojson          — IGNP + Gang Canal + Gang Canal Link (real OSM lines)
    dams.geojson                  — 10+ major dams (point + attributes)
    groundwater.geojson           — 4 CGWB status categories × districts
    command-areas.geojson         — 4 major command areas × districts

    knowledge-graph-agri.json     — 100+ new typed edges (merged into main graph)

DESIGN CONTRACT
================
* Every thematic feature is district-approximated. Every one carries
  `geometryQuality: "generalised (district-approximated)"` + source citation.
* Canals ship as REAL OSM LineStrings.
* Dams ship as points with documented coordinates + capacity + purpose.
* Every crop feature carries related-soil / related-climate / related-water fields
  that RelationsGraph / KnowledgeGraph consume for cross-highlighting.
* The KG expansion is emitted as a separate JSON file and MERGED into the main
  knowledge-graph.json so nothing is regenerated destructively.

SOURCES (documented per layer, cited in DATA_SOURCES.md):
    RAD    — Rajasthan Agriculture Department, Directorate of Agriculture
    DES    — Directorate of Economics & Statistics, GoR
    ICAR   — Indian Council of Agricultural Research
    RWRD   — Rajasthan Water Resources Department
    CWC    — Central Water Commission
    CGWB   — Central Ground Water Board (groundwater status)
    CADD   — Command Area Development Department, GoR
    OSM    — OpenStreetMap contributors (canals + reservoirs)
"""

import json
import math
import sys
from pathlib import Path

HERE      = Path(__file__).parent
OSM       = HERE / 'osm-rajasthan-agri.json'
OUT       = HERE.parent
RETRIEVED = '2026-07-07'
STATE     = 'Rajasthan'

def out(name): return OUT / name

# ============================================================================
#  DISTRICT LOAD
# ============================================================================

def load_districts():
    d = json.load(open(OUT / 'districts.geojson'))
    m = {}
    for f in d['features']:
        m[f['properties']['name']] = f
    return m

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
            f = x1*y2 - x2*y1
            ra += f; rx += (x1+x2)*f; ry += (y1+y2)*f
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
    if not polys: return None
    return {'type': 'MultiPolygon', 'coordinates': polys}

# ============================================================================
#  CROPS METADATA — official RAD/DES statistics
#
#  Each crop's `districts_included` = the top producing districts, from the
#  Rajasthan Agricultural Statistics 2023 gazette. When production is broadly
#  distributed we include the primary belt.
# ============================================================================

CROPS = {
    'wheat': {
        'label':          'Wheat', 'season':'Rabi',
        'water_req':      'High (450–650 mm through the growing season)',
        'soil_pref':      ['Alluvial soils (Entisols/Inceptisols)','Black cotton soils (Vertisols)'],
        'climate_pref':   'Sub-humid to semi-arid; requires cool weather during grain-filling',
        'irrigation':     'Canal + tube-well dominant',
        'related_soil':   ['soil-types-alluvial','soil-types-black'],
        'related_climate':['climate-regions-sub-humid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-canals','irrigation-sources-tubewells'],
        'districts':      ['Sri Ganganagar','Hanumangarh','Alwar','Bharatpur','Deeg','Karauli','Jaipur','Dausa','Kota','Baran','Bundi','Jhalawar','Chittorgarh','Bhilwara'],
        'facts':          ['Rajasthan\'s largest rabi crop by area.',
                           'Sri Ganganagar–Hanumangarh belt is the "grain bowl" of the state, fed by the Indira Gandhi Canal.',
                           'Also grown widely in the Chambal command (Kota, Baran, Bundi).'],
    },
    'mustard': {
        'label':          'Mustard', 'season':'Rabi',
        'water_req':      'Low to moderate (240–400 mm)',
        'soil_pref':      ['Alluvial soils'],
        'climate_pref':   'Semi-arid — cool winters, low humidity',
        'irrigation':     'Limited canal + tube-well',
        'related_soil':   ['soil-types-alluvial'],
        'related_climate':['climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-tubewells','irrigation-sources-canals'],
        'districts':      ['Bharatpur','Deeg','Alwar','Sawai Madhopur','Karauli','Dholpur','Sri Ganganagar','Hanumangarh','Tonk','Dausa','Kotputli-Behror'],
        'facts':          ['Rajasthan is India\'s largest producer of mustard — around 45 % of national output.',
                           'Bharatpur is nicknamed the "yellow gold" district for its mustard yield.',
                           'Grown in rotation with wheat under the same canal command.'],
    },
    'bajra': {
        'label':          'Pearl millet (Bajra)', 'season':'Kharif',
        'water_req':      'Very low (250–500 mm) — the classic drought-tolerant crop',
        'soil_pref':      ['Desert soils (Aridisols)','Sandy loam'],
        'climate_pref':   'Arid to semi-arid',
        'irrigation':     'Predominantly rain-fed',
        'related_soil':   ['soil-types-desert'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-rainfed'],
        'districts':      ['Jaisalmer','Barmer','Balotra','Bikaner','Churu','Jodhpur','Phalodi','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu','Pali','Jalore','Ajmer','Beawar'],
        'facts':          ['Rajasthan is India\'s largest producer of bajra.',
                           'Western arid districts grow bajra almost exclusively under rain-fed conditions.',
                           'A staple food and a fodder crop across the Thar.'],
    },
    'maize': {
        'label':          'Maize', 'season':'Kharif',
        'water_req':      'Moderate (500–800 mm)',
        'soil_pref':      ['Red loamy soils','Mixed red-black'],
        'climate_pref':   'Sub-humid; needs warm growing season with monsoon rain',
        'irrigation':     'Rain-fed with tank + well support',
        'related_soil':   ['soil-types-red-loamy','soil-types-mixed-red-black'],
        'related_climate':['climate-regions-sub-humid','climate-regions-humid-pocket'],
        'related_irrig':  ['irrigation-sources-rainfed','irrigation-sources-wells'],
        'districts':      ['Banswara','Dungarpur','Udaipur','Salumbar','Pratapgarh','Chittorgarh','Rajsamand','Bhilwara'],
        'facts':          ['Southern tribal-belt districts grow maize as their staple food.',
                           'Banswara–Dungarpur–Pratapgarh is Rajasthan\'s primary maize belt.'],
    },
    'gram': {
        'label':          'Gram (Chickpea)', 'season':'Rabi',
        'water_req':      'Low (300–400 mm)',
        'soil_pref':      ['Black cotton soils (Vertisols)','Alluvial'],
        'climate_pref':   'Semi-arid to sub-humid; cool winters',
        'irrigation':     'Mostly rain-fed on residual moisture',
        'related_soil':   ['soil-types-black','soil-types-alluvial'],
        'related_climate':['climate-regions-semi-arid','climate-regions-sub-humid'],
        'related_irrig':  ['irrigation-sources-rainfed','irrigation-sources-tubewells'],
        'districts':      ['Bikaner','Churu','Sikar','Jhunjhunu','Nagaur','Didwana-Kuchaman','Kota','Baran','Bundi','Jhalawar','Chittorgarh','Bhilwara','Sri Ganganagar','Hanumangarh'],
        'facts':          ['Rajasthan is India\'s largest producer of gram.',
                           'Grown as a residual-moisture rabi crop after the kharif harvest.'],
    },
    'soybean': {
        'label':          'Soybean', 'season':'Kharif',
        'water_req':      'Moderate (500–700 mm)',
        'soil_pref':      ['Black cotton soils (Vertisols)'],
        'climate_pref':   'Sub-humid to humid',
        'irrigation':     'Rain-fed on Vertisol moisture; supplementary well/tank',
        'related_soil':   ['soil-types-black'],
        'related_climate':['climate-regions-sub-humid','climate-regions-humid-pocket'],
        'related_irrig':  ['irrigation-sources-rainfed'],
        'districts':      ['Kota','Baran','Jhalawar','Pratapgarh','Chittorgarh','Bundi','Bhilwara'],
        'facts':          ['Concentrated in the Hadoti plateau where black soils and monsoon rain coincide.',
                           'Kota, Baran and Jhalawar together form Rajasthan\'s soybean triangle.'],
    },
    'cotton': {
        'label':          'Cotton', 'season':'Kharif',
        'water_req':      'High (700–1300 mm equivalent)',
        'soil_pref':      ['Alluvial (canal command)','Black cotton soils'],
        'climate_pref':   'Semi-arid; long frost-free season',
        'irrigation':     'Canal (IGNP + Gang Canal) dominant',
        'related_soil':   ['soil-types-alluvial','soil-types-black'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-canals'],
        'districts':      ['Sri Ganganagar','Hanumangarh','Bikaner','Churu'],
        'facts':          ['Cotton in Rajasthan is entirely canal-fed — an IGNP/Gang-Canal-driven crop.',
                           'Grown as a substitute for lower-value bajra where canal water arrived.'],
    },
    'groundnut': {
        'label':          'Groundnut', 'season':'Kharif',
        'water_req':      'Moderate (500–700 mm)',
        'soil_pref':      ['Sandy loam','Desert soils with irrigation'],
        'climate_pref':   'Arid to semi-arid — warm summer',
        'irrigation':     'Well + tube-well; drip in some pockets',
        'related_soil':   ['soil-types-desert','soil-types-red-loamy'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-tubewells','irrigation-sources-wells'],
        'districts':      ['Jodhpur','Bikaner','Sikar','Jhunjhunu','Chittorgarh','Rajsamand'],
        'facts':          ['Second-largest oilseed after mustard in Rajasthan.',
                           'Shekhawati (Sikar–Jhunjhunu) uses well-based irrigation for groundnut.'],
    },
    'barley': {
        'label':          'Barley', 'season':'Rabi',
        'water_req':      'Low to moderate (350–500 mm)',
        'soil_pref':      ['Alluvial','Saline-tolerant on reclaimed soils'],
        'climate_pref':   'Semi-arid with cool winter',
        'irrigation':     'Canal + well',
        'related_soil':   ['soil-types-alluvial','soil-types-saline'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-canals','irrigation-sources-wells'],
        'districts':      ['Jaipur','Sikar','Jhunjhunu','Alwar','Ajmer','Nagaur','Didwana-Kuchaman'],
        'facts':          ['A traditional cereal grown for malt (breweries) and animal feed.',
                           'Tolerates the mildly saline soils of the Nagaur–Sikar belt.'],
    },
    'pulses': {
        'label':          'Pulses (moong · moth · urad)', 'season':'Kharif',
        'water_req':      'Very low',
        'soil_pref':      ['Desert soils','Sandy loam'],
        'climate_pref':   'Arid to semi-arid',
        'irrigation':     'Rain-fed',
        'related_soil':   ['soil-types-desert'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-rainfed'],
        'districts':      ['Barmer','Jaisalmer','Bikaner','Churu','Jodhpur','Phalodi','Nagaur','Balotra','Jodhpur','Pali','Jalore'],
        'facts':          ['Moth and moong are drought-hardy pulses of the Thar.',
                           'Fix atmospheric nitrogen, improving desert-soil fertility.'],
    },
    'oilseeds-misc': {
        'label':          'Other oilseeds (sesame · taramira · linseed)', 'season':'Mixed',
        'water_req':      'Low',
        'soil_pref':      ['Alluvial','Desert soils'],
        'climate_pref':   'Semi-arid',
        'irrigation':     'Rain-fed + supplementary',
        'related_soil':   ['soil-types-alluvial','soil-types-desert'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid'],
        'related_irrig':  ['irrigation-sources-rainfed'],
        'districts':      ['Pali','Jodhpur','Nagaur','Barmer','Jalore','Sirohi'],
        'facts':          ['Rajasthan produces significant taramira (Eruca sativa), a low-water oilseed.',
                           'Sesame is grown in Pali and Jodhpur as a kharif oilseed.'],
    },
    'horticulture': {
        'label':          'Horticulture (kinnow · orange · guar · isabgol · seed spices)', 'season':'Mixed',
        'water_req':      'Variable',
        'soil_pref':      ['Alluvial (kinnow)','Vertisol (orange)','Desert soils (guar/isabgol)'],
        'climate_pref':   'Wide — depends on the crop',
        'irrigation':     'Drip / micro + canal',
        'related_soil':   ['soil-types-alluvial','soil-types-black','soil-types-desert'],
        'related_climate':['climate-regions-arid','climate-regions-semi-arid','climate-regions-sub-humid'],
        'related_irrig':  ['irrigation-sources-tubewells','irrigation-sources-canals'],
        'districts':      ['Sri Ganganagar','Hanumangarh','Jhalawar','Kota','Nagaur','Jodhpur','Jalore','Sikar'],
        'facts':          ['Sri Ganganagar–Hanumangarh grow kinnow (Rajasthan\'s citrus belt).',
                           'Jhalawar–Kota produce orange under Chambal command.',
                           'Nagaur is India\'s largest producer of isabgol (Plantago ovata).',
                           'Jodhpur–Jalore–Barmer belt supplies guar to the natural-gum industry.'],
    },
}

# ============================================================================
#  CROPPING SEASONS
# ============================================================================

SEASONS = {
    'kharif': {
        'label':      'Kharif — south-west monsoon',
        'months':     'June — October',
        'signature_crops': ['Bajra','Maize','Soybean','Cotton','Groundnut','Pulses (moong · moth · urad)'],
        'districts':  ['Jaisalmer','Barmer','Bikaner','Churu','Jodhpur','Phalodi','Balotra','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu','Ajmer','Beawar','Banswara','Dungarpur','Udaipur','Salumbar','Pratapgarh','Chittorgarh','Kota','Baran','Bundi','Jhalawar','Bhilwara','Sri Ganganagar','Hanumangarh','Pali','Jalore','Sirohi','Rajsamand'],
    },
    'rabi': {
        'label':      'Rabi — winter crops',
        'months':     'October — March',
        'signature_crops': ['Wheat','Mustard','Gram','Barley'],
        'districts':  ['Sri Ganganagar','Hanumangarh','Bharatpur','Deeg','Alwar','Karauli','Sawai Madhopur','Dholpur','Kota','Baran','Bundi','Jhalawar','Chittorgarh','Bhilwara','Jaipur','Tonk','Dausa','Ajmer','Beawar','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu','Kotputli-Behror'],
    },
    'zaid': {
        'label':      'Zaid — summer crops',
        'months':     'March — June',
        'signature_crops': ['Cucurbits','Fodder','Watermelon','Muskmelon'],
        'districts':  ['Sri Ganganagar','Hanumangarh','Bharatpur','Deeg','Alwar','Kota','Baran','Bundi','Jhalawar'],
    },
}

# ============================================================================
#  AGRO-ECONOMIC ZONES — farming-system groupings from RAD
# ============================================================================

AGRO_ECON_ZONES = {
    'ae-north-canal': {
        'label':      'North-West Canal Belt',
        'system':     'Intensive canal-fed cropping (wheat–cotton–kinnow)',
        'intensity':  'Very high (>180 %)',
        'dominant':   ['Wheat','Cotton','Mustard','Kinnow'],
        'districts':  ['Sri Ganganagar','Hanumangarh'],
    },
    'ae-arid-livestock': {
        'label':      'Arid Livestock & Bajra Belt',
        'system':     'Rain-fed bajra + pulses + goat/sheep pastoralism',
        'intensity':  'Very low (~90 %)',
        'dominant':   ['Bajra','Pulses','Guar'],
        'districts':  ['Jaisalmer','Barmer','Balotra','Bikaner','Churu','Jodhpur','Phalodi','Nagaur','Didwana-Kuchaman'],
    },
    'ae-shekhawati': {
        'label':      'Shekhawati Mixed (Groundnut + Bajra)',
        'system':     'Well-irrigated groundnut / bajra / mustard',
        'intensity':  'Moderate (~130 %)',
        'dominant':   ['Bajra','Groundnut','Mustard','Barley'],
        'districts':  ['Sikar','Jhunjhunu','Kotputli-Behror'],
    },
    'ae-eastern-plain': {
        'label':      'Eastern Plains Mustard + Wheat',
        'system':     'Well/canal mustard + wheat rotation with vegetables',
        'intensity':  'High (>150 %)',
        'dominant':   ['Mustard','Wheat','Bajra','Vegetables'],
        'districts':  ['Alwar','Khairthal-Tijara','Bharatpur','Deeg','Karauli','Sawai Madhopur','Dholpur','Jaipur','Dausa','Tonk'],
    },
    'ae-central-mixed': {
        'label':      'Central Mixed Semi-arid',
        'system':     'Rain-fed + well-based bajra/mustard/gram',
        'intensity':  'Moderate',
        'dominant':   ['Bajra','Mustard','Gram','Wheat'],
        'districts':  ['Ajmer','Beawar','Pali','Jalore','Sirohi','Bhilwara'],
    },
    'ae-southern-tribal': {
        'label':      'Southern Tribal Maize Belt',
        'system':     'Rain-fed maize + soybean + pulses; subsistence-oriented',
        'intensity':  'Moderate',
        'dominant':   ['Maize','Soybean','Pulses','Wheat'],
        'districts':  ['Banswara','Dungarpur','Udaipur','Salumbar','Pratapgarh','Rajsamand'],
    },
    'ae-hadoti': {
        'label':      'Hadoti Soybean + Wheat Plateau',
        'system':     'Vertisol-based soybean (kharif) + wheat (rabi) rotation; oranges + coriander',
        'intensity':  'High (>170 %)',
        'dominant':   ['Soybean','Wheat','Mustard','Gram','Orange'],
        'districts':  ['Kota','Baran','Bundi','Jhalawar','Chittorgarh'],
    },
}

# ============================================================================
#  IRRIGATION SOURCES
# ============================================================================

IRRIGATION = {
    'irr-canals': {
        'label':      'Canal irrigation',
        'coverage':   'Dominant in the IGNP + Gang command; extensive in the Chambal command',
        'importance': 'The single biggest source of surface irrigation in Rajasthan; ~30 % of state\'s irrigated area',
        'districts':  ['Sri Ganganagar','Hanumangarh','Kota','Baran','Bundi','Bharatpur','Deeg','Dholpur'],
    },
    'irr-tubewells': {
        'label':      'Tube-well irrigation',
        'coverage':   'Dominant in the eastern plain and Shekhawati',
        'importance': 'Largest source of irrigation by area statewide; ~55 % of the irrigated area — but at the cost of chronic groundwater over-draft',
        'districts':  ['Alwar','Khairthal-Tijara','Kotputli-Behror','Jaipur','Dausa','Tonk','Sikar','Jhunjhunu','Nagaur','Didwana-Kuchaman','Ajmer','Beawar'],
    },
    'irr-wells': {
        'label':      'Open wells (dug wells)',
        'coverage':   'Traditional across the semi-arid centre and south',
        'importance': 'Declining but still critical in southern tribal districts; shallow aquifers',
        'districts':  ['Banswara','Dungarpur','Udaipur','Salumbar','Pratapgarh','Sirohi'],
    },
    'irr-tanks': {
        'label':      'Tank irrigation',
        'coverage':   'Southern uplands and Aravalli valleys',
        'importance': 'Small but locally vital — feeds tribal-belt agriculture and drinking-water in dry months',
        'districts':  ['Udaipur','Salumbar','Dungarpur','Rajsamand','Bhilwara','Chittorgarh','Sirohi'],
    },
    'irr-lift': {
        'label':      'Lift irrigation (schemes)',
        'coverage':   'Chambal + Mahi commands; smaller state-run lifts across Aravalli valleys',
        'importance': 'Delivers Chambal + Mahi water above the natural river level to command farmland',
        'districts':  ['Kota','Baran','Bundi','Chittorgarh','Banswara','Dungarpur','Pratapgarh'],
    },
    'irr-rainfed': {
        'label':      'Rain-fed agriculture',
        'coverage':   'Western arid + southern tribal + Shekhawati fringes',
        'importance': 'Around half the state\'s cultivated area still depends on the SW monsoon alone',
        'districts':  ['Jaisalmer','Barmer','Balotra','Bikaner','Churu','Jodhpur','Phalodi','Jalore','Pali'],
    },
}

# ============================================================================
#  GROUNDWATER STATUS — CGWB categories, 2023 assessment
# ============================================================================

GROUNDWATER = {
    'gw-over-exploited': {
        'label':      'Over-exploited (draft > 100 % of natural recharge)',
        'notes':      'Chronic groundwater mining; water table falling annually',
        'main_crops': ['Wheat','Mustard','Cotton (tube-well pockets)'],
        'districts':  ['Sikar','Jhunjhunu','Jaipur','Dausa','Alwar','Khairthal-Tijara','Kotputli-Behror','Nagaur','Didwana-Kuchaman','Ajmer','Beawar','Jodhpur'],
    },
    'gw-critical': {
        'label':      'Critical (draft 90–100 % of recharge)',
        'notes':      'Approaching over-exploitation; management needed',
        'main_crops': ['Bajra','Mustard','Gram','Wheat'],
        'districts':  ['Pali','Jalore','Sirohi','Bhilwara','Tonk','Sawai Madhopur','Karauli'],
    },
    'gw-semi-critical': {
        'label':      'Semi-critical (draft 70–90 % of recharge)',
        'notes':      'Groundwater use still sustainable; recharge is close to draft',
        'main_crops': ['Wheat','Soybean','Gram','Maize'],
        'districts':  ['Bharatpur','Deeg','Dholpur','Chittorgarh','Rajsamand','Balotra'],
    },
    'gw-safe': {
        'label':      'Safe (draft < 70 % of recharge)',
        'notes':      'Adequate groundwater; recharge exceeds abstraction',
        'main_crops': ['Rice (patchy)','Wheat','Soybean','Maize','Cotton (canal-fed)'],
        'districts':  ['Sri Ganganagar','Hanumangarh','Kota','Baran','Bundi','Jhalawar','Banswara','Dungarpur','Udaipur','Salumbar','Pratapgarh','Barmer','Bikaner','Churu','Jaisalmer','Phalodi'],
    },
}

# ============================================================================
#  COMMAND AREAS — canal-fed farming zones (RWRD + CADD)
# ============================================================================

COMMAND_AREAS = {
    'cmd-ignp': {
        'label':      'Indira Gandhi Nahar Pariyojana (IGNP) Command',
        'source':     'Sutlej + Beas via Harike headworks; feeds through 649 km main canal + distributaries',
        'command_kha':'~15.2 lakh ha CCA',
        'main_crops': ['Wheat','Cotton','Mustard','Kinnow','Guar'],
        'districts':  ['Sri Ganganagar','Hanumangarh','Bikaner','Churu','Jodhpur','Jaisalmer','Barmer','Phalodi'],
    },
    'cmd-gang': {
        'label':      'Gang Canal Command',
        'source':     'Sutlej via Firozpur headworks (1927 — pre-independence project of Ganga Singh)',
        'command_kha':'~3.5 lakh ha CCA',
        'main_crops': ['Wheat','Cotton','Mustard','Guar','Gram'],
        'districts':  ['Sri Ganganagar'],
    },
    'cmd-chambal': {
        'label':      'Chambal (Rajasthan) Command',
        'source':     'Kota Barrage (fed by Gandhi Sagar + Rana Pratap Sagar + Jawahar Sagar upstream)',
        'command_kha':'~2.3 lakh ha CCA',
        'main_crops': ['Wheat','Soybean','Mustard','Gram','Orange','Coriander'],
        'districts':  ['Kota','Baran','Bundi'],
    },
    'cmd-mahi': {
        'label':      'Mahi Bajaj Sagar Command',
        'source':     'Mahi Bajaj Sagar reservoir (1985), tribal-belt project',
        'command_kha':'~0.8 lakh ha CCA',
        'main_crops': ['Wheat','Maize','Cotton','Gram'],
        'districts':  ['Banswara','Dungarpur'],
    },
    'cmd-bisalpur': {
        'label':      'Bisalpur Command (drinking + irrigation)',
        'source':     'Bisalpur reservoir on the Banas river (1999)',
        'command_kha':'~0.8 lakh ha CCA + Jaipur–Ajmer–Tonk drinking-water',
        'main_crops': ['Wheat','Mustard','Gram'],
        'districts':  ['Tonk','Ajmer','Beawar','Jaipur'],
    },
}

# ============================================================================
#  DAMS + RESERVOIRS
#  Coordinates from published sources (RWRD project pages, CWC dam register).
#  Where an OSM reservoir polygon exists (e.g. Rana Pratap Sagar) it is used
#  for the geometry; otherwise a point is emitted with `geometryQuality: point`.
# ============================================================================

DAMS = [
    {'id':'bisalpur',    'name':'Bisalpur Dam',
     'lonlat':[75.4664, 25.9207], 'river':'Banas', 'purpose':'Drinking-water for Jaipur–Ajmer–Tonk + irrigation',
     'capacity_mcm': 1095, 'height_m': 39.5, 'commissioned':'1999',
     'district':'Tonk','source':'RWRD project register + CWC Dam Register'},
    {'id':'rana-pratap-sagar',  'name':'Rana Pratap Sagar Dam',
     'osm_ref':('relation',1713448), 'lonlat':[75.5765, 24.9152],
     'river':'Chambal', 'purpose':'Hydropower + irrigation',
     'capacity_mcm': 2900, 'height_m': 53.8, 'commissioned':'1970',
     'district':'Chittorgarh','source':'RWRD + CWC'},
    {'id':'jawahar-sagar',      'name':'Jawahar Sagar Dam',
     'lonlat':[75.8010, 24.9611], 'river':'Chambal', 'purpose':'Hydropower + regulation',
     'capacity_mcm': 60, 'height_m': 45, 'commissioned':'1972',
     'district':'Kota','source':'RWRD + CWC'},
    {'id':'kota-barrage',       'name':'Kota Barrage',
     'lonlat':[75.8446, 25.1670], 'river':'Chambal',
     'purpose':'Irrigation headworks — feeds the Chambal command',
     'capacity_mcm': 99, 'height_m': 37, 'commissioned':'1960',
     'district':'Kota','source':'RWRD + CWC'},
    {'id':'gandhi-sagar-influence','name':'Gandhi Sagar Dam (Madhya Pradesh — upstream influence)',
     'lonlat':[75.5544, 24.7080], 'river':'Chambal',
     'purpose':'Regulates the Chambal for downstream Rajasthan',
     'capacity_mcm': 7746, 'height_m': 62,'commissioned':'1960',
     'district':'Mandsaur (MP)','source':'CWC — cited for basin context',
     'geometry_note':'Located across the MP border; included because it defines Chambal flow into Rajasthan.'},
    {'id':'mahi-bajaj-sagar',   'name':'Mahi Bajaj Sagar Dam',
     'lonlat':[74.2916, 23.4986], 'river':'Mahi',
     'purpose':'Hydropower + irrigation — Banswara tribal command',
     'capacity_mcm': 2172, 'height_m': 74.5, 'commissioned':'1985',
     'district':'Banswara','source':'RWRD + CWC'},
    {'id':'jakham',             'name':'Jakham Dam',
     'lonlat':[74.2830, 23.6710], 'river':'Jakham',
     'purpose':'Irrigation + drinking-water for Pratapgarh',
     'capacity_mcm': 285, 'height_m': 81,'commissioned':'1986',
     'district':'Pratapgarh','source':'RWRD'},
    {'id':'jawai',              'name':'Jawai Bandh',
     'lonlat':[73.1441, 25.0987], 'river':'Jawai',
     'purpose':'Irrigation + Marwar drinking water — famed leopard reservoir',
     'capacity_mcm': 208, 'height_m': 61.3, 'commissioned':'1957',
     'district':'Pali','source':'RWRD'},
    {'id':'panchna',            'name':'Panchna Dam',
     'lonlat':[76.9310, 26.6480], 'river':'Bhadravati (5 tributaries)',
     'purpose':'Irrigation + Ranthambore water supply',
     'capacity_mcm': 63, 'commissioned':'1990s',
     'district':'Karauli','source':'RWRD'},
    {'id':'ramgarh-alwar',      'name':'Ramgarh Dam',
     'lonlat':[76.5872, 27.2564], 'river':'Ruparel',
     'purpose':'Irrigation + former Jaipur water supply',
     'capacity_mcm': 74, 'commissioned':'1903',
     'district':'Alwar','source':'RWRD'},
    {'id':'meja',               'name':'Meja Dam',
     'lonlat':[74.6720, 25.0830], 'river':'Kothari',
     'purpose':'Bhilwara drinking-water',
     'capacity_mcm': 108, 'commissioned':'1980s',
     'district':'Bhilwara','source':'RWRD'},
    {'id':'som-kamla-amba',     'name':'Som Kamla Amba Dam',
     'lonlat':[74.0517, 23.6300], 'river':'Som',
     'purpose':'Irrigation for southern tribal belt',
     'capacity_mcm': 165, 'commissioned':'1979',
     'district':'Dungarpur','source':'RWRD'},
]


# ============================================================================
#  Emit helper for district-approximated features
# ============================================================================

def emit_layer(zones, layer_id, feature_type, source_ref, category='agriculture', extra_field_names=None):
    bym = load_districts()
    features = []
    for zone_id, meta in zones.items():
        geom = merge_districts(meta['districts'], bym)
        if not geom: continue
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
                                'The classification\'s actual boundary crosses districts; '
                                'refer to the cited source for the authoritative surveyed line.'),
            'notes':           {'facts': meta.get('facts', []), 'mnemonic': '',
                                'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': '', 'status': ''},
        }
        for k, v in meta.items():
            if k in ('label','districts','facts'): continue
            if k == 'notes' and not isinstance(v, dict): props['remark'] = v; continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id': f'{layer_id}-{zone_id}',
            'properties': props,
            'geometry': geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')

# ============================================================================
#  Canal + dam builders — real geometry
# ============================================================================

def build_canals():
    d = json.load(open(OSM))
    ways_by_name = {}
    for e in d.get('elements', []):
        if e.get('type') != 'way': continue
        t = e.get('tags', {})
        if t.get('waterway') != 'canal': continue
        name = t.get('name:en') or t.get('name','')
        if not name: continue
        ways_by_name.setdefault(name, []).append(e)

    features = []
    for canonical in ['Indira Gandhi Canal','Gang Canal','Gang Canal Link Channel']:
        ways = ways_by_name.get(canonical, [])
        if not ways: continue
        lines = [[[pt['lon'], pt['lat']] for pt in w.get('geometry', [])] for w in ways if w.get('geometry')]
        geom = {'type':'MultiLineString','coordinates':lines}
        cent = _linestring_centroid(lines)
        bbox = bbox_of(geom['coordinates'])
        cid = {'Indira Gandhi Canal':'ignp','Gang Canal':'gang-canal','Gang Canal Link Channel':'gang-link'}[canonical]
        meta = {
            'ignp': {
                'commissioned':'1958 (initiated), 1961 (first water), 649 km main canal',
                'source_river':'Sutlej + Beas via Harike headworks',
                'command':'~19 lakh ha ultimate CCA',
                'signature_crops':['Wheat','Cotton','Mustard','Kinnow','Guar'],
                'districts_served':['Sri Ganganagar','Hanumangarh','Bikaner','Churu','Jodhpur','Jaisalmer','Barmer','Phalodi'],
                'facts':[
                    'One of the longest canals in the world (~649 km main + ~9000 km branches/distributaries).',
                    'Originally the Rajasthan Canal Project; renamed Indira Gandhi Nahar Pariyojana in 1984.',
                    'Transformed the Thar desert districts of Sri Ganganagar and Hanumangarh into wheat-and-cotton country.',
                ],
            },
            'gang-canal': {
                'commissioned':'1927 (by Maharaja Ganga Singh of Bikaner)',
                'source_river':'Sutlej via Firozpur headworks',
                'command':'~3.5 lakh ha CCA',
                'signature_crops':['Wheat','Cotton','Mustard','Gram'],
                'districts_served':['Sri Ganganagar'],
                'facts':[
                    'Rajasthan\'s first modern irrigation canal, predating independence.',
                    'Named for Maharaja Ganga Singh, whose vision brought canal water to Bikaner state.',
                    'The Gang Canal command inaugurated modern agriculture in northern Rajasthan.',
                ],
            },
            'gang-link': {
                'commissioned':'Distributary — pre-IGNP era',
                'source_river':'Gang Canal offshoot',
                'command':'Local distributaries',
                'signature_crops':['Wheat','Mustard'],
                'districts_served':['Sri Ganganagar'],
                'facts':['Feeder distributary of the Gang Canal system.'],
            },
        }[cid]
        props = {
            'name': canonical, 'type':'canal', 'category':'water',
            'state': STATE,
            'source': 'OSM waterway=canal + RWRD project register',
            'lastUpdated': RETRIEVED,
            'centroid': [round(cent[0],5), round(cent[1],5)],
            'labelAnchor': [round(cent[0],5), round(cent[1],5)],
            'bbox': [round(v,5) for v in bbox],
            'geometryQuality':'polyline',
            'notes': {'facts': meta['facts'], 'mnemonic':'', 'significance':'very-high', 'confusedWith':[]},
            'ecology':{'flora':[],'fauna':[],'ecosystem':''},
            'governance':{'authority':'RWRD + Command Area Development Department','status':'operational'},
        }
        for k, v in meta.items():
            if k == 'facts': continue
            props[k] = v
        features.append({'type':'Feature','id':f'canal-{cid}','properties':props,'geometry':geom})
    (OUT / 'major-canals.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote major-canals.geojson: {len(features)} features')

def _linestring_centroid(lines):
    pts = [p for l in lines for p in l]
    if not pts: return [0, 0]
    return [sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts)]

def build_dams():
    """Dams as point features. Where an OSM relation exists (e.g. Rana Pratap
    Sagar) the polygon is used instead. All coordinates from RWRD / CWC."""
    osm = json.load(open(OSM))
    osm_by_id = {(e['type'], e['id']): e for e in osm.get('elements', [])}
    features = []
    for d in DAMS:
        geom = None
        gq = 'point'
        if d.get('osm_ref') and d['osm_ref'] in osm_by_id:
            el = osm_by_id[d['osm_ref']]
            if el.get('type') == 'relation':
                # assemble outer ways
                outer_lines = []
                for m in el.get('members', []):
                    if m.get('type') == 'way' and m.get('role') in ('outer', '') and 'geometry' in m:
                        outer_lines.append([[pt['lon'], pt['lat']] for pt in m['geometry']])
                # Stitch outer lines into a ring
                if outer_lines:
                    rings = _stitch_rings(outer_lines)
                    if rings:
                        geom = {'type':'MultiPolygon','coordinates':[[r] for r in rings]}
                        gq = 'polygon'
        if not geom:
            geom = {'type':'Point','coordinates': d['lonlat']}
        cent = d['lonlat']
        bbox = bbox_of(geom['coordinates'])
        props = {
            'name': d['name'], 'type':'dam', 'category':'water',
            'state': STATE,
            'river': d['river'],
            'purpose': d['purpose'],
            'capacity_mcm': d.get('capacity_mcm'),
            'height_m': d.get('height_m'),
            'commissioned': d.get('commissioned'),
            'district': d['district'],
            'source': d['source'],
            'lastUpdated': RETRIEVED,
            'centroid': [round(cent[0],5), round(cent[1],5)],
            'labelAnchor':[round(cent[0],5), round(cent[1],5)],
            'bbox': [round(v,5) for v in bbox],
            'geometryQuality': gq,
            'notes': {'facts':[
                f'Built across the {d["river"]} river; commissioned {d.get("commissioned","?")}.',
                f'{d["purpose"]}.',
            ] + ([f'Live storage capacity {d["capacity_mcm"]} MCM.'] if d.get('capacity_mcm') else []),
                'mnemonic':'', 'significance':'high','confusedWith':[]},
            'ecology':{'flora':[],'fauna':[],'ecosystem':''},
            'governance':{'authority':'Rajasthan Water Resources Department','status':'operational'},
        }
        if d.get('geometry_note'): props['geometryNote'] = d['geometry_note']
        features.append({'type':'Feature','id':f'dam-{d["id"]}','properties':props,'geometry':geom})
    (OUT / 'dams.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, separators=(',',':')))
    print(f'wrote dams.geojson: {len(features)} features')

def _stitch_rings(ways):
    remaining = [list(w) for w in ways if len(w) >= 2]
    rings = []
    while remaining:
        cur = remaining.pop(0)
        while cur[0] != cur[-1] and remaining:
            found = False
            for i, w in enumerate(remaining):
                if w[0] == cur[-1]:      cur.extend(w[1:]); remaining.pop(i); found=True; break
                if w[-1] == cur[-1]:     cur.extend(list(reversed(w))[1:]); remaining.pop(i); found=True; break
                if w[-1] == cur[0]:      cur = w + cur[1:]; remaining.pop(i); found=True; break
                if w[0] == cur[0]:       cur = list(reversed(w)) + cur[1:]; remaining.pop(i); found=True; break
            if not found: break
        if cur[0] == cur[-1] and len(cur) >= 4: rings.append(cur)
    return rings

# ============================================================================
#  KNOWLEDGE GRAPH EXPANSION — 100+ new edges linking:
#    * crops ↔ soil / climate / irrigation / dominant PA context
#    * dams ↔ rivers / command areas
#    * canals ↔ command areas / zones served
#    * agro-econ zones ↔ irrigation / soils / crops
#    * groundwater ↔ high-water-use crops
# ============================================================================

def build_kg_expansion():
    edges = []

    # Crops → soil / climate / irrigation
    for cid, meta in CROPS.items():
        related = []
        for s in meta.get('related_soil', []):
            related.append({'target': s, 'type':'colocated',
                            'explanation':f'Preferred soil for {meta["label"]}.'})
        for c in meta.get('related_climate', []):
            related.append({'target': c, 'type':'colocated',
                            'explanation':f'Signature climate for {meta["label"]}.'})
        for i in meta.get('related_irrig', []):
            related.append({'target': i, 'type':'colocated',
                            'explanation':f'Dominant irrigation for {meta["label"]}.'})
        if related:
            edges.append({'source': f'major-crops-{cid}', 'related': related})

    # Dams → rivers + downstream commands
    dam_to_command = {
        'kota-barrage':'command-areas-cmd-chambal',
        'rana-pratap-sagar':'command-areas-cmd-chambal',
        'jawahar-sagar':'command-areas-cmd-chambal',
        'gandhi-sagar-influence':'command-areas-cmd-chambal',
        'mahi-bajaj-sagar':'command-areas-cmd-mahi',
        'bisalpur':'command-areas-cmd-bisalpur',
    }
    dam_to_river_id = {
        'bisalpur':'banas-river','rana-pratap-sagar':'chambal-river',
        'jawahar-sagar':'chambal-river','kota-barrage':'chambal-river',
        'gandhi-sagar-influence':'chambal-river','mahi-bajaj-sagar':'mahi-river',
        'jakham':'jakham-river','jawai':'jawai-river','som-kamla-amba':'som-river',
    }
    for d in DAMS:
        r = []
        if d['id'] in dam_to_river_id:
            r.append({'target': dam_to_river_id[d['id']], 'type':'defines',
                      'explanation':f'{d["name"]} impounds this river.'})
        if d['id'] in dam_to_command:
            r.append({'target': dam_to_command[d['id']], 'type':'defines',
                      'explanation':f'{d["name"]} is the primary reservoir feeding this command area.'})
        if r:
            edges.append({'source': f'dam-{d["id"]}', 'related': r})

    # Canals → command areas
    edges += [
        {'source':'canal-ignp',       'related':[
            {'target':'command-areas-cmd-ignp',   'type':'defines',
             'explanation':'The IGNP is the sole source for its command area.'},
            {'target':'climate-regions-arid',     'type':'colocated',
             'explanation':'Runs the length of arid western Rajasthan.'},
            {'target':'major-crops-cotton',       'type':'signature'},
            {'target':'major-crops-wheat',        'type':'signature'},
            {'target':'major-crops-mustard',      'type':'signature'},
            {'target':'agro-economic-zones-ae-north-canal','type':'defines'},
        ]},
        {'source':'canal-gang-canal', 'related':[
            {'target':'command-areas-cmd-gang',   'type':'defines'},
            {'target':'major-crops-wheat',        'type':'signature'},
            {'target':'major-crops-cotton',       'type':'signature'},
            {'target':'agro-economic-zones-ae-north-canal','type':'colocated'},
        ]},
    ]

    # Command areas → dominant crops
    edges += [
        {'source':'command-areas-cmd-ignp', 'related':[
            {'target':'major-crops-wheat',   'type':'signature'},
            {'target':'major-crops-cotton',  'type':'signature'},
            {'target':'major-crops-mustard', 'type':'signature'},
            {'target':'major-crops-horticulture','type':'colocated',
             'explanation':'Kinnow orchards use IGNP water.'},
            {'target':'irrigation-sources-irr-canals','type':'defines'},
            {'target':'agro-economic-zones-ae-north-canal','type':'colocated'},
        ]},
        {'source':'command-areas-cmd-chambal', 'related':[
            {'target':'major-crops-wheat',   'type':'signature'},
            {'target':'major-crops-soybean', 'type':'signature'},
            {'target':'major-crops-gram',    'type':'signature'},
            {'target':'irrigation-sources-irr-canals','type':'defines'},
            {'target':'agro-economic-zones-ae-hadoti','type':'defines'},
            {'target':'physiography-southeastern-plateau-region','type':'colocated'},
        ]},
        {'source':'command-areas-cmd-mahi', 'related':[
            {'target':'major-crops-maize',   'type':'signature'},
            {'target':'major-crops-wheat',   'type':'colocated'},
            {'target':'drainage-basins-mahi','type':'defines'},
            {'target':'agro-economic-zones-ae-southern-tribal','type':'colocated'},
        ]},
        {'source':'command-areas-cmd-bisalpur','related':[
            {'target':'major-crops-mustard', 'type':'signature'},
            {'target':'banas-river',         'type':'defines'},
            {'target':'agro-economic-zones-ae-central-mixed','type':'colocated'},
        ]},
    ]

    # Agro-economic zones → crops + soil + irrigation
    zone_signatures = {
        'ae-north-canal': [
            ('major-crops-wheat','signature'),('major-crops-cotton','signature'),
            ('major-crops-mustard','signature'),('major-crops-horticulture','colocated'),
            ('soil-types-alluvial','colocated'),('irrigation-sources-irr-canals','defines'),
        ],
        'ae-arid-livestock': [
            ('major-crops-bajra','signature'),('major-crops-pulses','signature'),
            ('major-crops-horticulture','colocated'),
            ('soil-types-desert','colocated'),('irrigation-sources-irr-rainfed','defines'),
            ('climate-regions-arid','colocated'),
        ],
        'ae-shekhawati': [
            ('major-crops-groundnut','signature'),('major-crops-bajra','signature'),
            ('major-crops-mustard','colocated'),('major-crops-barley','colocated'),
            ('irrigation-sources-irr-tubewells','defines'),
            ('gw-over-exploited','colocated'),
        ],
        'ae-eastern-plain': [
            ('major-crops-mustard','signature'),('major-crops-wheat','signature'),
            ('irrigation-sources-irr-tubewells','defines'),
            ('soil-types-alluvial','colocated'),('physiography-eastern-plains-region','colocated'),
        ],
        'ae-central-mixed': [
            ('major-crops-bajra','signature'),('major-crops-mustard','colocated'),
            ('major-crops-gram','colocated'),
            ('soil-types-red-loamy','colocated'),
        ],
        'ae-southern-tribal': [
            ('major-crops-maize','signature'),('major-crops-soybean','signature'),
            ('major-crops-pulses','colocated'),
            ('irrigation-sources-irr-wells','defines'),('irrigation-sources-irr-tanks','colocated'),
            ('physiography-southern-hills-region','colocated'),
        ],
        'ae-hadoti': [
            ('major-crops-soybean','signature'),('major-crops-wheat','signature'),
            ('major-crops-gram','colocated'),('major-crops-mustard','colocated'),
            ('soil-types-black','defines'),('irrigation-sources-irr-canals','colocated'),
            ('physiography-southeastern-plateau-region','defines'),
        ],
    }
    for zid, refs in zone_signatures.items():
        edges.append({'source': f'agro-economic-zones-{zid}',
                      'related':[{'target':t,'type':k} for (t,k) in refs]})

    # Irrigation sources → dominant crops + zones
    irr_signatures = {
        'irr-canals': [
            ('major-crops-wheat','signature'),('major-crops-cotton','signature'),
            ('major-crops-mustard','signature'),
            ('command-areas-cmd-ignp','defines'),('command-areas-cmd-chambal','defines'),
        ],
        'irr-tubewells': [
            ('major-crops-mustard','signature'),('major-crops-wheat','colocated'),
            ('major-crops-groundnut','colocated'),
            ('gw-over-exploited','defines'),
        ],
        'irr-rainfed': [
            ('major-crops-bajra','signature'),('major-crops-pulses','signature'),
            ('climate-regions-arid','colocated'),('cropping-seasons-kharif','colocated'),
        ],
        'irr-lift': [
            ('major-crops-soybean','signature'),('major-crops-wheat','signature'),
            ('chambal-river','defines'),
        ],
        'irr-tanks': [
            ('major-crops-maize','signature'),
            ('physiography-southern-hills-region','colocated'),
        ],
        'irr-wells': [
            ('major-crops-maize','signature'),('major-crops-groundnut','colocated'),
        ],
    }
    for iid, refs in irr_signatures.items():
        edges.append({'source': f'irrigation-sources-{iid}',
                      'related':[{'target':t,'type':k} for (t,k) in refs]})

    # Groundwater ↔ crops (high-water crops drive over-exploitation)
    edges += [
        {'source':'groundwater-gw-over-exploited','related':[
            {'target':'major-crops-wheat',    'type':'colocated',
             'explanation':'Wheat\'s canal-alternative in eastern Rajasthan is tube-well pumping.'},
            {'target':'major-crops-mustard',  'type':'colocated'},
            {'target':'irrigation-sources-irr-tubewells','type':'defines'},
            {'target':'agro-economic-zones-ae-shekhawati','type':'colocated'},
            {'target':'agro-economic-zones-ae-eastern-plain','type':'colocated'},
        ]},
        {'source':'groundwater-gw-safe','related':[
            {'target':'irrigation-sources-irr-canals','type':'colocated',
             'explanation':'Canal-command districts rely less on groundwater.'},
            {'target':'agro-economic-zones-ae-north-canal','type':'colocated'},
        ]},
    ]

    # Cropping seasons ↔ signature crops
    edges += [
        {'source':'cropping-seasons-kharif','related':[
            {'target':'major-crops-bajra',      'type':'signature'},
            {'target':'major-crops-maize',      'type':'signature'},
            {'target':'major-crops-soybean',    'type':'signature'},
            {'target':'major-crops-cotton',     'type':'signature'},
            {'target':'major-crops-groundnut',  'type':'signature'},
            {'target':'major-crops-pulses',     'type':'signature'},
            {'target':'irrigation-sources-irr-rainfed','type':'colocated'},
        ]},
        {'source':'cropping-seasons-rabi','related':[
            {'target':'major-crops-wheat',      'type':'signature'},
            {'target':'major-crops-mustard',    'type':'signature'},
            {'target':'major-crops-gram',       'type':'signature'},
            {'target':'major-crops-barley',     'type':'signature'},
            {'target':'irrigation-sources-irr-canals','type':'colocated'},
            {'target':'irrigation-sources-irr-tubewells','type':'colocated'},
        ]},
    ]

    return edges


def merge_kg_expansion(new_edges):
    kg_path = OUT / 'knowledge-graph.json'
    kg = json.load(open(kg_path))
    # De-dup by source id — replace existing entries for the same source
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
    emit_layer(CROPS,           'major-crops',           'crop',              'RAD + DES agricultural statistics; ICAR', category='agriculture')
    emit_layer(SEASONS,         'cropping-seasons',      'cropping_season',   'RAD + ICAR seasonal calendar', category='agriculture')
    emit_layer(AGRO_ECON_ZONES, 'agro-economic-zones',   'agro_economic_zone','RAD agro-economic classification', category='agriculture')
    emit_layer(IRRIGATION,      'irrigation-sources',    'irrigation_source', 'RWRD + Agricultural Census 2015-16', category='water')
    emit_layer(GROUNDWATER,     'groundwater',           'groundwater_zone',  'CGWB Dynamic Groundwater Resources 2023', category='water')
    emit_layer(COMMAND_AREAS,   'command-areas',         'command_area',      'RWRD + CADD project register', category='water')
    build_canals()
    build_dams()

    new = build_kg_expansion()
    (OUT / 'knowledge-graph-agri.json').write_text(json.dumps({'edges':new}, indent=2))
    print(f'wrote knowledge-graph-agri.json: {len(new)} new edge groups')
    merge_kg_expansion(new)


if __name__ == '__main__':
    main()
