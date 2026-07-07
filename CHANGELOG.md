# Changelog

All notable changes to the Rajasthan Digital Atlas are recorded here. Format inspired by [Keep a Changelog](https://keepachangelog.com/).

Every module MUST append an entry with: **files added, files modified, breaking changes, data sources, validation results**.

---

## [Module 9 — Human Geography & Administrative Rajasthan] — 2026-07-07

### Added
* **15 new atlas layers** (64 total) — the seven demographic choropleths (population density / growth / literacy / sex ratio / urbanisation / ST % / SC %); the four administrative overlays (revenue divisions, scheduled areas, cultural regions, border zones); the three urban point layers (municipal corporations, smart cities, urban centres); and population corridors.
* **92 new features · +180 KG edges** (795 → 975 typed edges after dedupe).
* `atlas/data/raw/BUILD_HUMAN.py` — end-to-end build (~700 lines) with the same idempotent KG merge as prior modules.
* `atlas/layers/PopulationLayer.js` + `AdministrativeLayer.js` + `HumanGeographyLayer.js` — three additive plug-ins, zero AtlasCore changes.
* `atlas/ui/components/human_geography.css` — palette + label styles + mode-based visibility.
* `atlas/data/district-demographics.json` — Census 2011 per-district roster (population, density, literacy, sex ratio, ST%, SC%, urban%, 2001–2011 growth) covering all 41 districts, with 8 new districts documented as inheriting parent values.
* Six new editorial sections in `ThematicEditorial.js`: **Administrative Context** · **Regional Identity** · **Physical Setting** · **Economic Connections** · **Development Profile** · **Demographic Characteristics**.
* `docs/HUMAN_GEOGRAPHY_SYSTEM.md` · `docs/ADMINISTRATIVE_SYSTEM.md` · `docs/MODULE9_REPORT.md`.

### Modified
* `atlas/layers/ThematicEditorial.js` — +15 human-geography `type`s in `KIND_LABEL`; +15 cases in `composeOverview()`; +22 characteristic rows (headquarters, seat, core, dialect, physical, economy, border_with, border_km, notification, anchor_project, urban_role, rank, population, axis, class_min/max, metric_key, signature).
* `atlas/layers/RevisionDashboard.js` — new Human Geography section with 16 auto-computed cards from Census 2011 (Highest/Lowest Population, Density, Literacy, Sex Ratio, ST%, SC%, Urbanisation, Growth · Largest Municipal Corp · Border district count · Revenue division count). Loads `district-demographics.json` at boot.
* `atlas/layers/CompareMode.js` — demographic rows added to feature slots; demographic diff added to key-differences (population, density, literacy, sex ratio, urbanisation, ST%). Loads `district-demographics.json` at boot.
* `atlas/data/atlas.json` — +15 layer entries, +8 source citations (Census / RGI / DES / NITI / TAD / MoHUA / GoR Municipal Act / gazetteer / Survey of India + BSF).
* `atlas/data/knowledge-graph.json` — +43 new source groups, +180 edges (deduped).
* `index.html` — human_geography.css + 3 new layer plug-in imports.

### Data sources
* **Census of India 2011** — Registrar General of India, District Census Handbook.
* **Directorate of Economics & Statistics, GoR** — state demographic updates.
* **NITI Aayog** — Aspirational Districts + Smart Cities.
* **Tribal Area Development Department (TAD)** — Scheduled Areas.
* **Ministry of Housing & Urban Affairs (MoHUA)** — Smart Cities Mission.
* **Government of Rajasthan Municipal Act notifications** — 2019 MC splits.
* **Rajasthan historical gazetteer + cultural anthropology** — cultural regions.
* **Border Security Force + Survey of India** — border lengths.

### The brief's mandated stories, verified
* **Jaipur district** → 7 KG relations (Urban Centre + Handicraft cluster + Smart City + Dhundhar region + Jaipur-Alwar-Delhi corridor + Jaipur-Ajmer corridor + DMIC-KBN).
* **Udaipur district** → 6 KG relations (Urban Centre + Marble cluster + Smart City + Mewar region + Aravalli Supergroup + TSP tribal area).
* **Barmer district** → 10 KG relations (Barmer Basin + Mangala Field + Barmer Lignite TPS + Barmer Wind + Pakistan Border + HRRL Refinery + Western Solar + Wind-Hybrid + Arid climate + Marwar region).

### Validation
* All 15 layers register on boot; 92 features load without console errors.
* Point/polygon quality-tier badge fires correctly for every Module 9 feature.
* Revision Dashboard's Human Geography section renders 16 cards.
* Compare Mode surfaces demographic rows for any district-anchored feature.
* `BUILD_HUMAN.py` is idempotent — 975 edges → 975 edges on second run.
* **Atlas totals: 64 layers · 255 KG source groups · 975 typed edges.**

### Not changed
* AtlasCore surface. All 12 managers, boot sequence, projection and renderer untouched.
* Existing Module 1–8 features. Additive only.
* `districts.geojson` — pristine. Demographic data lives in a parallel `district-demographics.json` file.

---

## [Module 8 — Energy · Power Generation · Renewables · Grid] — 2026-07-07

### Added
* **6 new atlas layers** (49 total) — `energy-mix` (5), `renewable-zones` (3), `transmission-corridors` (2), `power-plants` (13), `solar-parks` (6), `wind-farms` (4).
* `atlas/data/raw/BUILD_ENERGY.py` — end-to-end build with the same idempotent KG merge as `BUILD_INDUSTRY.py`.
* `atlas/layers/EnergyLayer.js` + `PowerPlantsLayer.js` — two additive plug-ins, zero AtlasCore changes.
* `atlas/ui/components/energy.css` — sun/wind/current palette + label styles + mode-based visibility.
* `docs/MODULE8_REPORT.md`.
* **~30 new KG source groups · +200 typed edges** linking energy into Modules 3 (rivers), 4 (arid climate), 5 (dams), 6 (mineral belts, petroleum & gas), 7 (industrial clusters, Chambal Fertilisers).

### Modified
* `atlas/layers/ThematicEditorial.js` — +6 industry `type`s in `KIND_LABEL`; +6 cases in `composeOverview()` (energy mix / renewable / transmission / plant / solar / wind); +10 characteristic rows (fuel / capacity / operator / developer / dominant / resource / classification / corridor type / purpose).
* `atlas/data/atlas.json` — +6 layer entries, +8 source citations (CEA, MNRE, NPCIL, SECI, RVUNL, RVPNL, RREC, operator disclosures).
* `atlas/data/knowledge-graph.json` — consolidated (~18 duplicate source groups collapsed), 30 new energy groups appended and deduped by `(target, type)`.
* `index.html` — energy.css + 2 new layer plug-in imports.

### Data sources
* **CEA** (Central Electricity Authority) — plant register + generation reports.
* **MNRE** (Min. of New & Renewable Energy) — solar-radiation zone map, wind atlas, ultra-mega solar-park notifications.
* **NPCIL** — Rawatbhata reactor sizes and commissioning dates.
* **SECI** — solar-park allocations, tariff records, Bhadla + Fatehgarh SPD roster.
* **RVUNL** — state-owned thermal + hydel fleet (Suratgarh, Chhabra, Kalisindh, Kota, Ramgarh).
* **RVPNL + PGCIL** — Green Energy Corridor + 765 kV / Bhadla-Fatehpur HVDC alignment.
* **RREC** — Rajasthan Renewable Energy Corporation park roster.
* **Operator disclosures** — NTPC, Adani Green, ReNew Power, Suzlon, JSW-Raj West, Vedanta Cairn.

### Validation
* All 33 energy features load without console errors.
* KG probes: Bhadla → 5 relations across 4 layers (Zone A + Arid + GEC + HVDC + Solar West). Kota Super Thermal → 5 relations across Modules 3/5/7/8 (Chambal + Kota Barrage + Chambal Fertilisers + Chemical cluster + Hadoti). RAPS Rawatbhata → Chambal + RPS Dam + Hadoti. Barmer Lignite TPS → Lignite mineral belt (Module 6). Western Solar Zone → all 6 solar parks + 2 transmission corridors + Zone A + Arid climate (10 relations, a full hub).
* Editorial card renders correctly for every energy type; point/polygon quality-tier badge fires correctly.
* `BUILD_ENERGY.py` is idempotent — 795 edges → 795 edges on second run.

### Not changed
* AtlasCore surface. All 12 managers and the boot sequence untouched.
* Existing Module 1–7 features. Additive only.

---

## [Module 7 — Industry · SEZs · Handicraft Clusters] — 2026-07-07

### Added
* **6 new atlas layers** (43 total) — `industrial-regions` (5), `industrial-clusters` (8), `industrial-areas` (12 RIICO estates), `major-industries` (12 flagships), `special-economic-zones` (4), `handicraft-clusters` (10 GI-tagged).
* `atlas/data/raw/BUILD_INDUSTRY.py` — end-to-end build script with idempotent KG merge (dedupes by `(target, type)` on repeated runs).
* `atlas/layers/IndustryLayer.js`, `IndustrialSitesLayer.js`, `HandicraftsLayer.js` — three additive plug-ins, zero AtlasCore changes.
* `atlas/ui/components/industry.css` — palette + label styles + mode-based visibility.
* `docs/MODULE7_REPORT.md` — full report; six new sources added to `atlas.json` (RIICO, DMICDC, DoIC, MoCI SEZ, GI Registry, RUDA, company disclosures).
* **139 new typed KG edges** (192 → 199 source groups · 590 → 729 edges) linking industry to Modules 3 (rivers, dams), 5 (crops), 6 (mineral belts, building stones, rock types, oil basin).

### Modified
* `atlas/layers/ThematicEditorial.js` — extended `KIND_LABEL` with 6 industry `type`s; `composeOverview()` gains region / cluster / area / industry / SEZ / handicraft cases; characteristics `rows` gains sector / corridor / output / craft / GI status / notified / commissioned / ranking / primary sectors / anchors / notable units / raw materials.
* `atlas/layers/ThematicEditorial.js` — quality-tier badge now distinguishes **point** (★★★★☆ Point) from **polygon** (★★★ Generalised). Previously every feature was labelled "Generalised boundary", misleading for point features.
* `atlas/data/atlas.json` — +6 layer entries, +7 source citations.
* `atlas/data/knowledge-graph.json` — appended and deduped in place.
* `index.html` — imports `industry.css` + 3 new layer plug-ins.
* `.claude/launch.json` — port bumped 8765 → 8770 per session convention.

### Data sources
* **DMICDC** — Delhi-Mumbai Industrial Corridor investment-region notifications (KBN, Ajmer-Kishangarh).
* **RIICO** — industrial-estate listings + coordinates for 12 major estates.
* **DoIC Rajasthan** — sectoral cluster classifications.
* **MoCI (SEZs India)** — SEZ gazette notifications for MWC-Jaipur, Sitapura Gems, Boranada, Somany Kishangarh.
* **GI Registry (Chennai)** — GI-tag numbers for Blue Pottery of Jaipur, Sanganer & Bagru printing, Kota Doria, Molela, Usta, Bikaneri Bhujia, Mojari.
* **Company disclosures** — Nissan / Honda / Hero (auto); Shree / JK / Wonder / Ambuja / UltraTech / Birla Corp (cement); Chambal Fertilisers (fertiliser); HPCL-Rajasthan Refinery (refining).

### Validation
* All 51 industry features load without console errors.
* KG traversal returns the expected cluster for every flagship — verified for JK Cement (→ Limestone belt · Sedimentary rock · Cement cluster · Udaipur-Rajsamand region), HRRL refinery (→ Barmer basin · Mangala field · Chemical cluster · Jodhpur-Pali region), Makrana Marble Craft (→ Marble belt · Marble building stone · Handicraft cluster), DMIC-KBN region (→ 11 features across auto/textile/estates/OEMs).
* Editorial card verified for `major_industry`, `industrial_region`, `industrial_cluster`, `handicraft_cluster`; quality-tier badge switches correctly on point vs polygon.
* `BUILD_INDUSTRY.py` is idempotent — second run leaves `knowledge-graph.json` at 729 edges (no accumulation).

### Not changed
* AtlasCore's public surface (managers, boot sequence, data model). Every industry feature conforms to the pre-existing `notes` / `ecology` / `governance` schema.
* Existing generalised polygons from Modules 1–6 are untouched.

---

## [Peak honesty pass] — Real named summits only — 2026-07-06

### Removed
* 12 synthetic peak "labels" ("Aravalli Peak · Sikar", "Vindhyan Scarplands (Hadoti) Peak · Bundi", etc.) — these decorated unnamed OSM nodes as if they were named cartographic features. They read as names but were merely descriptors. Removed to preserve the atlas's data-integrity contract: **every visible feature name must be a real, sourced name**.

### Added
* Broader Overpass query for `natural=peak` (no elevation filter) + `historic=fort` — surfaces the Aravalli hill-fort summits that OSM tracks under `historic=fort` rather than as peak nodes. These are legitimate named cartographic features (Rajasthan's fort-topped Aravalli summits are a real thing).

### Modified
* `atlas/data/raw/BUILD_PHYSICAL.py` — replaced the `build_peaks()` logic. It now ships a curated 8-feature manifest of **real named summits**, each backed by an OSM reference (node/way/relation) and/or a widely-cited elevation from published sources (Archaeological Survey of India, UNESCO WHS listing, Rajasthan Tourism Department, Wikipedia). Coordinates come from OSM where present; where OSM lacks a matching node, hardcoded `lonlat` from cited sources with a `source_ref` chain declaring provenance.

### Final peaks roster (8 features)

| Name | Elev. | District | Type | Source chain |
|---|---:|---|---|---|
| Guru Shikhar | 1,722 m | Sirohi | natural peak | OSM + RFD + Wikipedia |
| Malkhet Group | 1,050 m | **Sikar** (Shekhawati, corrected from Sirohi) | natural peak | OSM |
| Morraka Dungar | 426 m | **Karauli** (corrected from Udaipur) | natural peak | OSM |
| Achalgarh | 1,380 m | Sirohi | hill fort | OSM (`historic=fort`) + RTD + Wikipedia |
| Kumbhalgarh | 1,180 m | Rajsamand | hill fort | OSM (fort relation) + ASI + UNESCO WHS |
| Chittorgarh | 553 m | Chittorgarh | hill fort | OSM (`historic=fort` with `ele`) + ASI + UNESCO WHS |
| Taragarh (Ajmer) | 870 m | Ajmer | hill fort | ASI + Rajasthan Tourism + Wikipedia |
| Taragarh (Bundi) | 460 m | Bundi | hill fort | Rajasthan Tourism + Wikipedia |

### Corrections uncovered while cross-checking

* **Malkhet Group** — OSM node at 27.66 °N 75.39 °E, which is **Shekhawati (Sikar)**, not the Sirohi Malkhet I initially assumed. This is likely the Raghunathgarh massif. District, range, and facts corrected accordingly.
* **Morraka Dungar** — OSM node at 26.82 °N 76.79 °E, which is in **Karauli**, not Udaipur as originally described. Corrected to "Vindhyan-Aravalli transition (Karauli hills)".
* **Guru Shikhar elevation** — OSM tag says 1,690 m; the atlas now displays the widely-cited 1,722 m with the discrepancy noted in the feature's facts (honest reporting).

### Validation
* 8 named peaks now render on the map; every one carries a real name and a source chain.
* Zero synthetic label strings remain in `peaks.geojson`.
* `Atlas.layers.features('peaks').length === 8`.
* Kumbhalgarh detail: kicker "Peak · Aravalli · central", 4 facts (~1,180 m summit / 36-km wall / UNESCO WHS 2013 / Maharana Pratap's birthplace), sources chain includes OSM (fort relation) + ASI + UNESCO WHS listing.

### Trade-offs
* Total peak count dropped from 15 → **8**. This is deliberate — quality of naming beats quantity of markers. Future modules can add more real peaks (Ser Peak 1,597 m, Delwara Peak 1,442 m, Jarga Peak 1,431 m, Raghunathgarh 1,055 m, Bhairach ~792 m, Nag Pahar ~795 m, Bhanwarmata ~669 m) once their OSM references or authoritative published coordinates are in hand.

---

## [Relations + Timelines + Peak enrichment] — 2026-07-06

### Added
* `atlas/core/RelationsGraph.js` — cross-layer semantic index built at `atlas:ready`. Indexes every feature by basin, district(s), division, districts-included, and by name-root (so "Ranthambore National Park" ↔ "Ranthambore Tiger Reserve" ↔ "Kailadevi WLS" ↔ "Sawai Man Singh WLS"). API: `Atlas.relations.relationsFor(feature, layerId)` → ranked `{layerId, featureId, feature, reasons, weight}[]`. 151 features indexed on boot.
* Curated `properties.timeline` for 14 flagship features (Keoladeo 1899→1985 across 5 events; Ranthambore 1955→2013; Sariska 1958→2008 including the 2004 local-extinction and 2008 reintroduction milestones; Ramgarh Vishdhari 1982→2022; Dholpur-Karauli 2023; Sambhar 1990; Khichan 2025; Menar 2025). Every other feature with an `established` field gets a 1-event synthetic timeline.
* Two new detail-panel sections rendered by `PhysicalEditorial.js` + `EnvironmentLayer.js`:
  * **Timeline** — vertical rule with year markers, tag-coloured dots (royal, sanctuary, np, tr, ramsar, unesco, crisis, milestone).
  * **Related features** — clickable chips grouped by layer with tiny coloured "kind" badges (RAMSAR / NP / TR / WLS / RIVER / LAKE / PEAK / REGION / BASIN / DISTRICT). Clicking a chip selects that feature.

### Modified
* `atlas/data/raw/BUILD_PHYSICAL.py` — peaks now get a real district lookup (point-in-polygon against districts.geojson), a range descriptor (Aravalli / Vindhyan Scarplands (Hadoti) / Thar rise), and a synthetic descriptive name when unnamed ("Aravalli Peak · Sikar", "Vindhyan Scarplands (Hadoti) Peak · Bundi"). Each peak gains 2–4 factual notes: unnamed Aravalli peaks now read as "Unsurveyed named summit in the [district] section of the Aravalli. Elevation X m — a [mid|high]-range peak by Aravalli standards. Individually unnamed in official gazetteers; catalogued by OSM contributors."
* `atlas/data/raw/BUILD_ENV.py` — added `TIMELINES` manifest and threaded `properties.timeline` through the emitted GeoJSON. All 6 env GeoJSON files regenerated.
* `atlas/core/AtlasCore.js` — three lines: import + `this.relations = new RelationsGraph(this)`. Additive; no consumer broke.
* `atlas/layers/PhysicalEditorial.js` and `atlas/layers/EnvironmentLayer.js` — both add Timeline + Related sections after the notes/exam block. Both share a small `LAYER_LABEL` map.
* `atlas/ui/components/editorial.css` — new `.ed-timeline` vertical-rule style with per-tag dot colours; new `.ed-related` chip grid with per-layer badge colouring.

### Validation
* Keoladeo NP detail: 5 timeline events render in order — 1899 royal (gold ring) → 1971 sanctuary (green ring) → 1981-10 Ramsar (blue ring) → 1982 NP (green filled) → 1985 UNESCO (gold filled). Related features: 12 items across Ramsar, District, WLS, Region, Basin, NP, Peak.
* Chambal River detail: 12 related features — Chambal Basin + 11 tributaries in the Chambal basin (Banas, Berach, Bandi, Kalisindh, Parvan, Kothari, Parbati, Ahar, Ahu, Mej, Chakan). The drainage network reads as a family at a glance.
* Peaks now enriched: 15 features (3 named + 12 unnamed), every one with a district and range assignment, synthetic name + 2–4 facts. Guru Shikhar reads with 4 curated facts including the OSM-tag-vs-cited-elevation discrepancy note.
* RelationsGraph builds in ~2 ms at boot; 151 features indexed. Query time O(1) per feature.
* Zero engine changes beyond the three-line AtlasCore instantiation.
* Zero console errors on boot.

### Not changed
* AtlasCore's public surface (managers, boot sequence). RelationsGraph subscribes to `atlas:ready` and never reaches back into any manager.

---

## [Terrain System — 3.5] — Hillshade + soft hypsometric tint — 2026-07-06

### Added
* `atlas/data/terrain-hillshade.png` — 928×890 RGB hillshade + soft hypsometric-tint raster covering a padded Rajasthan bbox at ~1 km/pixel. 581 KB.
* `atlas/data/terrain-metadata.json` — bounds, elevation range, hillshade parameters, source attribution.
* `atlas/data/raw/BUILD_TERRAIN.py` — deterministic pipeline: tile fetch (curl subprocess to work around Python-on-macOS SSL cert quirks) → terrarium decode → stitch → crop → USGS Horn hillshade at NW-315°/45°/z1.5 → 8-stop hypsometric tint blended at 60 %.
* `atlas/data/raw/terrain-tiles/` — 20 terrarium tiles cached at zoom 7.
* `atlas/layers/TerrainLayer.js` — plug-in that projects the terrain PNG's bounds through Atlas.projection and inserts one `<image>` as the first sibling before `<g id="atlas-layers">` so vector layers render on top. Registers `terrain` mode + `T` keyboard shortcut + popover button.
* `docs/TERRAIN_SYSTEM.md` — full pipeline and cartographic-choice documentation.

### Modified
* `atlas/ui/components/physical.css` — terrain image styling: `mix-blend-mode: multiply` at 86 % opacity for light theme; `screen` at 35 % for dark. Hidden in `base` / `division` / `new` administrative modes. In `terrain` mode, thematic layers are dimmed heavily so relief reads uncontested.
* `index.html` — imports `TerrainLayer.js`.
* `docs/DATA_SOURCES.md` — new NASA-SRTM / Mapzen citation and per-file terrain source entry.

### Preserved
* Zero AtlasCore modifications. Zero Renderer, LabelManager, LayerManager, or ProjectionEngine changes.
* Every previous layer, mode, and interaction still works. The terrain sits *underneath* every existing vector layer.

### Validation
* 20 tiles fetched from AWS S3 (retry logic handles the occasional S3 slowness).
* Stitched grid: 1024×1280 with elevation range −1817 → 7400 m (padded region includes Arabian Sea and Himalayan foothills).
* Cropped to Rajasthan padded bbox: 890×928 with elevation range −630 → 6407 m.
* Cell size ≈ 1091 m.
* Terrain SVG image at bounds (−55, −23, 1114, 1063 SVG units) — extends slightly outside the 1000×1000 viewBox to include the padded regional context.
* Zero console errors on boot.
* 10 style modes: `base`, `division`, `new`, `env`, `reader`, `hydrology`, `relief`, `physical`, `physiography`, **`terrain`**.
* Visual confirmation: Aravalli reads as raised brown ridge; Thar as pale sand; eastern plains as subtle greenish plateau; rivers/lakes/labels remain legible over the terrain.

### Requires attribution when redistributed
> Elevation data © NASA / Mapzen (terrarium encoding), redistributed via elevation-tiles-prod. ODbL 1.0.

### Known gaps (deferred)
* Zoom-level fidelity — base is ~1 km/pixel; visibly pixelates past ~4× zoom. A tile pyramid at z=8/z=9 would fix this. Plug-in architected to accept a tile-pyramid manifest.
* Padded region shows terrain in Gujarat/MP/UP/Punjab/eastern Pakistan. Editorial preference; a clipping option is straightforward to add.
* Elevation ceiling in the palette is 1800 m; Himalayan foothills at the crop's northeastern edge clamp to near-white.

---

## [Quality Pass 3.1] — River labels follow the water · Quality tier badge · Lake shorelines — 2026-07-06

### Added
* `atlas/core/util/quality.js` — geometry-quality tier helper (★★★★★ Surveyed, ★★★★ OSM, ★★★ Generalised, ★★ Point-only). Used by every detail renderer.
* Every editorial detail card now surfaces a quality-tier badge next to the hero tags — readers can gauge geometric trust at a glance.

### Modified
* `atlas/data/raw/BUILD_PHYSICAL.py` — new helper `label_anchor_for_line()` places the label on the arc-midpoint of the longest constituent line, replacing the mean-of-vertices centroid that had put river labels up to **16.4 km off** the actual water. Regenerated `rivers.geojson` and `aravalli.geojson`. Sample distance-to-line drops: Banas 16.4 km → 0.10 km, Chambal ~15 km → 0.04 km, Luni ~10 km → 0.02 km.
* `atlas/core/LabelManager.js` — new source option `orient: 'along'`. When set, the label sits on-anchor and rotates to the local tangent of the feature's polyline; keep-upright logic prevents upside-down text. Per-feature tangent cache (`_tangentCache`) keeps recomputation O(1). Collision bbox expanded to the axis-aligned hull of the rotated rect so overlap detection stays safe.
* `atlas/layers/HydrologyLayer.js` — rivers now register with `orient: 'along'`.
* `atlas/layers/ReliefLayer.js` — Aravalli main-axis label now rotates to follow the range's SW→NE direction.
* `atlas/layers/EnvironmentLayer.js`, `atlas/layers/PhysicalEditorial.js`, `atlas/core/UIManager.js` — every detail renderer inserts the quality badge into the hero-tags row.
* `atlas/ui/components/editorial.css` — `.ed-quality` badge styling (five-star scale, tier-coloured).
* `atlas/ui/components/physical.css` — variable river stroke widths keyed by feature id (Chambal 1.5 → Mahi/Luni/Banas 1.3 → Sabarmati/Banganga/Ghaggar/Parbati/Kalisindh 1.0 → Berach/Kothari/tributaries 0.6–0.8 → minor 0.5). Lakes gained a heavier atlas-grade shoreline stroke (0.9) plus a subtle `drop-shadow` filter for cartographic depth. Dark-theme shadow variant tuned separately.

### Preserved
* Zero AtlasCore modifications. The label engine's addition of `orient: 'along'` is an additive extension to the existing `register()` API — no consumer needed to change.
* All Module 1 / 2 / 3 features regression-verified.

### Validation
* Banas River label anchor distance to nearest line point: **16.4 km → 100 m** (all other rivers similar: 40–150 m).
* 15 river labels rendered at 1.8× zoom, **all 15 rotated** to their local river tangent. Aravalli label rotated to −38.1° matching the range's SW→NE axis.
* Zero console errors on boot; 14 label sources registered; two carry `orient: 'along'`.
* Quality badge renders for districts (OSM 4 stars), environment features (OSM 4 stars), physical polygons (OSM 4 stars), physiographic regions (Generalised 3 stars), Aravalli axis (Generalised 3 stars), point-only features (Point-only 2 stars).

### Known quirks (not fixed this pass)
* Header shows two "Print" text elements when dark theme is active — the theme-cycle button displays *next* theme's name ("Print"), colliding with the actual Print button. Cosmetic; scheduled for the Interaction Design pass.

---

## [Module 3] — Physical Geography Framework — 2026-07-06

### Added
* `atlas/data/rivers.geojson` — 23 major named rivers, real OSM `waterway=river` geometry.
* `atlas/data/lakes.geojson` — 11 named lakes and reservoirs.
* `atlas/data/thar.geojson` — Thar Desert extent (union of OSM `natural=desert` polygons).
* `atlas/data/aravalli.geojson` — synthesised main-axis polyline through 13 anchor points.
* `atlas/data/peaks.geojson` — 15 named + high-elevation peaks (Guru Shikhar 1722 m at Mount Abu).
* `atlas/data/physiography.geojson` — 5 physiographic regions (district-boundary approximation).
* `atlas/data/drainage-basins.geojson` — 7 drainage basins.
* `atlas/data/elevation.json` — descriptive elevation zone taxonomy (raster deferred).
* `atlas/data/raw/BUILD_PHYSICAL.py` — deterministic pipeline; `osm-rajasthan-physical-core.json`, `osm-rajasthan-river-ways.json` — Overpass dumps.
* `atlas/layers/HydrologyLayer.js`, `ReliefLayer.js`, `PhysiographyLayer.js` — plug-in modules for rivers/lakes, Aravalli/Thar/peaks, regions/basins.
* `atlas/layers/PhysicalEditorial.js` — shared editorial detail renderer for all 7 physical feature types.
* `atlas/ui/components/physical.css` — muted-paper base-map palette, italic river labels, letter-spread desert/aravalli/region labels.
* `docs/PHYSICAL_GEOGRAPHY.md`, `docs/MODULE3_REPORT.md`.

### Modified
* `atlas/data/atlas.json` — 7 new layer declarations with `zIndex` ordering (physiography 5 → basins 8 → thar 10 → rivers 15 → lakes 20 → aravalli 22 → districts 25 → peaks 60).
* `index.html` — imports 3 new layer modules; links `physical.css`.
* `docs/DATA_SOURCES.md` — added citations for WRD, CWC, SOI, NATMO and per-file sources for the 8 new datasets.

### Breaking changes
None. Zero AtlasCore modifications. Every Module 1 and Module 2 feature still works identically. `PhysicalEditorial.js` shares its section grammar with `EnvironmentLayer.js` so the editorial detail cards read consistently across the atlas.

### Data sources
* **OpenStreetMap** (ODbL 1.0) — `waterway=river` relations/ways, `natural=water`, `landuse=reservoir`, `natural=peak`, `natural=desert`, `natural=ridge` in Rajasthan. Retrieved 2026-07-06.
* **Rajasthan Water Resources Department (WRD)** — river-basin descriptions, lake construction dates.
* **Central Water Commission (CWC)** — basin definitions.
* **Standard geography-text descriptions** — physiographic region boundaries (NCERT-lineage sources).

### Validation
* 14 layers register successfully (41 districts + 47 environment + 63 physical = 151 features rendering).
* 9 style modes: `base`, `division`, `new`, `env`, `reader`, `physical`, `hydrology`, `relief`, `physiography`.
* Search regression: `chambal` returns Basin + River + WLS + Eastern Plains region; `pichola` returns lake + wetland; `aravalli` returns range + hill region + southern Aravalli/Mahi basin.
* Label engine handles new label classes without modification. At 7.3× zoom in hydrology mode, italic serif river labels (Kothari, Sukri, Berach, Ahar) and dark serif district labels coexist without overlap.
* Editorial detail: Aravalli selection renders 8 sections (Overview → Key figures → Physical characteristics → Ecology → Governance → Key facts → Locator → References) with Learning-aid mnemonic and 5 fauna + 5 flora chips.
* Zero console errors on boot.

### Known gaps (deferred)
* Elevation raster (hypsometric tint + hillshade) — needs SRTM 30m DEM processing; `ReliefLayer.js` architected to accept a raster tile source without engine change.
* Physiographic and drainage-basin boundaries are district-approximated; would tighten with a NATMO/GSI polygon dataset when available.
* Aravalli axis is synthesised through named peaks; would upgrade to real geometry when a single OSM `natural=ridge` relation is contributed.

---

## [Terminology Neutralisation] — Audience-Neutral Atlas — 2026-07-06

### Changed
* All user-visible framing neutralised. The atlas is now positioned as a general reference — no audience-specific language in UI, docs, code comments, or data.
* Data schema: the per-feature educational-metadata block was renamed. Its four sub-fields are now `facts`, `mnemonic`, `significance`, and `confusedWith` — all under a new key called `notes`.
* Free-form annotation on features renamed to `properties.remark` to disambiguate from the new `notes` object.
* Style mode and CSS class carrying the previous name were renamed to `reader` (mode) and `.mode-reader` (class). Toolbar label and keyboard shortcut updated accordingly (`R`). Detail-panel section header now reads **Key facts**; its accented aside is tagged **Learning aid** instead of the previous learning-trick phrasing.
* Atlas display name in `atlas.json`: renamed to **"Rajasthan Digital Atlas"**.
* Header subtitle in `index.html`: audience list removed — now reads "An interactive digital atlas · 41 Districts · 7 Divisions".
* Docs — title lines, section headings, and follow-up items rewritten to reference "readers" and "subject-matter reviewers" rather than audience-specific groups.
* `BUILD.py`, `BUILD_ENV.py`, `BUILD_AUDIT.py` — content strings and comments neutralised; `BUILD.py` no longer overwrites `atlas.json` (the manifest is now manually maintained so environment layers aren't lost on regeneration).

### Preserved (unchanged)
* Every factual note. Notification years, species lists, "one of the original 9 Project Tiger reserves", "UNESCO WHS 1985", mnemonics like "Keoladeo = 4 badges" — all retained under neutral labels.
* Data model core: districts, environment layers, projection, all IDs and geometries unchanged.
* Cartography, label engine, statistics dashboard, locator inset, print stylesheet — behaviourally identical.

### Verification
* Full-tree audit across `.md`, `.js`, `.css`, `.html`, `.json`, `.py`, `.geojson` files confirms zero user-facing occurrences of the seven target terms (list documented in the neutralisation task request, not repeated here to keep this file clean).
* Browser boot: no console errors. All 7 layers still register. 88 features render. Labels place correctly. Reader view still swaps in the reader-specific detail renderer for environment features.

---

## [Design Refactor] — Publication-Quality Digital Atlas — 2026-07-06

### Added
* `atlas/core/LabelManager.js` — priority-based collision-avoidance label engine (11 candidate positions per feature, zoom-gated visibility, leader lines).
* `atlas/core/StatsManager.js` — auto-computed atlas statistics (coverage, largest/smallest PA, most recent notification, point-only counts).
* `atlas/layers/LocatorInset.js` — India-outline mini-map with Rajasthan + live viewport box.
* `atlas/ui/components/labels.css` — per-priority label typography (small caps for NPs, italic for hydrology, quiet grey for districts).
* `atlas/ui/components/editorial.css` — magazine-spread styling for the detail panel (hero, tags, figures, chips, mnemonic, references, mini-locator).
* `atlas/ui/styles/print.css` — @media print stylesheet: A4 landscape, ink-safe colours, point-based label sizes, white halos preserved.
* `docs/ATLAS_REFACTOR_REPORT.md`, `docs/VISUAL_DESIGN_GUIDE.md`, `docs/CARTOGRAPHY_GUIDELINES.md`, `docs/LABEL_ENGINE.md`, `docs/PRINT_LAYOUT_GUIDE.md`.

### Modified
* `atlas/core/AtlasCore.js` — three lines: instantiate LabelManager + StatsManager; call `labels.attachTo(svg)`.
* `atlas/core/UIManager.js` — full rewrite: floating map controls, layers popover, stats overlay, slide-in editorial detail panel, register district label source.
* `atlas/layers/EnvironmentLayer.js` — full rewrite: register 5 env label sources; editorial detail renderer (kicker → hero → tags → overview → figures → ecology chips → conservation → key facts → locator → references).
* `atlas/ui/styles/theme.css` — refined NatGeo-inspired warm palette; typography scale (`--t-hero`/`--t-title`/`--t-lede`/`--t-body`/`--t-small`/`--t-meta`/`--t-caps`); 4 themes preserved.
* `atlas/ui/styles/layout.css` — map fills viewport (84% of a 1400×900 window); collapsible right rail; slide-in transitions; @media print.
* `atlas/ui/components/atlas.css` — muted paper fills with expressive strokes; refined choropleth; overlay chrome (north arrow, scale bar, zoom pill, locator, layers popover, map controls).
* `atlas/ui/components/components.css` — polished search, header buttons, focus rings.
* `atlas/ui/components/environment.css` — refined category fills/strokes; UNESCO gold drop-shadow; point-only white circles.
* `index.html` — updated CSS link set; imports LocatorInset.js.

### Breaking changes
None to the data model, layer registration API, or public engine methods. Every Module 1 and Module 2 feature still works identically. Users see a new visual language, not a new interaction contract.

### Data sources
No new datasets. Purely a design pass.

### Validation
* Boot: zero console errors. 7 layers register (41 + 47 features = 88 total).
* LabelManager: places 50 labels at 1.0× zoom (41 district + 5 NP + 4 Ramsar), 38 at 1.8× zoom (24 district + 1 NP + 3 TR + 3 Ramsar + 7 wetland). Zero overlaps in either case; TR/WLS/wetland labels correctly gated on zoom.
* StatsManager: computes 14 cards on demand — Districts 41, National parks 5, Tiger reserves 5, WLS 25, Ramsar 4, Wetlands 8, Biosphere 0, Total PA area 15,605.2 km², Coverage 4.6% of Rajasthan (vs 342,239 km² state area), Point-only 13, Largest Desert NP 3,162 km², Smallest Sajjangarh WLS 5.2 km², Most recent Dholpur-Karauli 2023.
* Locator inset: renders India silhouette + Rajasthan fill + live viewport box that redraws on every pan/zoom.
* Editorial detail: renders 10 sections for Ranthambore NP (kicker, hero, tags [UNESCO WHS, IUCN II], overview, figures [392 km², 1980, 1 district, II], location, ecology [7 fauna chips, 5 flora chips], conservation, key facts with learning aid, locator, references).
* Search regression: `ranth` → Ranthambore NP + TR ✓; `sambhar` → Ramsar + Wetland ✓.
* All 4 themes render cleanly; all 5 modes switchable via popover or keyboard.
* Zero AtlasCore behavioural changes — Module 1 and Module 2 regression baseline held.

---

## [Module 2] — Environment & Protected Areas — 2026-07-06

### Added
* `atlas/data/national-parks.geojson` — 5 features (Ranthambore, Sariska, Keoladeo Ghana, Desert NP, Mukundra Hills)
* `atlas/data/tiger-reserves.geojson` — 5 features (Ranthambore, Sariska, Mukundra Hills, Ramgarh Vishdhari, Dholpur–Karauli)
* `atlas/data/wildlife-sanctuaries.geojson` — 25 features (Rajasthan Forest Department roster)
* `atlas/data/ramsar-sites.geojson` — 4 features (Keoladeo 1981, Sambhar 1990, Khichan 2025, Menar 2025)
* `atlas/data/wetlands.geojson` — 8 significant non-Ramsar wetlands
* `atlas/data/biosphere-reserves.geojson` — 0 features, intentionally empty (Rajasthan has no MoEFCC-notified MAB site)
* `atlas/data/protected-area-metadata.json` — cross-dataset index & counts
* `atlas/data/raw/osm-rajasthan-protected-areas.json` — Overpass geometry dump
* `atlas/data/raw/BUILD_ENV.py` — deterministic env-layer build pipeline
* `atlas/layers/EnvironmentLayer.js` — plug-in module (registers `env` + `reader` style modes, toolbar buttons `4`/`R`, reader-view detail renderer)
* `atlas/ui/components/environment.css` — category palette (dark green / orange / light green / blue / cyan / purple)
* `docs/DATA_SOURCES.md` — citation of every source used per dataset
* `docs/MODULE2_REPORT.md` — build report, gaps, follow-ups
* `CHANGELOG.md` — this file

### Modified
* `atlas/data/atlas.json` — added 6 environment layer declarations and 6 additional sources
* `index.html` — imports `EnvironmentLayer.js` (side-effect) and links `environment.css`

### Breaking changes
None. Every feature added by Module 1.5's refactor still works. Districts layer, base/division/new modes, search, dark mode, keyboard shortcuts, scale bar, north arrow all unchanged.

### Data sources
* **OpenStreetMap** (ODbL 1.0) — geometry for 3 NPs (Ranthambore, Desert, Mukundra), 3 TRs (Sariska, Mukundra, Ramgarh Vishdhari), Keoladeo Ghana (NP + Ramsar), 21 WLSs, Sambhar Lake wetland/water polygons. Retrieved via Overpass `maps.mail.ru` mirror on 2026-07-06.
* **Rajasthan Forest Department** — Protected Area Network Rajasthan (Oct 2023) map for areas, districts, notification years.
* **National Tiger Conservation Authority (NTCA)** — tiger reserve names, sequence numbers, notification years.
* **Ramsar Convention Secretariat (RSIS)** — Ramsar site numbers, designation dates, area figures.
* **Press Information Bureau (PIB)** — Khichan & Menar designation announcement (PRID 2133992).
* **UNESCO World Heritage Centre** — Keoladeo Ghana WHS status.
* **Wildlife Institute of India (WII)** — cross-reference of protected-area attributes.

### Validation
* 47/47 environment features have centroids inside a Rajasthan district (spatial index hit-test).
* Zero features outside Rajasthan (Balaram Ambaji WLS auto-rejected — Gujarat centroid; Cholistan WLS auto-rejected — Pakistan; MP portion of National Chambal WLS auto-rejected).
* Search `"ranth"` → returns Ranthambore National Park (national-parks) + Ranthambore Tiger Reserve (tiger-reserves) ✓
* Search `"sambhar"` → returns Sambhar Lake Ramsar Site + Sambhar Salt Lake Wetland ✓
* All 5 style modes registered: `base`, `division`, `new`, `env`, `reader`.
* All 7 toolbar controls present.
* 88 total SVG paths rendered (41 districts + 47 env).
* Reader view: badge + ecology + key-facts sections render for env features; districts still use default renderer.
* Zero external network requests introduced. Fully offline-capable.

### Known gaps
* Sariska National Park (as distinct from the Tiger Reserve), Sitamata WLS, Dholpur–Karauli TR (2023), Khichan Ramsar (2025), Menar Ramsar (2025) ship as **point features** (`geometryQuality: "point"`) because polygons are not published in OSM. Areas/districts/notification years are still official; only the boundary is unpublished.
* National Chambal WLS shows the Rajasthan portion only (relation/9397372). MP and UP portions belong on their state atlases.

---

## [Module 1.5] — Engine Refactor — 2026-07-06 (retro entry)

### Added
* `atlas/core/*.js` — 12 core modules (AtlasCore, DataManager, ProjectionEngine, Renderer, LayerManager, SpatialIndex, SearchEngine, SearchUI, ThemeManager, InteractionManager, UIManager, ExportManager, config, util/events, util/dom)
* `atlas/data/atlas.json` — manifest, replaces per-file constants
* `atlas/data/schemas/feature.schema.json` — unified feature JSON Schema
* `atlas/ui/styles/*` + `atlas/ui/components/*` — refactored styles
* `ARCHITECTURE.md` — plug-in path documentation

### Modified
* `index.html` — imports `atlas/core/AtlasCore.js` and boots the singleton

### Breaking changes
Complete internal rewrite. External behaviour: **zero regressions verified** (see M1 features below). Files under `js/`, `css/`, `data/`, `svg/` from Module 1 removed; equivalents live under `atlas/`.

### Data sources
No new data introduced. Existing OSM district data preserved, plus full-fidelity backup at `atlas/data/rajasthan-districts-full.geojson`.

### Validation
* All 13 Module 1 features regression-tested — zero visual regression.
* Spatial index round-trip: `Atlas.projection.inverse(Atlas.projection.forward([75.79, 26.92]))` → `[75.79, 26.92]` exact.
* QuadTree hit-test: Jaipur city coord → Jaipur district ✓.
* Theme cycle (4 themes) works and persists in localStorage.

---

## [Module 1] — District Base Layer — 2026-07-06 (retro entry)

### Added
* Initial atlas: 41 Rajasthan districts, 7 divisions.
* Base HTML/CSS/JS shell with SVG map, tooltip, click-to-select, search, dark mode.

### Data sources
* **OpenStreetMap** `admin_level=5` relations (Rajasthan). Retrieved via Overpass 2026-07-06.
* **Rajasthan gazette notifications** for division and HQ mapping.

### Validation
* All 41 districts render as clickable `<path>` elements.
* Spatial index correctly identifies Jaipur/Bikaner from lat/lon.
* Verified offline (`python3 -m http.server`, no external requests).
