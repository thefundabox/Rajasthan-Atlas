"""
BUILD_HUMAN.py — Module 9: Human Geography & Administrative Rajasthan.

Outputs (into atlas/data/):
    population-density.geojson       — 5-class classification (polygon,
                                       district-approximated)
    population-growth.geojson        — 5-class classification
    literacy.geojson                 — 5-class classification
    sex-ratio.geojson                — 5-class classification
    urbanisation.geojson             — 5-class classification
    scheduled-tribes.geojson         — 5-class ST-percentage classification
    scheduled-castes.geojson         — 5-class SC-percentage classification
    scheduled-areas.geojson          — 1 polygon (Fifth Schedule TSP block)
    administrative-divisions.geojson — 7 revenue divisions (Jaipur, Jodhpur,
                                       Ajmer, Bikaner, Bharatpur, Kota, Udaipur)
    regional-zones.geojson           — 9 cultural zones (Marwar, Mewar, Hadoti,
                                       Shekhawati, Dhundhar, Vagad, Matsya,
                                       Godwar, Mewat)
    border-districts.geojson         — 21 districts with international / state
                                       borders
    municipal-corporations.geojson   — 10 municipal corporations (points)
    smart-cities.geojson             — 4 India Smart Cities Mission cities
    urban-centres.geojson            — 15 Class-I urban centres (points)
    population-corridors.geojson     — 5 major inter-city development corridors

    district-demographics.json       — per-district Census 2011 values (for the
                                       Revision Dashboard + Compare Mode)
    knowledge-graph-human.json       — new typed edges

DESIGN CONTRACT
================
* Every demographic layer is district-approximated. Class boundaries follow
  standard Census/RGI cut-offs; district-to-class assignment uses Census 2011
  official district figures.
* The 8 new (post-2023) districts inherit Census 2011 values from their parent
  district. This is documented in each feature's `data_note` field.
* Every point feature (municipal corp, smart city, urban centre) ships with
  `geometryQuality: "point"` and a real coordinate from the RGI town register.
* Every polygon feature carries `geometryQuality: "generalised
  (district-approximated)"`.
* KG expansion links:
    every metric-class → its constituent districts
    every regional zone → its dominant crops / minerals / industry / physical
    every urban centre → its municipal corp + smart-city status + population
                         corridor + industrial cluster / region
    every border district → its neighbour state / country

SOURCES:
    Census 2011 — Registrar General of India, District Census Handbook
    RGI        — Registrar General of India (population projections)
    DES        — Directorate of Economics & Statistics, GoR
    NITI Aayog — Aspirational-district statistics + Smart Cities Mission
    TAD        — Tribal Area Development Department, GoR (Scheduled Areas)
    ECI        — Election Commission (constituency boundaries)
    OSM        — supplementary geometry for urban centres
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
#  DISTRICT LOAD (shared helpers)
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
#  CENSUS 2011 — per-district figures
#
#  33 pre-2023 districts carry authoritative RGI Census 2011 values.
#  8 new (2023+) districts inherit from their parent — documented in NEW_DISTRICT_PARENT.
# ============================================================================

# Format:  district: (population, area_km2, density, literacy_pct, sex_ratio, st_pct, sc_pct, urban_pct)
DISTRICT_CENSUS = {
    'Ajmer':          (2583052,  8481,  305, 69.32, 951,  2.2, 19.7, 40.1),
    'Alwar':          (3674179,  8380,  438, 70.72, 895,  6.3, 18.6, 17.6),
    'Banswara':       (1797485,  5037,  357, 56.33, 980, 76.4,  4.3,  7.1),
    'Baran':          (1222755,  6955,  176, 66.74, 929, 20.5, 20.0, 20.9),
    'Barmer':         (2603751, 28387,   92, 56.53, 902,  6.7, 17.5,  7.1),
    'Bharatpur':      (2548462,  5066,  503, 70.11, 880,  3.4, 20.9, 20.0),
    'Bhilwara':       (2408523, 10455,  230, 61.37, 973,  9.3, 15.0, 20.0),
    'Bikaner':        (2363937, 27244,   87, 65.13, 905,  0.0, 20.1, 33.1),
    'Bundi':          (1110906,  5776,  192, 61.65, 925, 22.9, 19.4, 20.7),
    'Chittorgarh':    (1544338,  7822,  197, 60.35, 972, 22.2, 15.1, 14.6),
    'Churu':          (2039547, 13858,  147, 66.75, 940,  0.0, 20.9, 27.9),
    'Dausa':          (1634409,  3432,  476, 68.22, 905, 26.1, 22.5,  8.5),
    'Dholpur':        (1206516,  3033,  398, 69.13, 846,  6.0, 22.3, 21.6),
    'Dungarpur':      (1388552,  3770,  368, 59.46, 994, 70.8,  3.5,  6.1),
    'Sri Ganganagar': (1969168,  7984,  179, 69.63, 887,  0.0, 36.6, 27.4),
    'Hanumangarh':    (1774692, 12645,  184, 67.13, 906,  0.0, 28.7, 20.5),
    'Jaipur':         (6626178, 11152,  598, 75.51, 910,  8.3, 15.4, 52.4),
    'Jaisalmer':      ( 669919, 38401,   17, 57.22, 852,  5.7, 15.5, 15.3),
    'Jalore':         (1828730, 10640,  172, 54.86, 951,  8.5, 17.4,  8.8),
    'Jhalawar':       (1411327,  6928,  208, 61.51, 947, 12.3, 22.0, 15.3),
    'Jhunjhunu':      (2137045,  5928,  361, 74.13, 950,  2.6, 17.4, 23.0),
    'Jodhpur':        (3687165, 22850,  161, 65.94, 916,  3.0, 18.7, 34.0),
    'Karauli':        (1458459,  5043,  289, 66.22, 861, 24.7, 22.6, 17.4),
    'Kota':           (1951014,  5217,  374, 76.56, 911, 12.6, 18.4, 60.3),
    'Nagaur':         (3307743, 17718,  187, 62.80, 950,  0.4, 19.0, 20.5),
    'Pali':           (2037573, 12387,  165, 62.38, 987,  6.6, 18.5, 21.7),
    'Pratapgarh':     ( 867848,  4449,  195, 55.94, 983, 62.5,  7.7,  7.9),
    'Rajsamand':      (1156597,  4655,  249, 63.10, 990, 12.7, 17.7, 15.9),
    'Sawai Madhopur': (1338114,  4498,  297, 65.53, 897, 21.7, 22.3, 19.7),
    'Sikar':          (2677333,  7732,  346, 71.19, 947,  4.3, 12.2, 22.9),
    'Sirohi':         (1036346,  5136,  202, 55.25, 938, 24.5, 17.7, 20.7),
    'Tonk':           (1421326,  7194,  198, 61.72, 949, 12.5, 18.4, 20.1),
    'Udaipur':        (3068420, 11724,  262, 61.82, 958, 47.9,  6.3, 19.4),
}

# 8 new (2023+) districts inherit from their parent (Census 2011 pre-split values)
NEW_DISTRICT_PARENT = {
    'Balotra':          'Barmer',
    'Beawar':           'Ajmer',
    'Deeg':             'Bharatpur',
    'Didwana-Kuchaman': 'Nagaur',
    'Khairthal-Tijara': 'Alwar',
    'Kotputli-Behror':  'Alwar',   # actually carved from Alwar + Jaipur + Sikar; Alwar is the largest source
    'Phalodi':          'Jodhpur',
    'Salumbar':         'Udaipur',
}

# Population growth rate (2001-2011, %) — RGI Census 2011
POPULATION_GROWTH = {
    'Ajmer': 18.5, 'Alwar': 22.8, 'Banswara': 26.7, 'Baran': 19.2, 'Barmer': 32.5,
    'Bharatpur': 21.3, 'Bhilwara': 19.8, 'Bikaner': 24.4, 'Bundi': 18.9,
    'Chittorgarh': 15.3, 'Churu': 20.4, 'Dausa': 23.4, 'Dholpur': 24.5,
    'Dungarpur': 25.0, 'Sri Ganganagar': 10.1, 'Hanumangarh': 17.1,
    'Jaipur': 26.9, 'Jaisalmer': 32.2, 'Jalore': 26.2, 'Jhalawar': 20.6,
    'Jhunjhunu': 11.8, 'Jodhpur': 27.7, 'Karauli': 20.7, 'Kota': 24.3,
    'Nagaur': 19.2, 'Pali': 11.9, 'Pratapgarh': 27.9, 'Rajsamand': 17.9,
    'Sawai Madhopur': 19.5, 'Sikar': 17.0, 'Sirohi': 15.7, 'Tonk': 17.2,
    'Udaipur': 23.7,
}

def val(district, idx):
    """Return the Census 2011 value at index `idx` for a district, following
    parent lookup for new districts."""
    parent = NEW_DISTRICT_PARENT.get(district, district)
    return DISTRICT_CENSUS[parent][idx]

def all_districts_with_values(idx):
    """Return a district → value dict for every one of the 41 districts."""
    out = {}
    for name in DISTRICT_CENSUS:
        out[name] = DISTRICT_CENSUS[name][idx]
    for new, parent in NEW_DISTRICT_PARENT.items():
        out[new] = DISTRICT_CENSUS[parent][idx]
    return out

def all_growth():
    out = dict(POPULATION_GROWTH)
    for new, parent in NEW_DISTRICT_PARENT.items():
        out[new] = POPULATION_GROWTH[parent]
    return out

# ============================================================================
#  Classification helpers — bin districts into 5 classes by metric
# ============================================================================

def classify(values, bins, labels):
    """values: {district:value}. bins: 4 thresholds. labels: 5 class names.
    Returns {label: [districts]}."""
    out = {label: [] for label in labels}
    for d, v in values.items():
        if v is None: continue
        if   v < bins[0]: out[labels[0]].append(d)
        elif v < bins[1]: out[labels[1]].append(d)
        elif v < bins[2]: out[labels[2]].append(d)
        elif v < bins[3]: out[labels[3]].append(d)
        else:             out[labels[4]].append(d)
    return out

# ============================================================================
#  DEMOGRAPHIC LAYERS — 7 metric-classified polygon layers
# ============================================================================

def build_population_density(bym):
    values = all_districts_with_values(2)   # density index
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [100, 200, 300, 500], labels)
    meta_labels = {
        'very-low':  'Very Low Density (<100/km²)',
        'low':       'Low Density (100–200/km²)',
        'medium':    'Medium Density (200–300/km²)',
        'high':      'High Density (300–500/km²)',
        'very-high': 'Very High Density (>500/km²)',
    }
    facts_by_class = {
        'very-low':  ['Thar Desert districts — Jaisalmer, Bikaner, Barmer.',
                      'Jaisalmer\'s 17/km² is the lowest in Rajasthan and among the lowest in India.',
                      'Aridity + saline groundwater keep the west sparsely populated.'],
        'low':       ['Semi-arid interior + Marwar districts.',
                      'Roughly matches the semi-arid climate belt.'],
        'medium':    ['Aravalli piedmont + eastern uplands.',
                      'Transition zone between arid west and populous east.'],
        'high':      ['Shekhawati + Mewat + tribal-belt districts (Banswara, Dungarpur).',
                      'High density coexists with lower literacy in the tribal belt.'],
        'very-high': ['Jaipur (598/km²), Bharatpur (503), Deeg — the most crowded belt.',
                      'Anchored on the Jaipur metropolitan area + Bharatpur\'s canal-irrigated plain.'],
    }
    return emit_metric_layer(
        'population-density','population_density_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · District Census Handbook',
        unit='/km²', metric_key='density',
    )

def build_population_growth(bym):
    values = all_growth()
    labels = ['low','moderate','average','high','very-high']
    classes = classify(values, [15, 20, 25, 30], labels)
    meta_labels = {
        'low':       'Low Growth (<15 % over 2001-2011)',
        'moderate':  'Moderate Growth (15–20 %)',
        'average':   'Around State Average (20–25 %)',
        'high':      'High Growth (25–30 %)',
        'very-high': 'Very High Growth (>30 %)',
    }
    facts_by_class = {
        'low':       ['Sri Ganganagar, Jhunjhunu, Pali — mature demographic transition; '
                      'low fertility + out-migration.'],
        'moderate':  ['Chittorgarh, Sirohi, Rajsamand — mixed rural-urban '
                      'demographic profile.'],
        'average':   ['Bulk of eastern and central Rajasthan.'],
        'high':      ['Tribal belt districts (Dungarpur, Banswara) + fast-growing urban '
                      'centres (Jaipur, Jodhpur).'],
        'very-high': ['Barmer (32.5 %) and Jaisalmer (32.2 %) — the highest growth '
                      'rates, linked to oil-and-gas exploration and canal-driven '
                      'in-migration.'],
    }
    return emit_metric_layer(
        'population-growth','population_growth_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 (2001-2011 decadal growth)',
        unit='%', metric_key='growth_pct',
    )

def build_literacy(bym):
    values = all_districts_with_values(3)   # literacy_pct index
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [60, 65, 70, 75], labels)
    meta_labels = {
        'very-low':  'Very Low Literacy (<60 %)',
        'low':       'Low Literacy (60–65 %)',
        'medium':    'Medium Literacy (65–70 %)',
        'high':      'High Literacy (70–75 %)',
        'very-high': 'Very High Literacy (>75 %)',
    }
    facts_by_class = {
        'very-low':  ['Jalore (54.9 %) is the lowest-literacy district in Rajasthan.',
                      'Southern tribal belt + western Thar districts fall here.',
                      'Female literacy is especially low in this class.'],
        'low':       ['Middle-southern districts + the Vagad tribal belt.',
                      'Rural / agricultural districts with weak schooling networks.'],
        'medium':    ['Central Rajasthan + the eastern canal belt.',
                      'Around the state average literacy of 66 %.'],
        'high':      ['Shekhawati (Sikar, Jhunjhunu) + eastern-plain districts + '
                      'Alwar-Bharatpur — high female literacy.'],
        'very-high': ['Kota (76.6 %) — the state\'s coaching-industry city and '
                      'literacy leader.',
                      'Jaipur (75.5 %) follows closely.'],
    }
    return emit_metric_layer(
        'literacy','literacy_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · Literacy rate (7+ years)',
        unit='%', metric_key='literacy_pct',
    )

def build_sex_ratio(bym):
    values = all_districts_with_values(4)   # sex_ratio index
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [900, 940, 970, 990], labels)
    meta_labels = {
        'very-low':  'Very Skewed Sex Ratio (<900 F/1000M)',
        'low':       'Skewed Sex Ratio (900–940 F/1000M)',
        'medium':    'Near Parity (940–970 F/1000M)',
        'high':      'Above Parity (970–990 F/1000M)',
        'very-high': 'Female-Surplus (>990 F/1000M)',
    }
    facts_by_class = {
        'very-low':  ['Dholpur (846 F/1000M) has the lowest sex ratio in Rajasthan.',
                      'Karauli, Bharatpur, Alwar — the eastern belt where the ratio '
                      'is chronically skewed.',
                      'Deeg and Khairthal-Tijara inherit the same skew from their '
                      'parent districts.'],
        'low':       ['Barmer, Balotra, Bikaner, Sri Ganganagar — western arid + '
                      'canal belt.'],
        'medium':    ['Central districts + Shekhawati — approaching parity.'],
        'high':      ['Southern Aravalli + Mewar — Rajsamand, Udaipur, Bhilwara.',
                      'Female-labour participation in agriculture and dairy is high here.'],
        'very-high': ['Dungarpur (994), Banswara (980), Rajsamand (990) — the tribal '
                      'and Aravalli-southern districts consistently exceed parity.'],
    }
    return emit_metric_layer(
        'sex-ratio','sex_ratio_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · Sex ratio (females per 1000 males)',
        unit=' F/1000M', metric_key='sex_ratio',
    )

def build_urbanisation(bym):
    values = all_districts_with_values(7)   # urban_pct index
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [10, 20, 30, 50], labels)
    meta_labels = {
        'very-low':  'Rural (<10 % urban)',
        'low':       'Predominantly rural (10–20 % urban)',
        'medium':    'Emerging urban (20–30 % urban)',
        'high':      'Substantially urban (30–50 % urban)',
        'very-high': 'Urban-dominant (>50 % urban)',
    }
    facts_by_class = {
        'very-low':  ['Dungarpur (6.1 %), Pratapgarh (7.9 %), Barmer (7.1 %) — '
                      'the least urbanised districts.',
                      'Tribal belt + Thar districts remain overwhelmingly rural.'],
        'low':       ['Bulk of central Rajasthan.',
                      'Village-and-district-town settlement pattern.'],
        'medium':    ['Ajmer-region + Shekhawati towns + eastern district capitals.'],
        'high':      ['Jodhpur (34 %), Bikaner (33 %), Ajmer (40 %) — regional capitals.'],
        'very-high': ['Kota (60.3 %) — the coaching-industry city.',
                      'Jaipur (52.4 %) — the state capital and only true metropolitan district.'],
    }
    return emit_metric_layer(
        'urbanisation','urbanisation_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · Urban population %',
        unit='%', metric_key='urban_pct',
    )

def build_scheduled_tribes(bym):
    values = all_districts_with_values(5)   # st_pct
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [5, 15, 25, 50], labels)
    meta_labels = {
        'very-low':  'Very Low ST (<5 %)',
        'low':       'Low ST (5–15 %)',
        'medium':    'Medium ST (15–25 %)',
        'high':      'High ST (25–50 %)',
        'very-high': 'Very High ST (>50 %) — Scheduled Areas',
    }
    facts_by_class = {
        'very-low':  ['Canal-belt (Ganganagar, Hanumangarh) + Shekhawati.',
                      'Bikaner, Ajmer, Nagaur — historically non-tribal.'],
        'low':       ['Most of central Rajasthan.'],
        'medium':    ['Chittorgarh, Bundi, Karauli, Sirohi, Rajsamand — Aravalli fringe.'],
        'high':      ['Udaipur (47.9 %), Salumbar, Dausa (26.1 %) — significant Bhil/'
                      'Garasia presence.'],
        'very-high': ['Banswara (76 %), Dungarpur (71 %), Pratapgarh (63 %) — '
                      'the Vagad region — Rajasthan\'s Fifth Schedule tribal belt.'],
    }
    return emit_metric_layer(
        'scheduled-tribes','st_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · Scheduled-Tribe %',
        unit='%', metric_key='st_pct',
    )

def build_scheduled_castes(bym):
    values = all_districts_with_values(6)   # sc_pct
    labels = ['very-low','low','medium','high','very-high']
    classes = classify(values, [10, 17, 20, 25], labels)
    meta_labels = {
        'very-low':  'Very Low SC (<10 %)',
        'low':       'Low SC (10–17 %)',
        'medium':    'Medium SC (17–20 %)',
        'high':      'High SC (20–25 %)',
        'very-high': 'Very High SC (>25 %)',
    }
    facts_by_class = {
        'very-low':  ['Tribal belt districts have low SC representation (the '
                      'ST community dominates the underprivileged share).',
                      'Banswara (4.3 %), Dungarpur (3.5 %), Pratapgarh (7.7 %) — '
                      'the classic inverse relationship with ST %.'],
        'low':       ['Central + southern Rajasthan.'],
        'medium':    ['Eastern plains + Shekhawati.'],
        'high':      ['Alwar, Bharatpur, Karauli, Dholpur — the eastern belt where '
                      'the SC percentage is 20-25 %.'],
        'very-high': ['Sri Ganganagar (36.6 %) has India\'s highest SC share among '
                      'canal-irrigated districts.',
                      'Hanumangarh (28.7 %) is close behind — the Ganga Canal command '
                      'attracted labour communities.'],
    }
    return emit_metric_layer(
        'scheduled-castes','sc_class',
        classes, meta_labels, facts_by_class, values, bym,
        source='Census of India 2011 · Scheduled-Caste %',
        unit='%', metric_key='sc_pct',
    )

def emit_metric_layer(layer_id, feature_type, classes, meta_labels, facts_by_class,
                      values_by_district, bym, source, unit, metric_key):
    """Emit a 5-class demographic choropleth as classification-zone polygons."""
    features = []
    for cls, districts in classes.items():
        if not districts: continue
        geom = merge_districts(districts, bym)
        if not geom:
            print(f'!! no geometry for {layer_id}/{cls}', file=sys.stderr); continue
        cent = centroid_of(geom['coordinates'])
        bbox = bbox_of(geom['coordinates'])
        # Build a per-district value roster for this class
        roster = {d: values_by_district[d] for d in districts if d in values_by_district}
        # Class-level extrema
        cls_min = min(roster.values()) if roster else None
        cls_max = max(roster.values()) if roster else None
        props = {
            'name':                 meta_labels[cls],
            'type':                 feature_type,
            'category':             'demographic',
            'state':                STATE,
            'zone_id':              cls,
            'source':               source,
            'lastUpdated':          RETRIEVED,
            'centroid':             [round(cent[0], 5), round(cent[1], 5)],
            'labelAnchor':          [round(cent[0], 5), round(cent[1], 5)],
            'bbox':                 [round(v, 5) for v in bbox],
            'districts_included':   districts,
            'district_values':      roster,
            'metric_key':           metric_key,
            'unit':                 unit,
            'class_min':            cls_min,
            'class_max':            cls_max,
            'geometryQuality':      'generalised (district-approximated)',
            'geometryNote':         'Union of districts falling into this Census class.',
            'notes':                {'facts': facts_by_class.get(cls, []), 'mnemonic': '',
                                     'significance': 'high', 'confusedWith': []},
            'ecology':              {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':           {'authority': 'Registrar General of India',
                                     'status':    'Census 2011'},
        }
        features.append({
            'type': 'Feature',
            'id':   f'{layer_id}-{cls}',
            'properties': props,
            'geometry':   geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')
    return features

# ============================================================================
#  ADMINISTRATIVE DIVISIONS — 7 revenue divisions
# ============================================================================

DIVISIONS = {
    'jaipur': {
        'label':      'Jaipur Division',
        'headquarters':'Jaipur',
        'districts':  ['Jaipur','Alwar','Khairthal-Tijara','Sikar','Jhunjhunu','Dausa',
                       'Kotputli-Behror','Didwana-Kuchaman'],
        'facts':      ['The most-populous division — anchored on Jaipur\'s '
                       'metropolitan population and Shekhawati\'s dense settlement.',
                       'Includes Rajasthan\'s two DMIC investment nodes '
                       '(KBN + Ajmer-Kishangarh partial).'],
    },
    'jodhpur': {
        'label':      'Jodhpur Division',
        'headquarters':'Jodhpur',
        'districts':  ['Jodhpur','Jaisalmer','Barmer','Balotra','Pali','Sirohi','Jalore','Phalodi'],
        'facts':      ['The largest by area — covers most of the Thar Desert.',
                       'Anchored on Jodhpur city and the Marwar industrial belt.'],
    },
    'ajmer': {
        'label':      'Ajmer Division',
        'headquarters':'Ajmer',
        'districts':  ['Ajmer','Beawar','Nagaur','Tonk','Bhilwara'],
        'facts':      ['Central Rajasthan division — anchored on the Ajmer-Kishangarh '
                       'industrial corridor.',
                       'Includes the state\'s marble-and-cement heartland.'],
    },
    'bikaner': {
        'label':      'Bikaner Division',
        'headquarters':'Bikaner',
        'districts':  ['Bikaner','Sri Ganganagar','Hanumangarh','Churu'],
        'facts':      ['Northern canal-command division — IGNP + Gang Canal territory.',
                       'India\'s wool + kinnow processing belt.'],
    },
    'bharatpur': {
        'label':      'Bharatpur Division',
        'headquarters':'Bharatpur',
        'districts':  ['Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur'],
        'facts':      ['Eastern division — bordered by UP and MP.',
                       'Anchored on Bharatpur\'s mustard belt and the Chambal-Yamuna '
                       'confluence area.'],
    },
    'kota': {
        'label':      'Kota Division',
        'headquarters':'Kota',
        'districts':  ['Kota','Bundi','Baran','Jhalawar'],
        'facts':      ['The Hadoti plateau — Rajasthan\'s soybean-and-wheat granary.',
                       'Anchored on Kota\'s coaching industry + Chambal chemicals.'],
    },
    'udaipur': {
        'label':      'Udaipur Division',
        'headquarters':'Udaipur',
        'districts':  ['Udaipur','Salumbar','Rajsamand','Chittorgarh','Banswara','Dungarpur','Pratapgarh'],
        'facts':      ['Southern Aravalli + tribal-belt division.',
                       'Includes the Vagad Fifth-Schedule tribal region.'],
    },
}

# ============================================================================
#  REGIONAL CULTURAL ZONES — 9 zones (Marwar / Mewar / Hadoti / Shekhawati / etc.)
# ============================================================================

REGIONAL_ZONES = {
    'marwar': {
        'label':      'Marwar Region',
        'seat':       'Jodhpur (former Rathore capital)',
        'core':       'Historical Marwar kingdom of the Rathore Rajputs',
        'dialect':    'Marwari',
        'signature':  ['Mehrangarh Fort','Osian temples','Rathore Rajput heritage',
                       'Marwari horse breed','Jodhpur handicrafts'],
        'physical':   'Arid + semi-arid Thar; Aravalli piedmont at the eastern margin',
        'economy':    'Wool + salt + handicraft exports + emerging petroleum',
        'facts':      ['Rajasthan\'s largest cultural region by area — covers the entire '
                       'central and western Thar.',
                       'Includes Godwar as a distinct sub-region at the '
                       'Aravalli piedmont.',
                       'Marwari dialect is the most-spoken Rajasthani dialect.'],
        'districts':  ['Jodhpur','Phalodi','Barmer','Balotra','Jaisalmer','Pali','Jalore','Nagaur','Didwana-Kuchaman'],
    },
    'mewar': {
        'label':      'Mewar Region',
        'seat':       'Udaipur (Sisodia capital, from Chittor)',
        'core':       'Historical Mewar kingdom of the Sisodia Rajputs',
        'dialect':    'Mewari',
        'signature':  ['City of Lakes (Udaipur)','Chittorgarh Fort','Kumbhalgarh',
                       'Nathdwara Pichwai','Rana Pratap heritage'],
        'physical':   'Southern Aravalli, forested hills, lake basins',
        'economy':    'Marble processing + zinc smelting + tourism',
        'facts':      ['Anchored on Udaipur, Rajasthan\'s tourism capital.',
                       'Home to India\'s largest zinc-lead smelting industry (HZL).',
                       'Mewar Rajputs never accepted Mughal suzerainty — a defining '
                       'historical thread.'],
        'districts':  ['Udaipur','Rajsamand','Chittorgarh','Bhilwara','Salumbar'],
    },
    'hadoti': {
        'label':      'Hadoti Region',
        'seat':       'Bundi + Kota (Hada Chauhan capitals)',
        'core':       'Historical Hadoti kingdom of the Hada Chauhan Rajputs',
        'dialect':    'Hadoti (a Rajasthani dialect close to Braj)',
        'signature':  ['Chambal river gorges','Bundi paintings','Kota Doria',
                       'Ranthambore Tiger Reserve','Kota coaching industry'],
        'physical':   'Vindhyan plateau + Chambal gorge; the wettest belt of Rajasthan',
        'economy':    'Cement + chemicals + soybean-wheat agriculture + coaching-education',
        'facts':      ['Rajasthan\'s wheat-and-soybean granary — vertisol-based '
                       'agriculture on the Hadoti plateau.',
                       'Bundi\'s miniature-painting tradition and Kota Doria weaving '
                       'are GI-registered crafts.',
                       'Coaching education has become the region\'s second industry.'],
        'districts':  ['Kota','Bundi','Baran','Jhalawar'],
    },
    'shekhawati': {
        'label':      'Shekhawati Region',
        'seat':       'Historical Shekhawati chieftaincies (Sikar, Jhunjhunu, Churu)',
        'core':       'Kachwaha branch (Shekha Rajputs of Amber)',
        'dialect':    'Shekhawati (a variant of Marwari with Braj influence)',
        'signature':  ['Painted havelis','Marwari trading heritage','Fresco tradition',
                       'Groundnut agriculture','Wind-solar hybrid installations'],
        'physical':   'Arid to semi-arid; sandy plains north of the Aravalli',
        'economy':    'Groundnut + mustard agriculture + emerging wind-solar power',
        'facts':      ['Home to the Marwari trading diaspora — the Birla, Bajaj, '
                       'Poddar, Goenka and Jhunjhunwala families all originate here.',
                       'Fresco-painted havelis of Nawalgarh, Mandawa and Fatehpur '
                       'are the world\'s largest open-air fresco gallery.',
                       'Highest sex ratio + high literacy among Rajasthan\'s northern '
                       'belt districts.'],
        'districts':  ['Sikar','Jhunjhunu','Churu','Kotputli-Behror'],
    },
    'dhundhar': {
        'label':      'Dhundhar Region',
        'seat':       'Amber → Jaipur (Kachwaha capital)',
        'core':       'Historical Dhundhar kingdom of the Kachwaha Rajputs',
        'dialect':    'Dhundhari (close to Braj)',
        'signature':  ['Amber Fort','Jaipur (Pink City)','Jantar Mantar',
                       'Jal Mahal','DMIC KBN + Ajmer-Kishangarh nodes'],
        'physical':   'Aravalli piedmont + eastern plains',
        'economy':    'Jaipur handicrafts + gems & jewellery + IT/ITeS + smart city',
        'facts':      ['Kachwaha Rajputs of Amber were Mughal allies — a strategic '
                       'political choice that made Jaipur India\'s planned city.',
                       'Dhundhar hosts India\'s only planned pre-modern city '
                       '(Jaipur, 1727) — a UNESCO World Heritage Site.',
                       'Jaipur is Rajasthan\'s Class-X metropolitan area — the '
                       'only district with >50 % urbanisation.'],
        'districts':  ['Jaipur','Dausa','Tonk','Sawai Madhopur','Karauli'],
    },
    'vagad': {
        'label':      'Vagad Region',
        'seat':       'Banswara and Dungarpur',
        'core':       'Vagad kingdom of the Bhil-majority southern Aravalli',
        'dialect':    'Vagadi (a Rajasthani-Gujarati transitional dialect)',
        'signature':  ['Bhil tribal culture','Mahi Bajaj Sagar','Ancient Beneshwar '
                       'tribal fair','Molela terracotta','Baneshwar Dham'],
        'physical':   'Southern Aravalli + Mahi basin; the wettest, most-forested '
                      'part of Rajasthan',
        'economy':    'Tribal agriculture + maize + hydel power (MBS) + emerging tourism',
        'facts':      ['Rajasthan\'s Scheduled-Area belt under the Fifth Schedule of '
                       'the Constitution.',
                       'Sex ratios exceed 990 F/1000M — matriarchal tribal '
                       'demographics.',
                       'The Beneshwar tribal fair at the Mahi-Som-Jakham confluence '
                       'is one of India\'s largest tribal gatherings.'],
        'districts':  ['Banswara','Dungarpur','Pratapgarh'],
    },
    'matsya': {
        'label':      'Matsya Region',
        'seat':       'Alwar + Bharatpur (historical Matsya kingdom)',
        'core':       'Ancient Matsya mahajanapada — one of the 16 great kingdoms',
        'dialect':    'Braj / Mewati transitional',
        'signature':  ['Sariska Tiger Reserve','Bharatpur Ramsar','Deeg Palace',
                       'Neemrana Japanese Industrial Zone','Jat + Meo history'],
        'physical':   'Aravalli extension into Alwar; eastern alluvial plain',
        'economy':    'Auto components (DMIC KBN) + mustard agriculture + tourism',
        'facts':      ['One of the ancient 16 mahajanapadas mentioned in the '
                       'Anguttara Nikaya.',
                       'Matsya evolved as a Jat + Meo cultural mosaic — distinct '
                       'from the pure Rajput identity elsewhere.',
                       'Alwar became the state name for a brief post-Independence '
                       'union (Matsya Union, 1948).'],
        'districts':  ['Alwar','Khairthal-Tijara','Bharatpur','Deeg','Dholpur'],
    },
    'godwar': {
        'label':      'Godwar Region',
        'seat':       'Pali (historical Godwar sub-region of Marwar)',
        'core':       'Sub-region of Marwar at the Aravalli piedmont',
        'dialect':    'Godwari (a Marwari sub-dialect)',
        'signature':  ['Ranakpur Jain temples','Kumbhalgarh (adjacent)',
                       'Pali dyeing cluster','Jawai leopard reservoir',
                       'Sirohi hill forts'],
        'physical':   'Aravalli western piedmont — a transition between the Thar and '
                      'the Aravalli main axis',
        'economy':    'Textile dyeing (Pali) + Jain-temple tourism (Ranakpur)',
        'facts':      ['A named sub-region of Marwar — often overlooked in atlases '
                       'but culturally distinct.',
                       'Ranakpur\'s Chaumukha Jain temple is one of India\'s most '
                       'important Jain pilgrimage sites.',
                       'Jawai reservoir is Rajasthan\'s celebrated leopard habitat.'],
        'districts':  ['Pali','Sirohi','Jalore'],
    },
    'mewat': {
        'label':      'Mewat Region',
        'seat':       'Meo-Muslim heartland (Alwar western + Bharatpur northern)',
        'core':       'Cross-border cultural region shared with Haryana',
        'dialect':    'Mewati (Braj-Rajasthani-Haryanvi blend)',
        'signature':  ['Meo Muslim culture','Firozi Sadar tomb','Rural agrarian mosque '
                       'architecture','Cross-border trade heritage'],
        'physical':   'Aravalli northeastern piedmont; extends into Haryana',
        'economy':    'Livestock (buffalo) + agrarian; DMIC-KBN industrial fringe',
        'facts':      ['A cross-state cultural region — Rajasthan hosts only the '
                       'southwestern part; the bulk lies in Haryana (Nuh, Palwal).',
                       'The Meo community traces its identity to a pre-Mughal '
                       'conversion.',
                       'The state\'s only Muslim-majority sub-region within a Hindu-'
                       'majority state.'],
        'districts':  ['Alwar','Khairthal-Tijara'],
    },
}

# ============================================================================
#  BORDER DISTRICTS — international + interstate
# ============================================================================

BORDER_DISTRICTS = {
    # International border with Pakistan
    'international-pakistan': {
        'label':      'Pakistan Border (international)',
        'border_with':'Pakistan',
        'border_km':  '~1070 km — Rajasthan has India\'s longest state border with Pakistan',
        'facts':      ['Barmer, Jaisalmer, Bikaner and Sri Ganganagar together form '
                       'Rajasthan\'s 1070 km international border with Pakistan.',
                       'The border is fully fenced and floodlit — India\'s only fully-'
                       'illuminated international border.',
                       'BSF operates the border; Jaisalmer district hosts a large '
                       'BSF training academy.'],
        'districts':  ['Sri Ganganagar','Bikaner','Jaisalmer','Barmer'],
    },
    'interstate-punjab': {
        'label':      'Punjab Border',
        'border_with':'Punjab (India)',
        'border_km':  '~89 km',
        'facts':      ['Sri Ganganagar and Hanumangarh share a short border with '
                       'Punjab — the Gang Canal enters Rajasthan through this border.',
                       'This is the smallest of Rajasthan\'s six border segments.'],
        'districts':  ['Sri Ganganagar','Hanumangarh'],
    },
    'interstate-haryana': {
        'label':      'Haryana Border',
        'border_with':'Haryana (India)',
        'border_km':  '~1262 km',
        'facts':      ['The longest interstate border — runs from Sri Ganganagar in '
                       'the northwest across the Shekhawati belt to Bharatpur.',
                       'DMIC-KBN sits on this border.',
                       'Includes the Mewat cultural region shared with Haryana\'s Nuh.'],
        'districts':  ['Sri Ganganagar','Hanumangarh','Churu','Jhunjhunu',
                       'Kotputli-Behror','Alwar','Khairthal-Tijara','Bharatpur'],
    },
    'interstate-up': {
        'label':      'Uttar Pradesh Border',
        'border_with':'Uttar Pradesh (India)',
        'border_km':  '~877 km',
        'facts':      ['Runs from Bharatpur east and south to the Chambal.',
                       'The Yamuna-Chambal confluence lies on this border.'],
        'districts':  ['Bharatpur','Deeg','Dholpur'],
    },
    'interstate-mp': {
        'label':      'Madhya Pradesh Border',
        'border_with':'Madhya Pradesh (India)',
        'border_km':  '~1600 km — Rajasthan\'s longest interstate border',
        'facts':      ['Rajasthan\'s longest state border — runs the length of the '
                       'Chambal river gorge and the Vindhyan plateau.',
                       'The Gandhi Sagar reservoir straddles this border.',
                       'Includes the Ratapani-Sariska tiger corridor via Ranthambore.'],
        'districts':  ['Dholpur','Karauli','Sawai Madhopur','Kota','Baran','Jhalawar',
                       'Chittorgarh','Pratapgarh','Banswara'],
    },
    'interstate-gujarat': {
        'label':      'Gujarat Border',
        'border_with':'Gujarat (India)',
        'border_km':  '~1022 km',
        'facts':      ['Runs across southern Rajasthan from the Rann of Kutch fringe '
                       'to the Mahi basin.',
                       'The Mahi Bajaj Sagar project delivers water across this '
                       'border to Gujarat\'s northern districts.'],
        'districts':  ['Barmer','Balotra','Jalore','Sirohi','Udaipur','Dungarpur','Banswara'],
    },
}

# ============================================================================
#  SCHEDULED AREAS — Fifth Schedule TSP block
# ============================================================================

SCHEDULED_AREAS = {
    'tsp-vagad': {
        'label':      'Tribal Sub-Plan (TSP) Area — Vagad Fifth-Schedule block',
        'notification':'Notified under the Fifth Schedule of the Constitution',
        'authority':  'Tribal Area Development Department (TAD), Government of Rajasthan',
        'facts':      ['Rajasthan\'s only Fifth-Schedule area — covers the '
                       'Bhil-majority Vagad region.',
                       'Full districts: Banswara, Dungarpur, Pratapgarh — plus '
                       'select tribal blocks in Udaipur, Rajsamand, Chittorgarh, '
                       'Sirohi and Bhilwara.',
                       'PESA (Panchayats Extension to Scheduled Areas) applies '
                       'within this block.',
                       'The Tribal Sub-Plan mandates proportionate development '
                       'expenditure equal to the ST population share.'],
        'districts':  ['Banswara','Dungarpur','Pratapgarh','Udaipur','Salumbar','Rajsamand','Chittorgarh','Sirohi'],
    },
}

# ============================================================================
#  MUNICIPAL CORPORATIONS — 10 corporations (post-2019 splits)
# ============================================================================

MUNICIPAL_CORPORATIONS = [
    {'id':'mc-jaipur-greater',   'name':'Jaipur Municipal Corporation — Greater',
     'lonlat':[75.8100, 26.9700], 'district':'Jaipur',
     'population_lakh': 30,  # metro-Jaipur split
     'facts':['Splitting of erstwhile JMC into Greater and Heritage was notified in 2019.',
              'Greater corporation covers eastern and southern Jaipur.'],
     'source':'Government of Rajasthan notification 2019'},
    {'id':'mc-jaipur-heritage',  'name':'Jaipur Municipal Corporation — Heritage',
     'lonlat':[75.8250, 26.9250], 'district':'Jaipur',
     'population_lakh': 15,
     'facts':['Heritage corporation includes the old walled city (UNESCO-listed).',
              'Focused on heritage-conservation policy.'],
     'source':'Government of Rajasthan notification 2019'},
    {'id':'mc-jodhpur-north',    'name':'Jodhpur Municipal Corporation — North',
     'lonlat':[73.0200, 26.2830], 'district':'Jodhpur',
     'population_lakh': 6,
     'facts':['Post-2019 split of the erstwhile Jodhpur Municipal Corporation.',
              'Includes the old city + Mehrangarh fort area.'],
     'source':'GoR notification 2019'},
    {'id':'mc-jodhpur-south',    'name':'Jodhpur Municipal Corporation — South',
     'lonlat':[73.0300, 26.2650], 'district':'Jodhpur',
     'population_lakh': 6,
     'facts':['South corporation covers newer developments south of the city.'],
     'source':'GoR notification 2019'},
    {'id':'mc-kota-north',       'name':'Kota Municipal Corporation — North',
     'lonlat':[75.8450, 25.1900], 'district':'Kota',
     'population_lakh': 5,
     'facts':['Kota was split in 2019 — the northern half + educational quarter.',
              'Includes the Kota coaching-industry core.'],
     'source':'GoR notification 2019'},
    {'id':'mc-kota-south',       'name':'Kota Municipal Corporation — South',
     'lonlat':[75.8500, 25.1550], 'district':'Kota',
     'population_lakh': 4,
     'facts':['Southern corporation — includes RIICO industrial estates.'],
     'source':'GoR notification 2019'},
    {'id':'mc-udaipur',          'name':'Udaipur Municipal Corporation',
     'lonlat':[73.6900, 24.5850], 'district':'Udaipur',
     'population_lakh': 5.5,
     'facts':['Udaipur\'s tourism-centric corporation — covers the lake belt.'],
     'source':'GoR Municipal Act'},
    {'id':'mc-ajmer',            'name':'Ajmer Municipal Corporation',
     'lonlat':[74.6300, 26.4500], 'district':'Ajmer',
     'population_lakh': 6,
     'facts':['Includes the Dargah Sharif area.'],
     'source':'GoR Municipal Act'},
    {'id':'mc-bikaner',          'name':'Bikaner Municipal Corporation',
     'lonlat':[73.3120, 28.0230], 'district':'Bikaner',
     'population_lakh': 6.5,
     'facts':['Wool + camel-hide crafts + Junagarh Fort area.'],
     'source':'GoR Municipal Act'},
    {'id':'mc-bharatpur',        'name':'Bharatpur Municipal Corporation',
     'lonlat':[77.4800, 27.2170], 'district':'Bharatpur',
     'population_lakh': 3.5,
     'facts':['Youngest municipal corporation in the state.',
              'Anchored on the Keoladeo Ghana Ramsar / UNESCO WHS.'],
     'source':'GoR Municipal Act'},
]

# ============================================================================
#  SMART CITIES — India Smart Cities Mission
# ============================================================================

SMART_CITIES = [
    {'id':'sc-jaipur',   'name':'Jaipur Smart City',
     'lonlat':[75.8100, 26.9200], 'district':'Jaipur',
     'notified':'2015 (Round 1)',
     'anchor_project':'Walled-city UNESCO conservation + integrated command centre',
     'facts':['Jaipur was selected in the first round of the Smart Cities Mission.',
              'Anchor projects include heritage-street revitalisation in the '
              'UNESCO-listed walled city.',
              'Integrated Command & Control Centre operational since 2019.'],
     'source':'Ministry of Housing & Urban Affairs — Smart Cities Mission'},
    {'id':'sc-udaipur',  'name':'Udaipur Smart City',
     'lonlat':[73.6900, 24.5850], 'district':'Udaipur',
     'notified':'2016 (Round 2)',
     'anchor_project':'Lake-front rejuvenation + tourism infrastructure',
     'facts':['Anchored on Fateh Sagar + Pichola lake conservation.',
              'Smart Mobility hub at Udaipur\'s Chetak Circle.'],
     'source':'MoHUA Smart Cities Mission'},
    {'id':'sc-kota',     'name':'Kota Smart City',
     'lonlat':[75.8450, 25.1830], 'district':'Kota',
     'notified':'2017 (Round 3)',
     'anchor_project':'Chambal riverfront + coaching-industry infrastructure',
     'facts':['Anchored on the Chambal riverfront project — one of India\'s '
              'largest urban-river restorations.',
              'Kota Doria weaving heritage revival is a smart-city sub-project.'],
     'source':'MoHUA Smart Cities Mission'},
    {'id':'sc-ajmer',    'name':'Ajmer Smart City',
     'lonlat':[74.6300, 26.4500], 'district':'Ajmer',
     'notified':'2017 (Round 3)',
     'anchor_project':'Ana Sagar lake rejuvenation + Dargah access',
     'facts':['Ana Sagar lake conservation + Dargah Sharif pedestrian access are '
              'the flagship smart-city projects.'],
     'source':'MoHUA Smart Cities Mission'},
]

# ============================================================================
#  MAJOR URBAN CENTRES — Class-I towns (population > 1 lakh, Census 2011)
# ============================================================================

URBAN_CENTRES = [
    {'id':'uc-jaipur',       'name':'Jaipur (State Capital)',
     'lonlat':[75.7873, 26.9124], 'district':'Jaipur',
     'population_lakh': 30, 'rank':1,
     'urban_role':'State capital + primate city + UNESCO WHS walled city',
     'source':'Census 2011 + UNESCO'},
    {'id':'uc-jodhpur',      'name':'Jodhpur',
     'lonlat':[73.0243, 26.2389], 'district':'Jodhpur','population_lakh': 10.5, 'rank':2,
     'urban_role':'Marwar cultural capital + handicrafts exports',
     'source':'Census 2011'},
    {'id':'uc-kota',         'name':'Kota',
     'lonlat':[75.8577, 25.2138], 'district':'Kota','population_lakh': 10.0, 'rank':3,
     'urban_role':'Coaching-education city + Chambal chemicals hub',
     'source':'Census 2011'},
    {'id':'uc-bikaner',      'name':'Bikaner',
     'lonlat':[73.3119, 28.0229], 'district':'Bikaner','population_lakh': 6.5, 'rank':4,
     'urban_role':'Wool + camel-hide crafts + Bhujia industry',
     'source':'Census 2011'},
    {'id':'uc-ajmer',        'name':'Ajmer',
     'lonlat':[74.6399, 26.4499], 'district':'Ajmer','population_lakh': 5.5, 'rank':5,
     'urban_role':'Dargah pilgrimage + educational hub',
     'source':'Census 2011'},
    {'id':'uc-udaipur',      'name':'Udaipur',
     'lonlat':[73.7125, 24.5854], 'district':'Udaipur','population_lakh': 5.0, 'rank':6,
     'urban_role':'Mewar cultural capital + tourism',
     'source':'Census 2011'},
    {'id':'uc-bhilwara',     'name':'Bhilwara',
     'lonlat':[74.6398, 25.3572], 'district':'Bhilwara','population_lakh': 3.6, 'rank':7,
     'urban_role':'Textile manufacturing (Manchester of Rajasthan)',
     'source':'Census 2011'},
    {'id':'uc-alwar',        'name':'Alwar',
     'lonlat':[76.6100, 27.5530], 'district':'Alwar','population_lakh': 3.5, 'rank':8,
     'urban_role':'Matsya capital + DMIC-KBN fringe city',
     'source':'Census 2011'},
    {'id':'uc-sri-ganganagar','name':'Sri Ganganagar',
     'lonlat':[73.8770, 29.9200], 'district':'Sri Ganganagar','population_lakh': 2.9, 'rank':9,
     'urban_role':'Gang Canal command centre + kinnow processing',
     'source':'Census 2011'},
    {'id':'uc-sikar',        'name':'Sikar',
     'lonlat':[75.1400, 27.6100], 'district':'Sikar','population_lakh': 2.5, 'rank':10,
     'urban_role':'Shekhawati regional centre + copper mining district',
     'source':'Census 2011'},
    {'id':'uc-pali',         'name':'Pali',
     'lonlat':[73.3234, 25.7723], 'district':'Pali','population_lakh': 2.3, 'rank':11,
     'urban_role':'Textile dyeing hub + Marwar sub-regional centre',
     'source':'Census 2011'},
    {'id':'uc-bharatpur',    'name':'Bharatpur',
     'lonlat':[77.4800, 27.2170], 'district':'Bharatpur','population_lakh': 2.5, 'rank':12,
     'urban_role':'Keoladeo Ghana + mustard-belt centre',
     'source':'Census 2011'},
    {'id':'uc-beawar',       'name':'Beawar',
     'lonlat':[74.3200, 26.1013], 'district':'Beawar','population_lakh': 1.5, 'rank':13,
     'urban_role':'Shree Cement HQ + Marwar industrial centre',
     'source':'Census 2011'},
    {'id':'uc-kishangarh',   'name':'Kishangarh',
     'lonlat':[74.8577, 26.5842], 'district':'Ajmer','population_lakh': 1.6, 'rank':14,
     'urban_role':'Asia\'s largest marble market + DMIC Ajmer node',
     'source':'Census 2011'},
    {'id':'uc-hanumangarh',  'name':'Hanumangarh',
     'lonlat':[74.3200, 29.5810], 'district':'Hanumangarh','population_lakh': 1.5, 'rank':15,
     'urban_role':'Gang Canal + Kalibangan Harappan-site district capital',
     'source':'Census 2011'},
]

# ============================================================================
#  POPULATION CORRIDORS — inter-city development axes
# ============================================================================

POPULATION_CORRIDORS = {
    'pc-jaipur-ajmer': {
        'label':      'Jaipur–Ajmer Corridor',
        'axis':       'NH8 / NH48 + DMIC alignment (Jaipur–Kishangarh–Ajmer)',
        'population_lakh': 55,
        'facts':      ['Rajasthan\'s densest urban corridor — links the state capital, '
                       'Kishangarh marble market and Ajmer.',
                       'DMIC Ajmer-Kishangarh Investment Node runs along this axis.',
                       'Includes Beawar\'s cement cluster at the southern end.'],
        'districts':  ['Jaipur','Ajmer','Beawar'],
    },
    'pc-jaipur-alwar-delhi': {
        'label':      'Jaipur–Alwar–Delhi Corridor',
        'axis':       'NH8 + Delhi-Mumbai Expressway + DFC',
        'population_lakh': 80,
        'facts':      ['DMIC-KBN Investment Region runs across this corridor.',
                       'Rajasthan\'s densest infrastructure corridor — combining '
                       'the Delhi-Mumbai Expressway, DFC and NH8.',
                       'Neemrana + Bhiwadi + Kotputli are the flagship industrial nodes.'],
        'districts':  ['Jaipur','Kotputli-Behror','Alwar','Khairthal-Tijara'],
    },
    'pc-jodhpur-ahmedabad': {
        'label':      'Jodhpur–Pali–Ahmedabad Corridor',
        'axis':       'NH62 + Jodhpur–Marwar Junction–Palanpur rail',
        'population_lakh': 30,
        'facts':      ['Marwar\'s primary trade corridor to Gujarat.',
                       'Pali\'s textile dyeing cluster + Jodhpur\'s handicraft '
                       'exports both channel through this axis.'],
        'districts':  ['Jodhpur','Pali','Sirohi','Jalore'],
    },
    'pc-kota-udaipur': {
        'label':      'Kota–Chittorgarh–Udaipur Corridor',
        'axis':       'NH27 / NH76 + Ratlam-Kota rail',
        'population_lakh': 22,
        'facts':      ['Southern Rajasthan\'s primary east-west corridor.',
                       'Links Kota\'s coaching industry with Udaipur\'s '
                       'tourism-and-mineral economy via the Hadoti-Mewar transition.'],
        'districts':  ['Kota','Bundi','Chittorgarh','Udaipur'],
    },
    'pc-bikaner-jaisalmer': {
        'label':      'Bikaner–Jaisalmer Corridor',
        'axis':       'NH15 + Bikaner-Jaisalmer rail',
        'population_lakh': 8,
        'facts':      ['Rajasthan\'s deep-desert corridor.',
                       'Anchors the emerging Bhadla + Fatehgarh solar-and-wind belt.',
                       'Includes Pokhran and Jaisalmer\'s BSF establishments.'],
        'districts':  ['Bikaner','Jaisalmer','Phalodi'],
    },
}


# ============================================================================
#  EMIT HELPERS
# ============================================================================

def emit_polygon_layer(zones, layer_id, feature_type, source_ref, category='administrative'):
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
                                'The classification\'s actual boundary crosses '
                                'districts; refer to the cited source for the '
                                'authoritative line.'),
            'notes':           {'facts': meta.get('facts', []), 'mnemonic': '',
                                'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': meta.get('authority', 'Government of Rajasthan'),
                                'status':    meta.get('status', 'active')},
        }
        for k, v in meta.items():
            if k in ('label', 'districts', 'facts'): continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id':   f'{layer_id}-{zone_id}',
            'properties': props,
            'geometry':   geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')
    return features

def emit_point_layer(items, layer_id, feature_type, source_ref, category='urban'):
    features = []
    for d in items:
        geom = {'type': 'Point', 'coordinates': d['lonlat']}
        cent = d['lonlat']
        bbox = bbox_of(geom['coordinates'])
        facts = d.get('facts', [])
        if not facts:
            fact_line = d.get('urban_role') or ''
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
            'governance':      {'authority': 'Government of Rajasthan',
                                'status':    'active'},
        }
        for k, v in d.items():
            if k in ('name', 'lonlat', 'district', 'source', 'facts'): continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id':   f'{layer_id}-{d["id"]}',
            'properties': props,
            'geometry':   geom,
        })
    (OUT / f'{layer_id}.geojson').write_text(
        json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')
    return features

# ============================================================================
#  DISTRICT DEMOGRAPHICS — one JSON file for the Revision Dashboard
# ============================================================================

def emit_district_demographics():
    metrics = {}
    for name in list(DISTRICT_CENSUS) + list(NEW_DISTRICT_PARENT):
        pop, area, den, lit, sr, st, sc, urb = DISTRICT_CENSUS[NEW_DISTRICT_PARENT.get(name, name)]
        metrics[name] = {
            'population': pop,
            'area_km2':   area,
            'density':    den,
            'literacy_pct': lit,
            'sex_ratio':  sr,
            'st_pct':     st,
            'sc_pct':     sc,
            'urban_pct':  urb,
            'growth_pct': all_growth()[name],
            'inherited_from_parent': NEW_DISTRICT_PARENT.get(name, None),
        }
    (OUT / 'district-demographics.json').write_text(json.dumps({
        'source': 'Census of India 2011 · District Census Handbook',
        'note':   ('8 new districts (2023+) inherit Census 2011 values from their '
                   'parent district. See `inherited_from_parent` per district.'),
        'districts': metrics,
    }, indent=2))
    print(f'wrote district-demographics.json: {len(metrics)} districts')

# ============================================================================
#  KNOWLEDGE GRAPH EXPANSION
# ============================================================================

def build_kg_expansion():
    edges = []

    # Every division → its districts (well-known relations)
    for did, meta in DIVISIONS.items():
        related = [{'target': 'districts-' + d.lower().replace(' ', '-'),
                    'type': 'colocated',
                    'explanation': f'Part of {meta["label"]}.'}
                   for d in meta['districts']]
        edges.append({'source': f'administrative-divisions-{did}',
                      'related': related})

    # Regional zones → key features from prior modules
    zone_defines = {
        'marwar': [
            ('industrial-clusters-ic-textile',      'signature'),
            ('industrial-clusters-ic-marble-stone', 'colocated'),
            ('industrial-clusters-ic-salt-wool',    'signature'),
            ('thar',                                'defines'),
            ('lakes-sambhar' if False else 'industrial-clusters-ic-handicraft', 'colocated'),
            ('major-crops-bajra',                   'signature'),
            ('major-crops-pulses',                  'signature'),
            ('climate-regions-arid',                'defines'),
        ],
        'mewar': [
            ('industrial-clusters-ic-marble-stone', 'signature'),
            ('mineral-belts-lead-zinc',             'signature'),
            ('lakes-pichola-lake',                  'signature'),
            ('lakes-fateh-sagar-lake',              'signature'),
            ('geological-provinces-aravalli-sg',    'colocated'),
            ('national-parks-1',                    'colocated'),
            ('major-crops-maize',                   'signature'),
            ('drainage-basins-mahi' if False else 'chambal-river','colocated'),
        ],
        'hadoti': [
            ('industrial-clusters-ic-cement',       'signature'),
            ('major-crops-soybean',                 'signature'),
            ('major-crops-wheat',                   'signature'),
            ('chambal-river',                       'defines'),
            ('command-areas-cmd-chambal',           'defines'),
            ('major-industries-chambal-gadepan',    'signature'),
            ('agro-economic-zones-ae-hadoti',       'defines'),
        ],
        'shekhawati': [
            ('major-crops-groundnut',               'signature'),
            ('major-crops-mustard',                 'colocated'),
            ('agro-economic-zones-ae-shekhawati',   'defines'),
            ('mineral-belts-copper',                'signature'),
            ('groundwater-gw-over-exploited',       'colocated'),
        ],
        'dhundhar': [
            ('industrial-regions-ir-dmic-kbn',      'colocated'),
            ('industrial-clusters-ic-handicraft',   'signature'),
            ('special-economic-zones-sez-sitapura', 'colocated'),
            ('handicraft-clusters-blue-pottery',    'signature'),
            ('handicraft-clusters-sanganeri-printing','signature'),
        ],
        'vagad': [
            ('scheduled-areas-tsp-vagad',           'defines'),
            ('major-crops-maize',                   'signature'),
            ('power-plants-mahi-bajaj-sagar-hep',   'signature'),
            ('dam-mahi-bajaj-sagar',                'signature'),
            ('mahi-river',                          'defines'),
            ('handicraft-clusters-molela-terracotta','signature'),
        ],
        'matsya': [
            ('industrial-regions-ir-dmic-kbn',      'defines'),
            ('industrial-clusters-ic-auto-engineering','signature'),
            ('major-industries-nissan-neemrana',    'signature'),
            ('major-industries-honda-tapukara',     'signature'),
            ('tiger-reserves-2',                    'colocated'),
            ('ramsar-sites-1',                      'colocated'),
        ],
        'godwar': [
            ('industrial-clusters-ic-textile',      'signature'),
            ('industrial-areas-pali-ia',            'signature'),
            ('dam-jawai',                           'signature'),
        ],
        'mewat': [
            ('industrial-regions-ir-dmic-kbn',      'colocated'),
        ],
    }
    for zid, refs in zone_defines.items():
        edges.append({'source': f'regional-zones-{zid}',
                      'related': [{'target': t, 'type': k,
                                   'explanation': f'Anchored on this feature within '
                                                  f'{zid}.'}
                                  for (t, k) in refs]})

    # Border districts → international / state neighbours (informative only)
    # These are self-contained — no cross-layer targets.
    # (Kept in the emitted layer facts; no KG edges beyond the zone itself.)

    # Smart cities → their urban centre + municipal corp
    sc_to_uc_mc = {
        'sc-jaipur':  ('uc-jaipur',  'mc-jaipur-greater'),
        'sc-udaipur': ('uc-udaipur', 'mc-udaipur'),
        'sc-kota':    ('uc-kota',    'mc-kota-north'),
        'sc-ajmer':   ('uc-ajmer',   'mc-ajmer'),
    }
    for sc, (uc, mc) in sc_to_uc_mc.items():
        edges.append({'source': f'smart-cities-{sc}', 'related': [
            {'target': f'urban-centres-{uc}',           'type': 'defines'},
            {'target': f'municipal-corporations-{mc}',  'type': 'signature'},
        ]})

    # Urban centres → their industrial-cluster + regional zone
    uc_to_context = {
        'uc-jaipur': [
            ('industrial-clusters-ic-handicraft', 'signature'),
            ('regional-zones-dhundhar',           'defines'),
            ('industrial-regions-ir-dmic-kbn',    'colocated'),
        ],
        'uc-jodhpur': [
            ('industrial-clusters-ic-handicraft', 'signature'),
            ('regional-zones-marwar',             'defines'),
            ('industrial-regions-ir-jodhpur-pali','colocated'),
        ],
        'uc-kota': [
            ('industrial-clusters-ic-chemical-refinery', 'signature'),
            ('regional-zones-hadoti',             'defines'),
            ('major-industries-chambal-gadepan',  'colocated'),
            ('power-plants-kota-super-tps',       'colocated'),
        ],
        'uc-udaipur': [
            ('industrial-clusters-ic-marble-stone', 'signature'),
            ('regional-zones-mewar',              'defines'),
            ('lakes-pichola-lake',                'signature'),
            ('lakes-fateh-sagar-lake',            'signature'),
        ],
        'uc-bikaner': [
            ('industrial-clusters-ic-salt-wool',  'signature'),
            ('industrial-clusters-ic-ceramics-glass','signature'),
            ('regional-zones-marwar',             'colocated'),
        ],
        'uc-ajmer': [
            ('regional-zones-marwar',             'colocated'),
            ('industrial-regions-ir-ajmer-kishangarh','colocated'),
        ],
        'uc-bhilwara': [
            ('industrial-clusters-ic-textile',    'signature'),
            ('regional-zones-mewar',              'colocated'),
        ],
        'uc-alwar': [
            ('regional-zones-matsya',             'defines'),
            ('industrial-regions-ir-dmic-kbn',    'colocated'),
        ],
        'uc-sri-ganganagar': [
            ('agro-economic-zones-ae-north-canal','signature'),
            ('command-areas-cmd-gang',            'signature'),
            ('major-crops-cotton',                'signature'),
        ],
        'uc-sikar': [
            ('regional-zones-shekhawati',         'defines'),
            ('agro-economic-zones-ae-shekhawati', 'colocated'),
        ],
        'uc-pali': [
            ('industrial-clusters-ic-textile',    'signature'),
            ('regional-zones-godwar',             'defines'),
        ],
        'uc-bharatpur': [
            ('regional-zones-matsya',             'colocated'),
            ('national-parks-1',                  'colocated'),
        ],
        'uc-beawar': [
            ('industrial-clusters-ic-cement',     'signature'),
            ('major-industries-shree-beawar',     'signature'),
        ],
        'uc-kishangarh': [
            ('industrial-clusters-ic-marble-stone','signature'),
            ('industrial-areas-kishangarh-ia',    'signature'),
        ],
        'uc-hanumangarh': [
            ('agro-economic-zones-ae-north-canal','signature'),
            ('command-areas-cmd-gang',            'signature'),
        ],
    }
    for uc, refs in uc_to_context.items():
        edges.append({'source': f'urban-centres-{uc}',
                      'related':[{'target': t, 'type': k,
                                  'explanation': f'Signature relation for {uc}.'}
                                 for (t, k) in refs]})

    # Population corridors → their anchor urban centres + industrial regions
    corridor_to_anchors = {
        'pc-jaipur-ajmer': [
            ('urban-centres-uc-jaipur',           'defines'),
            ('urban-centres-uc-ajmer',            'defines'),
            ('urban-centres-uc-kishangarh',       'defines'),
            ('urban-centres-uc-beawar',           'signature'),
            ('industrial-regions-ir-ajmer-kishangarh','signature'),
        ],
        'pc-jaipur-alwar-delhi': [
            ('urban-centres-uc-jaipur',           'defines'),
            ('urban-centres-uc-alwar',            'defines'),
            ('industrial-regions-ir-dmic-kbn',    'signature'),
        ],
        'pc-jodhpur-ahmedabad': [
            ('urban-centres-uc-jodhpur',          'defines'),
            ('urban-centres-uc-pali',             'signature'),
            ('industrial-regions-ir-jodhpur-pali','signature'),
        ],
        'pc-kota-udaipur': [
            ('urban-centres-uc-kota',             'defines'),
            ('urban-centres-uc-udaipur',          'defines'),
            ('industrial-regions-ir-udaipur-rajsamand','signature'),
        ],
        'pc-bikaner-jaisalmer': [
            ('urban-centres-uc-bikaner',          'defines'),
            ('solar-parks-bhadla-solar-park',     'signature'),
            ('solar-parks-fatehgarh-solar-park',  'signature'),
            ('energy-mix-em-solar-west',          'colocated'),
        ],
    }
    for cid, refs in corridor_to_anchors.items():
        edges.append({'source': f'population-corridors-{cid}',
                      'related':[{'target': t, 'type': k}
                                 for (t, k) in refs]})

    # District-level hubs for brief-mandated stories (Jaipur, Udaipur, Barmer).
    # These make the district feature a KG hub for the full narrative.
    edges += [
        {'source': 'jaipur', 'related': [
            {'target': 'urban-centres-uc-jaipur',                 'type': 'signature'},
            {'target': 'smart-cities-sc-jaipur',                  'type': 'defines'},
            {'target': 'regional-zones-dhundhar',                 'type': 'defines'},
            {'target': 'population-corridors-pc-jaipur-alwar-delhi','type':'defines'},
            {'target': 'population-corridors-pc-jaipur-ajmer',    'type': 'defines'},
            {'target': 'industrial-regions-ir-dmic-kbn',          'type': 'colocated'},
            {'target': 'industrial-clusters-ic-handicraft',       'type': 'signature'},
        ]},
        {'source': 'udaipur', 'related': [
            {'target': 'urban-centres-uc-udaipur',                'type': 'signature'},
            {'target': 'smart-cities-sc-udaipur',                 'type': 'defines'},
            {'target': 'regional-zones-mewar',                    'type': 'defines'},
            {'target': 'geological-provinces-aravalli-sg',        'type': 'colocated'},
            {'target': 'lakes-pichola-lake',                      'type': 'signature'},
            {'target': 'lakes-fateh-sagar-lake',                  'type': 'signature'},
            {'target': 'industrial-clusters-ic-marble-stone',     'type': 'signature'},
            {'target': 'scheduled-areas-tsp-vagad',               'type': 'colocated'},
        ]},
        {'source': 'barmer', 'related': [
            {'target': 'border-districts-international-pakistan', 'type': 'defines',
             'explanation': 'Barmer is one of four districts on India\'s '
                            'international border with Pakistan.'},
            {'target': 'petroleum-gas-barmer-basin',              'type': 'signature',
             'explanation': 'Home to Rajasthan\'s only crude-oil producing basin.'},
            {'target': 'petroleum-gas-mangala-field',             'type': 'signature'},
            {'target': 'major-industries-hrrl-pachpadra',         'type': 'colocated',
             'explanation': 'Under-construction HPCL refinery in Balotra (carved '
                            'from Barmer).'},
            {'target': 'power-plants-barmer-lignite-tps',         'type': 'signature'},
            {'target': 'energy-mix-em-solar-west',                'type': 'colocated'},
            {'target': 'energy-mix-em-wind-hybrid',               'type': 'colocated'},
            {'target': 'wind-farms-barmer-wind-zone',             'type': 'signature'},
            {'target': 'thar',                                    'type': 'colocated'},
            {'target': 'climate-regions-arid',                    'type': 'colocated'},
            {'target': 'regional-zones-marwar',                   'type': 'colocated'},
        ]},
    ]

    return edges


def merge_kg_expansion(new_edges):
    """Idempotent merge — dedupe by (target, type) within each source group."""
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
    bym = load_districts()

    # Demographic choropleths (7 layers)
    build_population_density(bym)
    build_population_growth(bym)
    build_literacy(bym)
    build_sex_ratio(bym)
    build_urbanisation(bym)
    build_scheduled_tribes(bym)
    build_scheduled_castes(bym)

    # Administrative overlays
    emit_polygon_layer(SCHEDULED_AREAS,   'scheduled-areas',         'scheduled_area',
                       'Constitution of India · Fifth Schedule; TAD Rajasthan')
    emit_polygon_layer(DIVISIONS,         'administrative-divisions','administrative_division',
                       'Government of Rajasthan revenue divisions')
    emit_polygon_layer(REGIONAL_ZONES,    'regional-zones',          'regional_cultural_zone',
                       'Rajasthan historical gazetteer + cultural-anthropology sources')
    emit_polygon_layer(BORDER_DISTRICTS,  'border-districts',        'border_district_zone',
                       'Survey of India + BSF (Pakistan border) + state gazettes')

    # Urban points
    emit_point_layer(MUNICIPAL_CORPORATIONS,'municipal-corporations','municipal_corporation',
                     'Government of Rajasthan Municipal Act 2009 + 2019 notifications',
                     category='urban')
    emit_point_layer(SMART_CITIES,          'smart-cities',          'smart_city',
                     'Ministry of Housing & Urban Affairs — Smart Cities Mission',
                     category='urban')
    emit_point_layer(URBAN_CENTRES,         'urban-centres',         'urban_centre',
                     'Census of India 2011 · Class-I town register',
                     category='urban')

    # Population corridors (polygon-approximated)
    emit_polygon_layer(POPULATION_CORRIDORS,'population-corridors',  'population_corridor',
                       'Rajasthan Urban Infrastructure Development Project + '
                       'DMICDC + NHAI corridor documents')

    # District demographics — one JSON payload for RevisionDashboard + CompareMode
    emit_district_demographics()

    # KG expansion
    new = build_kg_expansion()
    (OUT / 'knowledge-graph-human.json').write_text(json.dumps({'edges': new}, indent=2))
    print(f'wrote knowledge-graph-human.json: {len(new)} new edge groups')
    merge_kg_expansion(new)


if __name__ == '__main__':
    main()
