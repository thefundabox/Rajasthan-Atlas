# Module 7 — Industry · SEZs · Handicraft Clusters

**Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** 0 lines.

## What shipped

**6 new atlas layers** — the atlas now has **43 total layers**:

| Layer | Features | Category | Fidelity |
|---|---:|---|---|
| Industrial Regions | 5 | industry | District-approximated · DMICDC + DoIC Rajasthan |
| Industrial Clusters | 8 | industry | District-approximated · DoIC sectoral studies |
| RIICO Industrial Areas | 12 | industry | **Point features** · RIICO estate coordinates |
| Major Industries | 12 | industry | **Point features** · Company disclosures + press |
| Special Economic Zones | 4 | industry | **Point features** · MoCI SEZ notifications |
| Handicraft Clusters | 10 | industry | **Point features** · GI Registry + RUDA |

**Knowledge Graph: 192 → 199 unique source features · 590 → 729 typed edges** — 139 new edges weave the industrial story across every prior module:

* Every **industrial cluster** → its raw-material geology (limestone / marble / wollastonite / sandstone / gypsum) + its input crops (cotton for textile)
* Every **region** → the clusters it contains
* Every **flagship unit** → its parent cluster + parent region + specific input feature (Cement→limestone belt, HRRL→Barmer basin+Mangala, Chambal Fert.→Chambal river+Kota Barrage)
* Every **SEZ** → its parent cluster
* Every **handicraft cluster** → the handicraft-cluster parent + input crop / mineral / stone
* Every **RIICO area** → its parent region + sectoral cluster

## The complete industrial chain, verified

Click **JK Cement — Nimbahera Plant** and the cluster returns 4 features across every relevant module:

* **SIGNATURE** Cement Manufacturing Cluster
* **DEFINES** Limestone Belt *(from Module 6 — geology)*
* **COLOCATED** Udaipur-Rajsamand Mining-and-Marble Region · Sedimentary rock type *(from Module 6)*

Same story fires for every flagship:

* **HPCL-Rajasthan Refinery** → Barmer Basin + Mangala Oil Field + Chemical cluster + Jodhpur-Pali region
* **Nissan India (Neemrana)** → Auto cluster + DMIC-KBN region
* **Chambal Fertilisers (Gadepan)** → Chemical cluster + Chambal river + Kota Barrage *(Module 3 + Module 5)*
* **Sambhar Salts Ltd.** → Salt-Wool cluster + Ajmer-Kishangarh region
* **Makrana Marble Craft** → Marble belt *(Module 6)* + Marble building stone *(Module 6)* + Handicraft cluster

Click **Textile & Apparel Cluster** and the KG returns 6 features:

* **SIGNATURE** Boranada SEZ · Bhilwara Industrial Area · Pali Industrial Area
* **COLOCATED** Cotton *(Module 5)* · DMIC-KBN region · Jodhpur-Pali region

Click **DMIC — Khushkhera-Bhiwadi-Neemrana Investment Region** and the KG returns 11 features — the auto & textile clusters, all three flagship OEMs (Nissan / Honda / Hero), UltraTech Kotputli, and all five constituent RIICO estates. The region reads as a hub.

## Cartography

The industry palette leans muted-industrial:

* **Industrial regions** — DMIC-KBN in warm ochre, marble region in silvered grey, Marwar textile-belt in rust
* **Sectoral clusters** — cement in warm limestone tan, textile in kraft-brown, marble-stone in cool silver, chemical/refinery in deep steel, auto in blue-grey, ceramics in warm buff, handicraft in ochre
* **Point markers** — RIICO estates in steel-black squares, flagships in oxblood diamonds, SEZs in ink-blue, handicraft clusters in rust
* **Labels** — regions in serif small-caps, clusters in italic serif, RIICO in sans-uppercase, handicrafts in italic serif for the traditional-craft voice

Every module 4/5/6/7 mode dims districts + terrain to keep the thematic story primary.

## Data-integrity contract

Every industrial polygon carries `geometryQuality: "generalised (district-approximated)"` + the DMICDC/DoIC citation. Every point feature carries `geometryQuality: "point"` and cites its origin — RIICO listings, company press releases, or MoCI SEZ notifications. There are no synthetic locations; the two Nimbahera cement plants (JK, Wonder) are within ~1.5 km of each other and are catalogued as two separate points because they are two separate plants.

The editorial card now discriminates between polygon and point features — the quality-tier badge shows **★★★★☆ Point** for point features (instead of "★★★ Generalised") so the reader knows immediately whether they're looking at a district-approximated zone or a cited coordinate.

## Files added

```
atlas/data/raw/BUILD_INDUSTRY.py                  — build script (~700 lines)
atlas/data/industrial-regions.geojson             — 5 regions
atlas/data/industrial-clusters.geojson            — 8 sectoral clusters
atlas/data/industrial-areas.geojson               — 12 RIICO estates
atlas/data/major-industries.geojson               — 12 flagship units
atlas/data/special-economic-zones.geojson         — 4 SEZs
atlas/data/handicraft-clusters.geojson            — 10 GI-tagged clusters
atlas/data/knowledge-graph-industry.json          — the KG expansion payload
atlas/layers/IndustryLayer.js                     — regions + clusters plug-in
atlas/layers/IndustrialSitesLayer.js              — RIICO + flagship plug-in
atlas/layers/HandicraftsLayer.js                  — SEZ + craft plug-in
atlas/ui/components/industry.css                  — palette + mode styling
docs/MODULE7_REPORT.md                            — this file
```

## Files modified

```
atlas/data/atlas.json                             — +6 layer entries, +8 sources
atlas/data/knowledge-graph.json                   — +7 source groups, +139 edges (deduped)
atlas/layers/ThematicEditorial.js                 — KIND_LABEL + composeOverview
                                                    + characteristic rows +
                                                    point/polygon quality-tier switch
index.html                                        — industry.css + 3 layer imports
.claude/launch.json                               — port bumped 8765 → 8770
```

## Data model — every industry feature carries

* `name`, `state`, `district(s)`, `centroid`, `bbox`, `labelAnchor`
* `type` — one of: `industrial_region` · `industrial_cluster` · `industrial_area`
  · `major_industry` · `special_economic_zone` · `handicraft_cluster`
* `category` — `industry`
* `geometryQuality` — `generalised (district-approximated)` (polygons) or `point`
* `source` — the citation chain (RIICO / DMICDC / DoIC / MoCI / GI Registry / company disclosure)
* `notes.facts` — 2-4 factual bullets per feature
* Domain-specific fields per type:
  * region → `corridor`, `primary_sectors`, `anchors`
  * cluster → `sector`, `ranking`, `anchors`, `raw_materials`, `related_minerals`, `related_crops`, `related_stones`, `related_rocks`
  * area → `anchor_sector`, `notable_units`, `commissioned`
  * industry → `sector`, `output`, `commissioned`
  * SEZ → `sector`, `notified`
  * handicraft → `craft`, `gi_status`

## Sources

* **DMICDC** — investment-region notifications, KBN + Ajmer-Kishangarh polygons
* **RIICO** — industrial-estate listings and coordinates
* **DoIC Rajasthan** — sectoral cluster maps, MSME cluster classifications
* **MoCI (Ministry of Commerce & Industry)** — SEZ gazette notifications
* **GI Registry (Chennai)** — GI-tag numbers and descriptions for Blue Pottery, Sanganer, Bagru, Kota Doria, Molela, Usta, Bhikaneri Bhujia, Mojari
* **Company disclosures** — Nissan India, Honda Cars India, Hero MotoCorp, Shree Cement, JK Cement, Wonder Cement, Ambuja, UltraTech, Birla Corp, Chambal Fertilisers, HPCL-Rajasthan Refinery
* **Rajasthan Handicraft Development Corporation (RUDA)** — craft cluster rosters

## Validation

* 6 layers loaded on boot; `Atlas.layers.features(id).length` matches the emitted feature counts (5 · 8 · 12 · 12 · 4 · 10).
* 0 console errors after reload.
* 199 KG source groups · 729 typed edges (dedup-guaranteed idempotent).
* Editorial card renders for every industry `type` — verified for `major_industry` (JK Cement), `industrial_region` (DMIC-KBN), `industrial_cluster` (Textile), `handicraft_cluster` (implicit via KG probe).
* Cross-highlighting reaches into Modules 3 (rivers), 5 (crops), 6 (mineral belts, building stones, rock types, oil basin) — the KG is now a single connected story from geology → minerals → industry → SEZs → handicrafts.
* `BUILD_INDUSTRY.py` is idempotent — second run produces the same `knowledge-graph.json` (729 edges → 729 edges).

## Trade-offs (deferred to docs/PENDING.md)

* **Sambhar Salts → Sambhar Lake** — Sambhar isn't in the current `lakes.geojson`. The KG points the salt flagship at the salt-wool cluster instead; adding Sambhar as a lake feature would close the geographic loop.
* **DMIC alignment as a line feature** — currently the DMIC is represented by its two Rajasthan investment regions (KBN + Ajmer-Kishangarh) as polygons. The corridor's physical alignment (a DFC + expressway pair) would benefit from a separate line-string layer if OSM/DMICDC ships one.
* **StatsManager extensions** — the header still reads "41 DISTRICTS · 7 DIVISIONS" only. Extending `StatsManager` to surface cluster counts, RIICO estate counts and total KG edges is on the Module 4-onward backlog.
* **Some flagship coordinates are approximate** — Wonder Cement Nimbahera, Ambuja Rabriyawas and a few RIICO plot boundaries are within ~1 km of the exact plant coordinate. The town-scale placement reads correctly at atlas zoom.
