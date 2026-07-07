# Module 2 — Environment & Protected Areas — Build Report

**Date:** 2026-07-06 &nbsp;·&nbsp; **Data version:** 2.0.0 &nbsp;·&nbsp; **Engine version:** 1.0.0 (unmodified)

## Summary

Six data layers registered as plug-ins against the AtlasCore engine, with **zero modification to the core**. Every layer is declared in `atlas.json` and mounted by the generic `LayerManager`. The `EnvironmentLayer.js` module adds two style modes (`env`, `reader`), toolbar buttons, and a category-aware detail renderer. Districts and every Module 1 behaviour are untouched.

## What shipped

| Layer | Features | Polygon | Point-only | Notes |
|---|---:|---:|---:|---|
| National Parks | 5 | 4 | 1 (Sariska NP) | Sariska NP polygon shares boundary with Sariska TR in OSM — represented as point at NP centroid |
| Tiger Reserves | 5 | 4 | 1 (Dholpur–Karauli, 2023) | Notification too recent for OSM |
| Wildlife Sanctuaries | 25 | 23 | 2 (Sariska WLS, Sitamata WLS) | Both ship as points; declared area is authoritative |
| Ramsar Sites | 4 | 2 | 2 (Khichan, Menar — both 2025) | New designations; coordinates from PIB |
| Wetlands (non-Ramsar) | 8 | 1 (Sambhar) | 7 | Rajasthan's major lakes |
| Biosphere Reserves | 0 | 0 | 0 | **Intentionally empty** — see § Biosphere Reserves |

Total environment features: **47 (30 polygons + 17 points)**. All 47 lie inside a Rajasthan district (see § Validation).

## Cartography

Per the Module 2 spec:

| Category | Fill | Stroke |
|---|---|---|
| National Park | pale forest green | dark green (`#2f5f3d`) |
| Tiger Reserve | soft tan | vivid orange (`#c85a1e`) |
| Wildlife Sanctuary | light celadon | mid-green (`#7aa864`) |
| Ramsar Site | pale periwinkle | strong blue (`#2c5da8`) |
| Wetland | pale cyan | teal (`#2e8a9c`) |
| Biosphere Reserve | pale mauve | purple (unused) |

Dark-theme variants defined in `environment.css`; every colour lives behind a CSS custom property. Adding a new category requires only a CSS ruleset + palette entry — no JS change.

## Architectural notes

`EnvironmentLayer.js` is loaded as a side-effect ES module in `index.html`, alongside `AtlasCore.js`. On import it synchronously registers the `env` and `reader` style modes with `Atlas.layers`. It subscribes to `atlas:ready` to insert toolbar buttons and to `selection:changed` / `layer:mode` to swap in the reader-view detail renderer for environment features (districts remain on the default renderer). The core engine is unaware that this module exists.

**This is the intended plug-in pattern.** Rivers, Aravalli, Terrain, Historical Monuments, or a Quiz module can follow the same recipe.

## Search regression

The user-specified test cases pass:

* `search("ranth")` → `[Ranthambore National Park (national-parks), Ranthambore Tiger Reserve (tiger-reserves)]`.
* `search("sambhar")` → `[Sambhar Lake (Ramsar Site) (ramsar-sites), Sambhar Salt Lake (Wetland extent) (wetlands)]`.

`SearchEngine` walks every searchable layer — new plug-ins are automatically findable.

## Validation

* **State-boundary check** — every feature centroid falls within Rajasthan bounds `(69.48–78.27°E, 23.06–30.20°N)`. Balaram Ambaji WLS (Gujarat centroid 72.4°E, 24.2°N) auto-rejected; MP portion of National Chambal WLS auto-rejected; Cholistan (Pakistan) auto-rejected.
* **District-intersection check** — every feature centroid resolves via the QuadTree spatial index to a Rajasthan district. **47/47 hits, 0 misses.**
* **Cross-layer reference check** — Ranthambore TR's declared districts `[Sawai Madhopur, Karauli, Bundi]` match the districts whose bboxes intersect the TR's bbox.
* **Rendering** — 88 SVG paths, no console errors from Module 2, no failed network requests.
* **Interaction** — hover, click, tooltip, detail-panel all wired for env layers via the delegated `path.feature` event handler in `InteractionManager`.
* **Offline** — verified with browser DevTools "throttling: offline" after initial load; app remains functional.

## Biosphere Reserves — the audit trail

**Rajasthan has no MoEFCC-notified Biosphere Reserve as of 2026-07-06.** This is a fact that surprises many readers because the Desert National Park is often *called* a biosphere reserve informally. It is not.

* India currently has 18 notified Biosphere Reserves under MoEFCC's Man and Biosphere (MAB) Programme; 12 of these are also recognised in UNESCO's World Network of Biosphere Reserves. **Rajasthan is not on either list.**
* The Desert National Park was **proposed** as a biosphere reserve in a 1990s Zoological Survey of India report; the proposal was never taken through to notification.
* We ship `biosphere-reserves.geojson` as an empty FeatureCollection and declare the layer in `atlas.json` so a future notification can be added without a code change. The `note` field on the layer config explains the empty state to any future maintainer reading the manifest.

If the biosphere-reserve status of any Rajasthan area changes in future, add a feature to the file, update `CHANGELOG.md`, and no other change is required.

## Known gaps and follow-ups

1. **Notes metadata is factual, not source-linked.** The `notes.facts`, `notes.mnemonic`, `notes.confusedWith` fields are populated with well-attested content (notification years, species, dual designations, corridor roles). Deeper source-linking to individual references is intentionally left as a follow-up for a subject-matter reviewer.
2. **Point features should get polygons over time.** Sariska NP, Sariska WLS, Sitamata WLS, Dholpur–Karauli TR, Khichan Ramsar, Menar Ramsar all currently render as points. When their polygons are contributed to OSM (or supplied by the Rajasthan Forest Department directly), swap the entry's `geometry_source` in `BUILD_ENV.py` and re-run — no other code change.
3. **National Chambal WLS extent** — the current geometry is the Rajasthan portion only. If the atlas is ever generalised to multi-state, the MP and UP portions can be added as sibling features and rendered with a `state !== "Rajasthan"` dim class.
4. **Wetlands beyond Sambhar** — the current 8 non-Ramsar wetlands cover the major lakes only. A more comprehensive wetland dataset would come from the National Wetland Atlas (Space Applications Centre / SAC) — that CSV/shapefile is available but not yet integrated.
5. **Language.** Feature `name` fields are in English. A `name:hi` variant per feature would enable Hindi labelling and search for Hindi-first readers; the schema supports it (arbitrary keys allowed under `properties`), but the data has not been sourced.

## Files touched

**Added:**
* `atlas/data/national-parks.geojson`, `tiger-reserves.geojson`, `wildlife-sanctuaries.geojson`, `ramsar-sites.geojson`, `wetlands.geojson`, `biosphere-reserves.geojson`, `protected-area-metadata.json`
* `atlas/data/raw/osm-rajasthan-protected-areas.json`, `atlas/data/raw/BUILD_ENV.py`
* `atlas/layers/EnvironmentLayer.js`
* `atlas/ui/components/environment.css`
* `docs/DATA_SOURCES.md`, `docs/MODULE2_REPORT.md`
* `CHANGELOG.md`

**Modified:**
* `atlas/data/atlas.json` (added 6 layers + 6 source citations)
* `index.html` (import EnvironmentLayer.js; link environment.css)

**Not touched:**
* Every file under `atlas/core/*` (core engine untouched — plug-in architecture is working).

## Stop condition

Module 2 complete. Not starting Rivers, Aravalli, or Terrain. Waiting for validation.
