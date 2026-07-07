# Rajasthan Atlas

An interactive, publication-quality digital atlas of Rajasthan — **64 thematic layers across 9 modules**, a knowledge graph with **975 typed cross-layer relationships**, and a plug-in architecture that lets every dataset teach the geography, economy and people of the state through one connected story.

> **Live site:** https://thefundabox.github.io/Rajasthan-Atlas/

![Rajasthan Digital Atlas](audit/atlas-audit.html)

---

## What it covers

| # | Module | Layers | Highlights |
|---|---|---:|---|
| 1 | Districts + Divisions | 1 | 41 districts (post-2023 gazette) · 7 divisions |
| 2 | Physical Geography | 7 | Aravalli · Thar · 23 rivers · 11 lakes · 8 named peaks · 5 physiographic regions · 7 drainage basins |
| 2.5 | Terrain | 1 | SRTM/Copernicus hillshade + hypsometric raster |
| 3 | Environment & Protected Areas | 5 | 5 NPs · 5 Tiger Reserves · 25 WLS · 4 Ramsar sites · 8 wetlands |
| 4 | Climate · Soils · Vegetation | 8 | Rainfall · temperature · Köppen · agro-climatic · soils · vegetation · desertification · drought |
| 5 | Agriculture · Irrigation · Water | 8 | 12 crops · 3 seasons · 7 agro-economic zones · IGNP + Gang Canal + 12 dams · groundwater status · 5 command areas |
| 6 | Geology · Minerals · Mining | 7 | 8 provinces · 5 rocks · 10 mineral belts · 15 major mines · 6 clusters · Barmer Basin |
| 7 | Industry · SEZs · Handicrafts | 6 | 5 industrial regions · 8 sectoral clusters · 12 RIICO estates · 12 flagship units · 4 SEZs · 10 GI-tagged craft clusters |
| 8 | Energy · Power · Grid | 6 | 5 energy-mix zones · 3 renewable zones · 2 transmission corridors · 13 power plants · 6 solar parks · 4 wind farms |
| 9 | Human Geography · Administrative | 15 | 7 demographic choropleths · 7 administrative overlays · 3 urban point layers · population corridors |

**Every feature is real, sourced, and cross-linked.** Click the Bhadla Solar Park and the atlas lights up the arid climate region, the Thar Desert, the Solar Radiation Zone A and the Green Energy Corridor. Click JK Cement Nimbahera and it lights up the limestone belt, the sedimentary rock type, the Cement Cluster and the Udaipur-Rajsamand Mining region.

---

## Design commitments

* **Publication-quality cartography** — muted paper palette, serif typography, italic hydrology, small-caps region labels. Prints legibly at A4 landscape.
* **Honesty over completeness** — every feature carries a `geometryQuality` marker (Surveyed / OSM / Generalised / Point-only). District-approximated polygons are declared as such; synthetic labels are never invented.
* **Real names only** — no fabricated peak names, no filler placemarks. If the source doesn't cite it, the atlas doesn't ship it.
* **Zero engine changes** — every module is an additive plug-in under `atlas/layers/`. AtlasCore has not been modified since v1.0.0.
* **Teach relationships, not isolated facts** — the Knowledge Graph exposes typed edges (signature / defines / colocated / proximity) that render as cross-highlights on the map and as clickable chips in the detail panel.

---

## Tech

| Aspect | Choice |
|---|---|
| Runtime | Pure static site — HTML + ES modules + SVG. No build step. |
| Data | GeoJSON per layer + a shared `knowledge-graph.json` + `district-demographics.json` |
| Projection | Equirectangular corrected by cos(mid-latitude) — accurate at Rajasthan's ~26 °N |
| Styling | Semantic CSS with per-mode dimming; light / dark / print themes |
| Data build | Python 3 (`atlas/data/raw/BUILD_*.py`) — deterministic and idempotent |
| Deployment | GitHub Pages — see [DEPLOY.md](DEPLOY.md) |

---

## Run locally

```bash
python3 -m http.server 8770 --directory .
# → open http://localhost:8770/
```

The atlas needs an HTTP origin (ES modules + `fetch()` won't work over `file://`).

## Rebuild every dataset from scratch

```bash
cd atlas/data/raw
python3 BUILD.py               # districts (Module 1)
python3 BUILD_ENV.py           # environment (Module 3)
python3 BUILD_PHYSICAL.py      # physical geography (Module 2)
python3 BUILD_TERRAIN.py       # terrain hillshade (Module 2.5)
python3 BUILD_CLIMATE.py       # climate / soils / vegetation (Module 4)
python3 BUILD_AGRICULTURE.py   # agriculture (Module 5)
python3 BUILD_GEOLOGY.py       # geology / minerals / mining (Module 6)
python3 BUILD_INDUSTRY.py      # industry (Module 7)
python3 BUILD_ENERGY.py        # energy (Module 8)
python3 BUILD_HUMAN.py         # human geography (Module 9)
python3 BUILD_AUDIT.py         # regenerate audit/atlas-audit.html
```

Every build script is idempotent — re-running produces the same output.

---

## Architecture

```
atlas/
  core/                    ← 12 managers. Do not modify. AtlasCore v1.0.0.
    AtlasCore.js  DataManager.js  Renderer.js  LayerManager.js
    LabelManager.js  ProjectionEngine.js  InteractionManager.js
    SpatialIndex.js  SearchEngine.js  ThemeManager.js  UIManager.js
    StatsManager.js  RelationsGraph.js  KnowledgeGraph.js  ExportManager.js
  layers/                  ← additive plug-ins (25+ files, one per module)
  data/                    ← 60+ GeoJSONs + knowledge-graph.json + terrain-hillshade.png
    schemas/feature.schema.json
    raw/                   ← Python build pipeline + OSM dumps (dev-time only)
  ui/                      ← CSS: theme, layout, print, component styles

docs/                      ← module reports · PENDING.md · architecture references
audit/atlas-audit.html     ← generated QA snapshot
index.html                 ← ES-module boot
```

## Knowledge Graph API

```js
Atlas.knowledge.of(feature)       // grouped by edge type
Atlas.knowledge.cluster(feature)  // flat, deduped, weight-ranked
```

Loaded at boot from `atlas/data/knowledge-graph.json` (255 source groups · 975 typed edges). Every layer plug-in wires cross-highlighting through `ThematicEditorial.js`.

---

## Data sources

Every feature carries a citation chain in `properties.source`. Primary sources include Census of India 2011 (RGI), CGWB, GSI, DMG, DMICDC, RIICO, CEA, MNRE, NPCIL, SECI, RVUNL, MoHUA Smart Cities, TAD Rajasthan, Rajasthan Forest Department, IMD, ICAR, Champion & Seth (1968) forest classification, and OpenStreetMap contributors. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) and each module's report for the complete list.

---

## Deploy your own copy

See **[DEPLOY.md](DEPLOY.md)** for step-by-step GitHub Pages instructions (a single push + one setting toggle).

---

## License

MIT — see [LICENSE](LICENSE).

The underlying data is sourced from public government publications and OpenStreetMap. Cartography and code are original. Attribution is required for reuse; see `docs/DATA_SOURCES.md` for per-dataset provenance.
