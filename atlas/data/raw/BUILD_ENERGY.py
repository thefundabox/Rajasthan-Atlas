"""
BUILD_ENERGY.py — Module 8: Energy · Power Generation · Renewables · Grid.

Outputs (into atlas/data/):
    energy-mix.geojson              — 5 regional energy zones (polygon,
                                      district-approximated)
    renewable-zones.geojson         — 3 MNRE renewable-energy zones
                                      (polygon, district-approximated)
    transmission-corridors.geojson  — 2 HVDC / GEC corridor segments
                                      (polygon, district-approximated)
    power-plants.geojson            — 10 flagship generating stations
                                      (thermal + nuclear + hydel + gas, points)
    solar-parks.geojson             — 6 flagship solar parks (points)
    wind-farms.geojson              — 4 wind-farm cluster centroids (points)

    knowledge-graph-energy.json     — new typed edges (merged into main graph)

DESIGN CONTRACT
================
* Rajasthan is India's #1 solar-power state (~20 GW installed, >30 % of the
  national total) and a top-3 wind state (~5 GW). The atlas has to tell the
  renewable-first story clearly.
* Every polygon feature is district-approximated (`geometryQuality:
  "generalised (district-approximated)"`).
* Every point feature ships with `geometryQuality: "point"` and a coordinate
  from the operator's disclosures / CEA plant register.
* KG expansion links:
    hydel plants → their dam features (RPS HEP → Rana Pratap Sagar Dam)
    thermal plants → their fuel mineral belt (Giral/Barmer TPS → lignite)
    Rawatbhata → Chambal river + Rana Pratap Sagar reservoir
    solar parks → arid climate + Thar desert
    wind farms → arid climate + Thar desert
    Kota Super Thermal → Chambal Fertilisers + industrial clusters

SOURCES:
    CEA   — Central Electricity Authority (monthly generation report)
    MNRE  — Ministry of New & Renewable Energy
    NPCIL — Nuclear Power Corporation of India Ltd. (Rawatbhata)
    SECI  — Solar Energy Corporation of India (solar park allocations)
    RVUNL — Rajasthan Rajya Vidyut Utpadan Nigam Ltd. (state gencos)
    RVPNL — Rajasthan Vidyut Prasaran Nigam Ltd. (transmission)
    RREC  — Rajasthan Renewable Energy Corporation
    NTPC / Adani Power / Vedanta / Suzlon — plant / park owners
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
#  DISTRICT LOAD (shared helpers, mirrors BUILD_INDUSTRY.py)
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
#  ENERGY MIX ZONES — regional generation-source dominance
# ============================================================================

ENERGY_MIX_ZONES = {
    'em-solar-west': {
        'label':      'Western Solar Dominance Zone',
        'dominant':   'Solar PV (utility scale)',
        'headline':   'Bhadla + Fatehgarh + Nokh solar parks — the heart of Rajasthan\'s solar leadership.',
        'installed':  '~15 GW of the state\'s 20 GW solar fleet',
        'facts':      ['Thar-desert insolation of >2000 kWh/m²/year — among the highest in India.',
                       'Bhadla Solar Park at 2245 MW is the largest single-site solar park '
                       'in the world.',
                       'Land-availability + insolation + low humidity make the western belt '
                       'the country\'s renewable heartland.'],
        'districts':  ['Jaisalmer','Barmer','Balotra','Jodhpur','Phalodi','Bikaner'],
    },
    'em-nuclear-thermal-hadoti': {
        'label':      'Hadoti Base-Load Zone',
        'dominant':   'Nuclear + coal-thermal',
        'headline':   'Rawatbhata (RAPS 1-6) + Kota Super Thermal + Chhabra + Kalisindh — the '
                      'state\'s base-load fleet.',
        'installed':  '~6.5 GW aggregate',
        'facts':      ['Anchored on Chambal river water and the Chhabra-Kalisindh coal cluster.',
                       'RAPS 1-6 (Rajasthan Atomic Power Station) at 1180 MW is one of India\'s '
                       'oldest nuclear complexes, and its largest PHWR '
                       '(pressurised heavy water reactor) site by unit count.',
                       'RAPS 7-8 (700 MW × 2 PHWRs) are under construction, taking Rawatbhata '
                       'past 2.5 GW nuclear capacity.'],
        'districts':  ['Chittorgarh','Kota','Baran','Bundi','Jhalawar'],
    },
    'em-wind-hybrid': {
        'label':      'Jaisalmer-Barmer Wind + Solar Hybrid Zone',
        'dominant':   'Wind + solar hybrid',
        'headline':   'India\'s densest wind belt — >5 GW installed, now paired with co-located solar.',
        'installed':  '~5 GW wind + ~4 GW co-located solar',
        'facts':      ['Wind resource classified as "excellent" (>200 W/m² at 80 m hub height).',
                       'Suzlon, Vestas, Adani, ReNew, Vedanta — every major renewables developer '
                       'operates here.',
                       'Wind + solar hybrid park policy (MNRE 2018) has pushed co-located capacity '
                       'to industry-defining scale in Jaisalmer.'],
        'districts':  ['Jaisalmer','Barmer','Balotra','Jodhpur','Pali'],
    },
    'em-gas-mixed-north': {
        'label':      'Northern Gas + Solar Zone',
        'dominant':   'Gas-thermal + rooftop solar',
        'headline':   'Anta and Ramgarh gas-turbine stations + IGNP-command solar rooftop '
                      'in the north-canal belt.',
        'installed':  '~1 GW gas + growing distributed solar',
        'facts':      ['Ramgarh Gas TPS (Jaisalmer) uses Cairn\'s Raageshwari and Barmer basin gas.',
                       'IGNP command farmers have adopted solar-pump replacement under KUSUM.'],
        'districts':  ['Jaisalmer','Sri Ganganagar','Hanumangarh','Bikaner'],
    },
    'em-hydel-dam-south': {
        'label':      'Southern Hydel Zone',
        'dominant':   'Hydroelectric',
        'headline':   'Mahi Bajaj Sagar + Rana Pratap Sagar + Jawahar Sagar — the state\'s hydel fleet.',
        'installed':  '~600 MW hydel',
        'facts':      ['Every major dam commissioned across the Chambal cascade includes a '
                       'hydro-electric station.',
                       'Mahi Bajaj Sagar HEP (140 MW) serves the tribal-belt districts of the south.',
                       'Small-hydro pockets on the Bassi and Meja dams supplement the mix.'],
        'districts':  ['Chittorgarh','Kota','Bundi','Baran','Banswara','Dungarpur','Pratapgarh','Bhilwara'],
    },
}

# ============================================================================
#  RENEWABLE-ENERGY ZONES — MNRE / RREC classification
# ============================================================================

RENEWABLE_ZONES = {
    'rez-solar-a': {
        'label':      'Solar Radiation Zone A (Very high insolation)',
        'resource':   'GHI > 2000 kWh/m²/year',
        'classification':'MNRE Zone A (highest of five insolation classes)',
        'facts':      ['Highest solar irradiance in India — direct normal irradiance '
                       'commonly exceeds 6.0 kWh/m²/day.',
                       'Bhadla, Nokh, Fatehgarh, Pokhran solar parks all sit within this zone.',
                       'Ambient temperature and dust are the two engineering challenges '
                       'at this insolation.'],
        'districts':  ['Jaisalmer','Barmer','Balotra','Bikaner','Jodhpur','Phalodi','Churu'],
    },
    'rez-wind-belt': {
        'label':      'Wind Resource Belt',
        'resource':   'Class 5-6 wind (mean speed 6-8 m/s at 80 m hub)',
        'classification':'MNRE wind atlas — India\'s densest onshore wind belt after '
                         'Tamil Nadu\'s Muppandal ridge',
        'facts':      ['Jaisalmer-Barmer wind corridor is one of India\'s three top wind zones.',
                       'Suzlon\'s Jaisalmer wind farm (~1000 MW installed across sub-clusters) '
                       'is one of the largest onshore wind sites in the country.',
                       'The wind + solar hybrid park policy (MNRE 2018) is native to this zone.'],
        'districts':  ['Jaisalmer','Barmer','Balotra','Jodhpur','Pali'],
    },
    'rez-hybrid': {
        'label':      'Wind-Solar Hybrid Zone',
        'resource':   'Class-A insolation + Class 5+ wind (co-located)',
        'classification':'MNRE hybrid-park policy region (post-2018)',
        'facts':      ['Land, evacuation and transmission are shared across wind + solar.',
                       'Adani, ReNew and Vedanta operate flagship hybrid parks here.',
                       'Capacity utilisation factor of hybrid parks is 40–50 %, versus '
                       '~20 % for standalone solar and ~30 % for standalone wind.'],
        'districts':  ['Jaisalmer','Barmer','Jodhpur','Phalodi'],
    },
}

# ============================================================================
#  TRANSMISSION CORRIDORS — HVDC + Green Energy Corridor
# ============================================================================

TRANSMISSION_CORRIDORS = {
    'tc-green-energy-corridor': {
        'label':      'Green Energy Corridor — Rajasthan segment',
        'corridor_type':'765 kV / 400 kV inter-state transmission (RVPNL + PGCIL)',
        'purpose':    'Evacuate renewable power from Bhadla + Fatehgarh + Jaisalmer to the '
                      'northern grid (Delhi–NCR + Punjab + Haryana)',
        'commissioned':'Phase-I 2019; Phase-II under construction',
        'facts':      ['One of India\'s two Green Energy Corridors (the other in Andhra Pradesh).',
                       'Enables ~20 GW of renewables in western Rajasthan to reach the load '
                       'centres in the north and west.',
                       'Ajmer–Fatehpur–Bhinmal (400 kV) plus Bikaner–Sikar (765 kV) are the '
                       'principal spines.'],
        'districts':  ['Jaisalmer','Barmer','Jodhpur','Bikaner','Sikar','Jhunjhunu','Ajmer','Beawar'],
    },
    'tc-hvdc-bhadla-north': {
        'label':      'Bhadla–Sikar–Fatehpur HVDC / 765 kV Line',
        'corridor_type':'765 kV UHV AC transmission (PGCIL)',
        'purpose':    'Bulk power evacuation from Bhadla Solar Park cluster to Fatehpur (UP)',
        'commissioned':'2019',
        'facts':      ['Backbone of Bhadla evacuation — pushes 2245 MW of park capacity '
                       'to the interstate grid.',
                       'Ties into the northern-grid super-highway at Fatehpur (Uttar Pradesh) '
                       'via the PGCIL corridor.'],
        'districts':  ['Jodhpur','Phalodi','Nagaur','Didwana-Kuchaman','Sikar','Jhunjhunu'],
    },
}

# ============================================================================
#  POWER PLANTS — thermal + nuclear + hydel + gas (points)
#  Coordinates from CEA plant register + operator disclosures.
# ============================================================================

POWER_PLANTS = [
    {'id':'raps-rawatbhata',
     'name':'Rajasthan Atomic Power Station (RAPS 1-6) — Rawatbhata',
     'lonlat':[75.6150, 24.8670], 'district':'Chittorgarh','fuel':'Nuclear (PHWR)',
     'capacity_mw': 1180, 'owner':'NPCIL',
     'output':'RAPS-1 (100 MW retired), RAPS-2 (200 MW), RAPS 3-6 (220 MW × 4 PHWR)',
     'commissioned':'RAPS-1 (1973), 2 (1981), 3-4 (2000), 5-6 (2010)',
     'source':'NPCIL Rawatbhata disclosures + CEA',
     'facts':['One of India\'s oldest nuclear power stations — RAPS-1 was India\'s '
              'second-ever nuclear reactor after Tarapur.',
              'Uses the Rana Pratap Sagar reservoir for cooling water.',
              'RAPS 7-8 (700 MW × 2 indigenous PHWRs) under construction, taking '
              'Rawatbhata past 2.5 GW nuclear.']},
    {'id':'suratgarh-stps',
     'name':'Suratgarh Super Thermal Power Station (STPS)',
     'lonlat':[73.8950, 29.3250], 'district':'Sri Ganganagar','fuel':'Coal (super-critical)',
     'capacity_mw': 2820, 'owner':'RVUNL',
     'output':'6 × 250 MW (sub-critical) + 1 × 660 MW (super-critical) + 1 × 660 MW (unit 8)',
     'commissioned':'1998 (Stage-I), 2019 (super-critical Unit 7)',
     'source':'RVUNL disclosures + CEA',
     'facts':['Rajasthan\'s largest state-owned thermal power station.',
              'One of India\'s first "desert" super-thermal stations — sited far from '
              'coal fields (imported coal + linkage from eastern collieries).']},
    {'id':'chhabra-tps',
     'name':'Chhabra Thermal Power Station',
     'lonlat':[76.7250, 24.6650], 'district':'Baran','fuel':'Coal (super-critical)',
     'capacity_mw': 2320, 'owner':'RVUNL',
     'output':'2 × 250 MW (sub-critical) + 2 × 660 MW (super-critical) + 1 × 500 MW (Adani)',
     'commissioned':'2010 (Stage-I); 2020 (super-critical Stage-III)',
     'source':'RVUNL + CEA',
     'facts':['Rajasthan\'s second-largest thermal station.',
              'Super-critical technology brings station heat-rate below 2400 kcal/kWh.']},
    {'id':'kalisindh-tps',
     'name':'Kalisindh Thermal Power Station',
     'lonlat':[76.3560, 24.5960], 'district':'Jhalawar','fuel':'Coal (super-critical)',
     'capacity_mw': 1200, 'owner':'RVUNL',
     'output':'2 × 600 MW super-critical units',
     'commissioned':'2014-2016',
     'source':'RVUNL + CEA',
     'facts':['Named for the Kalisindh river which supplies cooling water.',
              'Among the newest super-critical thermal fleet in the state.']},
    {'id':'kota-super-tps',
     'name':'Kota Super Thermal Power Station',
     'lonlat':[75.8440, 25.1830], 'district':'Kota','fuel':'Coal',
     'capacity_mw': 1240, 'owner':'RVUNL',
     'output':'2 × 110 MW + 2 × 210 MW + 2 × 195 MW + 1 × 250 MW',
     'commissioned':'1983 (first unit)',
     'source':'RVUNL + CEA',
     'facts':['Rajasthan\'s oldest large coal-thermal station — supplied the industrial '
              'growth of the Kota belt.',
              'Draws cooling water from the Chambal at Kota Barrage.']},
    {'id':'barmer-lignite-tps',
     'name':'Barmer Lignite TPS (Bhadresh)',
     'lonlat':[71.3900, 25.7000], 'district':'Barmer','fuel':'Lignite',
     'capacity_mw': 1080, 'owner':'Raj West Power Ltd (JSW)',
     'output':'8 × 135 MW CFBC (circulating fluidised bed) units',
     'commissioned':'2013',
     'source':'RVUNL PPA + JSW disclosures + CEA',
     'facts':['Uses the Kapurdi-Jalipa lignite mines directly — mine-mouth station.',
              'The largest lignite-fired power station in India.',
              'Circulating fluidised-bed combustion technology is well-suited to '
              'high-ash lignite.']},
    {'id':'giral-lignite-tps',
     'name':'Giral Lignite TPS (RVUNL, largely non-operational)',
     'lonlat':[71.1900, 25.8500], 'district':'Barmer','fuel':'Lignite',
     'capacity_mw': 250, 'owner':'RVUNL',
     'output':'2 × 125 MW CFBC (largely idle since 2018 owing to technical issues)',
     'commissioned':'2007',
     'source':'RVUNL + CEA',
     'facts':['Rajasthan\'s first lignite-fired station; predecessor to Barmer Bhadresh.',
              'Has faced persistent operational challenges — mostly non-operational since 2018.']},
    {'id':'anta-gas-ntpc',
     'name':'Anta Gas Power Station (NTPC)',
     'lonlat':[76.2450, 25.1560], 'district':'Baran','fuel':'Natural gas + naphtha',
     'capacity_mw': 419, 'owner':'NTPC',
     'output':'3 × 88 MW gas turbines + 1 × 155 MW steam turbine (CCGT)',
     'commissioned':'1989',
     'source':'NTPC disclosures + CEA',
     'facts':['NTPC\'s first combined-cycle gas turbine plant in India.',
              'Runs on HBJ pipeline gas + Cairn Rajasthan basin gas.']},
    {'id':'ramgarh-gas-tps',
     'name':'Ramgarh Gas TPS (Jaisalmer)',
     'lonlat':[71.3750, 27.3600], 'district':'Jaisalmer','fuel':'Natural gas',
     'capacity_mw': 270, 'owner':'RVUNL',
     'output':'3 × 37.5 MW + 1 × 37.5 MW + 1 × 160 MW CCGT',
     'commissioned':'2001',
     'source':'RVUNL + CEA',
     'facts':['Fed by Cairn\'s Raageshwari gas field — first Barmer-basin gas plant.',
              'Ramgarh is a mine-mouth analogue for Cairn\'s gas fields.']},
    {'id':'dholpur-ccgt',
     'name':'Dholpur Combined Cycle Gas Turbine (CCGT)',
     'lonlat':[77.9000, 26.7000], 'district':'Dholpur','fuel':'Natural gas',
     'capacity_mw': 330, 'owner':'RVUNL',
     'output':'2 × 110 MW gas turbines + 1 × 110 MW steam turbine',
     'commissioned':'2007',
     'source':'RVUNL + CEA',
     'facts':['Runs on HBJ pipeline gas.',
              'Provides load-following capability to the north-eastern grid.']},
    {'id':'rana-pratap-sagar-hep',
     'name':'Rana Pratap Sagar Hydroelectric Station',
     'lonlat':[75.5765, 24.9152], 'district':'Chittorgarh','fuel':'Hydel',
     'capacity_mw': 172, 'owner':'RVUNL',
     'output':'4 × 43 MW Francis turbines',
     'commissioned':'1970',
     'source':'RVUNL + CWC',
     'facts':['Co-located with the Rana Pratap Sagar Dam on the Chambal.',
              'Second dam in the Chambal cascade (below Gandhi Sagar in MP).']},
    {'id':'jawahar-sagar-hep',
     'name':'Jawahar Sagar Hydroelectric Station',
     'lonlat':[75.8010, 24.9611], 'district':'Kota','fuel':'Hydel',
     'capacity_mw': 99, 'owner':'RVUNL',
     'output':'3 × 33 MW Kaplan turbines',
     'commissioned':'1972',
     'source':'RVUNL + CWC',
     'facts':['Third dam in the Chambal cascade — feeds Kota Barrage downstream.',
              'Runs the Chambal cascade as a "cascading peaking" system.']},
    {'id':'mahi-bajaj-sagar-hep',
     'name':'Mahi Bajaj Sagar Hydroelectric Station',
     'lonlat':[74.2916, 23.4986], 'district':'Banswara','fuel':'Hydel',
     'capacity_mw': 140, 'owner':'RVUNL',
     'output':'2 × 25 MW + 2 × 45 MW Kaplan units',
     'commissioned':'1985',
     'source':'RVUNL + CWC',
     'facts':['Rajasthan\'s largest hydel station outside the Chambal cascade.',
              'Serves the tribal-belt districts of southern Rajasthan.']},
]

# ============================================================================
#  SOLAR PARKS — flagship utility-scale installations (points)
# ============================================================================

SOLAR_PARKS = [
    {'id':'bhadla-solar-park',
     'name':'Bhadla Solar Park',
     'lonlat':[72.0678, 27.5389], 'district':'Jodhpur',
     'capacity_mw': 2245, 'developer':'RREC + SECI (multiple SPDs)',
     'commissioned':'Phase-I 2018; full 2245 MW by 2020',
     'facts':['At 2245 MW installed on ~14,000 acres, Bhadla is the largest single-site '
              'solar park in the world.',
              'Levelised solar tariff at Bhadla dropped to ₹2.44 / kWh in 2017 — one of '
              'the lowest solar bids ever globally.',
              'A dozen SPDs operate here — including SBG Cleantech, Acme, ReNew, Adani, '
              'Azure and Hero Future Energies.'],
     'source':'SECI + RREC + PIB'},
    {'id':'fatehgarh-solar-park',
     'name':'Fatehgarh Solar Park (Jaisalmer)',
     'lonlat':[71.1900, 27.3100], 'district':'Jaisalmer',
     'capacity_mw': 1500, 'developer':'Adani Green, SECI',
     'commissioned':'2021',
     'facts':['One of Adani Green\'s flagship parks in Rajasthan.',
              'Feeds the Green Energy Corridor for evacuation to northern grid.'],
     'source':'Adani Green disclosures + PIB'},
    {'id':'nokh-solar-park',
     'name':'Nokh Solar Park (Jaisalmer)',
     'lonlat':[71.7150, 27.0400], 'district':'Jaisalmer',
     'capacity_mw': 925, 'developer':'SECI + Adani + ReNew',
     'commissioned':'Under construction (target 2025)',
     'facts':['Notified solar-park cluster of ~925 MW.',
              'One of MNRE\'s "ultra-mega" solar parks.'],
     'source':'MNRE ultra-mega solar-park notification'},
    {'id':'pokhran-solar-park',
     'name':'Pokhran Solar Park (Jaisalmer)',
     'lonlat':[71.9170, 26.9180], 'district':'Jaisalmer',
     'capacity_mw': 750, 'developer':'RREC + private SPDs',
     'commissioned':'2020s',
     'facts':['Extension of Rajasthan\'s solar footprint around the historical '
              'Pokhran nuclear-test site.',
              'Land-use category: waste-land conversion under the Rajasthan Solar Policy.'],
     'source':'RREC + PIB'},
    {'id':'bikaner-solar-park',
     'name':'Bikaner Solar Park (Chhattargarh)',
     'lonlat':[72.5500, 28.7500], 'district':'Bikaner',
     'capacity_mw': 300, 'developer':'RREC + private SPDs',
     'commissioned':'2020',
     'facts':['Anchor solar cluster in the northern Thar (Bikaner).',
              'Notable for co-located solar-water pumping (KUSUM) demonstrations.'],
     'source':'RREC + MNRE'},
    {'id':'phalodi-solar-cluster',
     'name':'Phalodi Solar Cluster',
     'lonlat':[72.3600, 27.1300], 'district':'Phalodi',
     'capacity_mw': 500, 'developer':'ReNew Power + SECI',
     'commissioned':'2019-2022',
     'facts':['Utility-scale solar clusters around the Phalodi district — the ninth '
              'and newest Rajasthan district (2023).',
              'Adjacent to the Fatehgarh and Bhadla evacuation lines.'],
     'source':'ReNew disclosures + SECI'},
]

# ============================================================================
#  WIND FARMS — flagship cluster centroids (points)
# ============================================================================

WIND_FARMS = [
    {'id':'jaisalmer-wind-belt',
     'name':'Jaisalmer Wind Farm (Suzlon flagship cluster)',
     'lonlat':[71.1000, 26.9000], 'district':'Jaisalmer',
     'capacity_mw': 1064, 'developer':'Suzlon Energy',
     'commissioned':'2001-2013 (multi-phase build-out)',
     'facts':['One of India\'s largest onshore wind farms — over 1000 MW across '
              'multiple sub-clusters.',
              'Suzlon\'s original showcase project — established the Jaisalmer belt '
              'as India\'s wind capital after Muppandal (Tamil Nadu).',
              'Wind class 5-6 with ~8 m/s mean wind speed at 80 m hub height.'],
     'source':'Suzlon disclosures + MNRE'},
    {'id':'barmer-wind-zone',
     'name':'Barmer Wind Zone',
     'lonlat':[71.4000, 25.9000], 'district':'Barmer',
     'capacity_mw': 800, 'developer':'Vestas · ReNew · Adani',
     'commissioned':'Multi-phase 2005 onwards',
     'facts':['Wind resource contiguous with Jaisalmer — Barmer\'s belt sits along '
              'the Aravalli-perpendicular Thar winds.',
              'Many farms now co-located with solar under hybrid park policy.'],
     'source':'MNRE state-wise wind capacity + operator disclosures'},
    {'id':'jodhpur-wind-cluster',
     'name':'Jodhpur Wind Cluster (Osian belt)',
     'lonlat':[72.9000, 26.9000], 'district':'Jodhpur',
     'capacity_mw': 500, 'developer':'Enercon (Wobben) · Suzlon',
     'commissioned':'2003 onwards',
     'facts':['Osian (Jodhpur) hosts one of the state\'s earliest Enercon wind clusters.',
              'Wind resource is Class 4-5 (mean 6.5-7.5 m/s at 80 m).'],
     'source':'MNRE + operator disclosures'},
    {'id':'phalodi-wind-cluster',
     'name':'Phalodi Wind Cluster',
     'lonlat':[72.3500, 27.1500], 'district':'Phalodi',
     'capacity_mw': 400, 'developer':'ReNew Power · Adani',
     'commissioned':'2015 onwards',
     'facts':['Newer wind farms clustered around Phalodi and Pokhran — the transition '
              'zone between Jaisalmer and Jodhpur wind belts.'],
     'source':'MNRE + ReNew disclosures'},
]


# ============================================================================
#  Emit helpers (mirror BUILD_INDUSTRY.py)
# ============================================================================

def emit_polygon_layer(zones, layer_id, feature_type, source_ref, category='energy'):
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
                                'Refer to the cited source for the authoritative surveyed line.'),
            'notes':           {'facts': meta.get('facts', []), 'mnemonic': '',
                                'significance': 'high', 'confusedWith': []},
            'ecology':         {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance':      {'authority': 'MNRE / RREC / RVPNL', 'status': 'operational'},
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

def emit_point_layer(items, layer_id, feature_type, source_ref, category='energy'):
    features = []
    for d in items:
        geom = {'type': 'Point', 'coordinates': d['lonlat']}
        cent = d['lonlat']
        bbox = bbox_of(geom['coordinates'])
        facts = d.get('facts', [])
        if not facts:
            fact_line = d.get('fuel') or d.get('developer') or ''
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
            'governance':      {'authority': d.get('owner', 'RVUNL'),
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
#  KNOWLEDGE GRAPH EXPANSION
# ============================================================================

def build_kg_expansion():
    edges = []

    # Energy-mix zones → their signature plants + renewable zones
    edges += [
        {'source': 'energy-mix-em-solar-west', 'related': [
            {'target': 'solar-parks-bhadla-solar-park',      'type': 'signature'},
            {'target': 'solar-parks-fatehgarh-solar-park',   'type': 'signature'},
            {'target': 'solar-parks-nokh-solar-park',        'type': 'signature'},
            {'target': 'renewable-zones-rez-solar-a',        'type': 'defines'},
            {'target': 'climate-regions-arid',               'type': 'colocated'},
        ]},
        {'source': 'energy-mix-em-nuclear-thermal-hadoti', 'related': [
            {'target': 'power-plants-raps-rawatbhata',       'type': 'signature'},
            {'target': 'power-plants-kota-super-tps',        'type': 'signature'},
            {'target': 'power-plants-chhabra-tps',           'type': 'signature'},
            {'target': 'power-plants-kalisindh-tps',         'type': 'signature'},
            {'target': 'chambal-river',                      'type': 'defines'},
        ]},
        {'source': 'energy-mix-em-wind-hybrid', 'related': [
            {'target': 'wind-farms-jaisalmer-wind-belt',     'type': 'signature'},
            {'target': 'wind-farms-barmer-wind-zone',        'type': 'signature'},
            {'target': 'renewable-zones-rez-wind-belt',      'type': 'defines'},
            {'target': 'renewable-zones-rez-hybrid',         'type': 'defines'},
            {'target': 'thar',                               'type': 'colocated'},
        ]},
        {'source': 'energy-mix-em-gas-mixed-north', 'related': [
            {'target': 'power-plants-ramgarh-gas-tps',       'type': 'signature'},
            {'target': 'petroleum-gas-raageshwari-gas',      'type': 'defines'},
        ]},
        {'source': 'energy-mix-em-hydel-dam-south', 'related': [
            {'target': 'power-plants-rana-pratap-sagar-hep', 'type': 'signature'},
            {'target': 'power-plants-jawahar-sagar-hep',     'type': 'signature'},
            {'target': 'power-plants-mahi-bajaj-sagar-hep',  'type': 'signature'},
            {'target': 'chambal-river',                      'type': 'defines'},
            {'target': 'mahi-river',                         'type': 'defines'},
        ]},
    ]

    # Hydel plants → their dam features (Module 5 cross-hop)
    hydel_to_dam = {
        'rana-pratap-sagar-hep': 'dam-rana-pratap-sagar',
        'jawahar-sagar-hep':     'dam-jawahar-sagar',
        'mahi-bajaj-sagar-hep':  'dam-mahi-bajaj-sagar',
    }
    for pid, did in hydel_to_dam.items():
        edges.append({'source': f'power-plants-{pid}', 'related': [
            {'target': did, 'type': 'defines',
             'explanation': 'Hydel station co-located with this dam.'},
        ]})

    # Nuclear → Chambal river + Rana Pratap Sagar reservoir cooling
    edges.append({'source': 'power-plants-raps-rawatbhata', 'related': [
        {'target': 'chambal-river', 'type': 'defines',
         'explanation': 'Cooling water drawn from the Chambal via Rana Pratap Sagar.'},
        {'target': 'dam-rana-pratap-sagar', 'type': 'colocated',
         'explanation': 'Rawatbhata is built adjacent to the Rana Pratap Sagar reservoir.'},
    ]})

    # Thermal plants → their fuel
    thermal_to_fuel = {
        'barmer-lignite-tps':  'mineral-belts-lignite',
        'giral-lignite-tps':   'mineral-belts-lignite',
    }
    for pid, mid in thermal_to_fuel.items():
        edges.append({'source': f'power-plants-{pid}', 'related': [
            {'target': mid, 'type': 'defines',
             'explanation': 'Mine-mouth station burning this belt\'s lignite.'},
        ]})

    # (Kota Super Thermal edges are consolidated below with the industrial-anchor
    # cross-links — a single source group per plant to keep the merge idempotent.)

    # Kalisindh TPS → Kalisindh river
    edges.append({'source': 'power-plants-kalisindh-tps', 'related': [
        {'target': 'kalisindh-river', 'type': 'defines',
         'explanation': 'Cooling water from the Kalisindh river.'},
    ]})

    # Gas plants → Barmer basin / Cairn fields
    edges.append({'source': 'power-plants-ramgarh-gas-tps', 'related': [
        {'target': 'petroleum-gas-raageshwari-gas', 'type': 'defines',
         'explanation': 'Fed by Cairn\'s Raageshwari gas field.'},
    ]})
    edges.append({'source': 'power-plants-anta-gas-ntpc', 'related': [
        {'target': 'petroleum-gas-barmer-basin', 'type': 'colocated',
         'explanation': 'Partly fed by Barmer-basin gas via the HBJ trunk pipeline.'},
    ]})

    # Solar parks → Solar Radiation Zone A + arid climate + Thar
    for sp in SOLAR_PARKS:
        edges.append({'source': f'solar-parks-{sp["id"]}', 'related': [
            {'target': 'renewable-zones-rez-solar-a', 'type': 'defines',
             'explanation': 'Located within MNRE Solar Radiation Zone A.'},
            {'target': 'climate-regions-arid',        'type': 'colocated',
             'explanation': 'Sits in the arid climatic region.'},
            {'target': 'thar',                        'type': 'colocated',
             'explanation': 'Physically inside the Thar Desert.'},
            {'target': 'energy-mix-em-solar-west',    'type': 'signature',
             'explanation': 'Flagship park of the Western Solar Dominance Zone.'},
        ]})

    # Wind farms → wind belt + arid + Thar
    for wf in WIND_FARMS:
        edges.append({'source': f'wind-farms-{wf["id"]}', 'related': [
            {'target': 'renewable-zones-rez-wind-belt', 'type': 'defines'},
            {'target': 'renewable-zones-rez-hybrid',    'type': 'colocated'},
            {'target': 'climate-regions-arid',          'type': 'colocated'},
            {'target': 'thar',                          'type': 'colocated'},
            {'target': 'energy-mix-em-wind-hybrid',     'type': 'signature'},
        ]})

    # Transmission corridors → solar parks + energy-mix
    edges.append({'source': 'transmission-corridors-tc-green-energy-corridor', 'related': [
        {'target': 'solar-parks-bhadla-solar-park',     'type': 'defines'},
        {'target': 'solar-parks-fatehgarh-solar-park',  'type': 'defines'},
        {'target': 'wind-farms-jaisalmer-wind-belt',    'type': 'defines'},
        {'target': 'energy-mix-em-solar-west',          'type': 'colocated'},
        {'target': 'energy-mix-em-wind-hybrid',         'type': 'colocated'},
    ]})
    edges.append({'source': 'transmission-corridors-tc-hvdc-bhadla-north', 'related': [
        {'target': 'solar-parks-bhadla-solar-park',     'type': 'defines'},
        {'target': 'energy-mix-em-solar-west',          'type': 'colocated'},
    ]})

    # Kota Super Thermal — single consolidated source group.
    edges.append({'source': 'power-plants-kota-super-tps', 'related': [
        {'target': 'chambal-river',                            'type': 'defines',
         'explanation': 'Cooling water from the Chambal.'},
        {'target': 'dam-kota-barrage',                         'type': 'colocated',
         'explanation': 'Kota Super Thermal draws from the barrage pool.'},
        {'target': 'major-industries-chambal-gadepan',         'type': 'colocated',
         'explanation': 'Powers the Chambal chemical hub.'},
        {'target': 'industrial-clusters-ic-chemical-refinery', 'type': 'colocated'},
    ]})

    # Renewable zones → geographic anchors
    edges += [
        {'source': 'renewable-zones-rez-solar-a', 'related': [
            {'target': 'climate-regions-arid', 'type': 'defines'},
            {'target': 'thar',                 'type': 'defines'},
        ]},
        {'source': 'renewable-zones-rez-wind-belt', 'related': [
            {'target': 'climate-regions-arid', 'type': 'colocated'},
            {'target': 'thar',                 'type': 'defines'},
        ]},
        {'source': 'renewable-zones-rez-hybrid', 'related': [
            {'target': 'renewable-zones-rez-solar-a',  'type': 'colocated'},
            {'target': 'renewable-zones-rez-wind-belt','type': 'colocated'},
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
    emit_polygon_layer(ENERGY_MIX_ZONES,       'energy-mix',             'energy_mix_zone',
                       'CEA state generation report + RVUNL / RREC')
    emit_polygon_layer(RENEWABLE_ZONES,        'renewable-zones',        'renewable_zone',
                       'MNRE solar radiation zone map + MNRE wind atlas')
    emit_polygon_layer(TRANSMISSION_CORRIDORS, 'transmission-corridors', 'transmission_corridor',
                       'RVPNL + PGCIL Green Energy Corridor documents')
    emit_point_layer(POWER_PLANTS, 'power-plants',  'power_plant',
                     'CEA plant register + operator disclosures')
    emit_point_layer(SOLAR_PARKS,  'solar-parks',   'solar_park',
                     'SECI + RREC + MNRE ultra-mega solar-park notifications')
    emit_point_layer(WIND_FARMS,   'wind-farms',    'wind_farm',
                     'MNRE state-wise wind capacity + operator disclosures')

    new = build_kg_expansion()
    (OUT / 'knowledge-graph-energy.json').write_text(json.dumps({'edges': new}, indent=2))
    print(f'wrote knowledge-graph-energy.json: {len(new)} new edge groups')
    merge_kg_expansion(new)


if __name__ == '__main__':
    main()
