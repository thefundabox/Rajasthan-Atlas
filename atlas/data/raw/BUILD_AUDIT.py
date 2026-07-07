"""
BUILD_AUDIT.py — generate a self-contained HTML data-audit for the atlas.

Reads every shipped GeoJSON and atlas.json, projects geometries to SVG
coordinates using the atlas's equirectangular-corrected projection, then
emits `audit/atlas-audit.html` — a single-file QA report for review before
expanding the atlas further.

Report sections:
  1. Executive summary — counts, quality flags, overlaps
  2. Combined labelled map (every layer visible)
  3. Per-layer breakdowns — inset map + feature table
  4. Overlap analysis — protective-area containment and district clustering
  5. Point-only features and unresolved data issues
"""

import json
import math
import re
from pathlib import Path
from datetime import datetime

HERE   = Path(__file__).parent
DATA   = HERE.parent
OUT    = HERE.parent.parent.parent / 'audit' / 'atlas-audit.html'

# Layers to audit, in display order.
LAYERS = [
    ('districts',            'Districts',            'admin',      '#6b5c3f', '#f9f4e7'),
    ('national-parks',       'National Parks',       'environment','#2f5f3d', '#cfe1d3'),
    ('tiger-reserves',       'Tiger Reserves',       'environment','#c85a1e', '#f2c9a8'),
    ('wildlife-sanctuaries', 'Wildlife Sanctuaries', 'environment','#7aa864', '#d9e8ce'),
    ('ramsar-sites',         'Ramsar Sites',         'environment','#2c5da8', '#c5d7ef'),
    ('wetlands',             'Wetlands (non-Ramsar)','environment','#2e8a9c', '#c1e0e5'),
    ('biosphere-reserves',   'Biosphere Reserves',   'environment','#7a4a9c', '#dccbe6'),
]

# ---------------------------------------------------------------------------
# Projection (mirror ProjectionEngine.js — equirectangular corrected).
# ---------------------------------------------------------------------------

def load_manifest():
    return json.loads((DATA / 'atlas.json').read_text())

def make_projection(manifest, width, height, pad):
    b = manifest['projection']['bounds']
    lat0 = (b['minLat'] + b['maxLat']) / 2
    kx = math.cos(math.radians(lat0))
    spanX = (b['maxLon'] - b['minLon']) * kx
    spanY = (b['maxLat'] - b['minLat'])
    scale = min((width - 2*pad) / spanX, (height - 2*pad) / spanY)
    ox = pad + ((width - 2*pad) - spanX * scale) / 2
    oy = pad + ((height - 2*pad) - spanY * scale) / 2
    def project(lon, lat):
        x = ox + (lon - b['minLon']) * kx * scale
        y = oy + (b['maxLat'] - lat) * scale
        return round(x, 2), round(y, 2)
    return project

# ---------------------------------------------------------------------------
# GeoJSON walking helpers
# ---------------------------------------------------------------------------

def load_layer(key):
    p = DATA / f'{key}.geojson'
    return json.loads(p.read_text()) if p.exists() else {'features': []}

def rings_of(geom):
    """Yield (rings) for each polygon in a Polygon or MultiPolygon."""
    if not geom: return
    if geom['type'] == 'Polygon':
        yield geom['coordinates']
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']:
            yield poly

def bbox_of(geom):
    minx, miny, maxx, maxy = math.inf, math.inf, -math.inf, -math.inf
    def eat(pt):
        nonlocal minx, miny, maxx, maxy
        x, y = pt
        if x < minx: minx = x
        if x > maxx: maxx = x
        if y < miny: miny = y
        if y > maxy: maxy = y
    def walk(c, depth):
        if not c: return
        if isinstance(c[0], (int, float)): eat(c); return
        for inner in c: walk(inner, depth+1)
    if geom['type'] == 'Point':
        eat(geom['coordinates']); return [minx, miny, minx, miny]
    walk(geom['coordinates'], 0)
    return [minx, miny, maxx, maxy]

def bbox_intersects(a, b):
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])

def bbox_area(b):
    return max(0.0, b[2]-b[0]) * max(0.0, b[3]-b[1])

def point_in_ring(pt, ring):
    x, y = pt; inside = False
    for (x1,y1),(x2,y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: inside = not inside
    return inside

def point_in_geom(pt, geom):
    if geom['type'] == 'Point':
        return abs(geom['coordinates'][0]-pt[0])+abs(geom['coordinates'][1]-pt[1]) < 1e-6
    for rings in rings_of(geom):
        if not rings: continue
        if point_in_ring(pt, rings[0]):
            # Inside outer — check holes
            in_hole = any(point_in_ring(pt, h) for h in rings[1:])
            if not in_hole: return True
    return False

# ---------------------------------------------------------------------------
# SVG emission
# ---------------------------------------------------------------------------

def geom_to_svg_paths(geom, project):
    """Return list of SVG path 'd' strings for polygon-like geoms; ('circle',x,y) for points."""
    if not geom: return []
    if geom['type'] == 'Point':
        x, y = project(*geom['coordinates'])
        return [('circle', x, y)]
    out = []
    for rings in rings_of(geom):
        d = ''
        for ring in rings:
            pts = [project(*p) for p in ring]
            if len(pts) < 3: continue
            d += 'M' + f'{pts[0][0]},{pts[0][1]}'
            for x, y in pts[1:]:
                d += f'L{x},{y}'
            d += 'Z'
        if d: out.append(('path', d))
    return out

def emit_svg_layer(features, project, class_name, label_class):
    """Emit an SVG <g> containing all features + labels for one layer."""
    parts = [f'<g class="l-{class_name}">']
    label_parts = []
    for feat in features:
        p = feat.get('properties', {})
        name = p.get('name', feat.get('id', '?'))
        quality = p.get('geometryQuality', 'polygon')
        parts.append(f'<g class="feat" data-id="{feat.get("id","")}">')
        for kind, *args in geom_to_svg_paths(feat.get('geometry'), project):
            if kind == 'path':
                parts.append(f'<path d="{args[0]}"/>')
            else:
                x, y = args
                r = 4 if quality == 'point' else 2.5
                parts.append(f'<circle class="pt" cx="{x}" cy="{y}" r="{r}"/>')
        parts.append('</g>')
        # Label anchor
        anchor = p.get('labelAnchor') or p.get('centroid')
        if anchor:
            lx, ly = project(*anchor)
            label_parts.append(
                f'<text class="lbl {label_class}" x="{lx}" y="{ly}" text-anchor="middle">{svg_esc(name)}</text>')
    parts.append('</g>')
    return ''.join(parts), ''.join(label_parts)

def svg_esc(s):
    return (str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
            .replace('"','&quot;'))

def html_esc(s):
    return svg_esc(s).replace("'", '&#39;')

# ---------------------------------------------------------------------------
# Analysis: overlaps, quality flags
# ---------------------------------------------------------------------------

def analyse(layers_data):
    """
    Return dicts of:
      point_only     — { layer_id: [feature_id, ...] }
      containments   — [ (parent_layer, parent_id, child_layer, child_id, reason) ]
      district_load  — { district_name: [ (layer_id, feature_id), ... ] }
      duplicates     — [ (id_a, id_b, why) ]
    """
    point_only  = {}
    containments = []
    district_load = {}
    duplicates  = []

    # Per-layer geometry
    all_feats = []
    for lid, fc in layers_data.items():
        for f in fc.get('features', []):
            all_feats.append((lid, f))

    # Point-only
    for lid, f in all_feats:
        gq = f.get('properties', {}).get('geometryQuality', 'polygon')
        if gq in ('point',):
            point_only.setdefault(lid, []).append(f['id'])

    # District load — which districts host how many env features
    dist_feats = layers_data.get('districts', {}).get('features', [])
    env_layers = [lid for lid, _, cat, _, _ in LAYERS if cat == 'environment']
    for dfeat in dist_feats:
        dname = dfeat['properties']['name']
        dgeom = dfeat['geometry']
        dbbox = bbox_of(dgeom)
        hits = []
        for lid, f in all_feats:
            if lid not in env_layers: continue
            fbbox = bbox_of(f['geometry'])
            if not bbox_intersects(dbbox, fbbox): continue
            # Centroid-in-polygon
            cent = f.get('properties', {}).get('centroid')
            if not cent: continue
            if point_in_geom(tuple(cent), dgeom):
                hits.append((lid, f['id'], f['properties'].get('name','?')))
        if hits:
            district_load[dname] = hits

    # Containment among env features (NP inside TR etc.)
    env_feats = [(lid, f) for lid, f in all_feats if lid in env_layers]
    for i, (la, fa) in enumerate(env_feats):
        for lb, fb in env_feats:
            if fa['id'] == fb['id'] or la == lb: continue
            # Is fa's centroid inside fb's polygon?
            cent = fa.get('properties', {}).get('centroid')
            if not cent: continue
            if fb['geometry'].get('type') in ('Polygon','MultiPolygon'):
                if point_in_geom(tuple(cent), fb['geometry']):
                    containments.append((
                        lb, fb['id'], fb['properties']['name'],
                        la, fa['id'], fa['properties']['name'],
                    ))

    # Duplicates by name-similarity within category
    seen_names = {}
    for lid, f in env_feats:
        base = re.sub(r'\W+', '', f['properties']['name'].lower().split('(')[0])
        seen_names.setdefault(base, []).append((lid, f['id'], f['properties']['name']))
    for base, entries in seen_names.items():
        if len(entries) > 1:
            for i in range(len(entries)):
                for j in range(i+1, len(entries)):
                    duplicates.append((entries[i], entries[j], f'shared root name "{base}"'))

    return dict(
        point_only=point_only,
        containments=containments,
        district_load=district_load,
        duplicates=duplicates,
    )

# ---------------------------------------------------------------------------
# HTML rendering
# ---------------------------------------------------------------------------

CSS = """
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
       color: #1c1b18; background: #f4efe4; }
main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
h1 { font-family: "Iowan Old Style", Georgia, serif; font-weight: 500; font-size: 34px; margin: 0 0 4px; }
.subtitle { color: #7a726a; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 32px; }
h2 { font-family: "Iowan Old Style", Georgia, serif; font-weight: 500; font-size: 22px;
     border-bottom: 1px solid #d9cfba; padding-bottom: 8px; margin: 48px 0 20px; }
h3 { font-family: "Iowan Old Style", Georgia, serif; font-weight: 500; font-size: 16px;
     letter-spacing: 0.04em; margin: 24px 0 8px; }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.card { background: white; border-radius: 6px; padding: 16px; border: 1px solid #d9cfba;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.card .big { font-family: "Iowan Old Style", Georgia, serif; font-size: 32px; line-height: 1; margin-bottom: 4px; }
.card .lbl { color: #7a726a; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.card.warn { border-color: #c85a1e; }
.card.ok   { border-color: #7aa864; }

.map-wrap { background: #fbf7ec; border: 1px solid #d9cfba; border-radius: 6px; padding: 12px;
            margin: 16px 0; }
.map-wrap svg { width: 100%; height: auto; display: block; }

table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; font-size: 13px; }
th { text-align: left; background: #ede4d0; padding: 8px 10px; border-bottom: 1px solid #d9cfba;
     font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; font-size: 11px; color: #4a4640; }
td { padding: 6px 10px; border-bottom: 1px solid #ede4d0; vertical-align: top; }
tr:last-child td { border-bottom: 0; }
td.mono { font-family: "SF Mono", Menlo, monospace; font-size: 12px; color: #4a4640; }
.pill { display: inline-block; font-size: 10px; padding: 1px 8px; border-radius: 999px;
        letter-spacing: 0.06em; text-transform: uppercase; }
.pill.polygon      { background: #cfe1d3; color: #2f5f3d; }
.pill.multipolygon { background: #cfe1d3; color: #2f5f3d; }
.pill.point        { background: #f2c9a8; color: #c85a1e; }
.pill.linestring   { background: #c5d7ef; color: #2c5da8; }
.pill.warn         { background: #f2c9a8; color: #c85a1e; }
.pill.ok           { background: #cfe1d3; color: #2f5f3d; }
.pill.info         { background: #ede4d0; color: #7a6c4f; }

.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 12px 0; font-size: 12px; }
.legend .sw { display: inline-block; width: 12px; height: 12px; border-radius: 2px;
              border: 1px solid #333; margin-right: 6px; vertical-align: middle; }

.note { background: #fbf7ec; border-left: 3px solid #b25e28; padding: 10px 12px;
        border-radius: 4px; margin: 12px 0; font-size: 13px; color: #4a4640; }
.note strong { color: #1c1b18; }

/* --- Map style --- */
svg .l-districts path { fill: #f9f4e7; stroke: #6b5c3f; stroke-width: 0.4; }
svg .l-national-parks       path { fill: #cfe1d3; stroke: #2f5f3d; stroke-width: 0.9; }
svg .l-tiger-reserves       path { fill: #f2c9a8; stroke: #c85a1e; stroke-width: 1.1; fill-opacity: 0.55; }
svg .l-wildlife-sanctuaries path { fill: #d9e8ce; stroke: #7aa864; stroke-width: 0.7; fill-opacity: 0.6; }
svg .l-ramsar-sites         path { fill: #c5d7ef; stroke: #2c5da8; stroke-width: 1.1; }
svg .l-wetlands             path { fill: #c1e0e5; stroke: #2e8a9c; stroke-width: 0.8; }
svg .l-biosphere-reserves   path { fill: #dccbe6; stroke: #7a4a9c; stroke-width: 0.8; }

svg circle.pt.point { fill: white; stroke-width: 2; }
svg .l-national-parks       circle.pt { stroke: #2f5f3d; }
svg .l-tiger-reserves       circle.pt { stroke: #c85a1e; }
svg .l-wildlife-sanctuaries circle.pt { stroke: #7aa864; }
svg .l-ramsar-sites         circle.pt { stroke: #2c5da8; }
svg .l-wetlands             circle.pt { stroke: #2e8a9c; }

/* --- Labels --- */
svg text.lbl { font-family: "Iowan Old Style", Georgia, serif; pointer-events: none;
               paint-order: stroke; stroke: white; stroke-width: 3px; stroke-linejoin: round; }
svg text.lbl.dist   { fill: #4a4640; font-size: 8px; opacity: 0.55; }
svg text.lbl.env    { fill: #1c1b18; font-size: 8.5px; font-weight: 500; }
svg text.lbl.small  { fill: #4a4640; font-size: 7.5px; }
svg text.lbl.point  { fill: #c85a1e; font-size: 8px; font-weight: 600; }
"""

def render_html(manifest, layers_data, analysis):
    now = datetime.utcnow().strftime('%Y-%m-%d')

    # ------ Combined map ------
    project = make_projection(manifest, width=1200, height=1400, pad=30)
    all_layer_svg = []
    all_label_svg = []
    for lid, name, cat, stroke, fill in LAYERS:
        feats = layers_data.get(lid, {}).get('features', [])
        lclass = lid
        # Label class hierarchy — districts smallest, env prominent, points highlighted
        lbl_cls = 'dist' if lid == 'districts' else (
                  'point' if any(f.get('properties',{}).get('geometryQuality')=='point'
                                 for f in feats) and cat=='environment' else 'env')
        g, labels = emit_svg_layer(feats, project, lclass, 'dist' if lid=='districts' else 'env')
        all_layer_svg.append(g)
        all_label_svg.append(labels)

    combined_svg = (
        f'<svg viewBox="0 0 1200 1400" xmlns="http://www.w3.org/2000/svg">' +
        ''.join(all_layer_svg) + ''.join(all_label_svg) + '</svg>'
    )

    # ------ Per-layer inset maps ------
    per_layer_svgs = {}
    inset_project = make_projection(manifest, width=800, height=880, pad=20)
    for lid, name, cat, stroke, fill in LAYERS:
        feats = layers_data.get(lid, {}).get('features', [])
        # Show districts as a faint backdrop for context
        base_g, _ = emit_svg_layer(
            layers_data.get('districts', {}).get('features', []),
            inset_project, 'districts', 'dist')
        target_g, target_labels = emit_svg_layer(feats, inset_project, lid, 'env')
        per_layer_svgs[lid] = (
            f'<svg viewBox="0 0 800 880" xmlns="http://www.w3.org/2000/svg">' +
            base_g + target_g + target_labels + '</svg>'
        )

    # ------ Summary counts ------
    total_features = sum(len(fc.get('features', [])) for fc in layers_data.values())
    point_only_count = sum(len(v) for v in analysis['point_only'].values())
    layers_with_data = sum(1 for fc in layers_data.values() if fc.get('features'))

    # ------ Build HTML ------
    parts = [f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>Rajasthan Atlas — Data Audit</title>
<style>{CSS}</style>
</head><body>
<main>
  <h1>Rajasthan Atlas — Data Audit</h1>
  <div class="subtitle">Generated {now} · Engine v{manifest.get('version','?')} · Data v{manifest.get('dataVersion','?')}</div>

  <section>
    <div class="summary-grid">
      <div class="card"><div class="big">{len(LAYERS)}</div><div class="lbl">Layers registered</div></div>
      <div class="card ok"><div class="big">{layers_with_data}</div><div class="lbl">Layers with data</div></div>
      <div class="card"><div class="big">{total_features}</div><div class="lbl">Total features</div></div>
      <div class="card {'warn' if point_only_count else 'ok'}"><div class="big">{point_only_count}</div><div class="lbl">Point-only features</div></div>
      <div class="card"><div class="big">{len(analysis['containments'])}</div><div class="lbl">Nested containments</div></div>
      <div class="card"><div class="big">{len(analysis['duplicates'])}</div><div class="lbl">Name collisions</div></div>
    </div>
  </section>

  <h2>Combined map — every layer with labels</h2>
  <div class="legend">"""]
    for lid, name, cat, stroke, fill in LAYERS:
        n = len(layers_data.get(lid, {}).get('features', []))
        parts.append(f'<span><span class="sw" style="background:{fill};border-color:{stroke}"></span>{html_esc(name)} <span style="color:#7a726a">({n})</span></span>')
    parts.append('</div>')

    parts.append(f'<div class="map-wrap">{combined_svg}</div>')

    # -------- Per-layer sections --------
    parts.append('<h2>Per-layer detail</h2>')
    for lid, name, cat, stroke, fill in LAYERS:
        feats = layers_data.get(lid, {}).get('features', [])
        parts.append(f'<h3 style="color:{stroke}">{html_esc(name)} <span style="color:#7a726a;font-weight:400">— {len(feats)} feature{"" if len(feats)==1 else "s"}</span></h3>')
        if not feats:
            parts.append('<div class="note"><strong>Layer is empty by design.</strong> ')
            if lid == 'biosphere-reserves':
                parts.append('Rajasthan currently has no MoEFCC-notified Biosphere Reserve under the Man and Biosphere Programme. Reserved for a future notification.')
            parts.append('</div>')
            continue
        parts.append(f'<div class="map-wrap">{per_layer_svgs[lid]}</div>')
        # Table
        parts.append('<table>')
        parts.append('<thead><tr>'
                     '<th>Name</th><th>District(s)</th><th>Area (km²)</th>'
                     '<th>Notified</th><th>Geometry</th><th>Notes</th></tr></thead><tbody>')
        for f in feats:
            p = f.get('properties', {})
            gq = p.get('geometryQuality', 'polygon')
            note_bits = []
            if p.get('geometryNote'): note_bits.append(p['geometryNote'])
            if p.get('remark'):       note_bits.append(p['remark'])
            parts.append(
                f'<tr><td>{html_esc(p.get("name","?"))}</td>'
                f'<td>{html_esc(p.get("district") or "—")}</td>'
                f'<td class="mono">{p.get("area") if p.get("area") is not None else "—"}</td>'
                f'<td class="mono">{html_esc(p.get("established") or "—")}</td>'
                f'<td><span class="pill {gq}">{gq}</span></td>'
                f'<td style="font-size:12px;color:#4a4640">{html_esc(" · ".join(note_bits) or "—")}</td></tr>'
            )
        parts.append('</tbody></table>')

    # -------- Overlap analysis --------
    parts.append('<h2>Overlap analysis</h2>')
    if analysis['containments']:
        parts.append('<div class="note"><strong>Note:</strong> most containments below are <em>expected by design</em> — e.g., a National Park sits inside its Tiger Reserve; Wildlife Sanctuaries form buffer zones. They are listed for QA context, not as errors.</div>')
        parts.append('<table><thead><tr><th>Parent layer</th><th>Parent</th><th>Contains</th><th>Child layer</th><th>Interpretation</th></tr></thead><tbody>')
        for parent_layer, parent_id, parent_name, child_layer, child_id, child_name in analysis['containments']:
            interp = interpret(parent_layer, parent_name, child_layer, child_name)
            parts.append(
                f'<tr><td>{html_esc(parent_layer)}</td>'
                f'<td>{html_esc(parent_name)}</td>'
                f'<td>{html_esc(child_name)}</td>'
                f'<td>{html_esc(child_layer)}</td>'
                f'<td>{interp}</td></tr>')
        parts.append('</tbody></table>')
    else:
        parts.append('<div class="note">No containments detected between environment features.</div>')

    # -------- District clustering --------
    parts.append('<h3>Districts by environment-feature load</h3>')
    parts.append('<table><thead><tr><th>District</th><th>Feature count</th><th>Features</th></tr></thead><tbody>')
    dl = analysis['district_load']
    sorted_dl = sorted(dl.items(), key=lambda kv: -len(kv[1]))
    for dname, hits in sorted_dl:
        chip_list = ' · '.join(f'<span class="pill info">{html_esc(name)}</span>' for _, _, name in hits)
        parts.append(f'<tr><td>{html_esc(dname)}</td><td class="mono">{len(hits)}</td><td>{chip_list}</td></tr>')
    parts.append('</tbody></table>')

    # -------- Point-only features & issues log --------
    parts.append('<h2>Point-only features &amp; unresolved data issues</h2>')
    if analysis['point_only']:
        parts.append('<h3>Point-only features (no published polygon)</h3>')
        parts.append('<table><thead><tr><th>Layer</th><th>Feature</th><th>Reason</th></tr></thead><tbody>')
        for lid, ids in analysis['point_only'].items():
            for fid in ids:
                fc = layers_data.get(lid, {})
                feat = next((f for f in fc.get('features', []) if f['id']==fid), None)
                p = feat.get('properties', {}) if feat else {}
                reason = p.get('geometryNote') or point_reason(lid, fid)
                parts.append(
                    f'<tr><td>{html_esc(lid)}</td>'
                    f'<td>{html_esc(p.get("name", fid))}</td>'
                    f'<td>{html_esc(reason)}</td></tr>')
        parts.append('</tbody></table>')

    # Additional unresolved items collected from feature notes.
    unresolved = []
    for lid, fc in layers_data.items():
        for f in fc.get('features', []):
            note = (f.get('properties', {}).get('remark') or '').strip()
            if note:
                unresolved.append((lid, f.get('properties',{}).get('name','?'), note))
    if unresolved:
        parts.append('<h3>Feature notes flagged during build</h3>')
        parts.append('<table><thead><tr><th>Layer</th><th>Feature</th><th>Note</th></tr></thead><tbody>')
        for lid, name, note in unresolved:
            parts.append(f'<tr><td>{html_esc(lid)}</td><td>{html_esc(name)}</td><td>{html_esc(note)}</td></tr>')
        parts.append('</tbody></table>')

    # -------- Recommendations --------
    parts.append("""
    <h2>Recommendations before expanding</h2>
    <ol style="line-height:1.7">
      <li><strong>Chase down point-only polygons</strong> — six environment features currently ship as points because their boundaries are not published in OpenStreetMap. Preferred sources: Rajasthan Forest Department shapefiles (formal request), NTCA notification annexures, or Ramsar RSIS site-shape uploads for Khichan and Menar.</li>
      <li><strong>Confirm factual notes with a subject-matter reviewer.</strong> Every <code>notes.facts</code> entry is verifiable content; deeper source-linking is intentionally left as a follow-up.</li>
      <li><strong>Add a name-in-Hindi field</strong> for Hindi-language readers. Schema supports <code>properties.name:hi</code>; source curriculum textbooks or Rajasthan gazette Hindi editions.</li>
      <li><strong>Extend wetlands from the National Wetland Atlas</strong> (Space Applications Centre, ISRO). Current 8 major lakes are a starting set, not comprehensive.</li>
      <li><strong>Do not open Module 3 (Rivers / Aravalli / Terrain) until this audit is reviewed.</strong> The plug-in path from ARCHITECTURE.md § "Adding a new layer" applies unchanged.</li>
    </ol>
""")

    parts.append('</main></body></html>')
    return ''.join(parts)


def interpret(parent_layer, parent_name, child_layer, child_name):
    """Short human-readable reason for why two features overlap."""
    if parent_layer == 'tiger-reserves' and child_layer == 'national-parks':
        return 'Expected — the National Park is the core of the Tiger Reserve.'
    if parent_layer == 'tiger-reserves' and child_layer == 'wildlife-sanctuaries':
        return 'Expected — WLS is inside the TR buffer.'
    if parent_layer == 'wildlife-sanctuaries' and child_layer == 'tiger-reserves':
        return 'Ramgarh Vishdhari: the WLS became the core of the TR (2022).'
    if parent_layer == 'national-parks' and child_layer == 'ramsar-sites':
        return 'Keoladeo Ghana holds both NP and Ramsar designations.'
    if parent_layer == 'ramsar-sites' and child_layer == 'national-parks':
        return 'Keoladeo Ghana holds both NP and Ramsar designations.'
    if parent_layer == 'wetlands' and child_layer == 'ramsar-sites':
        return 'Wetland extent envelopes the Ramsar core (Sambhar).'
    if parent_layer == 'ramsar-sites' and child_layer == 'wetlands':
        return 'Ramsar core sits within the broader wetland extent (Sambhar).'
    return 'Cross-check required.'


def point_reason(lid, fid):
    if fid == 'sariska-np':
        return 'Sariska NP polygon coincident with the wider Sariska TR polygon in OSM; NP shipped as point to avoid double-count.'
    if fid == 'dholpur-karauli-tr':
        return 'Notified August 2023 — boundary not yet published in OSM.'
    if fid in ('khichan-ramsar','menar-ramsar'):
        return 'Designated February 2025 — boundary not yet published in OSM. Coordinates from PIB press release.'
    if fid == 'sariska-wls':
        return 'WLS extent outside NP core not distinct in OSM; shipped as point.'
    if fid == 'sitamata-wls':
        return 'Boundary not indexed in OSM at retrieval date.'
    return 'Boundary not available in OSM.'

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    manifest = load_manifest()
    layers_data = {lid: load_layer(lid) for lid, *_ in LAYERS}
    analysis = analyse(layers_data)
    OUT.parent.mkdir(exist_ok=True, parents=True)
    OUT.write_text(render_html(manifest, layers_data, analysis))
    print(f'wrote {OUT.relative_to(OUT.parent.parent.parent)}: {OUT.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
