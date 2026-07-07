"""
BUILD_CLIMATE.py — Climate · Soils · Natural Vegetation assembly pipeline.

Emits (into atlas/data/):
    rainfall.geojson              — 6 IMD isohyet zones (generalised)
    temperature.geojson           — 4 mean-annual temperature bands
    climate_regions.geojson       — 4 climate regions (arid → sub-humid) + Köppen
    agro_climatic_zones.geojson   — official 10 Rajasthan agro-climatic zones (RAU/ICAR)
    soil_types.geojson            — 7 NBSS&LUP soil groups (generalised)
    vegetation.geojson            — 7 Champion & Seth vegetation types
    desertification.geojson       — 4 SAC-atlas severity classes
    drought_vulnerability.geojson — 4 State DM vulnerability classes

DESIGN CONTRACT
================
* Every feature is a UNION of its constituent districts. That is the honest
  representation available without ground-truth GIS work.
* Every feature carries `geometryQuality: "generalised (district-approximated)"`.
* Every zone declaration cites its authoritative source in `source_ref`.
* Every dataset is easy to re-map: change the DISTRICT_ASSIGNMENT dict and re-run.

SOURCES (per layer, all documented in docs/DATA_SOURCES.md):
    IMD    — India Meteorological Department, annual rainfall averages
    ICAR   — Indian Council of Agricultural Research, agro-climatic classification
    RAU    — Rajasthan Agricultural University zone gazette
    NBSS   — National Bureau of Soil Survey & Land Use Planning
    C&S    — Champion & Seth 1968 forest-type classification
    SAC    — ISRO Space Applications Centre, Desertification Atlas of India
    RSAPCC — Rajasthan State Action Plan on Climate Change
    RSDMA  — Rajasthan State Disaster Management Authority
"""

import json
import math
import sys
from pathlib import Path

HERE      = Path(__file__).parent
OUT       = HERE.parent
RETRIEVED = '2026-07-06'
STATE     = 'Rajasthan'

# ============================================================================
#  DISTRICT → ZONE ASSIGNMENTS
#  These reflect published classifications. Each is documented per-layer below.
# ============================================================================

RAINFALL_ZONES = {
    'lt-200': {
        'label':   '< 200 mm',
        'range':   [0, 200],
        'avg_mm':  180,
        'monsoon_dependence': 'Extreme (>90 % from SW monsoon)',
        'variability':        'Very high (CV > 60 %)',
        'climate_notes':      'Hyper-arid Thar core; low, erratic, largely absent monsoon.',
        'districts': ['Jaisalmer'],
    },
    '200-300': {
        'label':   '200–300 mm',
        'range':   [200, 300],
        'avg_mm':  260,
        'monsoon_dependence': 'Very high',
        'variability':        'High (CV 45–55 %)',
        'climate_notes':      'Arid western plain, weak monsoon penetration.',
        'districts': ['Barmer','Bikaner','Sri Ganganagar','Hanumangarh','Churu','Phalodi','Balotra'],
    },
    '300-500': {
        'label':   '300–500 mm',
        'range':   [300, 500],
        'avg_mm':  420,
        'monsoon_dependence': 'High',
        'variability':        'Moderate (CV 35–45 %)',
        'climate_notes':      'Semi-arid transition; Aravalli begins to influence rainfall.',
        'districts': ['Jodhpur','Nagaur','Sikar','Jhunjhunu','Didwana-Kuchaman','Pali','Jalore','Sirohi','Ajmer','Beawar','Tonk'],
    },
    '500-700': {
        'label':   '500–700 mm',
        'range':   [500, 700],
        'avg_mm':  600,
        'monsoon_dependence': 'Moderate',
        'variability':        'Moderate (CV 30–40 %)',
        'climate_notes':      'Sub-humid; Aravalli rain shadow eases here.',
        'districts': ['Jaipur','Kotputli-Behror','Khairthal-Tijara','Alwar','Dausa','Bhilwara','Rajsamand','Bundi','Sawai Madhopur','Karauli','Bharatpur','Deeg','Dholpur'],
    },
    '700-1000': {
        'label':   '700–1000 mm',
        'range':   [700, 1000],
        'avg_mm':  850,
        'monsoon_dependence': 'Moderate',
        'variability':        'Lower (CV 25–35 %)',
        'climate_notes':      'Sub-humid to humid pockets; Mewar–Hadoti edge.',
        'districts': ['Udaipur','Salumbar','Chittorgarh','Kota','Baran'],
    },
    'gt-1000': {
        'label':   '> 1000 mm',
        'range':   [1000, 1400],
        'avg_mm':  1050,
        'monsoon_dependence': 'Moderate (some winter rain from western disturbances)',
        'variability':        'Lower (CV < 30 %)',
        'climate_notes':      'Wettest pockets of Rajasthan — Mount Abu and southern Mahi basin.',
        'districts': ['Banswara','Dungarpur','Pratapgarh','Jhalawar'],
    },
}

TEMPERATURE_ZONES = {
    'hot-arid': {
        'label':     'Hot arid — extreme summer, cool winter',
        'summer_c':  [42, 50],
        'winter_c':  [5, 15],
        'mean_c':    27,
        'notes':     'Diurnal range >20 °C; extreme summer heat is Rajasthan\'s defining hazard here.',
        'districts': ['Jaisalmer','Barmer','Bikaner','Churu','Sri Ganganagar','Hanumangarh','Phalodi','Balotra'],
    },
    'hot-semi-arid': {
        'label':     'Hot semi-arid — hot summer, cool-cold winter',
        'summer_c':  [40, 46],
        'winter_c':  [7, 17],
        'mean_c':    26,
        'notes':     'Broad central belt; winter fog and cold-wave events under western disturbances.',
        'districts': ['Jodhpur','Nagaur','Sikar','Jhunjhunu','Didwana-Kuchaman','Pali','Jalore','Ajmer','Beawar','Tonk','Jaipur','Dausa','Kotputli-Behror','Khairthal-Tijara','Alwar','Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur'],
    },
    'warm-sub-humid': {
        'label':     'Warm sub-humid — moderated by relief',
        'summer_c':  [38, 44],
        'winter_c':  [8, 18],
        'mean_c':    25,
        'notes':     'Aravalli and river-valley moderation.',
        'districts': ['Sirohi','Udaipur','Salumbar','Rajsamand','Bhilwara','Chittorgarh','Bundi','Kota','Baran','Jhalawar'],
    },
    'warm-humid': {
        'label':     'Warm humid — mildest summers, warmest winters',
        'summer_c':  [36, 42],
        'winter_c':  [10, 20],
        'mean_c':    25,
        'notes':     'Southern-most, best-watered pockets — Vagad and Mount Abu.',
        'districts': ['Banswara','Dungarpur','Pratapgarh'],
    },
}

CLIMATE_REGIONS = {
    'arid': {
        'label':       'Arid',
        'koppen':      'BWh — Hot desert',
        'characteristics': 'Precipitation < 300 mm, evaporation > 1500 mm, sparse vegetation.',
        'districts':   ['Jaisalmer','Barmer','Bikaner','Sri Ganganagar','Hanumangarh','Churu','Phalodi','Balotra'],
    },
    'semi-arid': {
        'label':       'Semi-arid',
        'koppen':      'BSh — Hot semi-arid',
        'characteristics': 'Precipitation 300–500 mm, seasonal river flow, thorn-scrub landscapes.',
        'districts':   ['Jodhpur','Nagaur','Sikar','Jhunjhunu','Didwana-Kuchaman','Pali','Jalore','Sirohi','Ajmer','Beawar','Tonk','Jaipur','Kotputli-Behror','Khairthal-Tijara','Alwar','Dausa'],
    },
    'sub-humid': {
        'label':       'Sub-humid',
        'koppen':      'Aw — Tropical savanna (transitional)',
        'characteristics': 'Precipitation 500–1000 mm, deciduous forests and cultivated plains.',
        'districts':   ['Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur','Bhilwara','Rajsamand','Bundi','Chittorgarh','Udaipur','Salumbar','Kota','Baran'],
    },
    'humid-pocket': {
        'label':       'Humid pocket',
        'koppen':      'Cwa — Humid subtropical (small pockets)',
        'characteristics': 'Precipitation > 1000 mm, dense forest, hydrologically active.',
        'districts':   ['Banswara','Dungarpur','Pratapgarh','Jhalawar'],
    },
}

# Rajasthan Agricultural University's officially-published 10-zone agro-climatic
# classification. Source: RAU zone gazette + ICAR NARP report.
AGRO_CLIMATIC_ZONES = {
    '1a': {
        'label':      'IA — Arid Western Plain',
        'crops':      ['Bajra','Guar','Moth','Til','Mustard'],
        'irrigation': 'Rain-fed dominant; scattered tube-wells in Jaisalmer canal command.',
        'constraints':'Extreme aridity, sand-dune movement, salinity in canal areas.',
        'districts':  ['Jaisalmer','Barmer','Balotra'],
    },
    '1b': {
        'label':      'IB — Irrigated North-Western Plain',
        'crops':      ['Wheat','Cotton','Mustard','Guar','Bajra','Kinnow'],
        'irrigation': 'Indira Gandhi Canal + tube-wells (>60 % irrigated).',
        'constraints':'Rising water-table & secondary salinisation.',
        'districts':  ['Sri Ganganagar','Hanumangarh'],
    },
    '1c': {
        'label':      'IC — Hyper-Arid Partially-Irrigated',
        'crops':      ['Bajra','Guar','Mustard','Gram','Wheat (patchy)'],
        'irrigation': 'IGNP tail-end + limited tube-well.',
        'constraints':'Erratic rainfall, water scarcity, dune areas.',
        'districts':  ['Bikaner','Churu'],
    },
    '2a': {
        'label':      'IIA — Internal Drainage Dry Plain',
        'crops':      ['Bajra','Guar','Til','Wheat','Gram','Mustard'],
        'irrigation': 'Well-irrigation only; internal-drainage rivers seasonal.',
        'constraints':'Prolonged dry spells, saline sub-soil water (Nagaur–Sambhar zone).',
        'districts':  ['Jodhpur','Phalodi','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu'],
    },
    '2b': {
        'label':      'IIB — Transitional Plain of Luni Basin',
        'crops':      ['Bajra','Wheat','Mustard','Gram','Cumin','Isabgol'],
        'irrigation': 'Wells + limited surface (Jawai, West Banas).',
        'constraints':'Drought stress; erratic monsoon; run-off losses.',
        'districts':  ['Pali','Jalore','Sirohi'],
    },
    '3a': {
        'label':      'IIIA — Semi-Arid Eastern Plain',
        'crops':      ['Bajra','Mustard','Wheat','Gram','Jowar','Sesame','Vegetables'],
        'irrigation': 'Wells + Bisalpur canal (Tonk/Ajmer/Jaipur).',
        'constraints':'Groundwater over-draft; declining tables.',
        'districts':  ['Ajmer','Beawar','Jaipur','Kotputli-Behror','Dausa','Tonk'],
    },
    '3b': {
        'label':      'IIIB — Flood-Prone Eastern Plain',
        'crops':      ['Wheat','Mustard','Bajra','Cotton','Sugarcane','Vegetables'],
        'irrigation': 'Well + canal (Gambhir, Banganga, Yamuna feed).',
        'constraints':'Monsoon flooding of low-lying Ghana–Bharatpur basin.',
        'districts':  ['Alwar','Khairthal-Tijara','Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur'],
    },
    '4a': {
        'label':      'IVA — Sub-Humid Southern Plain',
        'crops':      ['Maize','Wheat','Gram','Mustard','Soybean','Vegetables'],
        'irrigation': 'Well + Chambal-command canal.',
        'constraints':'Aravalli slopes — soil erosion; skewed monsoon distribution.',
        'districts':  ['Bhilwara','Rajsamand','Chittorgarh','Bundi'],
    },
    '4b': {
        'label':      'IVB — Humid Southern Plain',
        'crops':      ['Maize','Wheat','Gram','Soybean','Rice (upland)','Cotton'],
        'irrigation': 'Jaisamand + Som-Kamla-Amba + tribal-belt tanks.',
        'constraints':'Hilly terrain, small holdings, tribal subsistence agriculture.',
        'districts':  ['Udaipur','Salumbar','Dungarpur','Banswara'],
    },
    '5': {
        'label':      'V — Humid South-Eastern Plain',
        'crops':      ['Soybean','Wheat','Maize','Mustard','Gram','Orange (Jhalawar)'],
        'irrigation': 'Chambal-command canals + tanks.',
        'constraints':'Kharif waterlogging; frost in some years.',
        'districts':  ['Kota','Baran','Jhalawar','Pratapgarh'],
    },
}

SOIL_TYPES = {
    'desert': {
        'label':        'Desert soils (Aridisols)',
        'texture':      'Coarse sandy; low organic matter',
        'fertility':    'Very low',
        'nutrients':    'Nitrogen deficient; adequate potash & phosphorus in some pockets',
        'crop_suit':    'Bajra, guar, moth, cluster bean',
        'erosion':      'Very high (wind); dune formation',
        'districts':    ['Jaisalmer','Barmer','Bikaner','Sri Ganganagar','Hanumangarh','Churu','Phalodi','Balotra','Jodhpur'],
    },
    'red-loamy': {
        'label':        'Red loamy soils (Alfisols)',
        'texture':      'Medium loam over crystalline weathering',
        'fertility':    'Moderate',
        'nutrients':    'Iron-rich; deficient in N and P',
        'crop_suit':    'Maize, wheat, gram, mustard, oilseeds',
        'erosion':      'Moderate — slope-driven',
        'districts':    ['Sirohi','Udaipur','Salumbar','Rajsamand','Ajmer','Beawar','Pali'],
    },
    'alluvial': {
        'label':        'Alluvial soils (Entisols/Inceptisols)',
        'texture':      'Fine sandy loam to silty clay',
        'fertility':    'High',
        'nutrients':    'Adequate N and K; needs organic replenishment',
        'crop_suit':    'Wheat, mustard, sugarcane, vegetables',
        'erosion':      'Low (except along ravines of Chambal)',
        'districts':    ['Alwar','Khairthal-Tijara','Kotputli-Behror','Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur','Jaipur','Dausa','Tonk'],
    },
    'black': {
        'label':        'Black cotton soils (Vertisols)',
        'texture':      'Fine clay, high swell-shrink',
        'fertility':    'High for retentive crops',
        'nutrients':    'Calcareous; deficient in N and P',
        'crop_suit':    'Cotton, soybean, wheat, gram, chilli',
        'erosion':      'Low (except sheet erosion on slopes)',
        'districts':    ['Kota','Bundi','Baran','Jhalawar','Chittorgarh','Pratapgarh'],
    },
    'mixed-red-black': {
        'label':        'Mixed red-and-black soils',
        'texture':      'Variable — patchwork of Alfisol and Vertisol',
        'fertility':    'Moderate',
        'nutrients':    'Variable; often needs micronutrient supplementation',
        'crop_suit':    'Maize, soybean, wheat, gram',
        'erosion':      'Moderate',
        'districts':    ['Bhilwara','Banswara','Dungarpur'],
    },
    'saline': {
        'label':        'Saline & alkaline soils',
        'texture':      'Variable base with soluble-salt accumulations',
        'fertility':    'Low unless reclaimed',
        'nutrients':    'High sodium; low usable N and P',
        'crop_suit':    'Salt-tolerant crops after reclamation (barley, mustard, saltbush pasture)',
        'erosion':      'Moderate; wind-blown salts',
        'districts':    ['Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu'],
    },
    'skeletal': {
        'label':        'Skeletal / rocky soils (Entisols on Aravalli)',
        'texture':      'Shallow, gravelly, rock outcrops',
        'fertility':    'Very low',
        'nutrients':    'Very poor',
        'crop_suit':    'Grazing, agro-forestry',
        'erosion':      'Very high (slope + rill)',
        'districts':    ['Jalore','Sirohi'],   # west Aravalli slope skeletal representative
    },
}

VEGETATION_TYPES = {
    'thorn-forest': {
        'label':       'Tropical Thorn Forest',
        'champion_id': '6B — Northern Tropical Thorn Forest',
        'canopy':      'Open, 25–40 % cover',
        'species':     ['Prosopis cineraria (Khejri)','Acacia nilotica (Babul)','Ziziphus mauritiana (Ber)','Capparis decidua (Kair)','Tecomella undulata (Rohida)'],
        'threats':     ['Fuel-wood extraction','Overgrazing','Prosopis juliflora invasion'],
        'related_pas': ['Desert National Park','Tal Chhapar Wildlife Sanctuary','Sudasari CR'],
        'districts':   ['Jaisalmer','Barmer','Bikaner','Sri Ganganagar','Hanumangarh','Churu','Phalodi','Balotra','Jodhpur','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu','Pali','Jalore'],
    },
    'dry-deciduous': {
        'label':       'Dry Deciduous Forest',
        'champion_id': '5B — Northern Tropical Dry Deciduous Forest',
        'canopy':      'Moderate, 40–70 %',
        'species':     ['Anogeissus pendula (Dhok)','Boswellia serrata (Salar)','Butea monosperma (Palash)','Terminalia arjuna','Diospyros melanoxylon'],
        'threats':     ['Fire','Encroachment','Illegal felling'],
        'related_pas': ['Sariska','Ranthambore','Mukundra Hills','Ramgarh Vishdhari'],
        'districts':   ['Sirohi','Rajsamand','Ajmer','Beawar','Bhilwara','Bundi','Sawai Madhopur','Karauli','Alwar','Khairthal-Tijara','Chittorgarh'],
    },
    'dry-mixed': {
        'label':       'Dry Mixed Forest',
        'champion_id': '5A — Southern Tropical Dry Mixed Deciduous',
        'canopy':      'Moderate to dense, 50–80 %',
        'species':     ['Tectona grandis (Teak) — patchy','Anogeissus latifolia','Terminalia bellirica','Madhuca longifolia'],
        'threats':     ['Selective logging','Livestock browsing'],
        'related_pas': ['Sitamata Wildlife Sanctuary','Phulwari ki Nal WLS','Kumbhalgarh WLS'],
        'districts':   ['Udaipur','Salumbar','Pratapgarh'],
    },
    'grassland': {
        'label':       'Grasslands & Savanna',
        'champion_id': '5/DS1 — Anogeissus savanna edge, Sewan grasslands',
        'canopy':      'Herbaceous — few trees',
        'species':     ['Lasiurus sindicus (Sewan grass)','Cenchrus ciliaris','Cymbopogon spp.'],
        'threats':     ['Grazing pressure','Prosopis invasion','Conversion to cropland'],
        'related_pas': ['Tal Chhapar (Chinkara/blackbuck)','Sudasari (Great Indian Bustard)','Sonkhaliya CR'],
        'districts':   ['Jaisalmer','Bikaner','Churu','Nagaur','Sikar','Jhunjhunu'],
    },
    'riparian': {
        'label':       'Riparian Vegetation',
        'champion_id': '5/1S1 — Riparian belts along Chambal/Banas/Mahi',
        'canopy':      'Linear gallery forest, 60–90 %',
        'species':     ['Terminalia arjuna','Acacia catechu','Ficus racemosa','Syzygium cumini','Salix tetrasperma'],
        'threats':     ['Sand mining','Bank cultivation','Barrage submergence'],
        'related_pas': ['National Chambal Sanctuary','Bandh Baretha Lake area','Ramgarh Vishdhari (Banas)'],
        'districts':   ['Kota','Bundi','Sawai Madhopur','Karauli','Dholpur'],
    },
    'wetland': {
        'label':       'Wetland Vegetation',
        'champion_id': '4/E2 — Freshwater and brackish marshes',
        'canopy':      'Emergent, floating and submerged aquatic plants',
        'species':     ['Typha spp.','Phragmites karka','Nymphaea','Ipomoea aquatica','Vallisneria'],
        'threats':     ['Encroachment','Eutrophication','Invasive Prosopis fringes'],
        'related_pas': ['Keoladeo Ghana NP','Sambhar Lake','Menar Wetland','Khichan'],
        'districts':   ['Bharatpur','Deeg'],
    },
    'montane': {
        'label':       'Montane subtropical / semi-evergreen (Mount Abu)',
        'champion_id': '8C — Southern Subtropical Broad-leaved Hill Forest (pocket)',
        'canopy':      'Semi-evergreen, 70–90 %',
        'species':     ['Anogeissus sericea','Diospyros montana','Buchanania lanzan','Bauhinia racemosa'],
        'threats':     ['Fire','Development pressure at Mount Abu'],
        'related_pas': ['Mount Abu Wildlife Sanctuary'],
        'districts':   ['Sirohi'],
    },
}

DESERTIFICATION = {
    'severe': {
        'label':      'Severe',
        'causes':     'Dune-drift, sparse vegetation, high wind velocity',
        'wind':       'Very high',
        'water':      'Low',
        'salinity':   'Moderate (channel-adjacent)',
        'districts':  ['Jaisalmer','Barmer','Balotra','Bikaner','Phalodi'],
    },
    'moderate': {
        'label':      'Moderate',
        'causes':     'Overgrazing + rain-fed cropping stress',
        'wind':       'High',
        'water':      'Moderate',
        'salinity':   'Moderate',
        'districts':  ['Sri Ganganagar','Hanumangarh','Churu','Jodhpur','Nagaur','Didwana-Kuchaman'],
    },
    'mild': {
        'label':      'Mild',
        'causes':     'Groundwater over-draft; canal-command salinity',
        'wind':       'Moderate',
        'water':      'Moderate',
        'salinity':   'Localised',
        'districts':  ['Sikar','Jhunjhunu','Jaipur','Kotputli-Behror','Khairthal-Tijara','Ajmer','Beawar','Pali','Jalore','Sirohi','Tonk','Dausa'],
    },
    'stable': {
        'label':      'Stable / no significant desertification',
        'causes':     'Adequate rainfall + vegetation retention',
        'wind':       'Low',
        'water':      'Moderate (erosion on slopes)',
        'salinity':   'Low',
        'districts':  ['Alwar','Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur','Bhilwara','Rajsamand','Chittorgarh','Udaipur','Salumbar','Bundi','Kota','Baran','Jhalawar','Pratapgarh','Dungarpur','Banswara'],
    },
}

DROUGHT_VULNERABILITY = {
    'very-high': {
        'label':      'Very High',
        'frequency':  '4-of-10 years or worse',
        'historical': 'Recurrent 1965–66, 1985–87, 2000–03, 2018',
        'notes':      'Chronic — economy relies on livestock, migration to Kutch/Punjab.',
        'districts':  ['Jaisalmer','Barmer','Bikaner','Churu','Phalodi','Balotra'],
    },
    'high': {
        'label':      'High',
        'frequency':  '3-of-10',
        'historical': '1985–87, 1999–2002, 2018',
        'notes':      'Rain-fed farming vulnerable; canal-fed areas partly buffered.',
        'districts':  ['Sri Ganganagar','Hanumangarh','Jodhpur','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu','Pali','Jalore','Sirohi','Ajmer','Beawar'],
    },
    'moderate': {
        'label':      'Moderate',
        'frequency':  '2-of-10',
        'historical': '2000, 2015',
        'notes':      'Deficit years present but recoveries reliable.',
        'districts':  ['Jaipur','Kotputli-Behror','Khairthal-Tijara','Dausa','Tonk','Bhilwara','Rajsamand','Alwar'],
    },
    'low': {
        'label':      'Low',
        'frequency':  '1-of-10 or better',
        'historical': 'Rarely declared drought-affected; support water.',
        'notes':      'Southern and south-eastern Rajasthan.',
        'districts':  ['Bharatpur','Deeg','Dholpur','Karauli','Sawai Madhopur','Chittorgarh','Bundi','Kota','Baran','Jhalawar','Pratapgarh','Udaipur','Salumbar','Dungarpur','Banswara'],
    },
}

# ============================================================================
#  ASSEMBLY
# ============================================================================

def load_districts():
    d = json.load(open(OUT / 'districts.geojson'))
    m = {}
    for f in d['features']:
        m[f['properties']['name']] = f
    return m


def signed_area(ring):
    s = 0.0
    for (x1,y1),(x2,y2) in zip(ring, ring[1:]):
        s += (x2-x1)*(y2+y1)
    return -s / 2.0


def bbox_of(coords):
    xs=[]; ys=[]
    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c: walk(x)
    walk(coords)
    return [min(xs), min(ys), max(xs), max(ys)]


def centroid_of(mp_coords):
    """Area-weighted centroid across a MultiPolygon."""
    total_a = 0.0; cx = 0.0; cy = 0.0
    for poly in mp_coords:
        outer = poly[0]
        a = signed_area(outer)
        # Ring centroid
        rx = 0.0; ry = 0.0; ra = 0.0
        for (x1,y1),(x2,y2) in zip(outer, outer[1:]):
            f = x1*y2 - x2*y1
            ra += f; rx += (x1+x2)*f; ry += (y1+y2)*f
        if abs(ra) < 1e-12: continue
        rx /= (3 * ra); ry /= (3 * ra)
        ra /= 2
        cx += rx * ra; cy += ry * ra
        total_a += ra
    if abs(total_a) < 1e-12: return [0, 0]
    return [cx / total_a, cy / total_a]


def merge_districts(district_names, districts_by_name):
    """Union of the district polygons — geometrically a MultiPolygon of every
    constituent district. Not a true union (touching seams remain) but visually
    identical at atlas scale."""
    all_polys = []
    for n in district_names:
        feat = districts_by_name.get(n)
        if not feat:
            print(f'!! district not found: {n}', file=sys.stderr)
            continue
        g = feat['geometry']
        if g['type'] == 'Polygon':
            all_polys.append(g['coordinates'])
        else:
            all_polys.extend(g['coordinates'])
    if not all_polys:
        return None
    return {'type': 'MultiPolygon', 'coordinates': all_polys}


def emit_layer(zones, layer_id, feature_type, source_ref, extra_fields=None):
    districts_by_name = load_districts()
    features = []
    for zone_id, meta in zones.items():
        geom = merge_districts(meta['districts'], districts_by_name)
        if not geom: continue
        cent = centroid_of(geom['coordinates'])
        bbox = bbox_of(geom['coordinates'])
        props = {
            'name':            meta['label'],
            'type':            feature_type,
            'category':        'climate',
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
                                'Actual boundary of the classification is a smooth isopleth '
                                'that crosses districts; refer to the cited source for the '
                                'authoritative surveyed line.'),
            'notes':           {'facts': [], 'mnemonic': '', 'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': '', 'status': ''},
        }
        # Merge in the zone-specific fields — but avoid overwriting the
        # schema-required object shapes. Any string `notes` in a zone metadata
        # gets promoted to `remark` to preserve the atlas notes-object schema.
        for k, v in meta.items():
            if k in ('label','districts'): continue
            if k == 'notes' and not isinstance(v, dict):
                props['remark'] = v
                continue
            props[k] = v
        features.append({
            'type': 'Feature',
            'id': f'{layer_id}-{zone_id}',
            'properties': props,
            'geometry': geom,
        })
    fc = {'type': 'FeatureCollection', 'features': features}
    (OUT / f'{layer_id}.geojson').write_text(json.dumps(fc, separators=(',',':')))
    print(f'wrote {layer_id}.geojson: {len(features)} features')


def main():
    emit_layer(RAINFALL_ZONES,      'rainfall',              'rainfall_zone',
               'IMD annual rainfall averages; RSAPCC 2010 baseline')
    emit_layer(TEMPERATURE_ZONES,   'temperature',           'temperature_zone',
               'IMD monthly means; RSAPCC 2010 baseline')
    emit_layer(CLIMATE_REGIONS,     'climate-regions',       'climate_region',
               'Köppen classification + Rajasthan physical geography (Sharma & Bhandari 2009)')
    emit_layer(AGRO_CLIMATIC_ZONES, 'agro-climatic-zones',   'agro_climatic_zone',
               'Rajasthan Agricultural University zone gazette; ICAR NARP report')
    emit_layer(SOIL_TYPES,          'soil-types',            'soil_type',
               'NBSS&LUP Rajasthan soil map (Bulletin 42); ICAR')
    emit_layer(VEGETATION_TYPES,    'vegetation',            'vegetation_type',
               'Champion & Seth (1968) forest-type classification; Rajasthan Forest Department atlas')
    emit_layer(DESERTIFICATION,     'desertification',       'desertification_zone',
               'ISRO SAC Desertification and Land Degradation Atlas of India (2021)')
    emit_layer(DROUGHT_VULNERABILITY,'drought-vulnerability','drought_zone',
               'Rajasthan State Disaster Management Authority; RSAPCC vulnerability index')

    # -----------------------------------------------------------------------
    #  KNOWLEDGE GRAPH — declarative typed relations between features.
    #  Keys are canonical short IDs; the JS graph builder resolves them at
    #  runtime against every layer.
    # -----------------------------------------------------------------------
    kg = {
        'version': '1.0',
        'generated': RETRIEVED,
        'notes': ('Declarative typed relations. Every entry links a source '
                  'feature id to related-feature ids across layers.'),
        'edges': [
            # ---------- Climate regions → their downstream signature features ----------
            {'source': 'climate-regions-arid', 'related': [
                {'target': 'thar-main',              'type': 'defines'},
                {'target': 'rainfall-lt-200',        'type': 'colocated'},
                {'target': 'rainfall-200-300',      'type': 'colocated'},
                {'target': 'soil-types-desert',      'type': 'colocated'},
                {'target': 'vegetation-thorn-forest','type': 'colocated'},
                {'target': 'vegetation-grassland',   'type': 'colocated'},
                {'target': 'desert-np',              'type': 'signature'},
                {'target': 'drainage-basins-luni',   'type': 'colocated'},
                {'target': 'drainage-basins-ghaggar','type': 'colocated'},
            ]},
            {'source': 'climate-regions-semi-arid', 'related': [
                {'target': 'rainfall-300-500', 'type': 'colocated'},
                {'target': 'rainfall-500-700', 'type': 'colocated'},
                {'target': 'soil-types-red-loamy', 'type': 'colocated'},
                {'target': 'soil-types-alluvial',  'type': 'colocated'},
                {'target': 'vegetation-dry-deciduous','type': 'colocated'},
                {'target': 'aravalli-main-axis',   'type': 'defines'},
                {'target': 'ranthambore-tr',       'type': 'signature'},
                {'target': 'sariska-tr',           'type': 'signature'},
            ]},
            {'source': 'climate-regions-sub-humid', 'related': [
                {'target': 'rainfall-500-700', 'type': 'colocated'},
                {'target': 'rainfall-700-1000','type': 'colocated'},
                {'target': 'soil-types-black', 'type': 'colocated'},
                {'target': 'vegetation-dry-deciduous','type': 'colocated'},
                {'target': 'mukundra-hills-tr','type': 'signature'},
                {'target': 'drainage-basins-chambal', 'type': 'colocated'},
            ]},
            {'source': 'climate-regions-humid-pocket', 'related': [
                {'target': 'rainfall-gt-1000',    'type': 'colocated'},
                {'target': 'vegetation-dry-mixed','type': 'colocated'},
                {'target': 'drainage-basins-mahi','type': 'colocated'},
                {'target': 'mahi-river',          'type': 'signature'},
            ]},
            # ---------- Vegetation ↔ signature protected areas ----------
            {'source': 'vegetation-thorn-forest', 'related': [
                {'target': 'desert-np',                     'type': 'signature'},
                {'target': 'thar-main',                     'type': 'colocated'},
                {'target': 'soil-types-desert',             'type': 'colocated'},
                {'target': 'climate-regions-arid',          'type': 'colocated'},
            ]},
            {'source': 'vegetation-dry-deciduous', 'related': [
                {'target': 'ranthambore-np',      'type': 'signature'},
                {'target': 'ranthambore-tr',      'type': 'signature'},
                {'target': 'sariska-np',          'type': 'signature'},
                {'target': 'sariska-tr',          'type': 'signature'},
                {'target': 'mukundra-hills-np',   'type': 'signature'},
                {'target': 'aravalli-main-axis',  'type': 'colocated'},
                {'target': 'soil-types-red-loamy','type': 'colocated'},
            ]},
            {'source': 'vegetation-wetland', 'related': [
                {'target': 'keoladeo-np',        'type': 'signature'},
                {'target': 'keoladeo-ramsar',    'type': 'signature'},
                {'target': 'sambhar-ramsar',     'type': 'signature'},
                {'target': 'menar-ramsar',       'type': 'signature'},
                {'target': 'khichan-ramsar',     'type': 'signature'},
            ]},
            {'source': 'vegetation-riparian', 'related': [
                {'target': 'chambal-river',                'type': 'colocated'},
                {'target': 'banas-river',                  'type': 'colocated'},
                {'target': 'national-chambal-wls',         'type': 'signature'},
            ]},
            {'source': 'vegetation-montane', 'related': [
                {'target': 'mount-abu-wls',      'type': 'signature'},
                {'target': 'peak-guru-shikhar',  'type': 'signature'},
            ]},
            # ---------- Soil ↔ crop / vegetation / physiography ----------
            {'source': 'soil-types-desert', 'related': [
                {'target': 'thar-main',                  'type': 'colocated'},
                {'target': 'vegetation-thorn-forest',    'type': 'colocated'},
                {'target': 'agro-climatic-zones-1a',     'type': 'colocated'},
                {'target': 'climate-regions-arid',       'type': 'colocated'},
            ]},
            {'source': 'soil-types-black', 'related': [
                {'target': 'physiography-southeastern-plateau-region', 'type': 'colocated'},
                {'target': 'agro-climatic-zones-5',      'type': 'colocated'},
                {'target': 'drainage-basins-chambal',    'type': 'colocated'},
            ]},
            {'source': 'soil-types-alluvial', 'related': [
                {'target': 'physiography-eastern-plains-region', 'type': 'colocated'},
                {'target': 'chambal-river',              'type': 'proximity'},
                {'target': 'banas-river',                'type': 'proximity'},
                {'target': 'agro-climatic-zones-3b',     'type': 'colocated'},
            ]},
            # ---------- Rainfall ↔ downstream water dependencies ----------
            {'source': 'rainfall-gt-1000', 'related': [
                {'target': 'mahi-river',              'type': 'signature'},
                {'target': 'drainage-basins-mahi',    'type': 'colocated'},
                {'target': 'climate-regions-humid-pocket', 'type': 'colocated'},
            ]},
            {'source': 'rainfall-lt-200', 'related': [
                {'target': 'thar-main',                     'type': 'colocated'},
                {'target': 'desert-np',                     'type': 'signature'},
                {'target': 'drought-vulnerability-very-high','type': 'colocated'},
                {'target': 'desertification-severe',        'type': 'colocated'},
            ]},
            # ---------- Drought / desertification signatures ----------
            {'source': 'drought-vulnerability-very-high', 'related': [
                {'target': 'thar-main',                'type': 'colocated'},
                {'target': 'desertification-severe',   'type': 'colocated'},
                {'target': 'rainfall-lt-200',          'type': 'colocated'},
                {'target': 'agro-climatic-zones-1a',   'type': 'colocated'},
            ]},
            {'source': 'desertification-severe', 'related': [
                {'target': 'thar-main',                'type': 'colocated'},
                {'target': 'drought-vulnerability-very-high','type': 'colocated'},
                {'target': 'soil-types-desert',        'type': 'colocated'},
                {'target': 'vegetation-thorn-forest',  'type': 'colocated'},
            ]},

            # =============================================================
            #  Module 4.1 expansion — physiography ↔ climate/soil/vegetation
            # =============================================================

            {'source': 'physiography-thar-desert-region', 'related': [
                {'target': 'climate-regions-arid',       'type': 'defines',
                 'explanation': 'The Thar physiographic region hosts India\'s hot-desert BWh climate.'},
                {'target': 'soil-types-desert',          'type': 'colocated',
                 'explanation': 'Sandy Aridisols are the parent material across the Thar.'},
                {'target': 'vegetation-thorn-forest',    'type': 'colocated',
                 'explanation': 'Prosopis-Ziziphus-Capparis thorn scrub dominates the region.'},
                {'target': 'vegetation-grassland',       'type': 'colocated',
                 'explanation': 'Sewan grass patches persist between dunes.'},
                {'target': 'drought-vulnerability-very-high','type': 'colocated'},
                {'target': 'desertification-severe',      'type': 'colocated'},
                {'target': 'agro-climatic-zones-1a',      'type': 'colocated'},
                {'target': 'drainage-basins-luni',        'type': 'colocated'},
                {'target': 'desert-np',                   'type': 'signature'},
                {'target': 'tal-chhapper-wls',            'type': 'signature',
                 'explanation': 'The Tal Chhapar grasslands are the Thar\'s classic protected grassland.'},
            ]},
            {'source': 'physiography-aravalli-hills-region', 'related': [
                {'target': 'climate-regions-semi-arid',   'type': 'defines'},
                {'target': 'soil-types-red-loamy',        'type': 'colocated',
                 'explanation': 'Alfisols weather from the Aravalli\'s crystalline base.'},
                {'target': 'soil-types-skeletal',         'type': 'colocated',
                 'explanation': 'Shallow rocky Entisols cap the ridges themselves.'},
                {'target': 'vegetation-dry-deciduous',    'type': 'colocated'},
                {'target': 'vegetation-montane',          'type': 'signature',
                 'explanation': 'Mount Abu\'s semi-evergreen pocket is the range\'s montane exemplar.'},
                {'target': 'aravalli-main-axis',          'type': 'signature'},
                {'target': 'peak-guru-shikhar',           'type': 'signature'},
                {'target': 'peak-kumbhalgarh-fort',       'type': 'signature'},
                {'target': 'mount-abu-wls',               'type': 'signature'},
                {'target': 'kumbhalgarh-wls',             'type': 'signature'},
                {'target': 'sariska-tr',                  'type': 'signature'},
            ]},
            {'source': 'physiography-eastern-plains-region', 'related': [
                {'target': 'climate-regions-sub-humid',   'type': 'defines'},
                {'target': 'soil-types-alluvial',         'type': 'colocated',
                 'explanation': 'Inceptisols and Entisols line the Banas–Chambal valleys.'},
                {'target': 'vegetation-dry-deciduous',    'type': 'colocated'},
                {'target': 'agro-climatic-zones-3a',      'type': 'colocated'},
                {'target': 'agro-climatic-zones-3b',      'type': 'colocated'},
                {'target': 'drainage-basins-chambal',     'type': 'colocated'},
                {'target': 'drainage-basins-banganga',    'type': 'colocated'},
                {'target': 'banas-river',                 'type': 'signature'},
                {'target': 'chambal-river',               'type': 'proximity'},
                {'target': 'keoladeo-np',                 'type': 'signature'},
                {'target': 'ranthambore-np',              'type': 'signature'},
            ]},
            {'source': 'physiography-southeastern-plateau-region', 'related': [
                {'target': 'climate-regions-sub-humid',   'type': 'defines'},
                {'target': 'soil-types-black',            'type': 'colocated',
                 'explanation': 'Vertisols (medium-black cotton soils) blanket the Hadoti plateau.'},
                {'target': 'vegetation-dry-deciduous',    'type': 'colocated'},
                {'target': 'vegetation-riparian',         'type': 'colocated'},
                {'target': 'agro-climatic-zones-5',       'type': 'colocated'},
                {'target': 'drainage-basins-chambal',     'type': 'colocated'},
                {'target': 'chambal-river',               'type': 'signature'},
                {'target': 'kalisindh-river',             'type': 'colocated'},
                {'target': 'mukundra-hills-np',           'type': 'signature'},
                {'target': 'mukundra-hills-tr',           'type': 'signature'},
                {'target': 'national-chambal-wls',        'type': 'signature'},
            ]},
            {'source': 'physiography-southern-hills-region', 'related': [
                {'target': 'climate-regions-humid-pocket','type': 'defines'},
                {'target': 'soil-types-mixed-red-black',  'type': 'colocated'},
                {'target': 'vegetation-dry-mixed',        'type': 'colocated'},
                {'target': 'agro-climatic-zones-4b',      'type': 'colocated'},
                {'target': 'drainage-basins-mahi',        'type': 'colocated'},
                {'target': 'mahi-river',                  'type': 'signature'},
                {'target': 'som-river',                   'type': 'colocated'},
                {'target': 'jakham-river',                'type': 'colocated'},
                {'target': 'sitamata-wls',                'type': 'signature'},
                {'target': 'phulwari-ki-nal-wls',         'type': 'signature'},
            ]},

            # =============================================================
            #  Drainage basins ↔ rivers + PAs + agro-climatic zones
            # =============================================================
            {'source': 'drainage-basins-chambal', 'related': [
                {'target': 'chambal-river',            'type': 'defines',
                 'explanation': 'The basin\'s trunk river.'},
                {'target': 'banas-river',              'type': 'colocated'},
                {'target': 'berach-river',             'type': 'colocated'},
                {'target': 'kalisindh-river',          'type': 'colocated'},
                {'target': 'parbati-river',            'type': 'colocated'},
                {'target': 'parvan-river',             'type': 'colocated'},
                {'target': 'ranthambore-tr',           'type': 'signature'},
                {'target': 'mukundra-hills-tr',        'type': 'signature'},
                {'target': 'national-chambal-wls',     'type': 'signature'},
                {'target': 'dholpur-karauli-tr',       'type': 'signature'},
                {'target': 'agro-climatic-zones-5',    'type': 'colocated'},
            ]},
            {'source': 'drainage-basins-luni', 'related': [
                {'target': 'luni-river',               'type': 'defines'},
                {'target': 'jawai-river',              'type': 'colocated'},
                {'target': 'sukri-river',              'type': 'colocated'},
                {'target': 'physiography-thar-desert-region','type': 'colocated'},
                {'target': 'climate-regions-arid',     'type': 'colocated'},
                {'target': 'drought-vulnerability-very-high','type': 'colocated'},
                {'target': 'agro-climatic-zones-2a',   'type': 'colocated'},
                {'target': 'agro-climatic-zones-2b',   'type': 'colocated'},
            ]},
            {'source': 'drainage-basins-mahi', 'related': [
                {'target': 'mahi-river',               'type': 'defines'},
                {'target': 'anas-river',               'type': 'colocated'},
                {'target': 'som-river',                'type': 'colocated'},
                {'target': 'jakham-river',             'type': 'colocated'},
                {'target': 'climate-regions-humid-pocket','type': 'colocated'},
                {'target': 'rainfall-gt-1000',         'type': 'colocated'},
                {'target': 'vegetation-dry-mixed',     'type': 'colocated'},
                {'target': 'agro-climatic-zones-4b',   'type': 'colocated'},
            ]},
            {'source': 'drainage-basins-banganga', 'related': [
                {'target': 'banganga-river',           'type': 'defines'},
                {'target': 'sabi-river',               'type': 'colocated'},
                {'target': 'keoladeo-np',              'type': 'signature',
                 'explanation': 'The park sits at the Banganga–Gambhir confluence.'},
                {'target': 'sariska-tr',               'type': 'colocated',
                 'explanation': 'The basin\'s headwaters rise in the Sariska hills.'},
                {'target': 'physiography-eastern-plains-region','type': 'colocated'},
            ]},
            {'source': 'drainage-basins-sabarmati', 'related': [
                {'target': 'sabarmati-river',          'type': 'defines'},
                {'target': 'west-banas-river',         'type': 'colocated'},
                {'target': 'climate-regions-semi-arid','type': 'colocated'},
            ]},
            {'source': 'drainage-basins-ghaggar', 'related': [
                {'target': 'ghaggar-river',            'type': 'defines'},
                {'target': 'climate-regions-arid',     'type': 'colocated'},
                {'target': 'agro-climatic-zones-1b',   'type': 'colocated'},
                {'target': 'desertification-moderate', 'type': 'colocated'},
            ]},
            {'source': 'drainage-basins-interior-drainage', 'related': [
                {'target': 'sambhar-ramsar',           'type': 'signature'},
                {'target': 'sambhar-wetland',          'type': 'signature'},
                {'target': 'soil-types-saline',        'type': 'colocated',
                 'explanation': 'Endorheic drainage concentrates salts in the Sambhar basin.'},
                {'target': 'climate-regions-semi-arid','type': 'colocated'},
            ]},

            # =============================================================
            #  Protected areas ↔ climate/soil/vegetation
            # =============================================================
            {'source': 'desert-np', 'related': [
                {'target': 'climate-regions-arid',       'type': 'defines'},
                {'target': 'rainfall-lt-200',            'type': 'colocated'},
                {'target': 'soil-types-desert',          'type': 'colocated'},
                {'target': 'vegetation-thorn-forest',    'type': 'colocated'},
                {'target': 'vegetation-grassland',       'type': 'signature',
                 'explanation': 'DNP\'s sewan grasslands are the Great Indian Bustard\'s last stronghold.'},
                {'target': 'thar-main',                  'type': 'colocated'},
                {'target': 'physiography-thar-desert-region','type': 'colocated'},
            ]},
            {'source': 'ranthambore-tr', 'related': [
                {'target': 'climate-regions-semi-arid',  'type': 'defines'},
                {'target': 'vegetation-dry-deciduous',   'type': 'defines'},
                {'target': 'soil-types-red-loamy',       'type': 'colocated'},
                {'target': 'chambal-river',              'type': 'colocated'},
                {'target': 'drainage-basins-chambal',    'type': 'colocated'},
                {'target': 'aravalli-main-axis',         'type': 'proximity'},
                {'target': 'physiography-eastern-plains-region','type': 'colocated'},
            ]},
            {'source': 'sariska-tr', 'related': [
                {'target': 'climate-regions-semi-arid',  'type': 'defines'},
                {'target': 'vegetation-dry-deciduous',   'type': 'defines'},
                {'target': 'soil-types-red-loamy',       'type': 'colocated'},
                {'target': 'aravalli-main-axis',         'type': 'colocated'},
                {'target': 'physiography-aravalli-hills-region','type': 'colocated'},
                {'target': 'drainage-basins-banganga',   'type': 'colocated'},
            ]},
            {'source': 'mukundra-hills-tr', 'related': [
                {'target': 'climate-regions-sub-humid',  'type': 'defines'},
                {'target': 'soil-types-black',           'type': 'colocated'},
                {'target': 'vegetation-dry-mixed',       'type': 'defines'},
                {'target': 'vegetation-riparian',        'type': 'colocated'},
                {'target': 'chambal-river',              'type': 'colocated'},
                {'target': 'physiography-southeastern-plateau-region','type': 'colocated'},
            ]},
            {'source': 'keoladeo-np', 'related': [
                {'target': 'vegetation-wetland',         'type': 'defines'},
                {'target': 'climate-regions-sub-humid',  'type': 'colocated'},
                {'target': 'soil-types-alluvial',        'type': 'colocated'},
                {'target': 'drainage-basins-banganga',   'type': 'colocated'},
                {'target': 'rainfall-500-700',           'type': 'colocated'},
                {'target': 'agro-climatic-zones-3b',     'type': 'colocated'},
            ]},
            {'source': 'ramgarh-vishdhari-tr', 'related': [
                {'target': 'climate-regions-semi-arid',  'type': 'defines'},
                {'target': 'vegetation-dry-deciduous',   'type': 'defines'},
                {'target': 'soil-types-red-loamy',       'type': 'colocated'},
                {'target': 'banas-river',                'type': 'proximity'},
                {'target': 'drainage-basins-chambal',    'type': 'colocated'},
            ]},
            {'source': 'mount-abu-wls', 'related': [
                {'target': 'vegetation-montane',         'type': 'signature'},
                {'target': 'peak-guru-shikhar',          'type': 'signature'},
                {'target': 'peak-achalgarh-fort',        'type': 'signature'},
                {'target': 'physiography-aravalli-hills-region','type': 'colocated'},
                {'target': 'rainfall-gt-1000',           'type': 'colocated',
                 'explanation': 'Mount Abu is the wettest pocket of Rajasthan.'},
            ]},
            {'source': 'sitamata-wls', 'related': [
                {'target': 'vegetation-dry-mixed',       'type': 'defines'},
                {'target': 'climate-regions-humid-pocket','type': 'colocated'},
                {'target': 'physiography-southern-hills-region','type': 'colocated'},
                {'target': 'agro-climatic-zones-4b',     'type': 'colocated'},
                {'target': 'rainfall-700-1000',          'type': 'colocated'},
            ]},
            {'source': 'phulwari-ki-nal-wls', 'related': [
                {'target': 'vegetation-dry-mixed',       'type': 'defines'},
                {'target': 'physiography-southern-hills-region','type': 'colocated'},
                {'target': 'som-river',                  'type': 'proximity'},
            ]},

            # =============================================================
            #  Agro-climatic zones ↔ rainfall + soil (crop syndrome)
            # =============================================================
            {'source': 'agro-climatic-zones-1a', 'related': [
                {'target': 'rainfall-lt-200',      'type': 'colocated'},
                {'target': 'rainfall-200-300',     'type': 'colocated'},
                {'target': 'soil-types-desert',    'type': 'colocated'},
                {'target': 'drought-vulnerability-very-high','type': 'colocated'},
            ]},
            {'source': 'agro-climatic-zones-1b', 'related': [
                {'target': 'rainfall-200-300',     'type': 'colocated'},
                {'target': 'soil-types-alluvial',  'type': 'colocated',
                 'explanation': 'Canal-command alluvial soils created by IGNP delivery.'},
                {'target': 'drainage-basins-ghaggar','type': 'colocated'},
            ]},
            {'source': 'agro-climatic-zones-2a', 'related': [
                {'target': 'rainfall-300-500',     'type': 'colocated'},
                {'target': 'soil-types-saline',    'type': 'colocated',
                 'explanation': 'Sub-soil salinity is chronic across the internal-drainage zone.'},
                {'target': 'drainage-basins-interior-drainage','type': 'colocated'},
            ]},
            {'source': 'agro-climatic-zones-3b', 'related': [
                {'target': 'rainfall-500-700',     'type': 'colocated'},
                {'target': 'soil-types-alluvial',  'type': 'colocated'},
                {'target': 'drainage-basins-banganga','type': 'colocated'},
                {'target': 'physiography-eastern-plains-region','type': 'colocated'},
            ]},
            {'source': 'agro-climatic-zones-4b', 'related': [
                {'target': 'rainfall-700-1000',    'type': 'colocated'},
                {'target': 'rainfall-gt-1000',     'type': 'colocated'},
                {'target': 'soil-types-mixed-red-black','type': 'colocated'},
                {'target': 'drainage-basins-mahi', 'type': 'colocated'},
            ]},
            {'source': 'agro-climatic-zones-5', 'related': [
                {'target': 'rainfall-700-1000',    'type': 'colocated'},
                {'target': 'soil-types-black',     'type': 'colocated'},
                {'target': 'drainage-basins-chambal','type': 'colocated'},
                {'target': 'physiography-southeastern-plateau-region','type': 'colocated'},
            ]},

            # =============================================================
            #  Rivers ↔ riparian environment + downstream PAs
            # =============================================================
            {'source': 'chambal-river', 'related': [
                {'target': 'vegetation-riparian',        'type': 'signature'},
                {'target': 'national-chambal-wls',       'type': 'signature'},
                {'target': 'ranthambore-tr',             'type': 'colocated'},
                {'target': 'mukundra-hills-tr',          'type': 'colocated'},
                {'target': 'dholpur-karauli-tr',         'type': 'colocated'},
                {'target': 'drainage-basins-chambal',    'type': 'defines'},
            ]},
            {'source': 'mahi-river', 'related': [
                {'target': 'drainage-basins-mahi',       'type': 'defines'},
                {'target': 'climate-regions-humid-pocket','type': 'colocated'},
                {'target': 'physiography-southern-hills-region','type': 'colocated'},
            ]},
            {'source': 'luni-river', 'related': [
                {'target': 'drainage-basins-luni',       'type': 'defines'},
                {'target': 'climate-regions-arid',       'type': 'colocated'},
                {'target': 'agro-climatic-zones-2b',     'type': 'colocated'},
            ]},
            {'source': 'banas-river', 'related': [
                {'target': 'drainage-basins-chambal',    'type': 'colocated'},
                {'target': 'physiography-eastern-plains-region','type': 'defines'},
                {'target': 'vegetation-dry-deciduous',   'type': 'colocated'},
                {'target': 'ranthambore-tr',             'type': 'colocated'},
                {'target': 'ramgarh-vishdhari-tr',       'type': 'colocated'},
            ]},

            # =============================================================
            #  Peaks ↔ range + PA + district
            # =============================================================
            {'source': 'peak-guru-shikhar', 'related': [
                {'target': 'mount-abu-wls',              'type': 'colocated'},
                {'target': 'aravalli-main-axis',         'type': 'defines'},
                {'target': 'physiography-aravalli-hills-region','type': 'colocated'},
                {'target': 'vegetation-montane',         'type': 'colocated'},
                {'target': 'rainfall-gt-1000',           'type': 'colocated'},
            ]},
            {'source': 'peak-kumbhalgarh-fort', 'related': [
                {'target': 'kumbhalgarh-wls',            'type': 'colocated'},
                {'target': 'aravalli-main-axis',         'type': 'colocated'},
                {'target': 'physiography-aravalli-hills-region','type': 'colocated'},
            ]},
            {'source': 'peak-achalgarh-fort', 'related': [
                {'target': 'mount-abu-wls',              'type': 'colocated'},
                {'target': 'peak-guru-shikhar',          'type': 'proximity'},
                {'target': 'aravalli-main-axis',         'type': 'colocated'},
            ]},

            # =============================================================
            #  Wetlands ↔ climate/soil (Ramsar network)
            # =============================================================
            {'source': 'sambhar-ramsar', 'related': [
                {'target': 'soil-types-saline',          'type': 'defines',
                 'explanation': 'India\'s largest inland salt lake — the source of the saline soil type here.'},
                {'target': 'vegetation-wetland',         'type': 'colocated'},
                {'target': 'drainage-basins-interior-drainage','type': 'defines'},
                {'target': 'climate-regions-semi-arid',  'type': 'colocated'},
            ]},
            {'source': 'khichan-ramsar', 'related': [
                {'target': 'physiography-thar-desert-region','type': 'colocated'},
                {'target': 'climate-regions-arid',       'type': 'colocated'},
                {'target': 'vegetation-wetland',         'type': 'colocated'},
                {'target': 'rainfall-200-300',           'type': 'colocated'},
            ]},

            # =============================================================
            #  Vegetation ↔ additional environmental context
            # =============================================================
            {'source': 'vegetation-grassland', 'related': [
                {'target': 'tal-chhapper-wls',           'type': 'signature'},
                {'target': 'desert-np',                  'type': 'signature'},
                {'target': 'physiography-thar-desert-region','type': 'colocated'},
                {'target': 'soil-types-desert',          'type': 'colocated'},
            ]},
            {'source': 'vegetation-riparian', 'related': [
                {'target': 'chambal-river',              'type': 'defines'},
                {'target': 'banas-river',                'type': 'colocated'},
                {'target': 'physiography-southeastern-plateau-region','type': 'colocated'},
                {'target': 'national-chambal-wls',       'type': 'signature'},
            ]},
        ],
    }
    (OUT / 'knowledge-graph.json').write_text(json.dumps(kg, indent=2))
    print(f'wrote knowledge-graph.json: {len(kg["edges"])} edge groups')


if __name__ == '__main__':
    main()
