# Print Layout Guide

The atlas is designed to print cleanly to A4 landscape via the browser's *Print → Save as PDF*. This document explains the print stylesheet and the invariants it preserves.

## How to print

1. Open the atlas in Chrome, Safari, or Firefox.
2. Choose *File → Print* (or `⌘/Ctrl-P`), or click the **Print** button in the header.
3. In the print dialog: destination *Save as PDF*, layout *Landscape*, paper *A4*, margins *Default*, background graphics *ON*.
4. Save.

The header, map, and status bar go to the page. Every floating chrome element hides.

## Page setup

```css
@page { size: A4 landscape; margin: 12mm; }
```

12 mm gutters give a comfortable trim. Landscape mirrors the atlas's natural aspect ratio (Rajasthan runs east-west).

## What hides

Print rules in [`atlas/ui/styles/print.css`](../atlas/ui/styles/print.css) hide:

* `.a-toolbar` (was already hidden, retained for defensive completeness).
* `.a-left` (also hidden).
* `.a-right` — the slide-in detail panel.
* `.layers-popover` — the floating layer control.
* `.map-controls` — the zoom / home / reset column.
* `.stats-overlay` — the statistics overlay.
* `.tooltip` — hover tooltips.
* `.a-map .overlay.zoom` — zoom pill (redundant on paper).

## What remains

* **Header** collapses into a print title band: h1 becomes 20 pt serif, subtitle 8 pt small caps.
* **Map** takes the balance of the page (`min-height: 130mm`).
* **Overlays**: north arrow, scale bar, and locator inset all print. Their `backdrop-filter: blur()` is dropped for ink; backgrounds go solid white with a black border.
* **Status bar** becomes an ink-safe footer strip with attribution.

## Ink-safe colour swap

Feature strokes and fills are overridden with print-friendly variants:

| Layer | Fill | Stroke |
|---|---|---|
| National Parks | `#d8e6d9` | `#204028` |
| Tiger Reserves | none | `#8a3a12` (strong outline only) |
| Wildlife Sanctuaries | `#e0eede` 60% opacity | `#4a6d3d` |
| Ramsar Sites | `#d4dff2` | `#1c3d75` |
| Wetlands | `#d0e5e9` | `#1f6672` |
| Districts | `#fbfaf5` | `#444` at 0.4 pt |

Stroke weights bump slightly (0.6 → 0.6 pt, 1.0 → 1.0 pt) so lines survive at 300 dpi.

## Label print sizes

The label engine's SVG `<text>` elements get overridden font sizes and ink colours:

| Class | Print size | Ink |
|---|---:|---|
| `.lbl-district` | 5.5 pt | `#555` |
| `.lbl-np` | 6.5 pt | `#204028` |
| `.lbl-tr` | 6 pt italic | `#8a3a12` |
| `.lbl-wls` | 5.5 pt | `#4a6d3d` |
| `.lbl-ramsar` | 6 pt italic | `#1c3d75` |
| `.lbl-wetland` | 5.5 pt italic | `#1f6672` |

White halo (`stroke: white; stroke-width: 1.5pt`) is retained via `paint-order: stroke fill` so labels stay legible over any fill.

## Attribution

The status bar in print carries:

> © OpenStreetMap contributors · ODbL 1.0

This is the minimum ODbL notice required for shipped derivative maps. If the print carries additional layers (protected areas), the Rajasthan Forest Department / NTCA / Ramsar Secretariat should be credited too — expand the status bar strip when adding those layers.

## Verified

* Map fills the printable area at A4 landscape.
* Labels render at their print sizes with white halos.
* Locator inset prints inside its border, unaffected by the `backdrop-filter` removal.
* Selection state is not carried into print (selected features remain but the selection ring is dropped) — this is intentional so the print reads as a *reference map* rather than a *user session*.

## Future upgrades

* **Legend on the printed page.** Currently the layers popover is hidden. A print-only inline legend under the map would round out the composition.
* **Attribution block** with source list from `atlas.json.sources`.
* **Two-page spread** for a "focus zone" print: main map on p1, feature detail on p2 as a proper editorial page.

Each is additive — a fresh @page rule + a `display: none` toggle away.
