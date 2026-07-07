# Cartography Guidelines

Rules for adding, styling, or altering layers so the atlas reads consistently across every future dataset.

## Visual hierarchy (top of stack visually)

```
Selection ring
Labels (priority-ordered)
Ramsar polygons
National Parks
Tiger Reserves
Biosphere Reserves
Wetlands
Wildlife Sanctuaries
Districts
Water body base
Paper
```

Higher-priority features render *on top of* lower-priority ones by adjusting layer `zIndex` in `atlas.json`. Ramsar sites and National Parks (both `zIndex: ≥ 40`) always sit above Wildlife Sanctuaries.

## Symbology

Every category follows one grammar: **paper-tinted fill + saturated stroke**. Fills sit lightly on the paper; strokes carry identity.

| Category | Fill token | Stroke token | Stroke weight | Style notes |
|---|---|---|---:|---|
| National Park | `--sym-np-soft` | `--sym-np` | 0.9 | dark forest green |
| Tiger Reserve | `--sym-tr-soft` | `--sym-tr` | 1.0 | 55% fill opacity — overlay reads over districts |
| Wildlife Sanctuary | `--sym-wls-soft` | `--sym-wls` | 0.6 | 55% fill opacity |
| Ramsar Site | `--sym-ramsar-soft` | `--sym-ramsar` | 1.1 | 85% fill opacity — strongest, most recognisable |
| Wetland (non-Ramsar) | `--sym-wetland-soft` | `--sym-wetland` | 0.8 | 70% fill opacity |
| Biosphere Reserve | `--sym-biosphere-soft` | `--sym-biosphere` | 0.9 | reserved for future notification |
| District | `--paper-warm` | `--stroke-district` | 0.45 | quiet base |

Rendered via `atlas/ui/components/environment.css` and `atlas.css`.

## Special cases

* **UNESCO WHS features.** Add a subtle `filter: drop-shadow(0 0 3px var(--gold))`. Keoladeo Ghana (NP + Ramsar) already carries this via `id$="keoladeo-*"` selectors.
* **Point-only features.** The Renderer emits a small circle path `M…a2.5…`; the CSS enlarges the circle and switches its fill to white, so users read *point-in-white-halo* as "boundary unpublished." Complements the "Point-only geometry" tag in the detail panel.
* **Transboundary features** (e.g. National Chambal WLS). Ship the Rajasthan portion only. When a future multi-state build is needed, add `properties.state !== "Rajasthan"` features and dim them via CSS.

## Modes

Style modes are class toggles on the root `<svg>`. Currently registered: `base`, `division`, `new`, `env`, `reader`.

* `base` — neutral paper fills across every layer.
* `division` — district choropleth via `[data-division="Xxx"]` selectors. Environment layers unaffected.
* `new` — highlights the 8 retained new districts (2023 → 2024) in tiger-orange; dims other districts.
* `env` — dims districts to `opacity: 0.42`; increases stroke weight on environment features.
* `reader` — dims districts further (`opacity: 0.28`) and swaps the detail-panel renderer to the focused-reading variant.

Adding a new mode is a two-file change: `Atlas.layers.registerMode(id, spec)` + a CSS ruleset keyed on `svg.mode-<id>`.

## Choropleth conventions

* **Continuous or numeric fills** should use a single-hue sequential ramp (from paper-tint at low to `--accent` at high). Never rainbow. See `stats-grid .card` for the convention.
* **Categorical fills** get the muted division palette in `theme.css`.

## Water treatment

Currently unused (no rivers/lakes layer yet). When Module 3 lands:

* Water polygons: fill `--water` (`#d6e5ed`), stroke `--sym-ramsar` at 0.4.
* River lines: stroke `--sym-ramsar` at 0.5, italic serif labels.
* Named lakes: labels in italic serif, small caps optional.

## Anti-patterns

* **Do not** use saturated fills. The atlas reads as a print artefact; fully-saturated fills wreck the paper aesthetic.
* **Do not** use `stroke-dasharray` on district or protected-area boundaries. Dashes are reserved for point-only features and the viewport box in the locator.
* **Do not** add `fill: url(#pattern)` textures. This is publication print, not marketing.
* **Do not** invent per-feature colours. A new individual protected area does not need its own hue — it inherits from its category.

## Adding a new layer

When Module 3 (Rivers, Aravalli, Terrain) is next:

1. Register the layer in `atlas.json` with an appropriate `category` and `zIndex` (see hierarchy above).
2. Add a `.layer-<id> path.feature` rule in a new CSS file under `atlas/ui/components/`.
3. If it's searchable, no code change — `SearchEngine` picks it up.
4. If it needs labels, register a `LabelSource` for it (see [LABEL_ENGINE.md](LABEL_ENGINE.md)).
5. Extend `StatsManager.compute()` if it should feed the dashboard.

No changes to `AtlasCore.js`, `Renderer.js`, or any other core module should be required.
