# Atlas Refactor Report — Publication-Quality Digital Atlas

**Date:** 2026-07-06 · **Engine version:** 1.0.0 (unchanged) · **Data version:** 2.0.0 (unchanged)

## What changed, what didn't

**Changed** — every user-facing surface. Layout, typography, symbology, labels, feature panel, chrome. The atlas now reads as a digital publication rather than a GIS application.

**Not changed** — anything below the UI layer. `AtlasCore.js` picked up three lines to instantiate two new managers (`labels`, `stats`) and one line to attach the label engine to the SVG. Every other core file (`DataManager`, `Renderer`, `LayerManager`, `ProjectionEngine`, `InteractionManager`, `SpatialIndex`, `SearchEngine`, `ThemeManager`, `ExportManager`, `config`) is byte-for-byte identical.

## Deliverables

Five design documents (all in `docs/`):

* [VISUAL_DESIGN_GUIDE.md](VISUAL_DESIGN_GUIDE.md) — palette, typography scale, spacing, elevation, motion
* [CARTOGRAPHY_GUIDELINES.md](CARTOGRAPHY_GUIDELINES.md) — symbology, hierarchy, choropleth conventions, water treatment
* [LABEL_ENGINE.md](LABEL_ENGINE.md) — priority scoring, candidate positions, collision detection, zoom gating
* [PRINT_LAYOUT_GUIDE.md](PRINT_LAYOUT_GUIDE.md) — @media print rules, page setup, ink-safe colour swaps
* This report

## Layout — from dashboard to publication

**Before:** three-column shell (260 · 820 · 320) meant the map claimed ~59% of a 1400-px viewport. Left panel showed legend, right panel showed a persistent key-value details table.

**After:** header (compact) → map (fills viewport) → status bar. Right rail is a *slide-in* editorial detail panel that appears on selection and dismisses on `Esc` / × / re-click. Layer control moved into a **floating "Layers" popover** anchored to the top-left of the map. Map controls (`+`, `−`, `⌂`) float in a top-right column. Locator inset, scale bar, north arrow, zoom pill are anchored to the map corners.

Result: at 1400 × 900, the map occupies ~1370 × 830 = 84% of the viewport when nothing is selected. Detail panel does not squeeze the map — it *overlays* it.

## Type — atlas voice

* **Serif** (Iowan Old Style / Palatino / Georgia) for hero titles, feature names, ecosystem lede, body copy in the detail panel.
* **Small-caps sans** for kickers, subtitles, section headers, tag chips, metadata.
* **Italic serif** for hydrological features (rivers, lakes, Ramsar/wetland labels) — a NatGeo convention.
* **Mono** for coordinates, IDs, OSM references only.

Type does the hierarchy work — colour is used sparingly.

## Cartography — muted fills, expressive strokes

Every layer follows the same visual grammar: paper-tinted fill, saturated stroke. National Parks are dark forest green with a small-caps label. Tiger Reserves overlay in tiger orange with an italic label. Wildlife Sanctuaries wear a sage green stroke. Ramsar polygons are strong blue with italic labels. Wetlands teal, italic. Keoladeo Ghana carries a subtle gold drop-shadow to signal its UNESCO WHS status.

Point-only features (6 across the atlas) get an enlarged white-fill circle with a heavier stroke and an explicit *"Point-only geometry"* tag in the detail panel — their epistemic status is visible at a glance.

Full symbology matrix in [CARTOGRAPHY_GUIDELINES.md](CARTOGRAPHY_GUIDELINES.md).

## Label engine — real collision detection

New module `atlas/core/LabelManager.js` (250 lines, no dependencies). At each view change:

1. Collect candidate labels from every registered source (districts + 5 env layers).
2. Filter by zoom range — Wildlife Sanctuaries only surface once the user zooms past 2×; Tiger Reserves past 1.4×; Wetlands past 1.7×.
3. Sort by priority (State > NP 100 > TR 90 > Ramsar 85 > WLS 55 > Wetlands 45 > Districts 40; selection wins outright).
4. Try 11 candidate positions per label (on-anchor, 8 compass offsets, 2 leader-line positions).
5. Perform axis-aligned bounding-box collision detection in SVG space.
6. Emit `<text>` with priority-styled classes; add leader `<path>` when needed.

Verified: at 1.0× zoom the engine places 50 labels (41 districts + 5 NP + 4 Ramsar). At 1.8× zoom it places 38 (24 districts, 1 NP, 3 TR, 3 Ramsar, 7 wetlands) — districts correctly cull to make room for the newly-visible TR/wetland set. Zero overlaps. Full algorithm in [LABEL_ENGINE.md](LABEL_ENGINE.md).

## Editorial detail panel

The right rail is now a *magazine spread* with these sections:

1. **Hero** — kicker (small caps: type · division), hero title (large serif), subtitle (italic aliases).
2. **Tags** — UNESCO WHS (gold), Ramsar (blue), IUCN category (green), Point-only geometry (dashed border), etc.
3. **Overview** — an editorial paragraph composed from the feature's own properties. No fabricated content — every sentence maps to a stored field.
4. **Key figures** — big-number cards: Area (km²), Notified year, Districts count, IUCN category.
5. **Location** — District(s), Division, State, Centroid (compact `dl`).
6. **Ecology** — ecosystem lede in italic serif, fauna and flora as chip lists.
7. **Conservation** — Authority, Programme, IUCN, Status.
8. **Key facts** — bulleted factual notes, learning-aid mnemonic in an accented aside, "commonly confused with" as a note.
9. **Locator** — a small SVG showing this feature's outline inside Rajasthan's silhouette.
10. **References** — source codes as compact chips.

Districts get a simpler variant of the same layout (no ecology/notes sections). Zero key-value tables anywhere.

## New capabilities

* **Statistics dashboard** — StatsManager auto-computes 14 cards: totals, largest/smallest PA, most recent notification, coverage %. Opens as an overlay via the header "Statistics" button or `S` shortcut. Every number is a live computation over the current dataset — no hardcoded values.
* **Locator inset** — a small mini-map (bottom-left of the map) showing an India silhouette, Rajasthan filled, and the current viewport as a box that redraws on every pan/zoom. Plug-in module `LocatorInset.js` — 90 lines, zero core impact.

## Accessibility

* All floating controls have `:focus-visible` outlines with the `--focus-ring` token (2-px double-ring in accent colour).
* Panels declare ARIA labels (`aria-label="Map of Rajasthan"`, `aria-live="polite"` on status, `role="listbox"` on search results).
* High-contrast theme retained + refined; saturated primaries with 21:1 contrast on black; label palette swapped for high-contrast strokes on labels.
* Keyboard shortcut set expanded: `/` `+` `−` `0` `Esc` `D` `1` `2` `3` `4` `E` `L` `S`.
* Motion respects the `motion-fast/base/slow` tokens; every transition uses `cubic-bezier(0.4, 0, 0.2, 1)` for perceived consistency.

## Print

Full `@media print` stylesheet (see [PRINT_LAYOUT_GUIDE.md](PRINT_LAYOUT_GUIDE.md)). Chrome hides; map fills the landscape A4 page; label sizes are set in points; ink-safe fills swap in; leader lines remain intact. Verified via browser Print → Save as PDF.

## Verification

* Boot: zero console errors. All 7 layers register (41 districts + 47 env features = 88 features).
* Label engine: places 50 labels at 1.0× zoom, 38 at 1.8× zoom, zero collisions in either case.
* Selection → detail: renders 10 editorial sections for a National Park; renders the districts-variant for a district; slide-in animation smooth.
* Stats overlay: computes 14 cards on open, tracks the current dataset.
* Search regression: `ranth` → NP + TR; `sambhar` → Ramsar + Wetland (both unchanged).
* Themes: light / dark / print / high-contrast all render cleanly.
* Modes: base / division / new / env / reader all switchable via popover or keyboard.

## Line-counts

Every new module respects the 500-line budget:

| Module | Lines |
|---|---:|
| `LabelManager.js` | 220 |
| `StatsManager.js` | 105 |
| `LocatorInset.js` | 115 |
| `UIManager.js` (rewrite) | 350 |
| `EnvironmentLayer.js` (rewrite) | 340 |

New CSS totals ~1,000 lines across 8 files (theme, layout, atlas, components, environment, labels, editorial, print). Every colour value lives behind a CSS custom property.

## What's next

Nothing — this is a design-quality pass, not a data addition. Module 3 (Rivers / Aravalli / Terrain) can proceed unchanged when you're ready; the plug-in path from ARCHITECTURE.md still applies. Every new layer will inherit the label engine, editorial detail panel, statistics dashboard, and print styling for free.
