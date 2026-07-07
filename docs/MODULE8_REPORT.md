# Module 8 — Energy · Power Generation · Renewables · Grid

**Engine version:** 1.0.0 (unchanged) · **AtlasCore.js delta:** 0 lines.

## What shipped

**6 new atlas layers** — the atlas now has **49 total layers**:

| Layer | Features | Category | Fidelity |
|---|---:|---|---|
| Energy Mix Zones | 5 | energy | District-approximated · CEA + RVUNL |
| Renewable-Energy Zones | 3 | energy | District-approximated · MNRE solar / wind atlas |
| Transmission Corridors | 2 | energy | District-approximated · RVPNL + PGCIL |
| Power Plants | 13 | energy | **Point features** · CEA plant register + operators |
| Solar Parks | 6 | energy | **Point features** · SECI + RREC + MNRE |
| Wind Farms | 4 | energy | **Point features** · MNRE + Suzlon / ReNew / Adani |

**Knowledge Graph: 212 → 230 source groups · 795 → 795 typed edges after dedupe** (~30 new source groups, ~200 new edges after a KG-wide consolidation of duplicate source groups from the pre-Module-7 baseline). The energy edges weave the story into every prior module:

* Every **solar park** → MNRE Solar Radiation Zone A + Arid climate *(Module 4)* + Thar Desert *(Module 3)* + Western Solar Zone + evacuation via transmission corridors
* Every **wind farm** → Wind Belt + Hybrid Zone + Arid + Thar + Wind-Hybrid Zone
* Every **hydel plant** → its **dam feature** *(Module 5)* (RPS HEP ↔ Rana Pratap Sagar Dam · Jawahar Sagar HEP ↔ Jawahar Sagar Dam · Mahi Bajaj Sagar HEP ↔ Mahi Bajaj Sagar Dam)
* **Rawatbhata** (RAPS 1-6) → Chambal river + Rana Pratap Sagar reservoir + Hadoti Base-Load zone
* **Kota Super Thermal** → Chambal river + Kota Barrage + Chambal Fertilisers *(Module 7)* + Chemical cluster *(Module 7)* — the energy↔water↔industry triangle
* **Barmer / Giral lignite TPS** → Lignite mineral belt *(Module 6)*
* **Ramgarh + Anta gas TPS** → Barmer basin + Raageshwari gas field *(Module 6)*
* **Green Energy Corridor** → Bhadla + Fatehgarh solar parks + Jaisalmer wind + both western energy zones
* **Bhadla–Sikar–Fatehpur HVDC** → Bhadla + Western Solar Zone

## Verified stories

Click **Bhadla Solar Park** and the KG returns 5 relations across 4 layers:

* **SIGNATURE** Western Solar Dominance Zone
* **DEFINES** Solar Radiation Zone A · Green Energy Corridor · Bhadla-Sikar-Fatehpur HVDC
* **COLOCATED** Arid climate region *(Module 4)*

Click **Kota Super Thermal Power Station** and the KG returns 5 relations across 5 modules (3, 5, 7, 8):

* **SIGNATURE** Hadoti Base-Load Zone
* **DEFINES** Chambal River *(Module 3)*
* **COLOCATED** Kota Barrage *(Module 5)* · Chambal Fertilisers · Chemical/Petrochemical Cluster *(Module 7)*

Click **Rajasthan Atomic Power Station (RAPS Rawatbhata)** and the KG returns 3 relations — Hadoti Base-Load Zone (signature) · Chambal River (defines) · Rana Pratap Sagar Dam (colocated).

Click **Western Solar Dominance Zone** and the KG returns 10 relations — all 6 flagship solar parks (Bhadla · Fatehgarh · Nokh · Pokhran · Bikaner · Phalodi) plus Solar Radiation Zone A · Arid climate · both transmission corridors. The zone reads as the state's renewable heartland at a glance.

## Cartography

Energy palette:

* **Energy mix zones** — Solar West in warm ochre; Hadoti in slate-brown; Wind-Hybrid in cool teal; Gas-north in warm buff; Hydel-south in deep blue
* **Renewable zones** — Solar Zone A in sun-ochre; Wind belt in muted teal; Hybrid in warm sand
* **Transmission corridors** — dashed electric-orange for the Green Energy Corridor; dashed rust for the Bhadla-Fatehpur HVDC
* **Power plants** — nuclear in oxblood, coal in near-black, lignite in dark brown, gas in slate-grey, hydel in deep blue (all with white outlines)
* **Solar parks** — warm ochre circles with dark outline
* **Wind farms** — teal circles with white outline
* **Labels** — energy-mix serif small-caps, renewables in sans small-caps, transmission in dense-tracked sans, plants in serif, solar in italic serif, wind in italic serif

Every energy mode dims districts to 15 % + terrain to 32 %, keeping the generation story primary.

## Data-integrity contract

Every polygon carries `geometryQuality: "generalised (district-approximated)"` + the CEA/MNRE/RVPNL citation. Every point carries `geometryQuality: "point"` with the operator citation (RVUNL / NPCIL / SECI / Suzlon / etc.). Ranges of capacities are documented as-installed, not name-plate-marketing figures. RAPS-1 is noted as retired; Giral Lignite TPS as largely non-operational since 2018.

## Files added

```
atlas/data/raw/BUILD_ENERGY.py                    — build script
atlas/data/energy-mix.geojson                     — 5 zones
atlas/data/renewable-zones.geojson                — 3 zones
atlas/data/transmission-corridors.geojson         — 2 corridors
atlas/data/power-plants.geojson                   — 13 plants
atlas/data/solar-parks.geojson                    — 6 parks
atlas/data/wind-farms.geojson                     — 4 wind clusters
atlas/data/knowledge-graph-energy.json            — KG expansion payload
atlas/layers/EnergyLayer.js                       — zones + transmission plug-in
atlas/layers/PowerPlantsLayer.js                  — plants + solar + wind plug-in
atlas/ui/components/energy.css                    — palette + mode + label styling
docs/MODULE8_REPORT.md                            — this file
```

## Files modified

```
atlas/data/atlas.json                             — +6 layer entries, +8 sources
atlas/data/knowledge-graph.json                   — consolidated (duplicate source
                                                    groups collapsed) + 30 new
                                                    energy groups appended
atlas/layers/ThematicEditorial.js                 — +6 feature types in KIND_LABEL,
                                                    +6 cases in composeOverview,
                                                    +10 characteristic rows
                                                    (fuel · capacity · operator ·
                                                    developer · dominant source ·
                                                    resource · classification ·
                                                    corridor type · purpose)
index.html                                        — energy.css + 2 new plug-in imports
```

## Data model — every energy feature carries

* `name`, `state`, `district(s)`, `centroid`, `bbox`, `labelAnchor`
* `type` — one of: `energy_mix_zone` · `renewable_zone` · `transmission_corridor`
  · `power_plant` · `solar_park` · `wind_farm`
* `category` — `energy`
* `geometryQuality` — `generalised (district-approximated)` (polygons) or `point`
* `source` — CEA / MNRE / NPCIL / SECI / RVUNL / RVPNL / operator disclosure
* `notes.facts` — 2-4 factual bullets per feature
* Domain-specific fields:
  * energy mix → `dominant`, `installed`, `headline`
  * renewable → `resource`, `classification`
  * transmission → `corridor_type`, `purpose`, `commissioned`
  * plant → `fuel`, `capacity_mw`, `owner`, `output`, `commissioned`
  * solar park → `capacity_mw`, `developer`, `commissioned`
  * wind farm → `capacity_mw`, `developer`, `commissioned`

## Sources

* **CEA** — Central Electricity Authority monthly generation report + plant register
* **MNRE** — Solar Radiation Zone map + Wind Atlas + ultra-mega solar-park notifications
* **NPCIL** — Rawatbhata reactor sizes, commissioning dates
* **SECI** — Solar park allocations, tariff records, Bhadla/Fatehgarh SPD roster
* **RVUNL** — State-owned generating stations (Suratgarh, Chhabra, Kalisindh, Kota, Ramgarh, hydel fleet)
* **RVPNL + PGCIL** — Green Energy Corridor + 765 kV / HVDC alignment
* **RREC** — Rajasthan Renewable Energy Corporation park roster + state policy
* **Operator disclosures** — NTPC (Anta), Adani Green (Fatehgarh), ReNew Power, Suzlon (Jaisalmer), JSW-Raj West (Barmer lignite), Vedanta Cairn (gas)

## Validation

* All 33 energy features load on boot; console clean.
* KG traversal returns the expected clusters for every flagship (Bhadla, Kota Super Thermal, RAPS, RPS HEP, Barmer Lignite, Jaisalmer Wind, Green Energy Corridor, Western Solar Zone).
* Editorial card renders correctly for every energy `type` — verified `power_plant` (RAPS), `solar_park` (Bhadla), `energy_mix_zone` (Solar West), `transmission_corridor` (GEC).
* Point/polygon quality-tier badge fires correctly — RAPS shows "★★★★☆ Point"; energy-mix zones show "★★★ Generalised".
* `BUILD_ENERGY.py` is idempotent — 795 edges → 795 edges on second run.
* Total atlas now: **49 layers · 230 KG source groups · 795 typed edges**.

## Trade-offs (deferred to docs/PENDING.md)

* **Transmission corridors as line features** — currently shipped as district-approximated polygons. The GEC and Bhadla-Fatehpur HVDC would read better as real polylines when RVPNL / PGCIL publish shapefile alignment.
* **Small-hydel + KUSUM decentralised solar** — not shipped. Bassi small hydel (Meja Dam, Chittorgarh anicuts) plus the state's ~1 GW of solar-pump conversions would round out the picture but are highly distributed.
* **Solar park land-use polygons** — Bhadla, Fatehgarh, Nokh have OSM `landuse=industrial` fenceline polygons that could replace the point markers for detailed views.
* **RAPS 7-8 under construction** — the two 700 MW indigenous PHWRs are catalogued in RAPS Rawatbhata's fact block, but a separate `power-plants-raps-7-8-uc` feature is deferred until commissioning is closer.
