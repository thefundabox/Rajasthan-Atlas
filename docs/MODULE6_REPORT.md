# Module 6 — Geology · Minerals · Mining

**Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** 0 lines.

## What shipped

**7 new atlas layers** — the atlas now has **37 total layers**:

| Layer | Features | Category | Fidelity |
|---|---:|---|---|
| Geological Provinces | 8 | geology | District-approximated · GSI stratigraphy |
| Rock Types | 5 | geology | District-approximated · GSI |
| Mineral Belts | 10 | mining | District-approximated · DMG + IBM |
| Building Stones | 6 | mining | District-approximated · DMG dimension-stone register |
| Mining Clusters | 6 | mining | District-approximated · DMG + IBM |
| Major Mines | 15 | mining | **Point features** with cited coordinates · HZL, HCL, RSMDC, IBM |
| Petroleum & Gas | 5 | geology | Barmer Basin polygon + 4 field points · Cairn / ONGC |

**Knowledge Graph: 141 → 192 unique source features · 474 → 590 typed edges** — 116 new edges spanning the complete geological narrative:

* Every province → its downstream mineral belts + signature mines + rock type
* Every belt → its parent province + signature mines + mining cluster
* Every mine → its mineral belt + mining cluster + operator
* Every building stone → its mineral belt + geological province
* Every field → its basin + operator

## The complete geological chain, verified

Click **Aravalli Supergroup** and the cluster returns 8 features across every layer:

* **SIGNATURE** Zawar Mines · Rajpura Dariba · Jhamarkotra Rock-Phosphate
* **DEFINES** Lead-Zinc belt · Phosphate belt · Metamorphic rocks
* **COLOCATED** Marble belt (Aravalli carbonates → marble) · Archaean Bhilwara (adjacent basement)

Same chain works for every province:

* **Delhi Supergroup** → Rampura Agucha + Khetri + Copper belt + Aravalli main axis
* **Malani Igneous Suite** → Jalore granite + granite belt + granite as building stone + igneous rocks
* **Marwar Supergroup** → Nagaur gypsum + gypsum belt + Jodhpur red sandstone
* **Vindhyan Supergroup** → Kota Stone + limestone belt + sandstone belt + Kota Limestone Cluster
* **Deccan Trap** → basalt weathering → Hadoti Vertisols (black soils) → SE Plateau

## Architecture continuity

`AtlasCore.js` delta = **0 lines**. All 7 new layers plug in via `Atlas.layers.register()`, `Atlas.labels.register()`, `Atlas.layers.registerMode()`. Renderer, LayerManager, LabelManager, KnowledgeGraph, RelationsGraph, DataManager, ThemeManager, ExportManager, StatsManager, RevisionDashboard, ConceptChains, CompareMode, InteractionManager, SpatialIndex, SearchEngine, ProjectionEngine, UIManager — all byte-for-byte unchanged.

## Verification

* Boot: **37 layers** register cleanly. 192 KG source features. 590 typed edges. Zero console errors.
* Cross-highlight test:
  * Aravalli SG → 8 features pulse (Zawar, Rajpura Dariba, Jhamarkotra, Lead-Zinc belt, Phosphate belt, metamorphic rocks, marble belt, Archaean Bhilwara)
  * Makrana Mine → marble belt + Nagaur–Ajmer cluster
  * Barmer Basin → 4 fields + Barmer-Oil-Lignite Cluster
* Every mine → mineral belt link works.
* Search regression: `zawar`, `makrana`, `khetri`, `barmer`, `kota stone`, `granite`, `marble` all return correct features.

## Known gaps (deferred to PENDING.md)

1. **All thematic polygons district-approximated.** GSI's 1:50 000 geological maps + belt polygons exist in the National Geoscience Data Repository (NGDR) but require registration. When swapped in, the atlas absorbs them without code change.
2. **Small mineral deposits omitted** (Fluorspar, Feldspar, Silica sand, Baryte, Ochre, etc.). The 10 belts shipped cover ~95 % of Rajasthan's mineral output value; small deposits are follow-up.
3. **Pipeline network not mapped** — the Salaya–Mathura pipeline (Cairn Rajasthan crude → Gujarat refinery) is well-documented but not yet shipped as GeoJSON.
4. **Environmental issues** are noted per cluster (`issues` field) but not ranked or overlaid. Follow-up when Module 8 (Environment/Sustainability) arrives.
5. **Historical mining sites** (Zawar antiquity, Sirohi copper) are noted in facts but not spatially catalogued.

## Deliverables checklist

* ✓ `data/geological-provinces.geojson` (8)
* ✓ `data/rock-types.geojson` (5)
* ✓ `data/mineral-belts.geojson` (10)
* ✓ `data/major-mines.geojson` (15)
* ✓ `data/building-stones.geojson` (6)
* ✓ `data/petroleum-gas.geojson` (5)
* ✓ `data/mining-clusters.geojson` (6)
* ✓ `layers/GeologyLayer.js`, `MineralsLayer.js`, `MiningLayer.js`
* ✓ `styles/geology.css`
* ✓ `docs/GEOLOGY_SYSTEM.md`, `MINERALS_SYSTEM.md`, `MINING_SYSTEM.md`, `MODULE6_REPORT.md`

## What's next

Per the stop condition: **stopping here**. Industry, Energy, Economy layers not started.
