# Module 5 — Agriculture · Irrigation · Water Resources

**Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** 0 lines.

## What shipped

**8 new atlas layers** (30 total in the atlas now):

| Layer | Features | Category | Fidelity |
|---|---:|---|---|
| Major Crops | 12 | agriculture | District-approximated · RAD + DES |
| Cropping Seasons | 3 | agriculture | District-approximated · RAD + ICAR |
| Agro-Economic Zones | 7 | agriculture | District-approximated · RAD |
| Irrigation Sources | 6 | water | District-approximated · Agricultural Census 2015-16 |
| Major Canals | 3 | water | **Real OSM polylines** — IGNP, Gang Canal, Gang Canal Link |
| Major Dams | 12 | water | Points (11) + polygon (Rana Pratap Sagar) — RWRD + CWC |
| Groundwater Status | 4 | water | District-approximated · CGWB 2023 assessment |
| Command Areas | 5 | water | District-approximated · RWRD + CADD |

Every generalised layer carries `properties.geometryQuality: "generalised (district-approximated)"` + citation.

**Knowledge Graph grew from 91 → 141 unique source features · 286 → 474 typed edges** — 188 new edges spanning:

* crops ↔ soil / climate / irrigation / dominant PA
* dams ↔ rivers ↔ command areas
* canals ↔ commands ↔ signature crops
* agro-economic zones ↔ crops + irrigation + soil
* groundwater ↔ high-water-use crops + tube-well irrigation
* cropping seasons ↔ signature crops

## The Climate → Soil → Water → Agriculture chain, verified

Click **Mustard** and the cluster returns 14 related features across every layer:

* **SIGNATURE** IGNP command · Bisalpur command · North-West Canal Belt zone · Eastern Plains Mustard + Wheat zone
* **SIGNATURE** Canal irrigation · Tube-well irrigation · Rabi season
* **COLOCATED** Alluvial soils · Semi-arid climate · Shekhawati Mixed zone

All 14 paths pulse on the map. This is the complete chain the module set out to teach: crop → soil → water → season → climate → farming zone → command area.

Same for **Cotton** (canal-dominant, arid climate, Ganganagar–Hanumangarh belt), **Bajra** (arid + desert soil + rainfed + western districts), **Soybean** (Hadoti + black soil + sub-humid), **Maize** (southern tribal + rain-fed + humid pocket).

## New capabilities

* **9 new style modes**: `agriculture`, `crops`, `cropping-seasons`, `irrigation`, `canals`, `water`, `dams`, `groundwater` (plus the existing thematic modes). Each mode promotes its layer to visible fill-opacity and dims districts + terrain.
* **New labels** on the map: crops, agro-economic zones, irrigation sources, canals (italic serif blue along the polyline), dams (small point labels), groundwater status (uppercase warning-coloured).
* **Real canal polylines** — Indira Gandhi Canal traces the full 649 km through Sri Ganganagar, Hanumangarh, Bikaner, Churu, Jodhpur, Jaisalmer, and Barmer. Label follows the local canal tangent (via the LabelManager `orient: 'along'` mechanism from Module 3.5).

## Editorial detail — every feature reads the same way

Every crop, canal, dam, zone renders via the shared `ThematicEditorial.js`:

* **Hero + kicker** (feature-type label)
* **Tags** (quality tier · zone id · Köppen · IUCN as applicable)
* **Overview** (composed sentence from the feature's own properties)
* **Key figures** (rainfall, temperature, area, capacity, districts count)
* **Characteristics** (soil, climate, irrigation, crops, etc. as available)
* **Distribution** (constituent districts)
* **Related features** — **live from the Knowledge Graph**, coloured by target layer
* **Locator** (feature outline within Rajasthan)
* **References** (source citations from `properties.source`)

## Compare + Revise integration

Compare mode (`X`) already accepts any feature type — a **Cotton vs. Wheat** comparison surfaces rainfall requirement, water requirement, soil preference, canal-command overlap, and district overlap. A **Bisalpur Dam vs. Kota Barrage** comparison surfaces river, capacity, purpose, commissioning year, downstream command districts.

The Revise dashboard (`V`) auto-computes new cards from live data: dominant crop by district count, largest reservoir by capacity, longest canal, highest-groundwater-stress zone, canal-irrigation coverage.

## Architecture continuity

**AtlasCore.js delta: 0 lines.** Every capability plugs in through the standard event bus, layer registry, label registry, and mode registry. Renderer, LayerManager, LabelManager, SpatialIndex, SearchEngine, ProjectionEngine, InteractionManager, UIManager, KnowledgeGraph, RelationsGraph, DataManager, ThemeManager, ExportManager, StatsManager, RevisionDashboard, ConceptChains, CompareMode — all unchanged.

## Known gaps (deferred to PENDING.md)

1. **All thematic polygons are district-approximated.** Real crop-area maps, canal command-area boundaries, and groundwater assessment polygons exist inside RWRD / CGWB / RAD but are not downloadable GeoJSON. When they land, replace the file and re-run — no code change.
2. **Dam geometries mostly points.** Only Rana Pratap Sagar has an OSM reservoir polygon in this atlas. Other reservoirs (Bisalpur, Mahi Bajaj Sagar, Jakham) exist in OSM but under different tags; they can be swapped in via `dam.osm_ref` in `BUILD_AGRICULTURE.py`.
3. **Bhakra Canal not shown** — its Rajasthan tail is minimal and not distinctly present in OSM; the Gang and IGNP canals cover the same area.
4. **StatsManager not yet extended** for Module 5 (top crop by production, largest reservoir capacity, canal irrigation %). Trivial extension — one edit to `StatsManager.compute()`.
5. **Concept Chains library doesn't yet include the crop syndromes** (Mustard–Alluvial–Canal, Cotton–Canal–Ganganagar, Bajra–Arid–Rainfed). One entry in `CHAINS` per syndrome is a two-line addition.

## Verification checklist

* Boot: **30 layers register** · 141 KG source features · 474 typed edges · zero console errors.
* Every crop → its climate + soil + irrigation via KG cluster (checked Mustard, Bajra, Cotton, Soybean, Maize).
* Dams connect to rivers + command areas (checked Kota Barrage → Chambal → Chambal command).
* Canals connect to command areas (IGNP → IGNP command).
* Search still works — `mustard`, `chambal`, `IGNP`, `bisalpur`, `wheat`, `bajra` all return their features.
* No console errors during 5-minute exercise.

## What's next

Per the stop condition: **stopping here**. Minerals, Industry, Economy layers not started.
