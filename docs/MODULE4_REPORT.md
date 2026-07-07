# Module 4 — Climate · Soils · Natural Vegetation

**Date:** 2026-07-06 · **Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** two lines (import + one instantiation of `KnowledgeGraph`).

## What shipped

**8 new atlas layers** (all category `climate`, all district-approximated with cited sources):

| Layer | Features | Source |
|---|---:|---|
| Rainfall Zones | 6 | IMD annual averages · RSAPCC 2010 baseline |
| Temperature Zones | 4 | IMD monthly means · RSAPCC baseline |
| Climate Regions | 4 | Köppen (BWh · BSh · Aw · Cwa) |
| Agro-Climatic Zones | 10 | RAU zone gazette · ICAR NARP report |
| Soil Types | 7 | NBSS&LUP Rajasthan Bulletin 42 |
| Natural Vegetation | 7 | Champion & Seth (1968) forest-type classification |
| Desertification | 4 | ISRO SAC Desertification Atlas 2021 |
| Drought Vulnerability | 4 | Rajasthan State Disaster Management Authority · RSAPCC |

Every polygon is the **union of its constituent districts** and carries `properties.geometryQuality: "generalised (district-approximated)"` with a `geometryNote` explaining the approximation. Every zone declaration cites its authoritative source in `properties.source`. See [DATA_SOURCES.md](DATA_SOURCES.md) for full citations.

**1 new engine module**: `atlas/core/KnowledgeGraph.js` — declarative typed cross-layer relationships. Loads `atlas/data/knowledge-graph.json` (52 edges across 16 source features) at boot. Undirected — every declared A→B is queryable as B→A. Public surface:

* `Atlas.knowledge.of(feature)` — grouped by edge type (`signature`, `defines`, `colocated`, `proximity`).
* `Atlas.knowledge.cluster(feature)` — flat, deduped, weight-ranked list for cross-highlighting.

**3 plug-in layer modules**:
* `ClimateLayer.js` — rainfall / temperature / climate-regions / agro-climatic-zones
* `SoilLayer.js` — soil-types / desertification / drought-vulnerability
* `VegetationLayer.js` — natural vegetation

All three delegate detail rendering to a shared **`ThematicEditorial.js`** helper. The renderer:
1. Renders the editorial card (hero → tags → overview → key figures → characteristics → distribution → related features → locator → references).
2. Fetches `Atlas.knowledge.cluster(feature)` and applies the `related-highlight` class to every returned feature's SVG path — the map pulses three times over 1.2 s, then settles.

## Cross-highlighting — the atlas that teaches

Verified end-to-end:

**Click "Arid" climate region** → cluster returns 6 related features across layers:

* National Park · **Desert National Park** (signature)
* Rainfall · **< 200 mm** (colocated)
* Rainfall · **200–300 mm** (colocated)
* Soil · **Desert soils (Aridisols)** (colocated)
* Vegetation · **Tropical Thorn Forest** (colocated)
* Vegetation · **Grasslands & Savanna** (colocated)

All six paths on the map pulse simultaneously.

**Click "Dry Deciduous Forest"** → cluster returns 7 related features:

* Tiger Reserve · **Ranthambore TR** · **Sariska TR** · **Mukundra Hills** (signature)
* NP · **Ranthambore NP** · **Sariska NP** (signature)
* Range · **Aravalli main axis** (colocated)
* Soil · **Red loamy soils** (colocated)

**Click "Very High" drought vulnerability** → cluster returns the whole arid syndrome: Thar polygon, Severe desertification zone, < 200 mm rainfall, Agro-climatic Zone 1A. The atlas *teaches* that these are the same story.

## New modes

Added to the layers popover: **Rainfall**, **Climate**, **Agro-Zones**, **Soils**, **Vegetation**, **Desertification**, **Drought**. Each promotes its own layer to full opacity and dims administrative + protected + terrain to background. Toggle any of them from the popover.

## Visual design

Per the spec's palette guidance:

* **Rainfall** — cool blue gradient, 6 stops from pale-sand at <200 mm to deep atlas-blue at >1000 mm.
* **Temperature** — cool blue → warm sienna, 4 stops.
* **Climate regions** — muted paper tones (sand · buff · sage · pine).
* **Soils** — earth-tone palette (desert cream · brick red · alluvial buff · charcoal black · rusty mix · saline pale · rock skeletal).
* **Vegetation** — natural greens (thorn khaki · deciduous sage · mixed forest green · grassland straw · riparian teal · wetland cyan · montane deep).
* **Desertification** — warning gradient (severe rust → moderate ochre → mild sand → stable moss).
* **Drought** — the same warning family, one shade darker to distinguish.

All thematic fills are 55 % opacity so terrain, protected areas, rivers, and districts remain visible beneath. In the seven thematic modes, districts fade to 15 % opacity so the theme reads uncluttered.

## Architecture continuity

**AtlasCore.js gained exactly two lines** (one import, one instantiation). Every other core file — Renderer, LayerManager, LabelManager, SpatialIndex, SearchEngine, ProjectionEngine, InteractionManager, UIManager, StatsManager, RelationsGraph, ExportManager, DataManager, ThemeManager — is byte-for-byte unchanged.

The Knowledge Graph engine reads only through the public `Atlas.layers.list()` / `Atlas.data.getFeature()` APIs. Cross-highlighting uses `Atlas.renderer.updateFeatureStyle` — a documented public method.

## Known gaps (deferred, honestly reported)

1. **Every polygon is district-approximated.** Actual isohyet, soil, and vegetation boundaries cross districts. When surveyed polygons from IMD/NBSS/FSI are downloadable as GeoJSON, drop them in and re-run — the layer registration and knowledge graph absorb the change without modification.
2. **The knowledge graph is 52 edges deep, not exhaustive.** Every edge is manually authored so it stays honest. Expanding it is additive: append to `atlas/data/raw/BUILD_CLIMATE.py`'s `edges` array and re-run.
3. **Temperature layer doesn't yet have its own tint mode.** It shares the `climate` mode's activation. A dedicated toolbar entry is a two-line change.
4. **Statistics dashboard hasn't been extended for Module 4.** The StatsManager can now surface "Highest rainfall district", "Largest soil group", "Dominant vegetation", "Most drought-prone region" — extension is on the follow-up list.
5. **Search hints for thematic features are minimal.** Zone names are searchable but pattern-name recognition (e.g., typing "arid" surfacing every arid-adjacent layer) is a follow-up.

Added to `docs/PENDING.md`.

## Verification

* Boot: 22 layers register successfully (1 admin + 7 physical + 6 environment + 8 climate). Zero console errors.
* Knowledge graph: 52 edge sources indexed at `atlas:ready`.
* Selection: clicking "Arid" fills the detail panel with 8 editorial sections and pulses 6 map features via cross-highlight.
* Every layer has a corresponding mode registered and a toolbar button appears in the layers popover.
* Search regression preserved: `ranth` still returns Ranthambore NP + TR; `sambhar` still returns both wetland + Ramsar; `chambal` now also returns Chambal Basin drought/desertification context via the graph.

## What's next

Per the stop condition: **stopping here**. Agriculture, Geology, Economy layers are not started. When you're ready, they follow the same district-approximated + knowledge-graph-extension pattern.
