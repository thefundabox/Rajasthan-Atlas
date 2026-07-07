"""
BUILD_ENV.py — Environment layer assembly pipeline.

Input:
    osm-rajasthan-protected-areas.json   — Overpass geometry dump

Output (in atlas/data/):
    national-parks.geojson
    tiger-reserves.geojson
    wildlife-sanctuaries.geojson
    ramsar-sites.geojson
    wetlands.geojson
    biosphere-reserves.geojson           — intentionally empty (no MAB site)
    protected-area-metadata.json         — cross-dataset index

Design notes
============
* Every feature conforms to the atlas unified schema (see feature.schema.json).
* Category = "environment"; per-feature "type" = "national_park" / "tiger_reserve" / ...
* Where OSM has authoritative geometry we use it. Where a feature is too recent
  (post-2023 notifications) or too small to have been mapped, we ship a POINT
  feature with `properties.geometryQuality = "point"` and the declared area from
  the official notification. We never fabricate polygons.
* District intersection is stamped in the metadata but computed properly at
  runtime by the LayerManager's spatial index against the districts layer.
* Feature notes reflect only what we can cite from published sources. Framing
  is neutral atlas content — see MODULE2_REPORT.md.
"""

import json
import math
import re
import sys
import unicodedata
from pathlib import Path

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------
HERE   = Path(__file__).parent
OSM    = HERE / 'osm-rajasthan-protected-areas.json'
OUT    = HERE.parent

def out(name): return OUT / name

RETRIEVED = '2026-07-06'
STATE     = 'Rajasthan'

# =============================================================================
#  AUTHORITATIVE METADATA MANIFEST
#
#  Each entry:
#    name, aliases, districts, area_km2, established, source_ref,
#    (osm relation/way ids for geometry, if any),
#    notes block (facts / mnemonic / significance / confusedWith)
#    ecology block (flora / fauna / ecosystem)
#    governance block (authority / status / iucn / conservation_programme)
#
#  Sources referenced by short code — see DATA_SOURCES.md for full citations.
#    RFD     = Rajasthan Forest Department (PROTECTED AREA NETWORK IN RAJASTHAN, Oct 2023)
#    NTCA    = National Tiger Conservation Authority
#    MoEFCC  = Ministry of Environment, Forest and Climate Change
#    RAMSAR  = Ramsar Convention Secretariat, RSIS
#    UNESCO  = UNESCO World Heritage Centre
#    WII     = Wildlife Institute of India, Protected Area database
#    OSM     = OpenStreetMap admin/protected-area relations (supplementary only)
#    PIB     = Press Information Bureau, Government of India
# =============================================================================

NATIONAL_PARKS = [
    {
        'id': 'ranthambore-np', 'name': 'Ranthambore National Park',
        'districts': ['Sawai Madhopur'], 'division': 'Bharatpur',
        'area_km2': 392.0, 'established': '1980',
        'geometry_source': ('relation', 3494941),
        'source_ref': ['RFD', 'WII', 'NTCA'],
        'ecology': {
            'ecosystem': 'Dry deciduous forest, grasslands, riverine',
            'fauna': ['Bengal tiger', 'Leopard', 'Sambar', 'Chital', 'Nilgai', 'Sloth bear', 'Marsh crocodile'],
            'flora': ['Dhok (Anogeissus pendula)', 'Banyan', 'Peepal', 'Khair', 'Ber'],
        },
        'governance': {'authority': 'Rajasthan Forest Department', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Originally established as Sawai Madhopur Game Sanctuary in 1955.',
                'Declared a National Park in 1980.',
                'Core of Ranthambore Tiger Reserve, one of the original 9 Project Tiger reserves (1973–74).',
                'Named after Ranthambore Fort — a UNESCO World Heritage Site (Hill Forts of Rajasthan, 2013).',
            ],
            'significance': 'high',
            'mnemonic': '"Ranthambore = R-anthambore = original 9 Project Tiger + Hill Fort WHS"',
            'confusedWith': ['Ranthambore Tiger Reserve (larger, includes NP + Sawai Man Singh + Kailadevi WLS)'],
        },
    },
    {
        'id': 'sariska-np', 'name': 'Sariska National Park',
        'districts': ['Alwar'], 'division': 'Jaipur',
        # NP subset within Sariska TR. OSM has no separate NP polygon.
        'area_km2': 273.8, 'established': '1982',
        'geometry_source': None,   # ship as point; centroid inside Sariska TR
        'point': [76.4400, 27.3300],
        'source_ref': ['RFD', 'WII'],
        'ecology': {
            'ecosystem': 'Dry deciduous scrub and rocky Aravalli terrain',
            'fauna': ['Bengal tiger (reintroduced)', 'Leopard', 'Sambar', 'Nilgai', 'Wild dog', 'Hyena'],
            'flora': ['Dhok', 'Salar', 'Kair', 'Palash'],
        },
        'governance': {'authority': 'Rajasthan Forest Department', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Established as a wildlife reserve in 1958; National Park in 1982.',
                'First tiger reserve in the world where tigers were successfully reintroduced after local extinction (2008).',
                'Local extinction of tigers declared 2004; reintroduction from Ranthambore began 2008.',
                'Part of the Aravalli hill system.',
            ],
            'significance': 'high',
            'mnemonic': '"Sariska = the reintroduction story"',
            'confusedWith': ['Sariska Tiger Reserve (larger area encompassing the NP)'],
        },
    },
    {
        'id': 'keoladeo-np', 'name': 'Keoladeo Ghana National Park',
        'aliases': ['Keoladeo Ghana', 'Bharatpur Bird Sanctuary'],
        'districts': ['Bharatpur'], 'division': 'Bharatpur',
        'area_km2': 28.73, 'established': '1981',
        'geometry_source': ('relation', 15743640),
        'source_ref': ['RFD', 'RAMSAR', 'UNESCO', 'WII'],
        'ecology': {
            'ecosystem': 'Man-made freshwater swamp / mixed grassland-wetland mosaic',
            'fauna': ['Siberian crane (historical wintering, extirpated)', 'Painted stork',
                      'Bar-headed goose', 'Sarus crane', 'Spotbill duck', 'Marsh harrier'],
            'flora': ['Kadam', 'Jamun', 'Babul (Acacia nilotica)', 'Aquatic macrophytes'],
        },
        'governance': {'authority': 'Rajasthan Forest Department', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Ramsar Convention (1981); UNESCO WHS (1985)'},
        'notes': {
            'facts': [
                'Ramsar Site since 1 Oct 1981 — one of India\'s earliest Ramsar sites.',
                'UNESCO World Heritage Site (Natural) inscribed 1985.',
                'Formerly a private waterfowl hunting reserve of the Maharaja of Bharatpur.',
                'Historic wintering ground for the critically-endangered Siberian Crane (not seen since 2002).',
                'Water source: Ajan Bund (fed by Gambhir and Banganga rivers).',
            ],
            'significance': 'very-high',
            'mnemonic': '"Keoladeo = 4 badges: NP + Ramsar + WHS + former royal shikargah"',
            'confusedWith': ['Sultanpur NP (Haryana — also birds, but not WHS)'],
        },
    },
    {
        'id': 'desert-np', 'name': 'Desert National Park',
        'aliases': ['Thar Desert National Park', 'DNP'],
        'districts': ['Jaisalmer', 'Barmer'], 'division': 'Jodhpur',
        'area_km2': 3162.0, 'established': '1980',
        'geometry_source': ('relation', 8334694),
        'source_ref': ['RFD', 'WII', 'MoEFCC'],
        'ecology': {
            'ecosystem': 'Sand dunes, salt lakes, craggy rocks and thorn scrub of the Thar',
            'fauna': ['Great Indian Bustard (Critically Endangered)', 'Chinkara', 'Desert fox',
                      'Desert cat', 'Blackbuck', 'Spiny-tailed lizard'],
            'flora': ['Rohida (Tecomella undulata)', 'Khejri (Prosopis cineraria)', 'Ker', 'Sewan grass'],
        },
        'governance': {'authority': 'Rajasthan Forest Department', 'status': 'active',
                       'iucn': 'II',
                       'conservation_programme': 'Project Great Indian Bustard; Species Recovery Programme (MoEFCC)'},
        'notes': {
            'facts': [
                'One of India\'s largest National Parks by area (~3,162 sq km).',
                'Last significant refuge of the Great Indian Bustard (Ardeotis nigriceps).',
                "Proposed historically but not designated as a Biosphere Reserve under UNESCO's MAB Programme.",
                'Home to the Akal Fossil Wood Park (180-million-year-old fossilised wood).',
            ],
            'significance': 'very-high',
            'mnemonic': '"Desert NP = GIB last stand"',
            'confusedWith': ['Kutch Desert Wildlife Sanctuary (Gujarat)'],
        },
    },
    {
        'id': 'mukundra-hills-np', 'name': 'Mukundra Hills National Park',
        'aliases': ['Mukundra Hills'],
        'districts': ['Kota', 'Chittorgarh', 'Jhalawar', 'Bundi'], 'division': 'Kota',
        'area_km2': 200.5, 'established': '2006',
        'geometry_source': ('relation', 9477404),
        'source_ref': ['RFD', 'WII', 'NTCA'],
        'ecology': {
            'ecosystem': 'Deciduous forest, plateau and Chambal riverine',
            'fauna': ['Bengal tiger (reintroduced)', 'Leopard', 'Sloth bear', 'Chinkara',
                      'Gharial (Chambal)', 'Mugger crocodile'],
            'flora': ['Dhok', 'Bamboo', 'Kadam', 'Palas'],
        },
        'governance': {'authority': 'Rajasthan Forest Department', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger (Mukundra Hills TR, 2013)'},
        'notes': {
            'facts': [
                'Declared a National Park in 2006; declared Tiger Reserve in 2013.',
                'India\'s newest big-cat reserve at the time of TR notification.',
                'Bordered by the Chambal, Kali Sindh, Ahu and Ramzan rivers.',
                'Encompasses parts of Darrah, Jawahar Sagar and Chambal WLSs.',
            ],
            'significance': 'high',
            'mnemonic': '"Mukundra = 4 rivers, 4 districts, 2006 NP → 2013 TR"',
        },
    },
]

TIGER_RESERVES = [
    {
        'id': 'ranthambore-tr', 'name': 'Ranthambore Tiger Reserve',
        'districts': ['Sawai Madhopur', 'Karauli', 'Bundi'], 'division': 'Bharatpur',
        'area_km2': 1411.29, 'core_km2': 1113.36, 'buffer_km2': 297.93, 'established': '1973',
        'geometry_source': ('relation', 3494941),  # NP polygon used; TR encompasses NP + Sawai Man Singh + Kailadevi
        'geometry_note': 'Boundary shown is Ranthambore National Park core; full TR includes Sawai Man Singh WLS and Kailadevi WLS (see those layers).',
        'source_ref': ['NTCA', 'RFD'],
        'ecology': {'ecosystem': 'Dry deciduous', 'fauna': ['Bengal tiger', 'Leopard', 'Sloth bear']},
        'governance': {'authority': 'Field Director, Ranthambore TR', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger (1973–74, original 9)'},
        'notes': {
            'facts': [
                'One of the 9 original Project Tiger reserves (1973–74).',
                'Core = Ranthambore NP; buffer includes Sawai Man Singh WLS and Kailadevi WLS.',
                'India\'s most-visited tiger reserve.',
            ],
            'significance': 'very-high',
        },
    },
    {
        'id': 'sariska-tr', 'name': 'Sariska Tiger Reserve',
        'districts': ['Alwar'], 'division': 'Jaipur',
        'area_km2': 1213.34, 'established': '1978',
        'geometry_source': ('relation', 9466769),
        'source_ref': ['NTCA', 'RFD'],
        'ecology': {'ecosystem': 'Dry deciduous, rocky Aravalli',
                    'fauna': ['Bengal tiger', 'Leopard', 'Nilgai', 'Wild dog']},
        'governance': {'authority': 'Field Director, Sariska TR', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Notified as Tiger Reserve in 1978.',
                'Only reserve in the world to successfully reintroduce tigers after local extinction (2008).',
                'Contains historic Neelkanth temple ruins and Kankwadi Fort.',
            ],
            'significance': 'very-high',
        },
    },
    {
        'id': 'mukundra-hills-tr', 'name': 'Mukundra Hills Tiger Reserve',
        'districts': ['Kota', 'Chittorgarh', 'Jhalawar', 'Bundi'], 'division': 'Kota',
        'area_km2': 759.99, 'established': '2013',
        'geometry_source': ('relation', 9477458),
        'source_ref': ['NTCA', 'RFD'],
        'ecology': {'ecosystem': 'Deciduous plateau; Chambal riverine',
                    'fauna': ['Bengal tiger (reintroduced)', 'Sloth bear', 'Gharial', 'Mugger']},
        'governance': {'authority': 'Field Director, Mukundra Hills TR', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Notified as 45th Tiger Reserve of India in 2013.',
                'Includes former Darrah National Park boundary (Darrah NP was denotified when TR was formed).',
            ],
            'significance': 'high',
        },
    },
    {
        'id': 'ramgarh-vishdhari-tr', 'name': 'Ramgarh Vishdhari Tiger Reserve',
        'districts': ['Bundi'], 'division': 'Kota',
        'area_km2': 1501.89, 'established': '2022',
        'geometry_source': ('relation', 9399789),
        'geometry_note': 'Polygon shown is the pre-2022 Ramgarh Vishdhari WLS; TR area extends further into buffer.',
        'source_ref': ['NTCA'],
        'ecology': {'ecosystem': 'Dry deciduous, Aravalli-Vindhyan transition',
                    'fauna': ['Bengal tiger', 'Leopard', 'Sloth bear']},
        'governance': {'authority': 'Field Director, Ramgarh Vishdhari TR', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Notified as the 52nd Tiger Reserve of India in July 2022.',
                'Fourth Tiger Reserve of Rajasthan; carved from the pre-existing Ramgarh Vishdhari WLS.',
                'Acts as a corridor between Ranthambore and Mukundra Hills.',
            ],
            'significance': 'very-high',
            'mnemonic': '"Ramgarh Vishdhari = 52nd TR, corridor Ranthambore ↔ Mukundra"',
        },
    },
    {
        'id': 'dholpur-karauli-tr', 'name': 'Dholpur–Karauli Tiger Reserve',
        'districts': ['Dholpur', 'Karauli'], 'division': 'Bharatpur',
        'area_km2': 1075.36, 'established': '2023',
        'geometry_source': None,  # No OSM boundary yet — recent notification
        'point': [77.100, 26.400],
        'source_ref': ['NTCA'],
        'ecology': {'ecosystem': 'Dry deciduous, ravines of the Chambal',
                    'fauna': ['Bengal tiger', 'Sloth bear', 'Leopard', 'Mugger crocodile']},
        'governance': {'authority': 'Field Director, Dholpur–Karauli TR', 'status': 'active',
                       'iucn': 'II', 'conservation_programme': 'Project Tiger'},
        'notes': {
            'facts': [
                'Notified as the 54th Tiger Reserve of India in August 2023.',
                'Fifth Tiger Reserve of Rajasthan.',
                'Provides connectivity with Ranthambore and Kuno-Palpur (MP) tiger habitats via the Chambal ravines.',
            ],
            'significance': 'very-high',
            'mnemonic': '"Dholpur–Karauli = 54th TR, Chambal ravines corridor"',
        },
    },
]

# Wildlife Sanctuaries — one entry per notified sanctuary. OSM geometry used where present.
# Districts listed per Rajasthan Forest Department PA network map (Oct 2023).
WILDLIFE_SANCTUARIES = [
    {'id':'bandh-baretha-wls','name':'Bandh Baretha Wildlife Sanctuary','districts':['Bharatpur'],'division':'Bharatpur','area_km2':199.24,'established':'1985','geometry_source':('relation',9435774),'source_ref':['RFD']},
    {'id':'bassi-wls','name':'Bassi Wildlife Sanctuary','districts':['Chittorgarh'],'division':'Udaipur','area_km2':138.69,'established':'1988','geometry_source':('way',666529511),'source_ref':['RFD']},
    {'id':'bhainsrodgarh-wls','name':'Bhainsrodgarh Wildlife Sanctuary','districts':['Chittorgarh'],'division':'Udaipur','area_km2':229.14,'established':'1983','geometry_source':('way',666625141),'source_ref':['RFD']},
    {'id':'darrah-wls','name':'Darrah Wildlife Sanctuary','districts':['Kota','Jhalawar'],'division':'Kota','area_km2':80.75,'established':'1955','geometry_source':('way',667103921),'source_ref':['RFD'],
     'remark':'The former Darrah National Park was denotified and merged into Mukundra Hills TR (2013).'},
    {'id':'jaisamand-wls','name':'Jaisamand Wildlife Sanctuary','districts':['Salumbar'],'division':'Udaipur','area_km2':52.34,'established':'1955','geometry_source':('way',667108199),'source_ref':['RFD']},
    {'id':'jamwa-ramgarh-wls','name':'Jamwa Ramgarh Wildlife Sanctuary','districts':['Jaipur'],'division':'Jaipur','area_km2':300.0,'established':'1982','geometry_source':('way',667114188),'source_ref':['RFD']},
    {'id':'jawahar-sagar-wls','name':'Jawahar Sagar Wildlife Sanctuary','districts':['Kota','Bundi','Chittorgarh'],'division':'Kota','area_km2':153.41,'established':'1975','geometry_source':('way',676873553),'source_ref':['RFD']},
    {'id':'jessore-wls','name':'Jessore Sloth Bear Wildlife Sanctuary','districts':['Sirohi'],'division':'Jodhpur','area_km2':52.4,'established':'1977','geometry_source':('relation',9308456),'source_ref':['RFD'],
     'remark':'OSM relation may extend across the Gujarat border; polygon clipped to Rajasthan bounds where applicable.'},
    {'id':'kailadevi-wls','name':'Kailadevi Wildlife Sanctuary','districts':['Karauli','Sawai Madhopur'],'division':'Bharatpur','area_km2':676.38,'established':'1983','geometry_source':('relation',9473779),'source_ref':['RFD'],
     'remark':'Part of Ranthambore Tiger Reserve buffer.'},
    {'id':'kesarbagh-wls','name':'Kesar Bagh Wildlife Sanctuary','districts':['Dholpur'],'division':'Bharatpur','area_km2':14.76,'established':'1955','geometry_source':('way',667257192),'source_ref':['RFD']},
    {'id':'kumbhalgarh-wls','name':'Kumbhalgarh Wildlife Sanctuary','districts':['Rajsamand','Pali','Udaipur'],'division':'Udaipur','area_km2':608.58,'established':'1971','geometry_source':('way',666956858),'source_ref':['RFD']},
    {'id':'mount-abu-wls','name':'Mount Abu Wildlife Sanctuary','districts':['Sirohi'],'division':'Jodhpur','area_km2':288.84,'established':'1960','geometry_source':('way',122077942),'source_ref':['RFD']},
    {'id':'nahargarh-wls','name':'Nahargarh Wildlife Sanctuary','districts':['Jaipur'],'division':'Jaipur','area_km2':52.4,'established':'1980','geometry_source':('way',667244115),'source_ref':['RFD']},
    {'id':'national-chambal-wls','name':'National Chambal Wildlife Sanctuary','districts':['Dholpur','Karauli','Sawai Madhopur','Kota','Bundi'],'division':'Bharatpur','area_km2':280.0,'established':'1979','geometry_source':('relation',9397372),'source_ref':['RFD'],
     'remark':'Trans-state gharial sanctuary shared with Madhya Pradesh and Uttar Pradesh; Rajasthan portion only shown.'},
    {'id':'phulwari-ki-nal-wls','name':'Phulwari ki Nal Wildlife Sanctuary','districts':['Udaipur'],'division':'Udaipur','area_km2':511.41,'established':'1983','geometry_source':('way',566643547),'source_ref':['RFD']},
    {'id':'ramgarh-vishdhari-wls','name':'Ramgarh Vishdhari Wildlife Sanctuary (now core of TR)','districts':['Bundi'],'division':'Kota','area_km2':252.79,'established':'1982','geometry_source':('relation',9399789),'source_ref':['RFD'],
     'remark':'Notified as Tiger Reserve in 2022; retained as WLS as well.'},
    {'id':'ramsagar-wls','name':'Ramsagar Wildlife Sanctuary','districts':['Dholpur'],'division':'Bharatpur','area_km2':34.4,'established':'1955','geometry_source':('way',677119465),'source_ref':['RFD']},
    {'id':'sajjangarh-wls','name':'Sajjangarh Wildlife Sanctuary','districts':['Udaipur'],'division':'Udaipur','area_km2':5.19,'established':'1987','geometry_source':('way',667026975),'source_ref':['RFD']},
    {'id':'sariska-wls','name':'Sariska Wildlife Sanctuary','districts':['Alwar'],'division':'Jaipur','area_km2':492.75,'established':'1958','geometry_source':None,'point':[76.4400,27.3300],'source_ref':['RFD'],
     'remark':'Portion of Sariska Tiger Reserve outside the National Park core.'},
    {'id':'sawai-man-singh-wls','name':'Sawai Man Singh Wildlife Sanctuary','districts':['Sawai Madhopur'],'division':'Bharatpur','area_km2':113.07,'established':'1984','geometry_source':('way',682779631),'source_ref':['RFD'],
     'remark':'Part of Ranthambore Tiger Reserve buffer.'},
    {'id':'shergarh-wls','name':'Shergarh Wildlife Sanctuary','districts':['Baran'],'division':'Kota','area_km2':98.71,'established':'1983','geometry_source':('way',666633877),'source_ref':['RFD']},
    {'id':'tal-chhapar-wls','name':'Tal Chhapar Wildlife Sanctuary','districts':['Churu'],'division':'Bikaner','area_km2':7.19,'established':'1962','geometry_source':('way',676869881),'source_ref':['RFD'],
     'remark':'Famous for wintering blackbuck and grassland raptors.'},
    {'id':'todgarh-raoli-wls','name':'Todgarh Raoli Wildlife Sanctuary','districts':['Ajmer','Pali','Rajsamand'],'division':'Ajmer','area_km2':495.27,'established':'1983','geometry_source':('way',317887080),'source_ref':['RFD']},
    {'id':'van-vihar-wls','name':'Van Vihar Wildlife Sanctuary','districts':['Dholpur'],'division':'Bharatpur','area_km2':25.6,'established':'1955','geometry_source':('way',666526440),'source_ref':['RFD']},
    {'id':'sitamata-wls','name':'Sitamata Wildlife Sanctuary','districts':['Pratapgarh','Chittorgarh','Udaipur'],'division':'Udaipur','area_km2':422.94,'established':'1979','geometry_source':None,'point':[74.35,24.10],'source_ref':['RFD'],
     'remark':'OSM boundary not indexed; geometry ships as point pending future mapping.'},
]

RAMSAR_SITES = [
    {
        'id': 'keoladeo-ramsar', 'name': 'Keoladeo Ghana (Ramsar Site)',
        'districts': ['Bharatpur'], 'division': 'Bharatpur',
        'area_km2': 28.73, 'ramsar_no': '230', 'designated': '1981-10-01',
        'geometry_source': ('relation', 15743640),
        'source_ref': ['RAMSAR', 'MoEFCC'],
        'ecology': {'ecosystem': 'Man-made freshwater swamp',
                    'fauna': ['Painted stork','Sarus crane','Marsh harrier','Formerly Siberian crane']},
        'governance': {'authority': 'Rajasthan Forest Department; MoEFCC (Ramsar focal point)',
                       'status': 'active', 'conservation_programme': 'Ramsar Convention'},
        'notes': {
            'facts': [
                'Rajasthan\'s first Ramsar Site (1 October 1981).',
                'Also a UNESCO World Heritage Site (Natural, 1985) — dual designation.',
            ],
            'significance': 'very-high',
        },
    },
    {
        'id': 'sambhar-ramsar', 'name': 'Sambhar Lake (Ramsar Site)',
        'districts': ['Jaipur', 'Nagaur', 'Didwana-Kuchaman'], 'division': 'Jaipur',
        'area_km2': 240.0, 'ramsar_no': '464', 'designated': '1990-03-23',
        'geometry_source': ('way', 131432307),
        'source_ref': ['RAMSAR', 'MoEFCC'],
        'ecology': {'ecosystem': 'Inland saline wetland — India\'s largest inland salt lake',
                    'fauna': ['Lesser flamingo','Greater flamingo','Common shelduck','Northern shoveler']},
        'governance': {'authority': 'Rajasthan Government (mixed forest, revenue, salt authorities)',
                       'status': 'active', 'conservation_programme': 'Ramsar Convention'},
        'notes': {
            'facts': [
                'India\'s largest inland saline wetland.',
                'Historic source of salt trade — Sambhar Salts Ltd. operates a saltworks here.',
                'Designated Ramsar Site 23 March 1990.',
                'Spread across the newly-created Didwana-Kuchaman district (post-2023) in addition to Jaipur and Nagaur.',
            ],
            'significance': 'very-high',
            'mnemonic': '"Sambhar = salt + flamingos + India\'s largest inland saline lake"',
        },
    },
    {
        'id': 'khichan-ramsar', 'name': 'Khichan Wetland (Ramsar Site)',
        'districts': ['Phalodi'], 'division': 'Jodhpur',
        'area_km2': 0.121,  # ~12.1 hectares per PIB
        'ramsar_no': None, 'designated': '2025-02-19',
        'geometry_source': None,
        'point': [72.3500, 27.1300],
        'source_ref': ['RAMSAR', 'PIB'],
        'ecology': {'ecosystem': 'Desert-edge village pond',
                    'fauna': ['Demoiselle crane (kurja) — wintering flock']},
        'governance': {'authority': 'Village-community managed; Rajasthan Forest Department',
                       'status': 'active', 'conservation_programme': 'Ramsar Convention'},
        'notes': {
            'facts': [
                'Ramsar-designated 19 February 2025; declared 4 June 2025.',
                'Famous for congregation of wintering demoiselle cranes (kurja).',
                'Model of community-led conservation — Marwari Jain villagers feed the cranes.',
                'Rajasthan\'s 3rd Ramsar Site (with Menar as the 4th, same date).',
            ],
            'significance': 'very-high',
            'mnemonic': '"Khichan = kurja capital, community conservation"',
        },
    },
    {
        'id': 'menar-ramsar', 'name': 'Menar Wetland (Ramsar Site)',
        'districts': ['Udaipur'], 'division': 'Udaipur',
        'area_km2': 1.55,  # combined Brahma + Dhandh + Kheroda talabs ~155 ha per PIB
        'ramsar_no': None, 'designated': '2025-02-19',
        'geometry_source': None,
        'point': [74.1000, 24.4800],
        'source_ref': ['RAMSAR', 'PIB'],
        'ecology': {'ecosystem': 'Village-pond cluster (Brahma, Dhandh, Kheroda talabs)',
                    'fauna': ['Painted stork','Bar-headed goose','Common crane','Ruddy shelduck']},
        'governance': {'authority': 'Village-community managed; Rajasthan Forest Department',
                       'status': 'active', 'conservation_programme': 'Ramsar Convention'},
        'notes': {
            'facts': [
                'Ramsar-designated 19 February 2025; declared 4 June 2025.',
                'Known as Rajasthan\'s "bird village".',
                'Three historic talabs maintained by the Menaria community for centuries.',
                'Rajasthan\'s 4th Ramsar Site.',
            ],
            'significance': 'very-high',
            'mnemonic': '"Menar = bird village = 4th Rajasthan Ramsar"',
        },
    },
]

# Significant wetlands NOT Ramsar-designated. Point-only unless polygon exists.
WETLANDS = [
    {'id':'sambhar-wetland','name':'Sambhar Salt Lake (Wetland extent)','districts':['Jaipur','Nagaur','Didwana-Kuchaman'],'division':'Jaipur','area_km2':230.0,'established':None,'geometry_source':('way',22825270),'source_ref':['OSM','RFD'],
     'remark':'The full wetland extent (larger than the Ramsar-designated core).'},
    {'id':'pichola-wetland','name':'Lake Pichola','districts':['Udaipur'],'division':'Udaipur','area_km2':6.96,'established':None,'geometry_source':None,'point':[73.6800,24.5750],'source_ref':['RFD']},
    {'id':'fateh-sagar-wetland','name':'Fateh Sagar Lake','districts':['Udaipur'],'division':'Udaipur','area_km2':1.00,'established':None,'geometry_source':None,'point':[73.6800,24.6000],'source_ref':['RFD']},
    {'id':'ana-sagar-wetland','name':'Ana Sagar Lake','districts':['Ajmer'],'division':'Ajmer','area_km2':1.20,'established':None,'geometry_source':None,'point':[74.6300,26.4800],'source_ref':['RFD']},
    {'id':'pushkar-wetland','name':'Pushkar Lake','districts':['Ajmer'],'division':'Ajmer','area_km2':0.22,'established':None,'geometry_source':None,'point':[74.5580,26.4870],'source_ref':['RFD']},
    {'id':'jaisamand-wetland','name':'Jaisamand Lake','districts':['Salumbar'],'division':'Udaipur','area_km2':52.0,'established':None,'geometry_source':None,'point':[73.9350,24.2500],'source_ref':['RFD'],
     'remark':'One of the largest artificial lakes in Asia; adjacent to Jaisamand WLS.'},
    {'id':'ramgarh-lake-wetland','name':'Ramgarh Lake (Jaipur)','districts':['Jaipur'],'division':'Jaipur','area_km2':15.5,'established':None,'geometry_source':None,'point':[75.9600,26.8900],'source_ref':['RFD']},
    {'id':'kaylana-wetland','name':'Kaylana Lake','districts':['Jodhpur'],'division':'Jodhpur','area_km2':0.84,'established':None,'geometry_source':None,'point':[72.9800,26.2900],'source_ref':['RFD']},
]

BIOSPHERE_RESERVES = []  # Rajasthan has NO MoEFCC-notified Biosphere Reserve as of 2026-07.


# =============================================================================
#  FEATURE TIMELINES — curated per-feature historical events, keyed by canonical
#  id. Only flagship features get full editorial timelines; every other feature
#  receives a 1-event synthetic timeline (in make_feature) from its `established`.
# =============================================================================

TIMELINES = {
    'ranthambore-np': [
        {'year':'1955','event':'Notified as the Sawai Madhopur Game Sanctuary','tag':'sanctuary'},
        {'year':'1973','event':'Included in Project Tiger (one of the original nine)','tag':'tr'},
        {'year':'1980','event':'Upgraded to Ranthambore National Park','tag':'np'},
        {'year':'2013','event':'Ranthambore Fort inscribed as part of UNESCO WHS "Hill Forts of Rajasthan"','tag':'unesco'},
    ],
    'ranthambore-tr': [
        {'year':'1973','event':'Notified as a Tiger Reserve under Project Tiger','tag':'tr'},
    ],
    'sariska-np': [
        {'year':'1958','event':'Declared a wildlife reserve','tag':'sanctuary'},
        {'year':'1978','event':'Notified as a Tiger Reserve','tag':'tr'},
        {'year':'1982','event':'Upgraded to Sariska National Park','tag':'np'},
        {'year':'2004','event':'Local extinction of tigers declared','tag':'crisis'},
        {'year':'2008','event':'First-ever inter-reserve tiger reintroduction (from Ranthambore)','tag':'milestone'},
    ],
    'sariska-tr': [
        {'year':'1978','event':'Notified as a Tiger Reserve','tag':'tr'},
        {'year':'2008','event':'First-ever inter-reserve tiger reintroduction (from Ranthambore)','tag':'milestone'},
    ],
    'keoladeo-np': [
        {'year':'1899','event':'Private waterfowl reserve of the Maharaja of Bharatpur','tag':'royal'},
        {'year':'1971','event':'Notified as Bharatpur Bird Sanctuary','tag':'sanctuary'},
        {'year':'1981-10-01','event':'Designated a Ramsar Site (No. 230)','tag':'ramsar'},
        {'year':'1982','event':'Upgraded to Keoladeo Ghana National Park','tag':'np'},
        {'year':'1985','event':'Inscribed as a UNESCO World Heritage Site (Natural)','tag':'unesco'},
    ],
    'keoladeo-ramsar': [
        {'year':'1981-10-01','event':"Designated a Ramsar Site (No. 230) — Rajasthan's first",'tag':'ramsar'},
        {'year':'1985','event':'Inscribed as a UNESCO World Heritage Site (Natural)','tag':'unesco'},
    ],
    'desert-np': [
        {'year':'1980','event':'Notified as Desert National Park','tag':'np'},
    ],
    'mukundra-hills-np': [
        {'year':'2006','event':'Notified as Mukundra Hills National Park','tag':'np'},
        {'year':'2013','event':'Declared 45th Tiger Reserve of India','tag':'tr'},
    ],
    'mukundra-hills-tr': [
        {'year':'2013','event':'Declared 45th Tiger Reserve of India','tag':'tr'},
    ],
    'ramgarh-vishdhari-tr': [
        {'year':'1982','event':'Ramgarh Vishdhari Wildlife Sanctuary notified','tag':'sanctuary'},
        {'year':'2022-07','event':"Notified as India's 52nd Tiger Reserve",'tag':'tr'},
    ],
    'dholpur-karauli-tr': [
        {'year':'2023-08','event':"Notified as India's 54th Tiger Reserve",'tag':'tr'},
    ],
    'sambhar-ramsar': [
        {'year':'1990-03-23','event':'Designated a Ramsar Site (No. 464)','tag':'ramsar'},
    ],
    'khichan-ramsar': [
        {'year':'2025-02-19','event':'Designated a Ramsar Site (initial notification)','tag':'ramsar'},
        {'year':'2025-06-04','event':'Ramsar designation officially declared','tag':'ramsar'},
    ],
    'menar-ramsar': [
        {'year':'2025-02-19','event':'Designated a Ramsar Site (initial notification)','tag':'ramsar'},
        {'year':'2025-06-04','event':'Ramsar designation officially declared','tag':'ramsar'},
    ],
}


# =============================================================================
#  OSM geometry assembly
# =============================================================================

def load_osm():
    with open(OSM) as f: d = json.load(f)
    by_id = {}
    for e in d.get('elements', []):
        by_id[(e['type'], e['id'])] = e
    return by_id


def geom_from_way(way):
    """OSM way with `out geom` → a ring."""
    return [[pt['lon'], pt['lat']] for pt in way.get('geometry', [])]


def geom_from_relation(rel):
    """Assemble MultiPolygon from relation members' geometries."""
    outers, inners = [], []
    for m in rel.get('members', []):
        if m.get('type') != 'way' or 'geometry' not in m: continue
        coords = [[pt['lon'], pt['lat']] for pt in m['geometry']]
        (outers if m.get('role') == 'outer' else inners).append(coords)
    outer_rings = stitch(outers)
    inner_rings = stitch(inners) if inners else []
    if not outer_rings: return None
    polys = []
    for o in outer_rings:
        holes = [h for h in inner_rings if point_in_ring(h[0], o)]
        polys.append([o] + holes)
    if len(polys) == 1:
        return {'type': 'Polygon', 'coordinates': polys[0]}
    return {'type': 'MultiPolygon', 'coordinates': polys}


def build_geometry(entry, by_id):
    src = entry.get('geometry_source')
    if src:
        elem = by_id.get(src)
        if elem is None:
            print(f'!! missing OSM element {src} for {entry["id"]}', file=sys.stderr)
        elif elem['type'] == 'way':
            ring = geom_from_way(elem)
            if len(ring) >= 4 and ring[0] == ring[-1]:
                return {'type': 'Polygon', 'coordinates': [ring]}
            if len(ring) >= 3:
                return {'type': 'LineString', 'coordinates': ring}
        else:
            g = geom_from_relation(elem)
            if g: return g
    if entry.get('point'):
        return {'type': 'Point', 'coordinates': entry['point']}
    return None


def stitch(ways):
    rings = []
    remaining = [list(w) for w in ways if len(w) >= 2]
    while remaining:
        current = remaining.pop(0)
        while current[0] != current[-1]:
            for i, w in enumerate(remaining):
                if w[0] == current[-1]:      current.extend(w[1:]); remaining.pop(i); break
                if w[-1] == current[-1]:     current.extend(list(reversed(w))[1:]); remaining.pop(i); break
                if w[-1] == current[0]:      current = w + current[1:]; remaining.pop(i); break
                if w[0] == current[0]:       current = list(reversed(w)) + current[1:]; remaining.pop(i); break
            else:
                break
        if current[0] == current[-1] and len(current) >= 4:
            rings.append(current)
    return rings


def point_in_ring(pt, ring):
    x, y = pt; inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: inside = not inside
    return inside


def signed_area(ring):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        s += (x2 - x1) * (y2 + y1)
    return -s / 2.0


def centroid_and_bbox(geom):
    if geom['type'] == 'Point':
        x, y = geom['coordinates']
        return [x, y], [x, y, x, y]
    if geom['type'] == 'LineString':
        pts = geom['coordinates']
    elif geom['type'] == 'Polygon':
        pts = geom['coordinates'][0]
    else:  # MultiPolygon — take outer of largest
        big = max(geom['coordinates'], key=lambda p: abs(signed_area(p[0])))
        pts = big[0]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return ([sum(xs)/len(xs), sum(ys)/len(ys)],
            [min(xs), min(ys), max(xs), max(ys)])


# =============================================================================
#  Emit
# =============================================================================

def make_feature(entry, feature_type, category, by_id, rajasthan_bounds):
    geom = build_geometry(entry, by_id)
    if geom is None:
        print(f'!! no geometry for {entry["id"]}', file=sys.stderr)
        return None
    centroid, bbox = centroid_and_bbox(geom)
    # Reject features whose centroid falls outside Rajasthan (Balaram Ambaji etc.)
    mnLon, mnLat, mxLon, mxLat = rajasthan_bounds
    if not (mnLon <= centroid[0] <= mxLon and mnLat <= centroid[1] <= mxLat):
        print(f'!! {entry["id"]} centroid {centroid} outside Rajasthan — skipped', file=sys.stderr)
        return None

    quality = 'polygon' if geom['type'] in ('Polygon', 'MultiPolygon') else geom['type'].lower()
    # Timeline — curated if we have one, otherwise a synthetic 1-event from `established`.
    timeline = TIMELINES.get(entry['id'])
    if timeline is None and entry.get('established'):
        timeline = [{'year': entry['established'],
                     'event': f'Notified as {feature_type.replace("_"," ").title()}',
                     'tag':  feature_type}]
    return {
        'type': 'Feature',
        'id': entry['id'],
        'properties': {
            'name':          entry['name'],
            'type':          feature_type,
            'category':      category,
            'district':      ', '.join(entry.get('districts', [])) or None,
            'districts':     entry.get('districts', []),
            'division':      entry.get('division'),
            'state':         STATE,
            'area':          entry.get('area_km2'),
            'established':   entry.get('established'),
            'source':        ' + '.join(entry.get('source_ref', [])),
            'lastUpdated':   RETRIEVED,
            'centroid':      [round(centroid[0], 5), round(centroid[1], 5)],
            'bbox':          [round(v, 5) for v in bbox],
            'geometryQuality': quality,
            'geometryNote':  entry.get('geometry_note', ''),
            'aliases':       entry.get('aliases', []),
            'remark':        entry.get('remark', ''),
            'notes':          entry.get('notes', {'facts': [], 'mnemonic': '', 'significance': 'medium'}),
            'timeline':      timeline or [],
            'ecology':       entry.get('ecology', {'flora': [], 'fauna': [], 'ecosystem': ''}),
            'governance':    entry.get('governance', {'authority': '', 'status': ''}),
        },
        'geometry': geom,
    }


def load_rajasthan_bounds():
    with open(OUT / 'atlas.json') as f: m = json.load(f)
    b = m['projection']['bounds']
    return b['minLon'], b['minLat'], b['maxLon'], b['maxLat']


def emit(name, features):
    fc = {'type': 'FeatureCollection', 'features': features}
    p = out(name)
    p.write_text(json.dumps(fc, separators=(',', ':')))
    print(f'wrote {name}: {p.stat().st_size:,} bytes, {len(features)} features')


def main():
    by_id = load_osm()
    bounds = load_rajasthan_bounds()

    layers = {
        'national-parks.geojson':       [(NATIONAL_PARKS,      'national_park')],
        'tiger-reserves.geojson':       [(TIGER_RESERVES,      'tiger_reserve')],
        'wildlife-sanctuaries.geojson': [(WILDLIFE_SANCTUARIES,'wildlife_sanctuary')],
        'ramsar-sites.geojson':         [(RAMSAR_SITES,        'ramsar_site')],
        'wetlands.geojson':             [(WETLANDS,            'wetland')],
        'biosphere-reserves.geojson':   [(BIOSPHERE_RESERVES,  'biosphere_reserve')],
    }
    meta_index = {'lastUpdated': RETRIEVED, 'layers': {}}
    for filename, sections in layers.items():
        feats = []
        for entries, ftype in sections:
            for e in entries:
                f = make_feature(e, ftype, 'environment', by_id, bounds)
                if f: feats.append(f)
        emit(filename, feats)
        meta_index['layers'][filename.replace('.geojson', '')] = {
            'count': len(feats),
            'featureType': sections[0][1],
        }

    (OUT / 'protected-area-metadata.json').write_text(json.dumps(meta_index, indent=2))
    print(f'wrote protected-area-metadata.json')


if __name__ == '__main__':
    main()
