# Physical Geography Framework

The physical geography module is the *base layer* on which every future thematic layer (climate, agriculture, geology, population, transport, biodiversity) will sit. This document describes its structure, the data quality tiers, and how a downstream module inherits the framework.

## The four visual tiers

Reading from bottom to top of the map stack:

1. **Physiographic regions** (`layer-physiography`) — flat, muted paper tones per region. Establishes the geographic ground.
2. **Drainage basins** (`layer-drainage-basins`) — dashed outlines, transparent fill. Appear when a hydrology or physiography mode is active.
3. **Thar Desert extent** (`layer-thar`) — warm sand fill.
4. **Rivers + Lakes** (`layer-rivers`, `layer-lakes`) — the water network in soft atlas blue.
5. **Aravalli main axis + Peaks** (`layer-aravalli`, `layer-peaks`) — the relief backbone.
6. **Protected areas** (Module 2 layers) — sit above the physical base.
7. **District boundaries** (`layer-districts`) — administrative overlay.
8. **Labels** — the label engine's collision-detected labels sit on top of everything.

The atlas's `zIndex` values in `atlas.json` encode this order. Any new module should slot into the layer stack at an appropriate `zIndex` — not blindly on top.

## Data quality tiers

| Layer | Fidelity | Source |
|---|---|---|
| Rivers | **High** — real OSM geometry | OSM `waterway=river` relations + ways |
| Lakes | **High** — real OSM geometry | OSM `natural=water` polygons |
| Peaks | **High** — real OSM points with elevation | OSM `natural=peak` nodes |
| Thar Desert | **Medium** — OSM-community-mapped extent | OSM `natural=desert` polygons |
| Aravalli axis | **Generalised** — synthesised polyline through named peaks | Constructed |
| Physiographic regions | **Generalised** — district-boundary approximation | Constructed |
| Drainage basins | **Generalised** — district-boundary approximation | Constructed |
| Elevation raster | **Deferred** — text zone metadata only | Follow-up (SRTM DEM) |

Every feature carries `properties.geometryQuality` marking its tier. The detail panel surfaces a "Generalised boundary" or "Point feature" tag so readers see the epistemic status of every polygon.

## Rivers

23 named major rivers ship in `rivers.geojson`. Each carries:

* `basin` — the drainage basin it belongs to (Chambal / Luni / Mahi / Sabarmati / Banganga / Ghaggar / internal)
* `length_km` — documented length
* `headwaters` — approximate source region
* `mouth` — outlet
* `perennial` — boolean
* `tributaries` — array of tributary names

The atlas covers: Chambal, Banas, Berach, Kothari, Bandi, Banganga, Luni, Mahi, Sabarmati, Anas, Ahar, Ahu, Kalisindh, Parvan, Parbati, Sabi, Amanishah, Ghaggar, Jawai, Sukri, West Banas, Mej, Menal, Chakan, Som, Jakham.

Not all named rivers in Rajasthan appear — many minor tributaries were excluded from the whitelist to keep the atlas legible. Adding one is a two-line change: extend `RIVER_META` in `BUILD_PHYSICAL.py` and re-run.

## Lakes

11 named lakes ship in `lakes.geojson`, spanning natural and artificial impoundments:

Ana Sagar (1135 CE), Pichola (1362), Fateh Sagar (1687), Rajsamand (1662), Jaisamand (1691), Nakki, Kaylana (1872), Bisalpur (1999), Ramgarh (1899), Bal Samand (1159), Amrit Kund, Bandh Baretha (1897).

Each carries `lake_type` (natural/artificial), `salinity` (freshwater/saline), area, basin, construction date.

The wetlands layer from Module 2 overlaps a few of these (Pichola, Fateh Sagar) — that is intentional: wetlands read as *ecological* features, lakes as *hydrological* features. Both perspectives coexist without deleting either.

## Aravalli Range

Shipped as a synthesised main-axis linestring running SW → NE through 13 anchor points, from Guru Shikhar (Mount Abu, Sirohi) through Kumbhalgarh → Ajmer → Shekhawati → Alwar-Sariska → the Delhi border.

`aravalli.geojson` also holds structural metadata: 692 km total length, six named segments, `highest_peak` reference to Guru Shikhar (1722 m).

**Do not treat the axis as a surveyed trace.** OSM has 142 unnamed ridge fragments in Rajasthan that cluster around this line but do not form a single continuous feature. The axis is a visualisation of the range, not the range itself.

## Thar Desert

Ships as the union of OSM `natural=desert` polygons. Categorised sub-regions in the properties: core arid dune belt, semi-arid transition, stabilised dunes, desert fringe.

## Physiographic regions

Five regions ship, following the standard geography-text division:

1. Western Sandy Plains (Thar Desert region) — 11 districts
2. Aravalli Hill Region — 12 districts
3. Eastern Plains (Banas–Chambal basin) — 10 districts
4. Southeastern Plateau (Hadoti) — 5 districts
5. Southern Aravalli / Mahi Basin — 2 districts

Each region is the *union of its constituent districts*. Actual physiographic boundaries cross districts, so the polygons here are approximations. This is documented per-feature via `geometryQuality: "generalised"` and a `geometryNote`.

## Drainage basins

Seven basins:

1. Chambal Basin
2. Luni Basin (internal)
3. Mahi Basin
4. Sabarmati Basin (western portion)
5. Banganga Basin
6. Ghaggar Basin (dying river system)
7. Interior Drainage (Sambhar–Nagaur inland basin)

Same district-union construction as physiographic regions. Some districts contribute to multiple basins in reality; the atlas assigns each district to one primary basin for legibility.

## Elevation

`elevation.json` is a *taxonomy* file rather than a raster:

```json
{
  "zones": [
    { "id": "lowland", "min_m": 100, "max_m": 300, "label": "Lowlands", ... },
    { "id": "plateau-low", "min_m": 300, "max_m": 500, ... },
    ...
    { "id": "peak", "min_m": 1200, "max_m": 1800, "label": "Aravalli peaks", ... }
  ]
}
```

`ReliefLayer.js` is architected to accept a raster tile source when SRTM (or equivalent) is added. The interface is a `Atlas.relief.setRasterSource(url)` call — currently a stub, but the plug-in path is documented so the eventual raster addition needs no engine change.

## Interaction

Modes registered by the physical modules:

* `physical` — dims districts and PAs so the physical base reads clearly.
* `hydrology` — emphasises rivers, lakes, basins.
* `relief` — emphasises Aravalli, Thar, peaks.
* `physiography` — emphasises regional structure.

Keyboard: `6` `7` `8` `9` respectively; also switchable via the Layers popover.

Selection of any physical feature opens the editorial detail panel via `PhysicalEditorial.js` — 10 sections tailored per feature type (hero → tags → overview → key figures → physical characteristics → ecology → governance → key facts → locator → references).

## What later modules inherit

Every future thematic module (climate, agriculture, forest types, geology, minerals, population, transport, biodiversity) inherits:

1. The four visual tiers and `zIndex` conventions.
2. The label priority ladder — new labels register with priorities relative to the existing ones.
3. The physiographic-region and drainage-basin polygons as spatial groupings — climate zones can be presented as an overlay indexed to these regions.
4. The rivers-as-hydrology-graph structure — irrigation, transport (water), agriculture-by-water-source layers can query the rivers layer.
5. The peaks-as-elevation-samples grid — biodiversity, forest types, and climate can be indexed by elevation zone.

No engine change is expected for Climate, Agriculture, or Geology modules — the [ARCHITECTURE.md](../ARCHITECTURE.md) plug-in path applies.
