"""
Rebuild pipeline for the atlas base layer.

Input:  osm-rajasthan-41-districts.json   (Overpass admin_level=5 dump)
Output:
    ../districts.geojson    — canonical GeoJSON, simplified, unified schema
    ../rajasthan-districts-full.geojson  — full-fidelity backup (uncommitted)
    ../atlas.json           — atlas metadata (versions, projection, layer index)

Design notes
------------
* On-disk data is stored in EPSG:4326 (lon/lat) as standard GeoJSON. The atlas
  runtime performs its own projection — never bake pixel coordinates into
  primary datasets.
* Every district conforms to the atlas unified feature schema. Empty notes /
  ecology / governance stubs are included so the shape is stable across
  future thematic layers (parks, rivers, etc.).
"""

import json
import math
import re
import sys
import unicodedata
from pathlib import Path

RAW           = Path(__file__).parent / 'osm-rajasthan-41-districts.json'
GEOJSON_FULL  = Path(__file__).parent.parent / 'rajasthan-districts-full.geojson'
GEOJSON_OUT   = Path(__file__).parent.parent / 'districts.geojson'
ATLAS_OUT     = Path(__file__).parent.parent / 'atlas.json'

RETRIEVED     = '2026-07-06'
DATA_VERSION  = '1.0.0'

NAME_ALIASES = {
    'Dhaulpur': 'Dholpur',
    'Chittorgarh': 'Chittorgarh',
    'Jalore': 'Jalore',
    'Sri Ganganagar': 'Sri Ganganagar',
    'Didwana-Kuchaman': 'Didwana-Kuchaman',
    'Khairthal-Tijara': 'Khairthal-Tijara',
    'Kotputli-Behror': 'Kotputli-Behror',
}

DIVISION_HQ = {
    'Ajmer': ('Ajmer', 'Ajmer'), 'Beawar': ('Ajmer', 'Beawar'),
    'Nagaur': ('Ajmer', 'Nagaur'), 'Tonk': ('Ajmer', 'Tonk'),
    'Bharatpur': ('Bharatpur', 'Bharatpur'), 'Deeg': ('Bharatpur', 'Deeg'),
    'Dholpur': ('Bharatpur', 'Dholpur'), 'Karauli': ('Bharatpur', 'Karauli'),
    'Sawai Madhopur': ('Bharatpur', 'Sawai Madhopur'),
    'Bikaner': ('Bikaner', 'Bikaner'), 'Churu': ('Bikaner', 'Churu'),
    'Hanumangarh': ('Bikaner', 'Hanumangarh'),
    'Sri Ganganagar': ('Bikaner', 'Sri Ganganagar'),
    'Alwar': ('Jaipur', 'Alwar'), 'Dausa': ('Jaipur', 'Dausa'),
    'Didwana-Kuchaman': ('Jaipur', 'Didwana'), 'Jaipur': ('Jaipur', 'Jaipur'),
    'Jhunjhunu': ('Jaipur', 'Jhunjhunu'),
    'Khairthal-Tijara': ('Jaipur', 'Khairthal'),
    'Kotputli-Behror': ('Jaipur', 'Kotputli'), 'Sikar': ('Jaipur', 'Sikar'),
    'Balotra': ('Jodhpur', 'Balotra'), 'Barmer': ('Jodhpur', 'Barmer'),
    'Jaisalmer': ('Jodhpur', 'Jaisalmer'), 'Jalore': ('Jodhpur', 'Jalore'),
    'Jodhpur': ('Jodhpur', 'Jodhpur'), 'Pali': ('Jodhpur', 'Pali'),
    'Phalodi': ('Jodhpur', 'Phalodi'), 'Sirohi': ('Jodhpur', 'Sirohi'),
    'Baran': ('Kota', 'Baran'), 'Bundi': ('Kota', 'Bundi'),
    'Jhalawar': ('Kota', 'Jhalawar'), 'Kota': ('Kota', 'Kota'),
    'Banswara': ('Udaipur', 'Banswara'), 'Bhilwara': ('Udaipur', 'Bhilwara'),
    'Chittorgarh': ('Udaipur', 'Chittorgarh'),
    'Dungarpur': ('Udaipur', 'Dungarpur'),
    'Pratapgarh': ('Udaipur', 'Pratapgarh'),
    'Rajsamand': ('Udaipur', 'Rajsamand'), 'Salumbar': ('Udaipur', 'Salumbar'),
    'Udaipur': ('Udaipur', 'Udaipur'),
}

NEW_DISTRICTS_2023 = {'Balotra', 'Beawar', 'Deeg', 'Didwana-Kuchaman',
                      'Kotputli-Behror', 'Khairthal-Tijara', 'Phalodi', 'Salumbar'}


def slugify(name):
    s = unicodedata.normalize('NFKD', name)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def stitch_rings(ways):
    rings = []
    remaining = [list(w) for w in ways if len(w) >= 2]
    while remaining:
        current = remaining.pop(0)
        while current[0] != current[-1]:
            for i, w in enumerate(remaining):
                if w[0] == current[-1]:
                    current.extend(w[1:]); remaining.pop(i); break
                if w[-1] == current[-1]:
                    current.extend(list(reversed(w))[1:]); remaining.pop(i); break
                if w[-1] == current[0]:
                    current = w + current[1:]; remaining.pop(i); break
                if w[0] == current[0]:
                    current = list(reversed(w)) + current[1:]; remaining.pop(i); break
            else:
                break
        if current[0] == current[-1] and len(current) >= 4:
            rings.append(current)
    return rings


def signed_area(ring):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        s += (x2 - x1) * (y2 + y1)
    return -s / 2.0


def polygon_centroid(ring):
    a = 0.0; cx = 0.0; cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        cross = x1 * y2 - x2 * y1
        a += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross
    a *= 0.5
    if abs(a) < 1e-12:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    return cx / (6 * a), cy / (6 * a)


def point_in_ring(pt, ring):
    x, y = pt; inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: inside = not inside
    return inside


def ring_bbox(ring):
    xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def pole_of_inaccessibility(outer, holes):
    minx, miny, maxx, maxy = ring_bbox(outer)
    steps = 40; dx = (maxx - minx) / steps; dy = (maxy - miny) / steps
    best = None; best_d = -1
    sampled = outer[::5] or outer
    for i in range(1, steps):
        for j in range(1, steps):
            x = minx + i * dx; y = miny + j * dy
            if not point_in_ring((x, y), outer): continue
            if any(point_in_ring((x, y), h) for h in holes): continue
            d = min(math.hypot(x - p[0], y - p[1]) for p in sampled)
            if d > best_d: best_d = d; best = (x, y)
    return best


def rdp(points, eps):
    if len(points) < 3: return points
    def perp(p, a, b):
        (x, y), (x1, y1), (x2, y2) = p, a, b
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0: return math.hypot(x - x1, y - y1)
        t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
        t = max(0, min(1, t))
        return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
    stack = [(0, len(points) - 1)]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    while stack:
        i, j = stack.pop()
        max_d = 0; idx = -1
        for k in range(i + 1, j):
            d = perp(points[k], points[i], points[j])
            if d > max_d: max_d = d; idx = k
        if max_d > eps and idx != -1:
            keep[idx] = True
            stack.append((i, idx)); stack.append((idx, j))
    return [p for p, k in zip(points, keep) if k]


def simplify_geometry(geom, eps):
    def ring(r):
        s = rdp(r, eps)
        if s[0] != s[-1]: s.append(s[0])
        return s if len(s) >= 4 else r
    if geom['type'] == 'Polygon':
        return {'type': 'Polygon', 'coordinates': [ring(r) for r in geom['coordinates']]}
    return {'type': 'MultiPolygon',
            'coordinates': [[ring(r) for r in poly] for poly in geom['coordinates']]}


def make_feature(rel):
    tags = rel.get('tags', {})
    raw_name = tags.get('name:en') or tags.get('name')
    name = NAME_ALIASES.get(raw_name, raw_name)
    outers, inners = [], []
    for m in rel.get('members', []):
        if m.get('type') != 'way' or 'geometry' not in m: continue
        coords = [[pt['lon'], pt['lat']] for pt in m['geometry']]
        (outers if m.get('role') == 'outer' else inners).append(coords)
    outer_rings = stitch_rings(outers)
    inner_rings = stitch_rings(inners) if inners else []
    if not outer_rings:
        print(f'!! no outer ring for {name}', file=sys.stderr); return None
    polys = []
    for o in outer_rings:
        holes = [h for h in inner_rings if point_in_ring(h[0], o)]
        polys.append([o] + holes)
    geometry = ({'type': 'Polygon', 'coordinates': polys[0]}
                if len(polys) == 1
                else {'type': 'MultiPolygon', 'coordinates': polys})
    div, hq = DIVISION_HQ.get(name, ('?', '?'))
    biggest = max((polys[0][0] if len(polys) == 1 else max(polys, key=lambda p: abs(signed_area(p[0])))[0]),
                  key=lambda _: 0) if polys else None
    outer = polys[0][0] if len(polys) == 1 else max(polys, key=lambda p: abs(signed_area(p[0])))[0]
    holes_of_outer = polys[0][1:] if len(polys) == 1 else []
    cx, cy = polygon_centroid(outer)
    bbox = ring_bbox(outer)
    anchor = pole_of_inaccessibility(outer, holes_of_outer) or (cx, cy)
    return {
        'type': 'Feature',
        'id': slugify(name),
        'properties': {
            'name': name,
            'type': 'district',
            'category': 'administrative',
            'district': name,
            'division': div,
            'state': 'Rajasthan',
            'area': None,
            'established': None,
            'source': f'OSM admin_level=5 relation/{rel["id"]}',
            'lastUpdated': RETRIEVED,
            'headquarters': hq,
            'newDistrict': name in NEW_DISTRICTS_2023,
            'centroid': [round(cx, 5), round(cy, 5)],
            'labelAnchor': [round(anchor[0], 5), round(anchor[1], 5)],
            'bbox': [round(bbox[0], 5), round(bbox[1], 5),
                     round(bbox[2], 5), round(bbox[3], 5)],
            'notes': {'facts': [], 'mnemonic': '', 'significance': ''},
            'ecology': {'flora': [], 'fauna': [], 'ecosystem': ''},
            'governance': {'authority': 'District Collector', 'status': 'active'},
        },
        'geometry': geometry,
    }


def main():
    with open(RAW) as f:
        raw = json.load(f)
    feats = [f for f in (make_feature(r) for r in raw['elements']) if f]
    feats.sort(key=lambda f: f['properties']['name'])

    names_seen = {f['properties']['name'] for f in feats}
    expected = set(DIVISION_HQ.keys())
    missing = expected - names_seen; extra = names_seen - expected
    if missing: print(f'!! missing: {sorted(missing)}', file=sys.stderr)
    if extra:   print(f'!! extra: {sorted(extra)}', file=sys.stderr)
    if missing or extra: sys.exit(1)

    full = {'type': 'FeatureCollection', 'features': feats}
    GEOJSON_FULL.write_text(json.dumps(full, separators=(',', ':')))
    print(f'wrote {GEOJSON_FULL.name}: {GEOJSON_FULL.stat().st_size:,} bytes')

    simple = {'type': 'FeatureCollection', 'features': [
        {**f, 'geometry': simplify_geometry(f['geometry'], eps=0.005)} for f in feats]}
    GEOJSON_OUT.write_text(json.dumps(simple, separators=(',', ':')))
    print(f'wrote {GEOJSON_OUT.name}: {GEOJSON_OUT.stat().st_size:,} bytes')

    all_lons = []; all_lats = []
    for f in feats:
        b = f['properties']['bbox']
        all_lons += [b[0], b[2]]; all_lats += [b[1], b[3]]

    # atlas.json is *manually maintained* — it lists every layer (admin + env +
    # future). Overwriting it here would nuke the environment layer entries
    # BUILD_ENV.py depends on. Districts geometry is the only thing this script
    # owns; if the projection bounds need updating, edit atlas.json by hand and
    # note the change in CHANGELOG.md.
    return
    atlas = {  # pragma: no cover  — kept for reference
        'name': 'Rajasthan Digital Atlas',
        'version': '1.0',
        'dataVersion': DATA_VERSION,
        'lastUpdated': RETRIEVED,
        'projection': {
            'crs': 'EPSG:4326',
            'display': {
                'type': 'equirectangular-corrected',
                'note': ('Equirectangular corrected by cos(midlatitude) so shapes '
                         'look right at Rajasthan mid-latitudes without a full LCC.'),
            },
            'bounds': {
                'minLon': round(min(all_lons), 5), 'maxLon': round(max(all_lons), 5),
                'minLat': round(min(all_lats), 5), 'maxLat': round(max(all_lats), 5),
            },
        },
        'stats': {
            'districts': len(feats),
            'divisions': len({v[0] for v in DIVISION_HQ.values()}),
            'newDistricts': len(NEW_DISTRICTS_2023),
        },
        'divisions': sorted({v[0] for v in DIVISION_HQ.values()}),
        'layers': [
            {
                'id': 'districts', 'name': 'Districts', 'type': 'polygon',
                'category': 'administrative',
                'data': 'atlas/data/districts.geojson',
                'searchable': True, 'visible': True,
                'featureType': 'district',
                'style': {'fill': 'var(--layer-districts-fill)',
                          'stroke': 'var(--layer-districts-stroke)'},
            },
        ],
        'sources': [
            {'name': 'OpenStreetMap contributors',
             'url': 'https://www.openstreetmap.org/',
             'license': 'ODbL 1.0',
             'used': 'admin_level=5 relations for 41 Rajasthan districts',
             'retrieved': RETRIEVED},
            {'name': 'Rajasthan gazette notifications',
             'used': 'District→division and district→HQ mapping'},
        ],
    }
    ATLAS_OUT.write_text(json.dumps(atlas, indent=2))
    print(f'wrote {ATLAS_OUT.name}: {ATLAS_OUT.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
