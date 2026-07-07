# Rajasthan Atlas — Engine Architecture

Version 1.0.0 (2026-07-06)

The atlas is a **generic GIS engine** with a Rajasthan base layer plugged into it. Every future dataset — protected areas, tiger reserves, Ramsar sites, rivers, lakes, mountains, minerals, historical monuments, or a quiz/revision module — plugs in through the same registration surface. No engine change should ever be needed to add a new layer.

## Guiding principles

1. **Data in WGS84, SVG derived.** Every dataset on disk is standard GeoJSON in `EPSG:4326`. SVG paths are generated at runtime by the `Renderer` from projected coordinates. Nothing bakes pixel coordinates into primary data.
2. **One `Atlas` namespace.** `AtlasCore.js` exports a singleton available as `Atlas` (also on `window` for devtools). Every module hangs off it — `Atlas.data`, `Atlas.layers`, `Atlas.theme`, etc. No module reaches across the graph without going through `Atlas`.
3. **DAG, not soup.** Modules communicate through an `EventBus` for cross-cutting concerns (selection, theme, view). Direct method calls are one-directional only — `UIManager` calls `LayerManager`, never the reverse.
4. **CSS is the theme layer.** No colour value or font family lives in JS. Everything is a CSS custom property in `atlas/ui/styles/theme.css`. Adding a theme = adding a ruleset and registering an id in `ThemeManager`.
5. **Files stay small.** No file over 300 lines. Larger modules split into a `<Manager>.js` (logic) plus a `<Manager>UI.js` (DOM adapter).

## Module map

```
                                ┌─────────────┐
                                │  AtlasCore  │  singleton
                                └──────┬──────┘
                                       │  composes every manager below
                                       ▼
     ┌─────────────┬────────────┬──────┴───────┬────────────┬────────────┐
     │ DataManager │ Projection │ LayerManager │  Renderer  │  Search    │
     └─────────────┴────────────┴──────┬───────┴────────────┴────────────┘
                                       │
     ┌────────────┬─────────────┬──────┴──────┬─────────────┬────────────┐
     │Interaction │ ThemeManager│  UIManager  │  SearchUI   │   Export   │
     └────────────┴─────────────┴─────────────┴─────────────┴────────────┘
                                       ▲
                                       │
                              (config.js — constants only, no logic)
```

### `AtlasCore.js`
Composition root. Owns `bus`, all manager instances, and the boot sequence. Public surface:

* `Atlas.boot(rootEl)` — mount the atlas into a DOM element.
* `Atlas.registerLayer(config)` — thin alias for `Atlas.layers.register(config)`.
* `Atlas.info()` — read-only snapshot for the status bar / about dialog.

### `config.js`
Frozen `CONFIG` object. Zoom limits, animation timings, IO paths, default theme, projection defaults, spatial-index parameters, search limits. Editing this file changes engine behaviour globally with zero code touched.

### `DataManager.js`
Only module that touches the network. `load(key, url)`, `get(key)`, `getFeature(key, id)`, `has(key)`, `list()`, `drop(key)`. Validates every feature against a keyword-based schema check; a stricter draft-07 validation lives in `atlas/data/schemas/feature.schema.json` for offline tooling.

### `ProjectionEngine.js`
Registrable projection implementations. Ships with `equirectangular-corrected` (cosine-scaled equirectangular tuned to Rajasthan midlatitude). Provides `forward([lon,lat])`, `inverse([svgX,svgY])`, `kmPerSvgUnit()`, and metadata. A future national-scale layer can register a proper Lambert Conformal Conic via `Atlas.projection.register('LCC', factory)`.

### `Renderer.js`
GeoJSON → SVG. Handles `Point`, `LineString`, `Polygon`, and Multi\* variants. Knows about layers and CSS classes; knows nothing about districts, parks, or any feature category. Adds `data-*` attributes on every `<path>` so CSS can style declaratively (see the division choropleth in `atlas.css`).

### `LayerManager.js`
Generic layer registry. A layer config is:

```js
Atlas.registerLayer({
  id:          'tiger-reserves',
  name:        'Tiger Reserves',
  type:        'polygon',
  category:    'environment',
  data:        'atlas/data/tiger-reserves.geojson',
  searchable:  true,
  visible:     true,
  zIndex:      50,
  style:       (feat) => ({ classes: ['tiger'], attrs: { 'data-status': feat.properties.status }}),
});
```

Also owns **style modes** (`base`, `division`, `new`). A mode is a class toggled on the root `<svg>`; CSS selectors keyed off feature dataset attributes do the actual styling. New modes register via `Atlas.layers.registerMode(id, spec)`.

### `SpatialIndex.js`
BBox QuadTree. Supports `insert`, `query(bbox)`, `hit(lon, lat)`, `nearest(lon, lat)`. LayerManager builds one index per layer so hit-testing and search can be O(log n) even at thousands of features. Deduped internally so features straddling a split return once.

### `SearchEngine.js`
Walks `Atlas.layers.searchable()`. For each searchable layer, scans features and ranks by exact → prefix → substring → fuzzy. Layers may override the indexable text by supplying `config.searchText(feat)` returning a string or array. New searchable layers become findable the moment they register.

### `SearchUI.js`
Header-widget adapter for `SearchEngine`. Owns the input, results dropdown, keyboard navigation, and picks. Emits `search:pick` on the bus; the default handler in `SearchUI.js` triggers a `Atlas.interaction.select(...)`. Any module can subscribe to react (e.g. a future quiz module could log the pick as a "hint used").

### `ThemeManager.js`
Registers themes as `{ id, cls }`. Ships with `light`, `dark`, `print`, `high-contrast`. `apply(id)` toggles a class on `<html>`. `cycle()` walks the registered order. Persisted via `localStorage`. Adding a new theme = 1 CSS ruleset + 1 `register()` call.

### `InteractionManager.js`
Owns hover / click / dblclick / drag / wheel / keyboard / tooltip. Emits `selection:changed`, `hover:changed`, `view:changed` over the bus. Renderer emits no events itself; delegated pointer events on the root `<svg>` are routed here based on `path.feature`'s `data-layer`/`data-feature` attributes.

### `UIManager.js`
Renders the toolbar, legend (left), detail (right), status bar, and map overlays (north arrow, scale bar, zoom pill). Zero interaction logic — it *displays* state and delegates every gesture to the appropriate manager.

### `ExportManager.js`
Stubbed at this refactor phase. Method surface: `toSVG()`, `toPNG()`, `toPDF()`, `toJSON(layerId)`, `print()`. Only `print()` is wired (delegates to `window.print`). Future implementations swap in without touching any consumer.

### `EventBus` (`util/events.js`)
Synchronous pub/sub. Topics currently in use:

* `atlas:ready`
* `data:loaded`, `layer:added`, `layer:removed`, `layer:visibility`, `layer:mode`
* `selection:changed`, `hover:changed`, `view:changed`
* `theme:changed`
* `search:pick`

## Feature schema

Every feature returned by `DataManager.getFeature()` conforms to:

```
{
  type: "Feature",
  id:   "<canonical-id>",
  layerKey: "<which layer this came from>",
  geometry: { type, coordinates },
  properties: {
    name, type, category,
    district, division, state,
    area, established, source, lastUpdated,
    notes:      { facts, mnemonic, significance, confusedWith },
    ecology:    { flora, fauna, ecosystem },
    governance: { authority, status },
    // ...layer-specific extras allowed
  }
}
```

The full JSON Schema lives at `atlas/data/schemas/feature.schema.json`. On-disk files are standard GeoJSON; `DataManager` normalises them into the shape above.

## atlas.json manifest

`atlas/data/atlas.json` is the atlas's declared identity:

* `name`, `version`, `dataVersion`, `lastUpdated`
* `projection.crs`, `projection.display.type`, `projection.bounds`
* `divisions`, `stats.districts`, `stats.divisions`, `stats.newDistricts`
* `layers[]` — declarative layer configs loaded at boot
* `sources[]` — attribution list

Editing `atlas.json` adds/removes layers with no code change.

## Adding a new layer — worked example

To add "National Parks":

1. Produce `atlas/data/national-parks.geojson` — standard GeoJSON, unified schema.
2. Append to `atlas.json`:
   ```json
   { "id": "national-parks", "name": "National Parks", "type": "polygon",
     "category": "environment", "data": "atlas/data/national-parks.geojson",
     "searchable": true, "visible": true, "zIndex": 100 }
   ```
3. (Optional) add CSS in `atlas.css`:
   ```css
   .a-map .layer-national-parks path.feature { fill: #6b9a5b; }
   ```
4. Reload. `AtlasCore.boot()` walks `manifest.layers`, calls `LayerManager.register`, which fetches the file via `DataManager`, indexes it via `SpatialIndex`, and paints it via `Renderer`. Search now includes national parks. Hover, click, tooltip, details panel all work.

No engine changes needed for steps 1–3.

## Adding a new theme

1. Add a `.theme-<id>` ruleset to `theme.css` overriding CSS custom properties.
2. `Atlas.theme.register('<id>', { cls: 'theme-<id>', meta: { name: '<Display Name>' }})`.

Done. The theme cycle button picks it up automatically.

## Adding a new style mode

Example — "Reader mode" (dim non-target districts and emphasise a subset):

```js
Atlas.layers.registerMode('reader', { apply: () => ({}) });
```

Then in `atlas.css`:
```css
.a-map svg.mode-reader .layer-districts path.feature { fill: transparent; }
```

No manager change required.

## Adding a new module (e.g. QuizEngine)

1. Create `atlas/core/QuizEngine.js` exporting a `class QuizEngine { constructor(atlas) {...} }`.
2. In `AtlasCore.js`, add `this.quiz = new QuizEngine(this)` in the constructor.
3. Subscribe to bus events it cares about (`selection:changed` etc.).
4. Register keyboard shortcuts via `Atlas.interaction.registerShortcut('q', ...)`.
5. Add its UI (if any) to `UIManager` or as an independent widget mounted in `boot()`.

## Offline guarantees

* No external HTTP requests. Only namespaces (SVG's `xmlns`) reference external URIs, and those are declarative, not fetched.
* No CDN scripts, no framework, no build step. Everything runs from a `python3 -m http.server`.
* `fetch()` is used for local file loads only, via paths resolved relative to the document root.
* Total shipped payload (excluding `atlas/data/raw/*`): ~285 KB.

## Regression guarantees vs. Module 1

Every Module 1 feature was verified after the refactor:

* Zoom (wheel + buttons + keyboard) ✓
* Pan (drag) ✓
* Hover tooltip ✓
* Click → detail panel ✓
* Double-click → zoom to district ✓
* Search (prefix, substring, fuzzy) ✓
* Dark mode ✓ (now via ThemeManager, four themes)
* Division choropleth ✓
* New-district highlight ✓
* Status bar ✓
* Scale bar (recomputes on zoom) ✓
* North arrow ✓
* Zoom-level pill ✓
* Keyboard shortcuts (`/`, `+`, `-`, `0`, `Esc`, `D`, `1`, `2`, `3`) ✓

## Directory layout

```
rajasthan-atlas/
  index.html                          — entry point
  ARCHITECTURE.md                     — this document
  atlas/
    core/
      AtlasCore.js                    — singleton, boot
      DataManager.js                  — network + cache + validate
      ProjectionEngine.js             — WGS84 ↔ SVG
      Renderer.js                     — geometry → SVG
      LayerManager.js                 — registry + style modes
      SpatialIndex.js                 — bbox QuadTree
      SearchEngine.js                 — generic ranker
      SearchUI.js                     — header widget adapter
      ThemeManager.js                 — theme registry
      InteractionManager.js           — hover/click/keyboard/zoom
      UIManager.js                    — chrome (toolbar/panels/status/overlays)
      ExportManager.js                — stub API surface
      config.js                       — constants
      util/
        events.js                     — EventBus
        dom.js                        — escape/el/svgEl/round
    data/
      atlas.json                      — manifest
      districts.geojson               — canonical simplified base layer
      rajasthan-districts-full.geojson— full-fidelity backup (not shipped in prod)
      schemas/
        feature.schema.json           — unified feature schema
      raw/
        BUILD.py                      — deterministic rebuild pipeline
        osm-rajasthan-41-districts.json — raw Overpass dump
    ui/
      components/
        atlas.css                     — map / feature styles
        components.css                — buttons, inputs, panels
      styles/
        theme.css                     — colour tokens for 4 themes
        layout.css                    — grid skeleton
```

## What's next

Module 1.5 is done. When Module 2 begins (protected areas), the plug-in path is the "Adding a new layer" recipe above. No engine work should be required.
