# Revision System

Module 4.1 transformed the thematic climate/soil/vegetation layers from a set of maps into a **spatial revision surface** that helps a learner move fluidly across geographic relationships. This document describes the four surfaces and how they are wired.

## Surfaces

### 1. Revision Dashboard

Header button **Revise** (keyboard `V`) opens a full-map overlay. Every card is **computed live** from the loaded datasets — no hardcoded values. Ships with:

* **Lowest / Highest rainfall** — sorted by `avg_mm`; card foot lists the constituent districts.
* **Coldest / Hottest zone** — sorted by `mean_c`.
* **Dominant soil type** — sorted by district-membership count; foot shows crop suitability.
* **Dominant vegetation** — same rank, plus Champion & Seth id + three signature species.
* **Most drought-prone** — auto-picks the `very-high` bucket.
* **Desertification hotspot** — auto-picks the `severe` bucket.
* **Climate coverage** — 4 cards, one per climate region, showing % of Rajasthan by district.
* **Signature protected areas** — pulled from the Knowledge Graph — for each climate region, the flagship PA is surfaced.

Every card is clickable — it fires `Atlas.interaction.select(layerId, featureId)` and the overlay closes.

Below the cards, the Dashboard renders the **Concept Chains** library (see below).

### 2. Concept Chains

`atlas/layers/ConceptChains.js` ships **7 curated chains**, each telling a spatial story:

* **The Arid Syndrome** — Arid Climate → <200 mm → Desert Soil → Thorn Forest → Sewan Grasslands → Desert NP
* **The Aravalli Tiger Corridor** — Semi-arid → Aravalli Hills → Red loamy → Dry Deciduous → Sariska + Ranthambore
* **The Humid South-East** — Humid pocket → >1000 mm → Southern Hills → Mixed red-black soils → Dry mixed forest → Sitamata + Phulwari ki Nal
* **The Chambal Water Network** — Chambal Basin → Chambal River → Riparian → National Chambal WLS → Mukundra + Dholpur–Karauli
* **The Ramsar Wetland Story** — Interior drainage → Sambhar (1990) → Keoladeo (1981) → Khichan (2025) → Menar (2025) → Wetland vegetation
* **The Hadoti Black-Soil Plateau** — SE Plateau → Black soils → Zone V → 700–1000 mm → Mukundra NP
* **The Canal Command (IGNP)** — Arid → Zone IB (Irrigated NW) → Ghaggar basin → Moderate desertification

Every step is a **real feature id** — the chain isn't a UI decoration, it's live navigation. Clicking a step opens that feature; extending the chain library requires adding one JS entry with the correct feature ids.

### 3. Quick Revision Mode

`Atlas.layers.setMode('quick-revision')` toggles a mode that:

* Fades **districts to 15 %** and terrain to 25 % so the base recedes.
* Reduces every thematic overlay to **25 % fill** so no polygon dominates.
* Promotes **National Parks + Tiger Reserves to full opacity** with thicker strokes — so the PA network reads through the muted thematic base.

The feature detail panel still opens with the full editorial card. Combined, the reader gets: minimal visual noise + rich narrative for whichever feature they clicked.

### 4. Compare Mode

Header button **Compare** (keyboard `X`) enters compare mode. In this mode:

* The next map click fills **Slot A**.
* The next click fills **Slot B**.
* Subsequent clicks round-robin between the two slots.
* A slide-in panel at the bottom of the map renders a **2-column side-by-side card** — rainfall, temperature, Köppen, soil texture, fertility, crops, species, canopy, districts, elevation, length, area, basin, range.
* Below the cards, a **Key Differences** section computes:
  * Districts unique to A / unique to B / shared
  * Rainfall delta (`… is wetter by …`)
  * Temperature delta
  * Same-vs-different feature type note

Comparison works **cross-layer** — you can compare a climate region to a river, or a soil type to a Tiger Reserve. The atlas is happy to explain that they're different kinds of features and show what they still have in common (usually districts).

## Student-friendly labels

* **Key Facts** — was "Key facts"; the noun now leads.
* **Remember** — was "Learning aid"; more natural in a study context.
* **Common Confusion** — was "Commonly confused with"; short and student-familiar.
* **Why It Matters** — new section, derived from `properties.notes.significance`. Renders when `significance !== 'medium'`; the copy adapts to `very-high` vs `high`.

Data field names stay unchanged (`properties.notes.facts`, `mnemonic`, `confusedWith`, `significance`) — this is a UI-labels-only rename so the JSON schema and every downstream tool continues to work.

## The Knowledge Graph expansion

The graph grew from 52 → **~286 typed edges** (91 unique source features). New coverage:

* Every **physiographic region** ↔ its climate, soils, vegetation, drainage basins, signature PAs (5 regions × ~8 edges = ~40 edges).
* Every **drainage basin** ↔ its rivers, agro-zones, PAs (7 basins × ~5 edges = ~35 edges).
* Every **major protected area** ↔ its climate, soil, vegetation, physiography (~10 PAs × ~5 edges = ~50 edges).
* Every **agro-climatic zone** ↔ its rainfall + soil + drainage basin (~10 zones × ~3 = ~30 edges).
* **Rivers** ↔ their riparian environments + downstream PAs.
* **Peaks** ↔ their range + district + associated WLS.
* **Wetlands / Ramsar** ↔ their salt / freshwater soil signatures.

Each new edge carries an optional `explanation` — a short one-sentence attribution that Compare and Related-Features rendering can surface. The renderer falls back gracefully when `explanation` is absent (existing edges continue to work).

## Wiring — every capability is a plug-in

All four surfaces plug into the existing engine through the same three touch-points:

1. `Atlas.bus.on('atlas:ready', …)` — install DOM elements after boot.
2. `Atlas.bus.on('selection:changed', …)` — react to feature selection (Compare consumes this to fill slots; ThematicEditorial cross-highlights the KG cluster).
3. `Atlas.layers.registerMode(id, spec)` + toolbar-button injection — every mode discovers itself.

Zero changes to `AtlasCore`, `Renderer`, `LayerManager`, `LabelManager`, `SpatialIndex`, `SearchEngine`, `ProjectionEngine`, `InteractionManager`, `UIManager`, `KnowledgeGraph`, or `RelationsGraph`. The engine is stable; every module-4.1 capability is additive.

## Extending

* **Add a card to the dashboard** — edit `RevisionDashboard.js`'s `render()` function.
* **Add a chain** — append a `{id, title, story, steps}` object to `CHAINS` in `ConceptChains.js`. Every step must reference a valid `layerId::featureId`.
* **Add a knowledge-graph edge** — append to the `edges` array in `BUILD_CLIMATE.py`, re-run.
* **Add a comparison field** — extend `extractRows()` in `CompareMode.js`.

## Anti-patterns

* **Never hardcode a value into the dashboard.** Every stat must derive from the datasets. If a fact should hold across dataset changes, compute it, don't type it.
* **Never invent a feature id in the chain library.** Every step must resolve. Broken ids surface as clicks that do nothing — bad UX.
* **Never widen the KnowledgeGraph edge model without a schema note here.** The `{target, type, explanation?, weight?}` shape is the contract.
