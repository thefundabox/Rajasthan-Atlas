# Module 9 — Human Geography & Administrative Rajasthan

**Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** 0 lines.

## What shipped

**15 new atlas layers** — the atlas now has **64 total layers**:

| Layer | Features | Category | Fidelity |
|---|---:|---|---|
| Population Density | 5 | demographic | Choropleth (Census 2011 classes) |
| Population Growth | 5 | demographic | Choropleth (2001–2011 growth) |
| Literacy | 5 | demographic | Choropleth |
| Sex Ratio | 5 | demographic | Choropleth |
| Urbanisation | 5 | demographic | Choropleth |
| Scheduled Tribes | 5 | demographic | Choropleth |
| Scheduled Castes | 5 | demographic | Choropleth |
| Scheduled Areas (TSP) | 1 | administrative | District-approximated · TAD |
| Revenue Divisions | 7 | administrative | District-approximated · GoR |
| Cultural Regions | 9 | human | District-approximated · Gazetteer |
| Border Districts | 6 | human | District-approximated · Survey of India + BSF |
| Municipal Corporations | 10 | urban | **Point features** · GoR Municipal Act |
| Smart Cities | 4 | urban | **Point features** · MoHUA |
| Major Urban Centres | 15 | urban | **Point features** · Census 2011 |
| Population Corridors | 5 | human | District-approximated |

**92 new features across 15 layers.** **KG: 230 → 255 source groups · 795 → 975 typed edges** — 180 new edges linking demography to prior modules (Modules 3–8).

## The brief's mandated stories, verified

### Jaipur → Highest urbanisation → Dhundhar → DMIC

Click the **Jaipur district** and the KG returns 7 relations:
* **SIGNATURE** Urban Centre "Jaipur (State Capital)" · Handicraft cluster
* **DEFINES** Jaipur Smart City · Dhundhar Region · Jaipur–Alwar–Delhi Corridor · Jaipur–Ajmer Corridor
* **COLOCATED** DMIC — Khushkhera-Bhiwadi-Neemrana Investment Region

That's the full brief chain — State Capital → Dhundhar → DMIC/Delhi–Mumbai corridor — surfaced at one click.

### Udaipur → Mewar → Tribal Belt → Aravalli → Lakes

Click the **Udaipur district** and the KG returns 6 relations:
* **SIGNATURE** Urban Centre "Udaipur" · Marble & Dimension-Stone Cluster
* **DEFINES** Udaipur Smart City · Mewar Region
* **COLOCATED** Aravalli Supergroup · Tribal Sub-Plan (TSP) Scheduled Area

Click **Mewar Region** itself for the lake/tourism angle — cluster returns Marble cluster + Lead-Zinc belt + Maize + Aravalli Supergroup + Chambal river + Udaipur + Bhilwara (7 relations).

Click the **Udaipur urban centre** for Pichola + Fateh Sagar lakes (routed through the urban centre rather than the district for the tourism story).

### Barmer → Border → Oil → Solar → Desert → Low Density

Click the **Barmer district** and the KG returns 10 relations across Modules 3, 4, 6, 8, 9:
* **SIGNATURE** Barmer Basin oil field · Mangala Oil Field · Barmer Lignite TPS · Barmer Wind Zone
* **DEFINES** Pakistan Border (international)
* **COLOCATED** HRRL Pachpadra refinery · Western Solar Zone · Wind-Hybrid Zone · Arid climate · Marwar Region

The border-oil-solar-desert story reads at one click.

## Editorial panel — new sections

The `ThematicEditorial.js` card now renders six new sections when the feature's properties support them:

* **Administrative Context** — for divisions / scheduled areas / border zones / municipal corps / smart cities
* **Regional Identity** — for cultural regions (historical seat, cultural core, dialect, signature)
* **Physical Setting** — a paragraph for cultural regions and border zones
* **Economic Connections** — for cultural regions / urban centres / population corridors
* **Development Profile** — for smart cities / urban centres / population corridors
* **Demographic Characteristics** — the per-district value roster for choropleth classification zones

The existing Overview / Key Figures / Characteristics / Distribution / Related Features / Locator / References structure is preserved; new sections slot between Characteristics and Distribution.

## Revision Dashboard — live human-geography cards

The dashboard now fetches `atlas/data/district-demographics.json` at boot and auto-computes **16 cards** below the existing climate cards:

| Card | Result (Census 2011) |
|---|---|
| Highest population | Jaipur — 6.6 M |
| Lowest population | Jaisalmer — 0.7 M |
| Highest density | Jaipur — 598/km² |
| Lowest density | Jaisalmer — 17/km² |
| Highest literacy | Kota — 76.56 % |
| Lowest literacy | Jalore — 54.86 % |
| Highest ST % | Banswara — 76.4 % |
| Highest SC % | Sri Ganganagar — 36.6 % |
| Most urbanised | Kota — 60.3 % |
| Least urbanised | Dungarpur — 6.1 % |
| Highest sex ratio | Dungarpur — 994 F/1000M |
| Lowest sex ratio | Dholpur — 846 F/1000M |
| Highest 2001–2011 growth | Barmer — 32.5 % |
| Largest Municipal Corp | Jaipur — Greater (~30 lakh) |
| Border districts | 21 districts across international + 5 states |
| Revenue divisions | 7 (Jaipur / Jodhpur / Ajmer / Bikaner / Bharatpur / Kota / Udaipur) |

Every card is a click — opens the underlying district's classification zone.

## Compare Mode — District ↔ District demographics

`CompareMode.js` now:

* Loads `district-demographics.json` at boot.
* When a compared feature has a `district` (or is a district), the panel adds Population / Density / Literacy / Sex Ratio / ST % / SC % / Urban % / 2001–2011 Growth rows.
* Adds a demographic diff to the "Key differences" section — for two comparable districts, it reports each metric's delta with "higher / lower by X".

Supports District vs District, Division vs Division, Region vs Region and Urban Centre vs Urban Centre out-of-the-box (all share the same feature-props extractor).

## Data-integrity contract

* All 33 pre-2023 districts carry authoritative Census 2011 values from RGI's District Census Handbook.
* The 8 new (2023+) districts inherit values from their parent district. Every inheritance is documented in `district-demographics.json` under `inherited_from_parent`.
* Every polygon feature carries `geometryQuality: "generalised (district-approximated)"`.
* Every point feature carries `geometryQuality: "point"` and a real coordinate from RGI's town register / operator disclosure.
* The map is designed to preserve the physical base map under the demographic overlay — every mode dims districts to 15 % and terrain to 32 %.

## Files added

```
atlas/data/raw/BUILD_HUMAN.py                     — build script (~700 lines)
atlas/data/population-density.geojson             — 5 classification zones
atlas/data/population-growth.geojson              — 5 zones
atlas/data/literacy.geojson                       — 5 zones
atlas/data/sex-ratio.geojson                      — 5 zones
atlas/data/urbanisation.geojson                   — 5 zones
atlas/data/scheduled-tribes.geojson               — 5 zones
atlas/data/scheduled-castes.geojson               — 5 zones
atlas/data/scheduled-areas.geojson                — 1 TSP block
atlas/data/administrative-divisions.geojson       — 7 divisions
atlas/data/regional-zones.geojson                 — 9 cultural regions
atlas/data/border-districts.geojson               — 6 border zones
atlas/data/municipal-corporations.geojson         — 10 corporations
atlas/data/smart-cities.geojson                   — 4 smart cities
atlas/data/urban-centres.geojson                  — 15 Class-I towns
atlas/data/population-corridors.geojson           — 5 corridors
atlas/data/district-demographics.json             — per-district roster
atlas/data/knowledge-graph-human.json             — KG payload
atlas/layers/PopulationLayer.js                   — 7 choropleth plug-in
atlas/layers/AdministrativeLayer.js               — divisions + scheduled areas + urban points
atlas/layers/HumanGeographyLayer.js               — regions + border + corridors
atlas/ui/components/human_geography.css           — palette + mode + labels
docs/HUMAN_GEOGRAPHY_SYSTEM.md                    — architecture reference
docs/ADMINISTRATIVE_SYSTEM.md                     — administrative-classification reference
docs/MODULE9_REPORT.md                            — this file
```

## Files modified

```
atlas/data/atlas.json                             — +15 layer entries, +8 sources
atlas/data/knowledge-graph.json                   — +43 source groups, +180 edges
atlas/layers/ThematicEditorial.js                 — +15 KIND_LABEL types,
                                                    +15 composeOverview cases,
                                                    +22 characteristic rows,
                                                    +6 new editorial sections
                                                    (Administrative Context /
                                                     Regional Identity /
                                                     Physical Setting /
                                                     Economic Connections /
                                                     Development Profile /
                                                     Demographic Characteristics)
atlas/layers/RevisionDashboard.js                 — +16 human-geography cards,
                                                    loads district-demographics.json
atlas/layers/CompareMode.js                       — demographic rows + diff,
                                                    loads district-demographics.json
index.html                                        — human_geography.css + 3 imports
```

## Sources

* **Census of India 2011** — Registrar General of India, District Census Handbook (per-district population, density, literacy, sex ratio, ST %, SC %, urbanisation, decadal growth)
* **Directorate of Economics & Statistics, GoR** — state demographic updates
* **NITI Aayog** — Aspirational Districts + Smart Cities Mission
* **Tribal Area Development Department (TAD)** — Scheduled Areas (Fifth Schedule block)
* **Ministry of Housing & Urban Affairs (MoHUA)** — Smart Cities Mission roster
* **Government of Rajasthan Municipal Act notifications** — Municipal Corporation splits (2019 JMC/JoMC/Kota)
* **Rajasthan historical gazetteer + cultural anthropology sources** — 9 regional cultural zones
* **Border Security Force + Survey of India** — border lengths

## Validation

* All 15 layers register on boot; 92 features load; console clean.
* KG traversal returns the expected clusters for Jaipur / Udaipur / Barmer / Mewar / Vagad / Matsya / DMIC-KBN corridor / Bikaner–Jaisalmer corridor / TSP scheduled area.
* Editorial card renders all six new sections when the feature carries the fields.
* Revision Dashboard's Human Geography section shows 16 auto-computed cards from Census 2011; every card clicks through to the underlying classification zone.
* Compare Mode surfaces demographic rows for any district-anchored feature.
* Point/polygon quality-tier badge fires correctly for every Module 9 type.
* `BUILD_HUMAN.py` is idempotent — 975 edges → 975 edges on second run.
* **Atlas totals: 64 layers · 255 KG source groups · 975 typed edges.**

## Trade-offs (deferred to docs/PENDING.md)

* **Census 2011 baseline** — Census 2021 has not been conducted; every value is 2011. Where post-2011 estimates from DES/RGI exist, they are noted in the feature facts but not the primary value.
* **New-district value inheritance** — 8 new districts (2023+) inherit parent values; this is documented per district in `district-demographics.json`.
* **Border-district geometry** — currently a union of border-touching districts. Actual border alignment (a line-string of the international / interstate boundary) would need Survey of India's official Great Trigonometrical Survey data.
* **Municipal Corporation ward-level detail** — not shipped. The 10 MCs are represented as single-point features; ward boundaries would require the state Municipal Act's ward-notification GeoJSON.
* **Cross-region overlap** — Godwar is a Marwar sub-region; Vagad districts (Banswara, Dungarpur, Pratapgarh) are also in Udaipur revenue division. The atlas ships both classifications with overlap; the reader sees them as parallel lenses.
