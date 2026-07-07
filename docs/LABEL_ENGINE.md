# Label Engine

The atlas ships a real label-placement engine at `atlas/core/LabelManager.js`. This document explains its algorithm, its knobs, and how future layers plug in.

## Why a real engine matters

A GIS control surface can get away with tooltips-on-hover. A publication atlas cannot. Labels are the primary reading surface — they must:

* Never overlap each other.
* Prefer legibility over completeness.
* Respect priority (a Tiger Reserve label must survive a district collision).
* Move outside crowded regions with leader lines when interior placement fails.
* Vanish and reappear with zoom.

The engine does all of this in ~220 lines of dependency-free JavaScript.

## Algorithm

Each render pass:

1. **Read state.** Current zoom, current viewBox, list of registered sources.
2. **Collect candidates.** For every source `S`, and every feature `F` of `S.layerId`:
   * Skip if `S.minZoom > zoom` or `S.maxZoom < zoom`.
   * Skip if the layer is toggled invisible.
   * Skip if `S.filter(F)` returns false.
   * Anchor = `F.properties.labelAnchor` (pole-of-inaccessibility from BUILD.py) *or* `F.properties.centroid`.
   * Skip if the anchor projects outside the current viewport.
   * Text = `S.text(F)` (defaults to `F.properties.name`).
3. **Sort by priority.** Selection wins first; then descending numeric priority.
4. **Place with collision detection.** For each candidate, iterate candidate positions (see below). Accept the first position whose axis-aligned bbox does not intersect any already-placed label's bbox (with a 1-px margin).
5. **Emit.** For each placed label, emit an SVG `<text>` with the source's `cls`. For leader-line positions, prepend a `<path class="leader">` connecting anchor and text.

Everything runs inside `requestAnimationFrame` and is throttled — a burst of `view:changed` events triggers a single render.

## Candidate positions

Per feature, 11 positions in this priority order:

```
0.  Centered on anchor         (on top of pole-of-inaccessibility)
1.  N   — directly above
2.  NE — up-right offset
3.  E  — right
4.  SE — down-right
5.  S  — directly below
6.  SW — down-left
7.  W  — left
8.  NW — up-left
9.  N-far  — high N with leader line
10. S-far  — far S with leader line
```

Offsets are computed in current SVG units at the current zoom, then multiplied by `1/zoom` so the visual spacing is constant regardless of zoom level.

## Priority defaults

Registered by `UIManager` and `EnvironmentLayer` at boot:

| Layer | Priority | minZoom | maxZoom | Class |
|---|---:|---:|---:|---|
| National Parks | 100 | 0 | ∞ | `.lbl-np` (small caps, forest green) |
| Tiger Reserves | 90 | 1.4 | ∞ | `.lbl-tr` (italic, tiger orange) |
| Ramsar Sites | 85 | 0 | ∞ | `.lbl-ramsar` (italic, blue) |
| Wildlife Sanctuaries | 55 | 2.0 | ∞ | `.lbl-wls` (small, sage) |
| Wetlands | 45 | 1.7 | ∞ | `.lbl-wetland` (italic, teal) |
| Districts | 40 | 0 | ∞ | `.lbl-district` (small, grey) |

Selection promotes a label to priority ∞ so the selected feature's label always survives collisions.

## Scale behaviour

The engine emits `<text>` at nominal SVG font-size × `(1 / zoom)` so on-screen size stays constant. The user zooms in; SVG viewBox shrinks; label font-size (in SVG units) shrinks; screen render stays the same 8-10 px.

Bounding-box collision math also uses SVG units × `1/zoom`, so a label's collision footprint always represents a fixed number of screen pixels regardless of zoom.

## Zoom-based visibility

`minZoom` / `maxZoom` per source is the primary declutter mechanism. Wildlife Sanctuaries are visually noisy at full extent — the atlas hides them until zoom > 2×. Same story for wetlands and TRs. Priority handles the remaining collisions.

## Registration API

```js
Atlas.labels.register({
  layerId:  'rivers',
  priority: 30,
  cls:      'lbl-river',
  minZoom:  1.5,
  text:     (feat) => feat.properties.name,      // optional; default is name
  filter:   (feat) => feat.properties.order >= 3, // optional; keep only major
});
```

Returns an unregister function.

Adding CSS for `.lbl-river` in a new components file is enough to style it. See [CARTOGRAPHY_GUIDELINES.md](CARTOGRAPHY_GUIDELINES.md) § "Water treatment" for river-label conventions.

## Performance envelope

Complexity is O(n²) in the number of visible candidates for the collision-check inner loop. With the current dataset (up to ~90 candidates at highest-zoom-max) that is ≤ 8100 rect-intersect comparisons per render pass — sub-millisecond in practice.

Registered sources hitting 1000+ candidates could add:

* A per-source `maxLabels` budget (top-K by priority).
* A pre-pass QuadTree lookup to avoid checking obviously-distant rectangles.

Neither is needed today; both are additive.

## Known limitations

* Text width is *estimated* via `chars × avgChar` per class, not measured. Adequate for Latin text at the current zoom; would need a `<canvas>` measure pass for CJK or heavily kerned fonts.
* Leader lines are straight `M…L…` paths — no curvature.
* No SDF / halo layer for extreme-zoom clarity; instead the CSS `paint-order: stroke fill` on `<text>` with a `stroke: paper` produces a serviceable halo effect.
* Rotation is not implemented. Rivers/roads will eventually need path-aligned labels; that will call for an SVG `<textPath>` layer that pairs with, but is separate from, this engine.

## Testing

Verified in-browser at multiple zoom levels — labels never overlap, sources gate correctly, priority holds under contention. Automated regression tests (a jsdom-based renderer that counts overlaps) are on the roadmap.
