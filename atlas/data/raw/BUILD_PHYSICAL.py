"""
BUILD_PHYSICAL.py — Physical geography assembly pipeline.

Inputs (from Overpass):
    osm-rajasthan-physical-core.json    — river relations, lake polygons, desert,
                                           peaks, ridges
    osm-rajasthan-river-ways.json       — river way fragments (merged per river)

Outputs (in atlas/data/):
    rivers.geojson              — one Feature per major named river, MultiLineString
    lakes.geojson               — named lakes and major reservoirs
    thar.geojson                — Thar Desert extent (from OSM natural=desert)
    aravalli.geojson            — Aravalli main axis + named peaks
    peaks.geojson               — named peaks with elevation
    physiography.geojson        — 6 generalised physiographic regions
    drainage-basins.geojson     — 7 drainage basins
    elevation.json              — descriptive elevation zones (raster deferred)

Design notes
============
* Rivers, lakes, desert, peaks — REAL OSM geometry, unmodified. High fidelity.
* Aravalli axis — synthesised from named peaks + documented ridge trace.
  Attributed as "axis derived from OSM natural=peak and natural=ridge features;
  visualisation is generalised."
* Physiographic regions + Drainage basins — GENERALISED. Constructed from
  district-boundary groupings following documented boundary descriptions in the
  standard geography sources (NCERT, NATMO textbooks). Every feature carries
  `properties.geometryQuality: "generalised"` + source citation.
* Elevation raster is intentionally deferred; elevation.json ships as textual
  metadata describing zones. ReliefLayer.js is architected to accept a raster
  tile source when one lands — no engine change needed.
"""

import json
import math
import re
import sys
from pathlib import Path
from collections import defaultdict

HERE   = Path(__file__).parent
CORE   = HERE / 'osm-rajasthan-physical-core.json'
WAYS   = HERE / 'osm-rajasthan-river-ways.json'
OUT    = HERE.parent

RETRIEVED = '2026-07-06'
STATE     = 'Rajasthan'

def out(name): return OUT / name


# =============================================================================
#  RIVER METADATA MANIFEST
#
#  For each named river we keep basin membership, headwaters (approx), mouth,
#  documented length, and perennial/intermittent classification. Content taken
#  from Rajasthan Water Resources Department and standard geography references.
# =============================================================================

RIVER_META = {
    'Chambal':     {'basin': 'Chambal', 'length_km': 1024, 'headwaters': 'Janapav Hills (MP)',
                    'mouth': 'Yamuna (UP)', 'perennial': True,
                    'tributaries': ['Banas','Kali Sindh','Parbati','Parvan','Mej']},
    'Banas':       {'basin': 'Chambal', 'length_km': 480, 'headwaters': 'Khamnor Hills, Rajsamand',
                    'mouth': 'Chambal (Sawai Madhopur)', 'perennial': False,
                    'tributaries': ['Berach','Kothari','Menal','Mashi','Dai']},
    'Berach':      {'basin': 'Chambal (via Banas)', 'length_km': 157, 'headwaters': 'Udaipur hills',
                    'mouth': 'Banas', 'perennial': False},
    'Kothari':     {'basin': 'Chambal (via Banas)', 'length_km': 145, 'headwaters': 'Divair, Rajsamand',
                    'mouth': 'Banas', 'perennial': False},
    'Bandi':       {'basin': 'Chambal (via Banas)', 'length_km': 190, 'headwaters': 'Bijolia, Bhilwara',
                    'mouth': 'Banas', 'perennial': False},
    'Kalisindh':   {'basin': 'Chambal', 'length_km': 145, 'headwaters': 'Bagli, MP',
                    'mouth': 'Chambal (near Nonera, Kota)', 'perennial': False,
                    'aliases': ['Kali Sindh']},
    'Parvan':      {'basin': 'Chambal', 'length_km': 150, 'headwaters': 'Malwa Plateau, MP',
                    'mouth': 'Kali Sindh', 'perennial': False},
    'Parbati':     {'basin': 'Chambal', 'length_km': 383, 'headwaters': 'Vindhyan, MP',
                    'mouth': 'Chambal (Palighat, Kota)', 'perennial': False},
    'Luni':        {'basin': 'Luni (internal)', 'length_km': 495, 'headwaters': 'Pushkar hills, Ajmer',
                    'mouth': 'Kutch marsh (Gujarat)', 'perennial': False,
                    'tributaries': ['Jawai','Sukri','Bandi','Guhiya','Jojri','Sagi']},
    'Mahi':        {'basin': 'Mahi', 'length_km': 583, 'headwaters': 'Mehd, Dhar (MP)',
                    'mouth': 'Gulf of Khambhat (Gujarat)', 'perennial': True,
                    'tributaries': ['Som','Jakham','Anas']},
    'Anas':        {'basin': 'Mahi', 'length_km': 156, 'headwaters': 'Sagwara, Dungarpur',
                    'mouth': 'Mahi (Gujarat)', 'perennial': False},
    'Som':         {'basin': 'Mahi', 'length_km': 155, 'headwaters': 'Bichhamera, Udaipur',
                    'mouth': 'Mahi (near Beneshwar Dham)', 'perennial': False},
    'Jakham':      {'basin': 'Mahi', 'length_km': 100, 'headwaters': 'Bhanjada hills, Pratapgarh',
                    'mouth': 'Som (near Beneshwar)', 'perennial': False},
    'Sabarmati':   {'basin': 'Sabarmati', 'length_km': 371, 'headwaters': 'Aravallis near Kotra, Udaipur',
                    'mouth': 'Gulf of Khambhat (Gujarat)', 'perennial': True},
    'Banganga':    {'basin': 'Banganga', 'length_km': 380, 'headwaters': 'Bairath hills, Jaipur',
                    'mouth': 'Yamuna (UP)', 'perennial': False},
    'Sabi':        {'basin': 'Banganga (via Yamuna)', 'length_km': 300, 'headwaters': 'Sawai Jaipur hills',
                    'mouth': 'Najafgarh Jheel (Delhi)', 'perennial': False,
                    'aliases': ['Sahibi']},
    'Amanishah':   {'basin': 'Banganga', 'length_km': 45, 'headwaters': 'Jhotwara, Jaipur',
                    'mouth': 'Dhundh (Banganga)', 'perennial': False,
                    'aliases': ['Amanisha']},
    'Ghaggar':     {'basin': 'Ghaggar (internal)', 'length_km': 320, 'headwaters': 'Shivalik hills, Himachal Pradesh',
                    'mouth': 'Terminates in Thar dunes near Hanumangarh', 'perennial': False,
                    'aliases': ['Ghaggar-Hakra','Ghaggar Hakra']},
    'Jawai':       {'basin': 'Luni', 'length_km': 130, 'headwaters': 'Bali, Pali',
                    'mouth': 'Luni', 'perennial': False},
    'Sukri':       {'basin': 'Luni', 'length_km': 156, 'headwaters': 'Aravalli near Desuri, Pali',
                    'mouth': 'Luni', 'perennial': False},
    'Ahar':        {'basin': 'Chambal (via Berach)', 'length_km': 60, 'headwaters': 'Udaipur hills',
                    'mouth': 'Berach', 'perennial': False,
                    'aliases': ['Ayad']},
    'Ahu':         {'basin': 'Chambal (via Kalisindh)', 'length_km': 90, 'headwaters': 'Chhipabarod, Baran',
                    'mouth': 'Kali Sindh', 'perennial': False},
    'West Banas':  {'basin': 'Sabarmati (west)', 'length_km': 266, 'headwaters': 'Aravalli near Sirohi',
                    'mouth': 'Rann of Kutch (Gujarat)', 'perennial': False,
                    'aliases': ['Banas (west)']},
    'Mej':         {'basin': 'Chambal', 'length_km': 96, 'headwaters': 'Mandalgarh, Bhilwara',
                    'mouth': 'Chambal', 'perennial': False},
    'Menal':       {'basin': 'Chambal (via Berach)', 'length_km': 89, 'headwaters': 'Meenapatti, Bhilwara',
                    'mouth': 'Berach', 'perennial': False},
    'Chakan':      {'basin': 'Chambal (via Parbati)', 'length_km': 130, 'headwaters': 'Vindhyan, MP',
                    'mouth': 'Parbati', 'perennial': False},
}

# Lake metadata: type / classification / area / basin / notes
LAKE_META = {
    'Ana Sagar':                   {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 1.20, 'basin': 'Luni',
                                    'built': '1135–1150 CE',
                                    'note': 'Constructed by Anaji Chauhan; historic reservoir at Ajmer.'},
    'Pichola':                     {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 6.96, 'basin': 'Chambal (via Berach)',
                                    'built': '1362 CE',
                                    'note': 'Constructed by Pichhu Banjara; heart of Udaipur.'},
    'Fateh Sagar':                 {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 1.00, 'basin': 'Chambal (via Berach)',
                                    'built': '1687 (rebuilt 1888)'},
    'Rajsamand':                   {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 6.20, 'basin': 'Chambal (via Banas)',
                                    'built': '1662 CE'},
    'Jaisamand':                   {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 52.0, 'basin': 'Mahi (via Som)',
                                    'built': '1691 CE',
                                    'aliases': ['Dhebar Lake'],
                                    'note': "One of Asia's largest artificial lakes."},
    'Nakki':                       {'type': 'natural', 'salinity': 'freshwater',
                                    'area_km2': 0.11, 'basin': 'West Banas',
                                    'note': 'Highest artificial water body in Rajasthan; Mount Abu.',
                                    'aliases': ['Nakki Lake']},
    'Kaylana':                     {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 0.84, 'basin': 'Luni',
                                    'built': '1872 CE'},
    'Bisalpur':                    {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 152.0, 'basin': 'Chambal (via Banas)',
                                    'built': '2004 (dam completed 1999)',
                                    'note': 'Primary drinking-water supply for Jaipur and Ajmer.'},
    'Ramgarh':                     {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 15.5, 'basin': 'Banganga',
                                    'built': '1899–1903 CE'},
    'Siliserh':                    {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 4.5, 'basin': 'Ruparel (via Yamuna)',
                                    'built': '1845 CE'},
    'Bal Samand':                  {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 0.60, 'basin': 'Luni',
                                    'built': '1159 CE',
                                    'note': 'Jodhpur — among the earliest in the region.'},
    'Amrit Kund':                  {'type': 'natural', 'salinity': 'freshwater',
                                    'basin': 'Chambal', 'note': 'Sacred kund.'},
    'Ramgarh Lake':                {'type': 'artificial', 'salinity': 'freshwater',
                                    'area_km2': 15.5, 'basin': 'Banganga',
                                    'built': '1899–1903 CE'},
    'Kanota Dam Lake':             {'type': 'artificial', 'salinity': 'freshwater',
                                    'basin': 'Banganga', 'built': '19th c.'},
    'Bandh Baretha Lake':          {'type': 'artificial', 'salinity': 'freshwater',
                                    'basin': 'Kakund → Yamuna', 'built': '1897–1903',
                                    'note': 'Bhusawar (Bharatpur).'},
    'Bal Samand Lake':             {'type': 'artificial', 'salinity': 'freshwater',
                                    'basin': 'Luni', 'built': '1159 CE'},
}

# Peaks manifest — enrich OSM peak metadata with named references.
PEAK_KNOWN = {
    'Guru Shikhar':      {'range': 'Aravalli', 'district': 'Sirohi',
                           'ele_reference': 1722,
                           'note': 'Highest point in Rajasthan and in the Aravalli Range.'},
    'Malkhet Group H.P.':{'range': 'Aravalli', 'district': 'Sirohi'},
    'Morraka-Dungar':    {'range': 'Aravalli', 'district': 'Udaipur'},
}


# =============================================================================
#  Load OSM dumps
# =============================================================================

def load_osm():
    core = json.load(open(CORE))
    ways = json.load(open(WAYS))
    combined = {(e['type'], e['id']): e for e in core.get('elements', [])}
    for e in ways.get('elements', []):
        combined[(e['type'], e['id'])] = e
    return combined


def geom_way(w):
    return [[pt['lon'], pt['lat']] for pt in w.get('geometry', [])]


def geom_relation_multipolygon(rel):
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


def geom_relation_lines(rel):
    """Return a MultiLineString from a relation's way members (for rivers)."""
    lines = []
    for m in rel.get('members', []):
        if m.get('type') != 'way' or 'geometry' not in m: continue
        coords = [[pt['lon'], pt['lat']] for pt in m['geometry']]
        if len(coords) >= 2: lines.append(coords)
    if not lines: return None
    if len(lines) == 1:
        return {'type': 'LineString', 'coordinates': lines[0]}
    return {'type': 'MultiLineString', 'coordinates': lines}


def stitch(ways):
    rings = []
    remaining = [list(w) for w in ways if len(w) >= 2]
    while remaining:
        current = remaining.pop(0)
        while current[0] != current[-1]:
            for i, w in enumerate(remaining):
                if w[0] == current[-1]:  current.extend(w[1:]); remaining.pop(i); break
                if w[-1] == current[-1]: current.extend(list(reversed(w))[1:]); remaining.pop(i); break
                if w[-1] == current[0]:  current = w + current[1:]; remaining.pop(i); break
                if w[0] == current[0]:   current = list(reversed(w)) + current[1:]; remaining.pop(i); break
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
    if geom['type'] in ('LineString',):
        pts = geom['coordinates']
    elif geom['type'] == 'MultiLineString':
        pts = [p for line in geom['coordinates'] for p in line]
    elif geom['type'] == 'Polygon':
        pts = geom['coordinates'][0]
    else:  # MultiPolygon
        big = max(geom['coordinates'], key=lambda p: abs(signed_area(p[0])))
        pts = big[0]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return ([sum(xs)/len(xs), sum(ys)/len(ys)],
            [min(xs), min(ys), max(xs), max(ys)])


def line_length(line):
    """Cumulative arc length in degrees (planar). Fine for label placement."""
    total = 0.0
    for a, b in zip(line, line[1:]):
        total += math.hypot(b[0]-a[0], b[1]-a[1])
    return total


def line_midpoint(line):
    """Return the coordinate at 50% of the arc length along a LineString."""
    total = line_length(line)
    if total == 0: return line[0]
    target = total / 2.0
    acc = 0.0
    for a, b in zip(line, line[1:]):
        seg = math.hypot(b[0]-a[0], b[1]-a[1])
        if acc + seg >= target:
            t = (target - acc) / seg if seg > 0 else 0
            return [a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]
        acc += seg
    return line[-1]


def label_anchor_for_line(geom):
    """
    Anchor a label ON the polyline itself:
      - LineString      → midpoint of the line
      - MultiLineString → midpoint of the longest constituent line
    Cures the 'label floats in the bbox middle' bug that centroid-based anchoring
    produces for meandering rivers.
    """
    if geom['type'] == 'LineString':
        return line_midpoint(geom['coordinates'])
    if geom['type'] == 'MultiLineString':
        lines = geom['coordinates']
        longest = max(lines, key=line_length) if lines else None
        if longest and len(longest) >= 2:
            return line_midpoint(longest)
    return None


def slugify(name):
    s = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return s or 'unnamed'


def norm_name(s):
    """Normalise a name for matching."""
    return re.sub(r'\s+', ' ', s.strip()).title()


# =============================================================================
#  RIVERS: merge per-name into single Feature (MultiLineString)
# =============================================================================

def build_rivers(osm):
    # Group ways + relation members by canonical name
    groups = defaultdict(list)  # canonical_name -> list[list[coord]]

    # Handle river relations first (they aggregate ways)
    for (tp, rid), e in osm.items():
        if tp != 'relation': continue
        t = e.get('tags', {})
        if t.get('waterway') != 'river': continue
        raw = t.get('name:en') or t.get('name', '')
        if not raw: continue
        canon = canonical_river_name(raw)
        if canon not in RIVER_META: continue
        for m in e.get('members', []):
            if m.get('type') != 'way' or 'geometry' not in m: continue
            coords = [[pt['lon'], pt['lat']] for pt in m['geometry']]
            if len(coords) >= 2:
                groups[canon].append(coords)

    # Then loose ways (waterway=river not part of relation)
    for (tp, rid), e in osm.items():
        if tp != 'way': continue
        t = e.get('tags', {})
        if t.get('waterway') != 'river': continue
        raw = t.get('name:en') or t.get('name', '')
        if not raw: continue
        canon = canonical_river_name(raw)
        if canon not in RIVER_META: continue
        coords = [[pt['lon'], pt['lat']] for pt in e.get('geometry', [])]
        if len(coords) >= 2:
            groups[canon].append(coords)

    feats = []
    for canon in sorted(groups.keys()):
        lines = groups[canon]
        geom = {'type': 'MultiLineString', 'coordinates': lines}
        cent, bbox = centroid_and_bbox(geom)
        anchor = label_anchor_for_line(geom) or cent
        meta = RIVER_META[canon]
        feats.append({
            'type': 'Feature',
            'id': slugify(canon) + '-river',
            'properties': {
                'name': canon + ' River',
                'type': 'river',
                'category': 'physical',
                'state': STATE,
                'basin': meta.get('basin'),
                'length_km': meta.get('length_km'),
                'headwaters': meta.get('headwaters'),
                'mouth': meta.get('mouth'),
                'perennial': meta.get('perennial'),
                'tributaries': meta.get('tributaries', []),
                'aliases': meta.get('aliases', []),
                'source': 'OSM waterway=river relations + Rajasthan Water Resources Department',
                'lastUpdated': RETRIEVED,
                'centroid':    [round(cent[0], 5), round(cent[1], 5)],
                'labelAnchor': [round(anchor[0], 5), round(anchor[1], 5)],
                'bbox':        [round(v, 5) for v in bbox],
                'geometryQuality': 'polyline',
                'notes': { 'facts': [], 'mnemonic': '',
                           'significance': 'high' if meta.get('length_km',0) > 200 else 'medium',
                           'confusedWith': [] },
                'ecology':   { 'flora': [], 'fauna': [], 'ecosystem': '' },
                'governance':{ 'authority': 'Central Water Commission; Rajasthan WRD',
                               'status':    'active' },
            },
            'geometry': geom,
        })
    return feats


def canonical_river_name(raw):
    r = norm_name(raw)
    # aliases → canonical
    if r in ('Kali Sindh',):                    return 'Kalisindh'
    if r in ('Amanisha River','Amanisha','Amanisha Nadi'): return 'Amanishah'
    if r in ('Ghaggar-Hakra','Ghaggar Hakra'):  return 'Ghaggar'
    if r in ('Parbati Nadi',):                  return 'Parbati'
    if 'West Banas' in r:                       return 'West Banas'
    if r == 'Banas':                            return 'Banas'
    return r


# =============================================================================
#  LAKES
# =============================================================================

def build_lakes(osm):
    feats = []
    seen = set()
    for (tp, rid), e in osm.items():
        t = e.get('tags', {})
        if t.get('natural') != 'water' and t.get('landuse') != 'reservoir': continue
        raw = t.get('name:en') or t.get('name', '')
        if not raw: continue
        canon = norm_name(raw)
        # Match against manifest keys — allow prefix match
        matched = None
        for key in LAKE_META:
            if key.lower() in canon.lower() or canon.lower() in key.lower():
                matched = key; break
        if matched is None: continue
        if matched in seen: continue
        seen.add(matched)
        if tp == 'way':
            ring = geom_way(e)
            if len(ring) < 4: continue
            if ring[0] != ring[-1]: ring.append(ring[0])
            geom = {'type': 'Polygon', 'coordinates': [ring]}
        else:
            geom = geom_relation_multipolygon(e)
            if geom is None: continue
        cent, bbox = centroid_and_bbox(geom)
        meta = LAKE_META[matched]
        feats.append({
            'type': 'Feature',
            'id': slugify(matched) + '-lake',
            'properties': {
                'name': matched,
                'type': 'lake',
                'category': 'physical',
                'state': STATE,
                'lake_type':  meta.get('type'),
                'salinity':   meta.get('salinity'),
                'area':       meta.get('area_km2'),
                'basin':      meta.get('basin'),
                'established':meta.get('built'),
                'aliases':    meta.get('aliases', []),
                'remark':     meta.get('note', ''),
                'source':     'OSM natural=water / landuse=reservoir + WRD',
                'lastUpdated':RETRIEVED,
                'centroid':   [round(cent[0], 5), round(cent[1], 5)],
                'bbox':       [round(v, 5) for v in bbox],
                'geometryQuality': 'polygon',
                'notes': { 'facts': [], 'mnemonic': '',
                           'significance': 'high' if (meta.get('area_km2') or 0) > 5 else 'medium',
                           'confusedWith': [] },
                'ecology':   { 'flora': [], 'fauna': [], 'ecosystem': '' },
                'governance':{ 'authority': 'Rajasthan Water Resources Department',
                               'status':    'active' },
            },
            'geometry': geom,
        })
    return feats


# =============================================================================
#  THAR DESERT — union of OSM natural=desert polygons
# =============================================================================

def build_thar(osm):
    polys = []
    for (tp, rid), e in osm.items():
        if e.get('tags', {}).get('natural') != 'desert': continue
        if tp == 'way':
            ring = geom_way(e)
            if len(ring) < 4: continue
            if ring[0] != ring[-1]: ring.append(ring[0])
            polys.append([ring])
        else:
            g = geom_relation_multipolygon(e)
            if g and g['type'] == 'MultiPolygon':
                polys.extend(g['coordinates'])
            elif g:
                polys.append(g['coordinates'])
    if not polys: return []
    geom = {'type': 'MultiPolygon', 'coordinates': polys} if len(polys) > 1 else {'type': 'Polygon', 'coordinates': polys[0]}
    cent, bbox = centroid_and_bbox(geom)
    return [{
        'type': 'Feature',
        'id': 'thar-desert',
        'properties': {
            'name': 'Thar Desert (Rajasthan portion)',
            'type': 'desert',
            'category': 'physical',
            'state': STATE,
            'districts': ['Jaisalmer','Barmer','Bikaner','Churu','Sri Ganganagar','Jodhpur','Nagaur','Balotra','Phalodi'],
            'sub_regions': ['Core arid dune belt','Semi-arid transition','Stabilized dunes','Desert fringe'],
            'source': 'OSM natural=desert (community-mapped extent)',
            'lastUpdated': RETRIEVED,
            'centroid': [round(cent[0], 5), round(cent[1], 5)],
            'bbox':     [round(v, 5) for v in bbox],
            'geometryQuality': 'osm-generalised',
            'notes': { 'facts': [
                'The Thar covers roughly 60 percent of Rajasthan.',
                'Great Indian Desert — spans Rajasthan, Gujarat, Sindh, Punjab.',
                'Aeolian sand dunes dominate; barchans in the west, transverse dunes east of Jaisalmer.',
                'Home to the Great Indian Bustard and the Desert National Park (Jaisalmer/Barmer).',
            ], 'mnemonic': '', 'significance': 'very-high', 'confusedWith': [] },
            'ecology': { 'ecosystem': 'Hot subtropical desert; sand dunes, salt lakes, thorn scrub',
                         'fauna': ['Great Indian Bustard','Chinkara','Desert fox','Desert cat','Camel','Blackbuck'],
                         'flora': ['Khejri (Prosopis cineraria)','Rohida','Ker','Sewan grass','Bui'] },
            'governance': { 'authority': 'Multiple — Rajasthan Forest Department, Revenue', 'status': 'active' },
        },
        'geometry': geom,
    }]


# =============================================================================
#  ARAVALLI — main axis + named peaks
#
#  The main axis is a synthesised polyline running southwest → northeast
#  through the highest named peaks. It is NOT an OSM feature; it is a
#  visualisation of the axis derived from documented peak locations.
# =============================================================================

# Axis anchor points ordered SW → NE, in [lon, lat]. Coordinates from OSM peak
# nodes (Guru Shikhar) and named ridges + geographic centres.
ARAVALLI_AXIS = [
    # Sirohi / Mount Abu block (SW terminus)
    [72.720, 24.593],   # Guru Shikhar (Mount Abu)
    [72.72,  24.71],    # Mount Abu range NE end
    # Kumbhalgarh section
    [73.55,  25.15],    # Kumbhalgarh ridge
    [73.68,  25.32],    # Rajsamand highlands
    # Central Aravalli
    [73.80,  25.75],    # Bhilwara–Ajmer transition
    [74.10,  26.05],    # Beawar–Ajmer axis
    [74.63,  26.45],    # Pushkar–Ajmer
    [75.20,  26.85],    # Kishangarh–Jaipur south
    # Sikar / Jhunjhunu Shekhawati Aravalli
    [75.80,  27.60],    # Sikar hills
    [75.95,  28.00],    # Jhunjhunu
    # Alwar section
    [76.55,  27.55],    # Alwar-Sariska ridge
    [76.85,  27.80],    # Alwar NE
    # Delhi extension
    [77.10,  28.30],    # Delhi border approach
]

def build_aravalli():
    geom = {'type': 'LineString', 'coordinates': ARAVALLI_AXIS}
    cent, bbox = centroid_and_bbox(geom)
    anchor = label_anchor_for_line(geom) or cent
    return [{
        'type': 'Feature',
        'id': 'aravalli-main-axis',
        'properties': {
            'name': 'Aravalli Range (main axis)',
            'type': 'mountain_range',
            'category': 'physical',
            'state': STATE,
            'length_km': 692,         # documented total length in India
            'trend': 'SW – NE',
            'highest_peak': {'name': 'Guru Shikhar', 'ele_m': 1722, 'district': 'Sirohi'},
            'segments': ['Sirohi–Mount Abu','Kumbhalgarh','Central (Ajmer)','Shekhawati','Alwar–Sariska','Delhi extension'],
            'source': 'Axis synthesised from OSM natural=peak elevations and standard geography sources',
            'lastUpdated': RETRIEVED,
            'centroid':    [round(cent[0], 5), round(cent[1], 5)],
            'labelAnchor': [round(anchor[0], 5), round(anchor[1], 5)],
            'bbox':        [round(v, 5) for v in bbox],
            'geometryQuality': 'generalised',
            'geometryNote': 'A synthesised main-axis polyline; individual OSM ridge segments cluster around this line but do not form a single continuous feature in OSM.',
            'notes': { 'facts': [
                'One of the oldest fold mountain systems in the world (~800 Ma).',
                'Extends ~692 km from Palanpur (Gujarat) through Rajasthan to Delhi.',
                'Guru Shikhar (Mt Abu, Sirohi) is the highest peak at 1722 m.',
                'Acts as a climatic divide — arrests monsoon winds to the east; leaves the Thar west.',
                'Major mineral belt — copper, zinc, marble, lead.',
            ], 'mnemonic': '"A-r-a-v-a-l-l-i = ancient · rifted · arid west · valley east · lofty · linear · igneous roots"',
              'significance': 'very-high', 'confusedWith': ['Vindhya Range (further south, plateau margin)'] },
            'ecology': { 'ecosystem': 'Dry deciduous forest at higher elevations; scrub and grassland lower down',
                         'fauna': ['Leopard','Sloth bear','Sambar','Jungle cat'],
                         'flora': ['Dhok (Anogeissus pendula)','Salar','Kair','Palas','Anwal'] },
            'governance': { 'authority': 'Rajasthan Forest Department (protected forest patches)', 'status': 'active' },
        },
        'geometry': geom,
    }]


# =============================================================================
#  PEAKS — named + top elevations
# =============================================================================

def _load_districts_for_peak_lookup():
    d = json.load(open(OUT / 'districts.geojson'))
    out = []
    for f in d['features']:
        name = f['properties']['name']
        division = f['properties'].get('division')
        rings = (f['geometry']['coordinates'] if f['geometry']['type'] == 'Polygon'
                 else [ring for poly in f['geometry']['coordinates'] for ring in poly])
        out.append((name, division, rings))
    return out


def _peak_district(lon, lat, dists):
    for name, division, rings in dists:
        if rings and point_in_ring([lon, lat], rings[0]):
            return name, division
    return None, None


# Named peaks + hill-fort summits of Rajasthan.
#
# Rajasthan has only a handful of *individually named* peaks in OSM. The Aravalli
# ridge has thousands of unnamed OSM nodes that were previously shown under
# synthetic labels ("Aravalli Peak · Sikar") — those have been removed because
# they read as names but were merely elevation-and-district descriptors.
#
# The atlas ships the peaks below. Every entry is a REAL named feature backed
# by an OSM node/relation and/or by a widely-cited elevation from published
# atlas / gazetteer sources.
#
# Sources per peak in `source_ref`.
NAMED_PEAKS = [
    # --- Genuinely tagged natural=peak in OSM ---
    {'id':'guru-shikhar', 'name':'Guru Shikhar',
     'osm_ref':('node',3577976686), 'ele_m':1722, 'ele_osm':1690,
     'district':'Sirohi', 'range':'Aravalli · Mount Abu massif',
     'source_ref':['OSM','Rajasthan Forest Department','Wikipedia'],
     'facts':[
         'Highest peak in Rajasthan and in the entire Aravalli Range.',
         'Located within the Mount Abu Wildlife Sanctuary, Sirohi district.',
         "Widely-cited elevation 1,722 m; OSM records the summit marker at 1,690 m.",
         'Site of the Adhar Devi and Guru Dattatreya shrines.',
     ]},
    {'id':'malkhet-group', 'name':'Malkhet Group',
     'osm_ref':('node',11611608655), 'ele_m':1050,
     'district':'Sikar', 'range':'Aravalli · Shekhawati (Raghunathgarh massif)',
     'source_ref':['OSM'],
     'facts':[
         'High point in the Shekhawati Aravalli — the north-eastern segment of the range.',
         'Elevation 1,050 m; among the highest points in the Sikar–Jhunjhunu belt.',
         'In the immediate neighbourhood of Raghunathgarh (~1,055 m), the widely-cited high peak of Shekhawati.',
     ]},
    {'id':'morraka-dungar', 'name':'Morraka Dungar',
     'osm_ref':('node',6356221330), 'ele_m':426,
     'district':'Karauli', 'range':'Vindhyan-Aravalli transition (Karauli hills)',
     'source_ref':['OSM'],
     'facts':[
         'A low, isolated hill (dungar) in the Karauli plateau.',
         'Sits at the transition where the Aravalli fades into the Vindhyan sandstone scarplands.',
     ]},
    # --- Hill-fort summits — real named cartographic features on OSM historic=fort nodes ---
    {'id':'achalgarh-fort', 'name':'Achalgarh',
     'osm_ref':('node',3577976685),
     'lonlat':[72.7629, 24.6310],
     'ele_m':1380,          # widely-cited approx elevation
     'district':'Sirohi', 'range':'Aravalli · Mount Abu massif',
     'kind':'hill fort',
     'source_ref':['OSM (historic=fort)','Rajasthan Tourism Department','Wikipedia'],
     'facts':[
         'Aravalli fort-summit north of Mount Abu at ~1,380 m.',
         '15th-century fort built by Rana Kumbha over 8th-century Paramara foundations.',
         'Achaleshwar Mahadev temple within the walls.',
     ]},
    {'id':'kumbhalgarh-fort', 'name':'Kumbhalgarh',
     'osm_ref':('relation',2825241),
     'lonlat':[73.5803, 25.1495],
     'ele_m':1180,          # summit height at fort walls
     'district':'Rajsamand', 'range':'Aravalli · central',
     'kind':'hill fort',
     'source_ref':['OSM (fort relation)','Archaeological Survey of India','UNESCO WHS listing'],
     'facts':[
         'Aravalli summit at ~1,180 m, crowned by the Kumbhalgarh fort walls.',
         "Second-longest continuous wall in the world after the Great Wall of China (~36 km).",
         'Inscribed as UNESCO World Heritage Site "Hill Forts of Rajasthan" (2013).',
         'Birthplace of Maharana Pratap.',
     ]},
    {'id':'chittorgarh-fort', 'name':'Chittorgarh',
     'osm_ref':('node',936811311),
     'lonlat':[74.6454, 24.8788],
     'ele_m':553,
     'district':'Chittorgarh', 'range':'Eastern Aravalli mesa',
     'kind':'hill fort',
     'source_ref':['OSM (historic=fort with ele)','Archaeological Survey of India','UNESCO WHS listing'],
     'facts':[
         "Mesa-top hill fort at 553 m — one of India's largest hill forts.",
         'Inscribed as UNESCO World Heritage Site "Hill Forts of Rajasthan" (2013).',
         'Site of the three medieval jauhars (1303, 1535, 1568).',
     ]},
    {'id':'taragarh-ajmer', 'name':'Taragarh (Ajmer)',
     'lonlat':[74.6244, 26.4525],
     'ele_m':870,           # widely-cited
     'district':'Ajmer', 'range':'Aravalli · Nagpahar spur',
     'kind':'hill fort',
     'source_ref':['Archaeological Survey of India','Rajasthan Tourism','Wikipedia'],
     'facts':[
         "Aravalli summit at ~870 m above Ajmer city, crowned by the Ajaymeru (Taragarh) fort.",
         'Founded by Chauhan king Ajayaraja II in the early 12th century.',
         'Overlooks the Ana Sagar lake and the Pushkar valley.',
     ]},
    {'id':'taragarh-bundi', 'name':'Taragarh (Bundi)',
     'osm_ref':('way',254041054),   # taragarh area in OSM
     'lonlat':[75.6415, 25.4394],
     'ele_m':460,
     'district':'Bundi', 'range':'Vindhyan-Aravalli transition',
     'kind':'hill fort',
     'source_ref':['Rajasthan Tourism Department','Wikipedia'],
     'facts':[
         '14th-century hill fort of the Bundi Hada Chauhans on a ~460 m summit.',
         'Above Bundi town, at the head of the Aravalli-Vindhyan meeting zone.',
     ]},
]


def build_peaks(osm):
    dists = _load_districts_for_peak_lookup()
    feats = []
    for entry in NAMED_PEAKS:
        # Resolve coordinates: OSM node lat/lon if present, else declared lonlat.
        lon, lat = None, None
        osm_ref = entry.get('osm_ref')
        if osm_ref:
            el = osm.get(osm_ref)
            if el:
                if el.get('lon') is not None:
                    lon, lat = el['lon'], el['lat']
                elif el.get('members') and el['members'][0].get('geometry'):
                    # Relation — use first outer way's centroid
                    pts = [(pt['lon'], pt['lat']) for m in el['members']
                           if m.get('type')=='way' and 'geometry' in m
                           for pt in m['geometry']]
                    if pts:
                        lon = sum(p[0] for p in pts)/len(pts)
                        lat = sum(p[1] for p in pts)/len(pts)
        if (lon is None or lat is None) and entry.get('lonlat'):
            lon, lat = entry['lonlat']
        if lon is None:
            print(f'!! could not resolve coordinates for {entry["id"]}', file=sys.stderr)
            continue

        # District & division from spatial lookup.
        d_name, d_division = _peak_district(lon, lat, dists)
        district = d_name or entry.get('district')
        division = d_division

        source_str = ' + '.join(entry.get('source_ref', ['OSM']))
        feats.append({
            'type': 'Feature',
            'id':   f"peak-{entry['id']}",
            'properties': {
                'name':          entry['name'],
                'type':          'peak',
                'category':      'physical',
                'state':         STATE,
                'elevation_m':   entry['ele_m'],
                'range':         entry['range'],
                'district':      district,
                'division':      division,
                'kind':          entry.get('kind', 'peak'),
                'source':        source_str,
                'lastUpdated':   RETRIEVED,
                'centroid':      [round(lon, 5), round(lat, 5)],
                'labelAnchor':   [round(lon, 5), round(lat, 5)],
                'bbox':          [round(lon, 5), round(lat, 5), round(lon, 5), round(lat, 5)],
                'geometryQuality': 'point',
                'notes':  {'facts': entry.get('facts', []), 'mnemonic': '',
                           'significance': 'very-high' if entry['ele_m'] >= 1000 else 'high',
                           'confusedWith': []},
                'ecology':    {'flora': [], 'fauna': [], 'ecosystem': ''},
                'governance': {'authority': '', 'status': ''},
                'timeline':   entry.get('timeline', []),
            },
            'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
        })
    return feats


# =============================================================================
#  PHYSIOGRAPHIC REGIONS — generalised, constructed from district groupings.
#  Boundaries follow the standard geography-textbook division of Rajasthan.
# =============================================================================

# Region name → list of district IDs (matches districts.geojson feature ids).
PHYSIOGRAPHIC = {
    'thar-desert-region': {
        'name': 'Western Sandy Plains (Thar Desert region)',
        'districts': ['jaisalmer','barmer','bikaner','churu','sri-ganganagar',
                      'hanumangarh','jodhpur','phalodi','balotra','nagaur',
                      'didwana-kuchaman'],
        'notes': [
            'Northwestern arid zone; ~60 percent of the state\'s area.',
            'Extends west of the Aravalli watershed.',
            'Home to the Thar Desert, sand dunes, and the Great Indian Bustard.',
        ],
    },
    'aravalli-hills-region': {
        'name': 'Aravalli Hill Region',
        'districts': ['sirohi','udaipur','salumbar','rajsamand','pratapgarh',
                      'ajmer','beawar','pali','sikar','jhunjhunu',
                      'khairthal-tijara','alwar'],
        'notes': [
            'Runs SW → NE through the state, ~692 km long.',
            'Highest peak: Guru Shikhar (1722 m), Mount Abu.',
            'Acts as a climatic and drainage divide.',
        ],
    },
    'eastern-plains-region': {
        'name': 'Eastern Plains (Banas–Chambal basin)',
        'districts': ['jaipur','dausa','tonk','bhilwara','sawai-madhopur',
                      'karauli','deeg','bharatpur','dholpur','kotputli-behror'],
        'notes': [
            'Fertile alluvial plains drained by the Banas, Berach, and Chambal.',
            'Highest agricultural productivity in the state.',
        ],
    },
    'southeastern-plateau-region': {
        'name': 'Southeastern Plateau (Hadoti)',
        'districts': ['kota','bundi','baran','jhalawar','chittorgarh'],
        'notes': [
            'Vindhyan sandstone plateau — Hadoti.',
            'Elevation 300–500 m; drained by the Chambal, Kali Sindh, and Parbati.',
        ],
    },
    'southern-hills-region': {
        'name': 'Southern Aravalli / Mahi Basin',
        'districts': ['banswara','dungarpur'],
        'notes': [
            'Aravalli spurs south of Udaipur; Mahi and Som drain southwards to Gujarat.',
        ],
    },
}


def build_physiography(districts):
    # Group district polygons per region and union them.
    dist_by_id = {f['id']: f for f in districts['features']}
    feats = []
    for rid, meta in PHYSIOGRAPHIC.items():
        polys = []
        included = []
        for did in meta['districts']:
            d = dist_by_id.get(did)
            if not d: continue
            included.append(d['properties']['name'])
            g = d['geometry']
            if g['type'] == 'Polygon':
                polys.append(g['coordinates'])
            else:  # MultiPolygon
                polys.extend(g['coordinates'])
        if not polys: continue
        geom = {'type': 'MultiPolygon', 'coordinates': polys}
        cent, bbox = centroid_and_bbox(geom)
        feats.append({
            'type': 'Feature',
            'id': rid,
            'properties': {
                'name': meta['name'],
                'type': 'physiographic_region',
                'category': 'physical',
                'state': STATE,
                'districts_included': included,
                'source': 'Generalised — constructed from standard geography-text descriptions using district-boundary building blocks',
                'lastUpdated': RETRIEVED,
                'centroid': [round(cent[0], 5), round(cent[1], 5)],
                'bbox':     [round(v, 5) for v in bbox],
                'geometryQuality': 'generalised',
                'geometryNote': 'Boundary is the union of the listed districts. Actual physiographic boundaries cross districts; the polygon here approximates the region.',
                'notes': { 'facts': meta['notes'], 'mnemonic': '', 'significance': 'high', 'confusedWith': [] },
                'ecology':   { 'flora': [], 'fauna': [], 'ecosystem': '' },
                'governance':{ 'authority': '', 'status': '' },
            },
            'geometry': geom,
        })
    return feats


# =============================================================================
#  DRAINAGE BASINS — generalised, constructed from district groupings.
# =============================================================================

BASINS = {
    'chambal-basin':   {'name': 'Chambal Basin',
                        'districts': ['kota','bundi','baran','jhalawar','sawai-madhopur',
                                      'karauli','dholpur','chittorgarh','bhilwara',
                                      'rajsamand','ajmer','beawar','tonk','pratapgarh']},
    'luni-basin':      {'name': 'Luni Basin (internal)',
                        'districts': ['barmer','balotra','jalore','pali','sirohi',
                                      'jodhpur','ajmer','beawar','phalodi']},
    'mahi-basin':      {'name': 'Mahi Basin',
                        'districts': ['banswara','dungarpur','udaipur','salumbar','pratapgarh']},
    'sabarmati-basin': {'name': 'Sabarmati Basin (west)',
                        'districts': ['sirohi','udaipur']},
    'banganga-basin':  {'name': 'Banganga Basin',
                        'districts': ['jaipur','dausa','bharatpur','deeg','alwar',
                                      'khairthal-tijara','kotputli-behror']},
    'ghaggar-basin':   {'name': 'Ghaggar Basin (dying river)',
                        'districts': ['sri-ganganagar','hanumangarh']},
    'inland-drainage': {'name': 'Interior Drainage (Sambhar–Nagaur)',
                        'districts': ['nagaur','sikar','jhunjhunu','churu','bikaner',
                                      'didwana-kuchaman']},
}


def build_basins(districts):
    dist_by_id = {f['id']: f for f in districts['features']}
    feats = []
    for bid, meta in BASINS.items():
        polys = []
        for did in meta['districts']:
            d = dist_by_id.get(did)
            if not d: continue
            g = d['geometry']
            if g['type'] == 'Polygon': polys.append(g['coordinates'])
            else: polys.extend(g['coordinates'])
        if not polys: continue
        geom = {'type': 'MultiPolygon', 'coordinates': polys}
        cent, bbox = centroid_and_bbox(geom)
        feats.append({
            'type': 'Feature',
            'id': bid,
            'properties': {
                'name': meta['name'],
                'type': 'drainage_basin',
                'category': 'physical',
                'state': STATE,
                'districts_included': [dist_by_id[d]['properties']['name'] for d in meta['districts'] if d in dist_by_id],
                'source': 'Generalised — constructed from CWC basin descriptions using district-boundary approximation',
                'lastUpdated': RETRIEVED,
                'centroid': [round(cent[0], 5), round(cent[1], 5)],
                'bbox':     [round(v, 5) for v in bbox],
                'geometryQuality': 'generalised',
                'geometryNote': 'District-approximated boundary. True hydrographic divide follows Aravalli ridge; some districts contribute to multiple basins.',
                'notes': { 'facts': [], 'mnemonic': '', 'significance': 'high', 'confusedWith': [] },
                'ecology':   { 'flora': [], 'fauna': [], 'ecosystem': '' },
                'governance':{ 'authority': 'Central Water Commission', 'status': 'active' },
            },
            'geometry': geom,
        })
    return feats


# =============================================================================
#  ELEVATION METADATA — descriptive zones. Raster deferred.
# =============================================================================

def build_elevation():
    return {
        'schemaVersion': 1,
        'lastUpdated': RETRIEVED,
        'note': ('Descriptive elevation zones for Rajasthan. A DEM-derived '
                 'hypsometric tint and hillshade raster are deferred to a '
                 'follow-up module — this file captures the zone taxonomy so '
                 'ReliefLayer.js can render text-based relief until the '
                 'raster arrives.'),
        'zones': [
            {'id':'lowland',     'min_m':100, 'max_m':300, 'label':'Lowlands',
             'colour':'#eae1c8', 'regions':['Eastern Plains','Ghaggar plains']},
            {'id':'plateau-low', 'min_m':300, 'max_m':500, 'label':'Low plateau',
             'colour':'#d4c69c', 'regions':['Hadoti Plateau (SE)','Mewar Plateau']},
            {'id':'aravalli-mid','min_m':500, 'max_m':800, 'label':'Aravalli mid-range',
             'colour':'#b7a575', 'regions':['Central Aravalli','Kumbhalgarh section']},
            {'id':'aravalli-high','min_m':800, 'max_m':1200, 'label':'High Aravalli',
             'colour':'#8f7f4d', 'regions':['Sirohi highlands','Mount Abu base']},
            {'id':'peak',        'min_m':1200, 'max_m':1800, 'label':'Aravalli peaks',
             'colour':'#5f5028', 'regions':['Mount Abu (Guru Shikhar 1722 m)']},
        ],
        'source': 'Zone taxonomy from standard geography descriptions; individual peak elevations from OSM natural=peak nodes.',
    }


# =============================================================================
#  Emit
# =============================================================================

def emit(name, features_or_dict):
    p = out(name)
    if isinstance(features_or_dict, list):
        payload = {'type': 'FeatureCollection', 'features': features_or_dict}
    else:
        payload = features_or_dict
    p.write_text(json.dumps(payload, separators=(',', ':')))
    print(f'wrote {name}: {p.stat().st_size:,} bytes, {len(features_or_dict) if isinstance(features_or_dict, list) else "-"} features')


def main():
    osm = load_osm()
    print(f'Loaded {len(osm)} OSM elements.')

    districts = json.load(open(OUT / 'districts.geojson'))

    rivers = build_rivers(osm);        emit('rivers.geojson', rivers)
    lakes  = build_lakes(osm);         emit('lakes.geojson', lakes)
    thar   = build_thar(osm);          emit('thar.geojson', thar)
    aravalli = build_aravalli();       emit('aravalli.geojson', aravalli)
    peaks  = build_peaks(osm);         emit('peaks.geojson', peaks)
    physio = build_physiography(districts); emit('physiography.geojson', physio)
    basins = build_basins(districts);  emit('drainage-basins.geojson', basins)
    ele    = build_elevation();        emit('elevation.json', ele)


if __name__ == '__main__':
    main()
