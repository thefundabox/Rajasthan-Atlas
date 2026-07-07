# Pending — deferred work across the atlas

The central log of *things we decided to defer, not forget*. Every entry names what to fix, why it was deferred, and the smallest concrete step to close it.

Kept in-tree so `git blame` shows when items land or get scoped.

---

## Peaks — expand from 8 → 15+ real named summits

**Current state:** `peaks.geojson` ships 8 named features (3 OSM `natural=peak` nodes + 5 OSM `historic=fort` hill-fort summits). See CHANGELOG "Peak honesty pass".

**What to add** — 7 additional peaks that are widely documented in Rajasthan geography sources but currently lack either an OSM reference or a verified coordinate in-tree:

| Peak | Elev. (m) | District | Kind | Source path to close |
|---|---:|---|---|---|
| **Ser Peak** | 1,597 | Sirohi | natural peak | Wikipedia / Sirohi gazetteer coords; probably no OSM `natural=peak` node |
| **Delwara Peak** | 1,442 | Sirohi | natural peak | Same — Mount Abu massif |
| **Jarga Peak** | 1,431 | Udaipur | natural peak | Wikipedia / Udaipur gazetteer coords |
| **Raghunathgarh** | 1,055 | Sikar | natural peak (& temple site) | Widely cited as the Shekhawati Aravalli high point |
| **Nag Pahar** | ~795 | Ajmer | natural peak | Pushkar–Ajmer area; likely a `place=locality` in OSM |
| **Bhairach** | ~792 | Alwar | natural peak | Sariska area |
| **Bhanwarmata** | ~669 | Chittorgarh | temple-peak | Notable religious summit |

**Recipe to close:**
1. Run an Overpass query with the exact names above against `natural=peak`, `natural=locality`, `place=locality`, `historic=archaeological_site`, `historic=temple` inside Rajasthan.
2. For each hit, capture `lat / lon / ele / name` and add to the `NAMED_PEAKS` manifest in `BUILD_PHYSICAL.py`.
3. For any peak with no OSM hit, use OSM Nominatim to search the exact name; if that fails, cite Wikipedia coordinates in the `lonlat` field and add `Wikipedia` to `source_ref`.
4. Rerun `python3 BUILD_PHYSICAL.py`. No code change to the app.

**Anti-goal:** synthetic descriptors ("Aravalli Peak · Sikar"). Every added feature must be a real named summit with a real citation chain.

---

## Terrain — tile pyramid for zoom fidelity

**Current state:** single 928×890 PNG at ~1 km/pixel from Mapzen terrarium tiles at zoom 7. At atlas zoom > ~4×, the hillshade visibly pixelates.

**What to add:** a tile pyramid at zoom 8 (~500 m/px) and/or zoom 9 (~250 m/px) for detail views. Roughly 4–16× the tile count of the current pass.

**Recipe:**
1. Extend `BUILD_TERRAIN.py`: parametrise `ZOOM`; add `--zoom 8` / `--zoom 9` runs.
2. Emit multiple PNGs to `atlas/data/terrain/{zoom}/index.png` + a `terrain-manifest.json` listing them.
3. Update `TerrainLayer.js` to swap the `<image href>` based on `Atlas.interaction.currentZoom()`.

No engine change needed — `TerrainLayer.js` is already architected to accept a manifest.

---

## Rivers — real variable-width strokes (source → mouth)

**Current state:** stroke width is per-*river* (feature-id CSS selector). Chambal 1.5 vs Berach 0.7 gives the right visual hierarchy across rivers, but each single river renders at constant width from source to mouth.

**What to add:** stroke that visibly widens downstream — source narrower, mouth wider.

**Recipe (approach A, purely CSS):** in `BUILD_PHYSICAL.py`, split each `MultiLineString` river into three ordered segments (upstream / middle / downstream) via arc-length. Emit three CSS-selectable features with `data-part` attributes. `physical.css` gives each part a different stroke width.

**Recipe (approach B, SVG-native):** switch the Renderer to emit `<path>` with a stroke-width that varies via `stroke-width` on multiple sub-paths, or fake it via layered paths. More invasive.

Prefer A — no engine change.

---

## Rivers — real curved labels via SVG `<textPath>`

**Current state:** river labels are rotated to the local tangent at the anchor. Reads well when the river is roughly straight through the anchor; less well on strong curves.

**What to add:** true text-along-path via SVG `<textPath>` referring to a short baseline path sampled from the river polyline around the anchor.

**Recipe:** extend `LabelManager.js` `orient: 'along'` to emit an invisible `<path id="lbl-baseline-{feat}">` with 5–7 vertices sampled from the polyline, then `<text><textPath href="#lbl-baseline-{feat}" startOffset="50%">…</textPath></text>`. Keep the current rotated-text fallback for browsers without textPath (all modern do).

---

## Lakes — atlas-grade shoreline gradient

**Current state:** heavier shoreline stroke + `drop-shadow` filter — reads as "depression" but not as a proper hand-painted lake.

**What to add:** a subtle radial or linear gradient (deeper blue toward centre, paler at shoreline) — the standard atlas convention.

**Recipe:** SVG `<radialGradient>` per lake, referenced by CSS `fill: url(#grad-lake-<id>)`. Or a single `<pattern>` reused across all lakes.

---

## Header — duplicate "Print" when dark theme active

**Current state:** theme-cycle button shows the *next* theme name. When Dark is active, next is Print → the theme button label reads "Print", visually colliding with the actual Print button next to it.

**Fix options:**
* Show the *current* theme name on the button, with a small icon indicating "cycle".
* Or show a fixed word like "Theme" and rely on the icon for state.
* Or move the theme cycle into an icon-only affordance.

Cosmetic; scheduled for the general interaction-design pass.

---

## Physiography + Drainage-basins — real boundaries

**Current state:** both layers are district-boundary unions (`geometryQuality: "generalised"`). Every feature declares this transparently to the reader via the quality-tier badge.

**What to close:**
* Physiographic regions — replace with a proper GeoJSON from NATMO or a geographic-boundaries dataset. Actual boundaries cross districts.
* Drainage basins — replace with CWC's basin polygon dataset. True hydrographic divides follow the Aravalli watershed.

Both are straightforward swaps in `BUILD_PHYSICAL.py`: update the source, regenerate. No engine change.

---

## Aravalli — real ridge geometry

**Current state:** synthesised polyline through 13 anchor points based on named peaks. OSM has 142 unnamed `natural=ridge` fragments but no single "Aravalli Range" feature.

**What to close:** if OSM contributors ever add a single `natural=ridge` relation for the whole Aravalli, swap `ARAVALLI_AXIS` in `BUILD_PHYSICAL.py` for the relation ID.

Alternative: manually chain the OSM ridge fragments and validate against the synthesised axis.

---

## Rivers — Sambhar, Kaylana, Bal Samand basin corrections

**Current state:** all lakes carry a `basin` attribute; for a few peripheral lakes (Sambhar salt lake, Kaylana) the basin assignment ("Luni") is coarse — they're internal-drainage / minor tributary systems.

**What to close:** cross-check with CWC basin data and refine each lake's `basin` field. Fifteen-minute review job.

---

## Terrain — clip to state boundary (optional)

**Current state:** terrain PNG covers a padded 68.8–79.0 °E × 22.2–30.9 °N bbox — visible terrain in Gujarat, MP, UP, Punjab, eastern Pakistan.

**Editorial preference:** shows Rajasthan in regional context — most atlas publishers do this. But a hard-clip is straightforward if the user prefers.

**Recipe:** SVG `<clipPath>` referencing the state outline, applied to `#atlas-terrain`.

---

## RelationsGraph — layer diversity balancing

**Current state:** for very-basin-rich features like the Chambal River, all 12 related-features slots fill with rivers of the same basin. Great for showing the drainage family; poor for showing cross-layer relatedness (WLSs, dams, forts on the Chambal).

**What to add:** cap same-layer results at ~4, then pull from other layers for the remaining slots. Small tuning of `relationsFor()` in `RelationsGraph.js`.

---

## Print CSS — reader-quality output

**Current state:** print stylesheet delivers A4 landscape at correct sizes; typography holds. Tested via browser Print → Save as PDF.

**What to add:**
* Inline legend on the printed page (currently the layers popover is hidden).
* Attribution block from `atlas.json.sources`.
* Two-page spread option (map p1, feature detail p2).

---

## Search — cross-layer relationship queries

**Current state:** search returns features whose name matches. It doesn't yet understand "rivers of the Chambal basin" or "national parks in Bharatpur division" or "Aravalli peaks in Sirohi".

**What to add:** structured-query hints in the search input — recognise phrases like "in Bharatpur", "of the Chambal", "hill forts of Rajasthan" and route through `RelationsGraph`.

---

## Industry — Sambhar Lake as a shipped feature

**Current state:** Sambhar (India's largest inland salt lake) is referenced in Module 3's rivers/lakes documentation but is **not** a feature in `lakes.geojson`. Consequently the KG edge from `major-industries-sambhar-salt` cannot resolve to a lake feature; it points at the salt-wool cluster instead.

**Recipe:**
1. Add Sambhar to `BUILD_PHYSICAL.py`'s lake manifest (`NAMED_LAKES`) — either as an OSM `natural=water` reference or from ISRO's inland-lake register (approx. 26.94 °N 75.08 °E · ~230 km² wet-season area).
2. Rerun `python3 BUILD_PHYSICAL.py`.
3. Add `{target: 'lakes-sambhar-lake', type: 'defines'}` back into `BUILD_INDUSTRY.py`'s Sambhar Salts edge, rerun `BUILD_INDUSTRY.py`.

Closes the salt→lake geographic loop that currently reads only as "salt-wool cluster".

---

## Industry — DMIC alignment as a line-string layer

**Current state:** DMIC is represented in the atlas by its two Rajasthan investment regions (KBN and Ajmer-Kishangarh) as polygons. The corridor's physical alignment — the Dedicated Freight Corridor rail line + Delhi-Mumbai Expressway highway — is not shipped as a discrete line feature.

**Recipe:**
1. Pull the DFC alignment from OSM (`railway=rail; usage=main; owner="DFCCIL"`) — the Rajasthan segment runs Rewari → Phulera → Marwar → Palanpur.
2. Add a `build_dmic_corridor()` step to `BUILD_INDUSTRY.py`, emit `atlas/data/dmic-corridor.geojson` as MultiLineString.
3. Register the new layer in `atlas.json`, extend `IndustryLayer.js` with a `data-mode="dmic"` toggle, style with a thick dashed rail line in `industry.css`.

Reads the full DMIC story visually, not just its notified nodes.

---

## Industry — StatsManager extensions for Modules 4/5/6/7

**Current state:** the header still surfaces `Districts 41 · Divisions 7` only. All Module 4-onwards additions (climate zones, crops, minerals, industry) don't feed the stats bar.

**Recipe:**
1. Extend `StatsManager.js` to accept optional per-layer counters (already discussed in prior sessions).
2. Emit rotating stats — `43 layers · 199 KG source features · 729 typed edges · 41 districts · 7 divisions` — so the reader sees the atlas's actual scale at a glance.

No engine change beyond StatsManager.

---

## Industry — cement / textile / marble craft plants that are approximate points

**Current state:** a handful of Module 7 flagship coordinates are pinned to their town centroid rather than the exact plant site — Wonder Cement Nimbahera, Ambuja Rabriyawas, UltraTech Adityapuram, Birla Corp Chanderia, HPCL-Rajasthan Refinery Pachpadra. They read correctly at atlas zoom but are typically 500–2000 m from the fenceline.

**Recipe:** cross-reference each plant against OSM (`landuse=industrial` polygons) or the operator's disclosed site plan; replace `lonlat` in the `MAJOR_INDUSTRIES` manifest in `BUILD_INDUSTRY.py`; rerun.

Editorial only — no user visible integrity claim is broken (each feature already carries `geometryQuality: "point"` + operator citation).

---

## Energy — transmission corridors as real polylines

**Current state:** Green Energy Corridor and Bhadla–Sikar–Fatehpur HVDC are shipped as district-approximated polygons with dashed strokes. Reads as "which districts the corridor runs through", not as an actual line on the map.

**Recipe:**
1. Pull the PGCIL 765 kV / HVDC alignment from OSM (`power=line; voltage=765000` or `voltage=800000`) inside the Rajasthan bbox.
2. Extend `BUILD_ENERGY.py` with a `build_transmission_lines()` that emits a `MultiLineString` GeoJSON to `transmission-lines.geojson`.
3. Register a new `line`-type layer in `atlas.json`; style with a thick electric-orange stroke in `energy.css`.
4. Keep the existing district-approximated `transmission-corridors` layer for the wider "corridor" polygon.

---

## Energy — solar-park fenceline polygons

**Current state:** Bhadla, Fatehgarh, Nokh solar parks are shipped as points. The public site footprints are visible in OSM (`landuse=industrial` polygons + `power=plant; plant:source=solar`).

**Recipe:**
1. Overpass query: `way["landuse"="industrial"]["operator"~"SECI|Adani|ReNew|SBG"]` within western Rajasthan.
2. Add a `SOLAR_PARK_POLYGONS` manifest in `BUILD_ENERGY.py`, keyed by solar-park id.
3. When emitting `solar-parks.geojson`, prefer the polygon geometry if available, otherwise fall back to the point.
4. `geometryQuality` becomes `polygon (OSM landuse)` for the polygon variants.

---

## Energy — RAPS 7-8 (under construction)

**Current state:** RAPS 7-8 (700 MW × 2 indigenous PHWRs, first-of-kind for Rajasthan) is mentioned in the RAPS Rawatbhata fact block but not shipped as a separate feature.

**Recipe:** wait for commissioning. Once RAPS-7 achieves first criticality (expected 2026-2027), add as `power-plants-raps-7-8` with the shared Rawatbhata coordinate, `status: 'under-construction'`, and a distinct fuel label ("Nuclear (indigenous PHWR)").

---

## Energy — decentralised solar (KUSUM) + small hydel

**Current state:** the atlas covers utility-scale generation only. Distributed / KUSUM solar (~1 GW of solar-pump conversions across the IGNP command) and small-hydel pockets (Bassi, Meja anicuts) are not represented.

**Recipe:** these are inherently distributed; a district-level "distributed solar penetration" polygon layer + a small-hydel point layer would round out the picture. Data is available from RREC's annual report but requires manual compilation — deferred until a Module 4-onwards stats-manager pass.

---

## Human Geography — Census 2021 refresh

**Current state:** every demographic value is Census 2011. Census 2021 has not been conducted; interim RGI projections exist but are estimates.

**Recipe:** when Census 2021 (or 2031) is conducted, regenerate `atlas/data/district-demographics.json` with the new values. The rest of Module 9 is stable — no code change needed. If the 41-district roster changes further, update `NEW_DISTRICT_PARENT` in `BUILD_HUMAN.py` accordingly.

---

## Human Geography — real border-alignment line features

**Current state:** border districts are shipped as district-union polygons. The actual state / international border alignment (a line-string) is not shipped separately.

**Recipe:** pull Survey of India's official state-boundary line-string; emit as `atlas/data/state-borders.geojson` with an `international` / `interstate` classification. Register as a `line` layer; style in `human_geography.css` with a thick ochre stroke for international + dashed cool-grey for interstate.

---

## Human Geography — municipal ward boundaries

**Current state:** the 10 municipal corporations ship as single points at the city HQ.

**Recipe:** the state Municipal Act ward notifications include GeoJSON ward polygons. Pull the roster for Jaipur (Greater + Heritage), Jodhpur (N + S), Kota (N + S), Udaipur, Ajmer, Bikaner, Bharatpur — emit `atlas/data/municipal-wards.geojson`. Would grow Module 9 from 92 → ~500 features.

---

## Human Geography — sub-district demographics (tehsil-level)

**Current state:** everything below district level is aggregated. Census 2011 records data down to tehsil / block level.

**Recipe:** emit `atlas/data/tehsil-demographics.json` (mirror of the district payload); add tehsil-level classification zones for the metrics where sub-district detail matters most (literacy, sex ratio, ST/SC %). Deferred — significantly larger dataset.

---

## Legend
Every item has a **Recipe** section so any future session (or teammate) can pick it up cold. Recipes are the smallest step from "known deferred" to "shipped".
