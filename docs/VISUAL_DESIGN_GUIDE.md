# Visual Design Guide

The atlas visual system in one document. Every design token lives in [`atlas/ui/styles/theme.css`](../atlas/ui/styles/theme.css); this guide explains the *why* behind the tokens.

## Design values

1. **Paper first, chrome recedes.** The map is the whole page. Panels overlay the map; they never permanently shrink it.
2. **Type does the hierarchy work.** Weight, size, tracking, and case do the heavy lifting. Colour is used sparingly, mostly for cartographic identity.
3. **Muted fills, expressive strokes.** Feature identity comes from stroke — fills are paper-tinted so the map reads as a *drawn* artefact, not a heatmap.
4. **Editorial cadence.** Detail views read like a magazine page: kicker → hero → tags → overview → figures → sections. Never a JSON dump.
5. **Restrained motion.** 120–260 ms transitions on the `cubic-bezier(0.4, 0, 0.2, 1)` curve. No spring physics, no decorative animation.

## Palette

### Paper & ink (light theme)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4ecd8` | body background, header, status |
| `--paper-warm` | `#ede2c4` | district fills, legend swatches |
| `--paper-tinted` | `#faf3e0` | quiet backdrop |
| `--card` | `#ffffff` | floating cards, popover, detail panel |
| `--card-quiet` | `#fbf6e9` | figure cards, mnemonic asides |
| `--map-bg` | `#f7efdb` | the map canvas |
| `--ink` | `#201f1c` | body text |
| `--ink-2` | `#4a463e` | secondary text |
| `--ink-3` | `#7a7263` | meta, kickers |
| `--ink-4` | `#a89f8b` | placeholders |
| `--hair` | `#d9cfb5` | 1px dividers, borders |
| `--rule` | `#b5a685` | stronger rules, hover borders |

### Cartographic identity

Every category has a saturated **hue** (stroke) and a **paper-tinted twin** (fill). Fills sit ~10% saturated relative to their strokes.

| Category | Hue | Fill (soft) |
|---|---|---|
| National Park | `#2f5f3d` | `#cfe1d3` |
| Tiger Reserve | `#b95119` | `#f4c9a4` |
| Wildlife Sanctuary | `#6e9860` | `#d4e5c9` |
| Ramsar | `#2c5da8` | `#c5d7ef` |
| Wetland | `#2e8a9c` | `#c1e0e5` |
| Biosphere | `#7a4a9c` | `#dccbe6` |
| UNESCO WHS halo | `#b8892c` (`--gold`) | `#e9d69f` |

### Divisions

Muted, non-competing hues so district choropleth reads as a base layer rather than a data-story.

Ajmer `#c4885a` · Bharatpur `#9ab778` · Bikaner `#d1b76a` · Jaipur `#8ea1c1` · Jodhpur `#c99a68` · Kota `#a684b0` · Udaipur `#7ba9a0`.

### Themes

Four themes ship, all defined by overriding the root tokens: `.theme-dark`, `.theme-print`, `.theme-hc`. No component reads a raw colour; every rule pulls from a token, so theme changes are complete.

## Typography

### Type stack

* **Serif:** `"Iowan Old Style", "Palatino Linotype", "Palatino", "Book Antiqua", Georgia, "Times New Roman", serif`
* **Sans:** `-apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro Text", "Helvetica Neue", "Inter", Arial, sans-serif`
* **Mono:** `ui-monospace, "SF Mono", "Menlo", "Consolas", monospace`

### Type scale

| Token | Size | Use |
|---|---:|---|
| `--t-hero` | 28 px | Detail hero, Stats heading |
| `--t-title` | 22 px | Header `<h1>`, section titles |
| `--t-lede` | 17 px | Kicker paragraphs, ecosystem lede |
| `--t-body` | 14 px | Body copy |
| `--t-small` | 12.5 px | Field labels, chips |
| `--t-meta` | 11 px | Kickers, source chips |
| `--t-caps` | 10.5 px | Section headings (uppercase, letter-spaced) |

### Rules

* Serif for atlas voice: hero titles, feature names, ecosystem descriptions, editorial paragraphs.
* Sans for chrome: buttons, form controls, kickers, chips, status bar.
* Small caps + `letter-spacing: 0.09em` for section headers and metadata labels.
* Italic serif for hydrological features (rivers, Ramsar, wetlands) — a Britannica/NatGeo convention.
* Mono for coordinates, IDs, OSM relation numbers only.

## Spacing scale

4-px grid. Named for intent so the reader isn't decoding numbers.

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 28 · `--sp-8` 40 · `--sp-10` 56.

## Elevation

Two shadows, semantically-named:

* `--shadow-card` — sits on paper (map controls, legend swatches).
* `--shadow-float` — sits above content (popovers, right-rail panel).
* `--shadow-tip` — tooltip only.

## Motion

* `--motion-fast` 120 ms — hover states.
* `--motion-base` 180 ms — panel opens/closes.
* `--motion-slow` 260 ms — theme swap.
* Single easing curve: `cubic-bezier(0.4, 0, 0.2, 1)` (Material's ease-in-out-standard). Applied consistently — the map, panel, and tooltip all move on the same clock.

## Focus

Two-ring focus indicator (`--focus-ring`): 2-px card-colored ring + 4-px accent ring. Applied on every interactive control via `:focus-visible`. Never removes native outlines without providing a replacement.

## Iconography

* Chevrons and hamburgers are UTF-8 glyphs (`☰`, `⌂`, `+`, `−`, `⌕`, `×`) — no icon font, no SVG sprite. Aligns with the "everything ships offline" invariant.
* Category identity in the legend and detail chips is carried by colour and small-caps type, not iconography. Icon systems get invented later if a specific category (rivers as arrow-glyphs, mountains as triangles) needs it.

## Motion reduction

The atlas respects users who set `prefers-reduced-motion: reduce`. Panel opens/closes go from a slide to a fade. To add in future: wrap all `transition` declarations in `@media (prefers-reduced-motion: no-preference)`.

## What NOT to do

* **No decorative gradients.** Backgrounds are flat paper tones.
* **No garish colour** on section headers. Colour marks cartographic identity, not chrome.
* **No fake shadows** on the map itself (feature paths). Elevation lives on floating panels, not on features.
* **No cartoon icons** anywhere — this is an atlas, not an app store listing.
* **No CSS-in-JS.** Every style ships in `.css` files that print/inspect cleanly.
