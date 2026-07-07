# Data Sources — Rajasthan Digital Atlas

Every spatial feature and every attribute in this atlas must be attributable to a named source. This document is the authoritative citation index. Editing a dataset means also adding or updating an entry here.

## Source-code table

| Code | Full name | Type | URL |
|------|-----------|------|-----|
| `RFD` | Rajasthan Forest Department | Government agency | https://forest.rajasthan.gov.in/ |
| `NTCA` | National Tiger Conservation Authority | Statutory authority | https://ntca.gov.in/ |
| `MoEFCC` | Ministry of Environment, Forest and Climate Change | Central government ministry | https://moef.gov.in/ |
| `RAMSAR` | Ramsar Convention Secretariat / RSIS | International convention | https://rsis.ramsar.org/ |
| `UNESCO` | UNESCO World Heritage Centre | International body | https://whc.unesco.org/ |
| `WII` | Wildlife Institute of India | MoEFCC autonomous body | https://wii.gov.in/ |
| `OSM` | OpenStreetMap contributors | Open geodata | https://www.openstreetmap.org/ |
| `PIB` | Press Information Bureau | Government press office | https://www.pib.gov.in/ |
| `WRD` | Rajasthan Water Resources Department | State agency | https://water.rajasthan.gov.in/ |
| `CWC` | Central Water Commission | Central government | https://cwc.gov.in/ |
| `SOI` | Survey of India | Central government topographic authority | https://www.surveyofindia.gov.in/ |
| `NATMO` | National Atlas & Thematic Mapping Organisation | Central government | https://www.natmo.gov.in/ |
| `NASA-SRTM` | NASA SRTM DEM (via Mapzen terrarium tiles) | Open elevation data | https://s3.amazonaws.com/elevation-tiles-prod/ |

## Dataset-by-dataset citations

### `districts.geojson`
* **OSM** `admin_level=5` relations in Rajasthan. Retrieved via Overpass `maps.mail.ru` mirror on 2026-07-06. ODbL 1.0.
* **Rajasthan gazette notifications** — district → division and district → HQ mapping. Post-Dec-2024 rationalisation (41 districts).

### `national-parks.geojson` (5 features)
* Geometry: **OSM** `boundary=national_park` and `boundary=protected_area` relations.
* Attributes: **RFD** Protected Area Network Rajasthan (Oct 2023) + **WII** protected-area database.
* Ranthambore NP (1980), Keoladeo Ghana NP (1981) also cross-referenced with **RAMSAR** and **UNESCO** for their additional designations.

### `tiger-reserves.geojson` (5 features)
* Geometry: **OSM** where available; Dholpur–Karauli TR is a point (too recent for OSM boundary).
* Sequence numbers, notification years, area figures: **NTCA** tiger-reserves list.
* Ranthambore TR: one of the original 9 Project Tiger reserves (1973–74). NTCA record.
* Ramgarh Vishdhari TR: 52nd India TR, notified July 2022. NTCA notification.
* Dholpur–Karauli TR: 54th India TR, notified August 2023. NTCA notification, PIB coverage.

### `wildlife-sanctuaries.geojson` (25 features)
* Geometry: **OSM** `boundary=protected_area` and `leisure=nature_reserve` ways/relations.
* Attribute canon: **RFD** — Protected Area Network Rajasthan (Oct 2023).
* Cross-state features (National Chambal WLS) — Rajasthan portion only per **RFD**.
* Sariska WLS and Sitamata WLS ship as point features (`geometryQuality: "point"`) because distinct WLS polygons are not published in OSM; their coordinates come from RFD.

### `ramsar-sites.geojson` (4 features)
* Site numbers and designation dates: **RAMSAR** Sites Information Service (RSIS).
  * Keoladeo Ghana NP — Site 230, 1 October 1981.
  * Sambhar Lake — Site 464, 23 March 1990.
  * Khichan — designated 19 February 2025 (declared 4 June 2025). Site number pending in RSIS as of retrieval date.
  * Menar — designated 19 February 2025 (declared 4 June 2025). Site number pending.
* Geometry: **OSM** for Keoladeo and Sambhar; **PIB** press release (PRID 2133992) coordinates for Khichan and Menar (points).
* **MoEFCC** is India's Ramsar focal point authority; cited alongside site attribute data.

### `wetlands.geojson` (8 features)
* Sambhar Salt Lake wetland extent: **OSM** `natural=wetland` polygon (way 22825270). Larger than the Ramsar-designated core.
* Point wetlands (Pichola, Fateh Sagar, Ana Sagar, Pushkar, Jaisamand, Ramgarh Lake, Kaylana): **RFD** protected-area register + Google Earth cross-check for approximate centroids. Areas per **RFD** figures.

### `rivers.geojson` (23 features)
* Geometry: **OSM** `waterway=river` relations and ways for named major rivers.
* Attributes (basin, length, source, mouth, tributaries): **WRD** and **CWC** river-basin descriptions, cross-checked against standard geography texts.

### `lakes.geojson` (11 features)
* Geometry: **OSM** `natural=water` polygons and `landuse=reservoir` polygons.
* Attributes (lake type, salinity, area, construction date): **WRD** records and heritage-body documentation.

### `thar.geojson` (1 feature)
* Geometry: union of **OSM** `natural=desert` polygons within Rajasthan admin boundary.
* Districts, sub-regions: standard geography-text descriptions.

### `aravalli.geojson` (1 feature)
* Geometry: synthesised main-axis polyline through 13 anchor points derived from **OSM** `natural=peak` elevations and standard-text descriptions.
* NOT a surveyed trace. Individual OSM `natural=ridge` fragments (142 of them in Rajasthan) cluster around this axis but do not form a single continuous feature in OSM.

### `peaks.geojson` (15 features)
* Geometry and elevation: **OSM** `natural=peak` nodes with `ele` tags. Guru Shikhar (1722 m) is the top-of-range at Mount Abu.

### `physiography.geojson` (5 features)
* Geometry: **generalised** — union of the constituent districts per region.
* Boundary descriptions: standard geography-text divisions (NCERT-lineage sources).
* Every feature carries `geometryQuality: "generalised"` and a `geometryNote`.

### `drainage-basins.geojson` (7 features)
* Geometry: **generalised** — same district-union approach as physiographic regions.
* Basin definitions: **CWC** river-basin lists.

### `elevation.json`
* Zone taxonomy from geography-text descriptions; individual peak elevations from **OSM**.

### `terrain-hillshade.png` + `terrain-metadata.json`
* Elevation source: **NASA-SRTM** via Mapzen terrarium encoding on the public AWS `elevation-tiles-prod` bucket. 20 tiles at zoom 7 covering the padded Rajasthan bbox.
* Attribution: **"Elevation © NASA / Mapzen (terrarium encoding), redistributed via elevation-tiles-prod. ODbL 1.0."** Required in any shipped/redistributed build.
* Cartography: hillshade at NW-315° / 45° altitude / z-factor 1.5, blended over a muted hypsometric tint (green-cream-buff-mauve-white). See [TERRAIN_SYSTEM.md](TERRAIN_SYSTEM.md) for the full palette and blend rationale.

### `biosphere-reserves.geojson` (0 features)
* Ships empty by design. As of 2026-07-06, **MoEFCC**'s Man and Biosphere (MAB) Programme has notified **no** biosphere reserve in Rajasthan. Desert National Park has been *proposed* historically but never notified. See MODULE2_REPORT.md § Biosphere Reserves for the audit trail.

## Cross-checks not used as primary source

The following were consulted only for triangulation and are **not** cited in `atlas.json`:

* Wikipedia — used to identify candidate feature names; every attribute copied from Wikipedia was then verified against a primary source above.
* Generalist secondary compendia (Drishti IAS, Vajiram, LotusArise, IASGyan, etc.) — used to identify likely reader-relevant themes; never used as authority for spatial or legal facts.

## OSM query provenance

The Overpass queries and mirror endpoints used to retrieve geometry are archived in:

* `atlas/data/raw/osm-rajasthan-41-districts.json` (Module 1)
* `atlas/data/raw/osm-rajasthan-protected-areas.json` (Module 2)

Both can be re-fetched deterministically by running the queries in [BUILD.py](/atlas/data/raw/BUILD.py) and [BUILD_ENV.py](/atlas/data/raw/BUILD_ENV.py). The raw JSON is preserved in-tree so the build pipeline can rerun without the network.

## Attribution notice for shipped builds

If this atlas is redistributed, the following attribution string MUST accompany it (per OSM ODbL and Ramsar / UNESCO courtesy):

> Boundary data © OpenStreetMap contributors, ODbL 1.0. Protected-area metadata from Rajasthan Forest Department, NTCA, MoEFCC and the Ramsar Convention Secretariat. World Heritage Site designation courtesy UNESCO.
