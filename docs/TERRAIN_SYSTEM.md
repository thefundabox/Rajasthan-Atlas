# Terrain System

The atlas ships a raster hillshade + soft hypsometric tint as its base landscape. Every other layer — administrative, protected, physical vector, thematic — sits on top of this terrain. This document explains the pipeline, the cartographic choices, and how a downstream system inherits the base.

## What ships

* `atlas/data/terrain-hillshade.png` — 928×890 RGB PNG at ~1 km/pixel, 581 KB.
* `atlas/data/terrain-metadata.json` — bounds, elevation range, hillshade parameters, source citation.
* `atlas/data/raw/BUILD_TERRAIN.py` — deterministic build pipeline (tile fetch → decode → stitch → crop → hillshade → tint → blend → PNG).
* `atlas/data/raw/terrain-tiles/` — raw terrarium tiles cached from AWS (20 tiles at zoom 7).
* `atlas/layers/TerrainLayer.js` — plug-in that inserts a single SVG `<image>` at the bottom of the layer stack and registers a `terrain` style mode.

## Data source

Mapzen "terrarium" DEM tiles from the public AWS bucket `s3://elevation-tiles-prod`. These fuse SRTMGL1 (30 m, land) with SRTMGL3 (90 m, land) and ETOPO1 (bathymetry) and encode elevation in the PNG RGB channels:

```
elevation_m = R * 256 + G + B / 256 − 32768
```

* Zoom level: **7**. Each tile covers ~2.8° of longitude. Rajasthan needs 20 tiles at this zoom (5 columns × 4 rows).
* Total download: ~1 MB compressed.
* Final rendered PNG covers a slightly padded bbox (68.8–79.0°E, 22.2–30.9°N) so the atlas can show Rajasthan in the context of its neighbours without a hard-edge crop.

Bulk of the data comes from NASA SRTM. Attribution required in shipped builds: **"Elevation data © NASA / Mapzen (terrarium encoding), redistributed via elevation-tiles-prod. ODbL 1.0."** — added to `docs/DATA_SOURCES.md`.

## Cartographic choices

### Hillshade

* Illumination azimuth: **315° (NW)** — the standard NatGeo / Britannica / USGS convention.
* Altitude: **45°**.
* Z-factor: **1.5** — subtle exaggeration so Rajasthan's low relief (mostly 100–600 m; Aravalli peaks 1000–1722 m) reads on the paper without becoming caricatured.
* Formula: standard USGS Horn's algorithm via numpy gradients — `cos(alt)·cos(slope) + sin(alt)·sin(slope)·cos(az − aspect)`.

### Hypsometric tint

Rajasthan's elevation range is narrow. A wildly-coloured tint would misrepresent the terrain and fight the vector overlays. The palette is deliberately restrained — cool pale-green in the plains, warm buff on the plateau, mauve-grey on the Aravalli, near-white on the peaks. Then desaturated toward the paper base (`0.65 × tint + 0.35 × paper`).

| Elevation (m) | Colour | Reads as |
|---:|---|---|
| 0–100 | cool paper | river plains |
| 100–250 | warm cream | eastern plains |
| 250–400 | pale buff | plateau |
| 400–600 | soft ochre | Aravalli mid |
| 600–900 | warm sienna | Aravalli high |
| 900–1200 | dusky mauve | near-peak |
| 1200–1500 | pale mauve | peaks |
| 1500+ | near-white | Guru Shikhar 1722 m |

### Blend

Hillshade multiplied over the tint at **60 % strength**. Weak enough that the tint stays legible; strong enough that the Aravalli reads as raised.

CSS then applies **`mix-blend-mode: multiply`** onto the paper canvas, so the terrain harmonises with the atlas palette rather than sitting as a foreign raster.

In dark theme, the blend inverts to **`screen`** at 35 % opacity so relief remains legible without dominating the ink base.

## Integration — how it plugs in

`TerrainLayer.js`:

1. Subscribes to `atlas:ready`.
2. Fetches `terrain-metadata.json` for bounds.
3. Projects `[minLon, maxLat]` and `[maxLon, minLat]` through `Atlas.projection.forward()` to get SVG-space top-left and bottom-right.
4. Creates a `<g id="atlas-terrain">` containing one `<image>` and inserts it as the first sibling before `<g id="atlas-layers">`, ensuring vector layers render on top.
5. Registers a `terrain` style mode and adds a **Terrain** button to the layers popover with the keyboard shortcut **T**.

Zero core-engine changes. `AtlasCore`, `Renderer`, `LayerManager`, `LabelManager`, `SpatialIndex`, `SearchEngine`, `ProjectionEngine` all untouched.

## Mode integration

* **Base / Divisions / New (2023)** — terrain hidden. These are pure administrative reads.
* **Physical / Hydrology / Relief / Physiography / Environment / Reader** — terrain visible at ~86 % opacity.
* **Terrain** mode — terrain at 100 %, all thematic layers heavily dimmed (districts 18 %, physiographic regions 25 %, PAs 35 %) so relief reads uncontested.

## What downstream systems inherit

Every future system now sits over a real landscape:

* **Climate** — rainfall isohyets read on top of terrain, showing rainshadow behind the Aravalli.
* **Agriculture** — crop-belt polygons overlay the plains; canal networks are legible against the terrain.
* **Geology / Minerals** — outcrops overlay the ridges they're associated with.
* **Population / Transport** — settlement patterns and roads read against the physical constraints they navigate.

None of these need a separate base map. The terrain is the atlas's ground.

## Known gaps

* **Zoom-level fidelity.** At z=7 the base is ~1 km/pixel. Zooming past 3–4× in the app makes the terrain visibly pixelated. A tile pyramid (z=7 for the overview, z=8 or z=9 for zoomed detail) would fix this. It's a follow-up; the plug-in is architected to accept a tile-pyramid manifest instead of a single PNG.
* **Padded region visible.** The terrain PNG covers a padded 68.8–79.0°E × 22.2–30.9°N — you see terrain in Gujarat, MP, UP, Punjab, and eastern Pakistan. Editorially preferable to a hard edge at the state boundary, but a clipping option (SVG `<clipPath>` referencing the state outline) is straightforward to add if a hard-clip is desired.
* **Elevation ceiling.** The northeastern corner of the padded region touches the Himalayan foothills at ~6400 m — well above the hypsometric palette's top stop (1800 m). Those pixels clamp to near-white, which reads as "very high peaks" and doesn't hurt the composition, but a wider palette would render them more distinctly if the atlas ever extends northward.

## Rebuild

```
python3 atlas/data/raw/BUILD_TERRAIN.py
```

Deterministic. Reuses cached terrarium tiles under `raw/terrain-tiles/` when present. To change:

* **The bounds** — edit `BOUNDS` at the top of `BUILD_TERRAIN.py`.
* **The palette** — edit `HYPSO_STOPS`.
* **The illumination** — edit the `azimuth_deg` / `altitude_deg` / `z_factor` defaults in `compute_hillshade()`.
* **The blend strength** — the `strength` argument to `blend()`.

Re-run the script; `terrain-hillshade.png` and `terrain-metadata.json` regenerate. No code change required in the atlas itself.
