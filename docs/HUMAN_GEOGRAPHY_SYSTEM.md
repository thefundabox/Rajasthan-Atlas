# Human Geography System — Architecture Reference

This document describes how the Human Geography layers (Module 9) are organised,
where each dataset comes from, and how they connect to the rest of the atlas
through the Knowledge Graph.

---

## Two axes: demographic vs administrative

Module 9 ships in two conceptual halves.

### 1. Demographic choropleths (7 layers, 35 classification zones)

Every demographic layer is a **5-class classification** built from Census 2011
per-district values:

* Population Density — 5 quintile classes from <100 to >500/km²
* Population Growth — 5 classes over the 2001–2011 decade
* Literacy — 5 classes from <60 to >75 %
* Sex Ratio — 5 classes from <900 to >990 F/1000M
* Urbanisation — 5 classes from <10 to >50 %
* Scheduled Tribes — 5 classes from <5 to >50 %
* Scheduled Castes — 5 classes from <10 to >25 %

Each classification zone is emitted as the union of the districts that fall into
that class. The polygon carries the district roster in `districts_included` and
the per-district values in `district_values`. This is what the Revision
Dashboard reads to compute its cards.

### 2. Administrative + cultural overlays (8 layers, 57 features)

* **7 revenue divisions** (Jaipur, Jodhpur, Ajmer, Bikaner, Bharatpur, Kota, Udaipur)
* **9 cultural regions** (Marwar, Mewar, Hadoti, Shekhawati, Dhundhar, Vagad, Matsya, Godwar, Mewat)
* **1 Scheduled Areas (TSP) block** — the Fifth-Schedule Vagad block
* **6 border zones** — Pakistan international + 5 interstate borders
* **10 municipal corporations** — post-2019 splits included
* **4 smart cities** — Jaipur, Udaipur, Kota, Ajmer
* **15 major urban centres** — Class-I towns per Census 2011
* **5 population corridors** — inter-city development axes

## Reconciling 33 (Census 2011) with 41 (post-2023) districts

Census 2011 authoritatively records 33 Rajasthan districts. Eight new districts
were gazetted in 2023 and are included in the current atlas roster:

| New district | Parent district (Census 2011) |
|---|---|
| Balotra | Barmer |
| Beawar | Ajmer |
| Deeg | Bharatpur |
| Didwana-Kuchaman | Nagaur |
| Khairthal-Tijara | Alwar |
| Kotputli-Behror | Alwar (with parts from Jaipur + Sikar) |
| Phalodi | Jodhpur |
| Salumbar | Udaipur |

Each new district inherits its parent's Census 2011 values. This is documented
per-district in `atlas/data/district-demographics.json` under the
`inherited_from_parent` field so downstream consumers (Revision Dashboard,
Compare Mode) can surface the caveat.

## The `district-demographics.json` payload

A single JSON file at `atlas/data/district-demographics.json` mirrors every
Census 2011 metric per district:

```json
{
  "source": "Census of India 2011 · District Census Handbook",
  "note":   "8 new districts (2023+) inherit Census 2011 values from their parent…",
  "districts": {
    "Jaipur": {
      "population": 6626178,
      "area_km2":   11152,
      "density":    598,
      "literacy_pct": 75.51,
      "sex_ratio":  910,
      "st_pct":     8.3,
      "sc_pct":     15.4,
      "urban_pct":  52.4,
      "growth_pct": 26.9,
      "inherited_from_parent": null
    }
  }
}
```

The Revision Dashboard fetches this file at `atlas:ready` and computes the
Human Geography cards in real time. The Compare Mode fetches the same file to
surface district-level demographic rows for any feature whose `properties.district`
matches.

## KG expansion pattern

The Human Geography layers connect to prior modules in three shapes:

### 1. Cultural region → module-specific anchors

Every cultural region declares its signature features across prior modules:

* **Marwar** → Textile / Marble-Stone / Handicraft / Salt-Wool clusters + Thar + Arid climate + Bajra + Pulses
* **Mewar** → Marble cluster + Lead-Zinc belt + Aravalli SG + Chambal river + Maize + Bhilwara + Udaipur lakes
* **Hadoti** → Cement cluster + Chambal command + Soybean + Wheat + Chambal Fertilisers
* **Shekhawati** → Groundnut + Copper belt + Over-exploited groundwater
* **Dhundhar** → DMIC-KBN + Handicraft + Sitapura SEZ + Blue Pottery + Sanganeri
* **Vagad** → TSP Scheduled Area + Maize + Mahi Bajaj Sagar Dam + Molela terracotta + Mahi river
* **Matsya** → DMIC-KBN + Auto cluster + Nissan + Honda + Sariska + Keoladeo
* **Godwar** → Textile cluster + Pali estate + Jawai Dam
* **Mewat** → DMIC-KBN (fringe)

### 2. Urban centre → industrial + regional + smart-city context

Every urban centre declares its industrial cluster + regional zone + smart-city
association. For example, Jaipur's KG cluster reaches Handicraft cluster + Dhundhar
+ Sitapura SEZ + Jaipur Smart City + Jaipur–Ajmer + Jaipur–Alwar–Delhi corridors + DMIC-KBN.

### 3. District-level KG hubs

Three brief-mandated stories (Jaipur, Udaipur, Barmer) get explicit district-level
KG edges so clicking the district lights up the full narrative.

## Editorial-panel sections

The `ThematicEditorial.js` card renders six new sections when the feature's
properties support them:

| Section | Feature types it fires for | Data fields |
|---|---|---|
| Administrative Context | administrative_division · scheduled_area · border_district_zone · municipal_corporation · smart_city | authority · status · headquarters · notification · border_with · border_km |
| Regional Identity | regional_cultural_zone | seat · core · dialect · signature |
| Physical Setting | any feature with a `physical` field | (paragraph) |
| Economic Connections | any feature with `economy` / `urban_role` / `axis` fields | (paragraph) |
| Development Profile | smart_city · urban_centre · population_corridor | rank · population_lakh · notified · anchor_project · axis |
| Demographic Characteristics | classification zones with `district_values` | per-district roster |

## Cartography

Demographic choropleths use quintile ramps within a metric-consistent hue family
(ochres for population, teals for sex ratio, earth tones for tribes/castes).
Every mode dims districts to 15 % and terrain to 32 % so the choropleth is the
primary read.

Cultural regions use warm differentiated hues (Marwar ochre, Mewar violet, Hadoti
gold, Vagad forest green, etc.). Borders use hazard-ochre for international +
cool grey for interstate. Points share the muted-industrial palette from
Module 7 (municipal corps and urban centres in warm ochre, smart cities in ink-blue).

## Files that make up Module 9

```
Build:
  atlas/data/raw/BUILD_HUMAN.py            (~700 lines)

Data:
  atlas/data/population-density.geojson
  atlas/data/population-growth.geojson
  atlas/data/literacy.geojson
  atlas/data/sex-ratio.geojson
  atlas/data/urbanisation.geojson
  atlas/data/scheduled-tribes.geojson
  atlas/data/scheduled-castes.geojson
  atlas/data/scheduled-areas.geojson
  atlas/data/administrative-divisions.geojson
  atlas/data/regional-zones.geojson
  atlas/data/border-districts.geojson
  atlas/data/municipal-corporations.geojson
  atlas/data/smart-cities.geojson
  atlas/data/urban-centres.geojson
  atlas/data/population-corridors.geojson
  atlas/data/district-demographics.json    (dashboard + compare payload)
  atlas/data/knowledge-graph-human.json    (KG expansion)

Plug-ins (additive; zero AtlasCore changes):
  atlas/layers/PopulationLayer.js
  atlas/layers/AdministrativeLayer.js
  atlas/layers/HumanGeographyLayer.js

Editorial + engine hooks:
  atlas/layers/ThematicEditorial.js        (extended, not rewritten)
  atlas/layers/RevisionDashboard.js        (extended with Human Geography section)
  atlas/layers/CompareMode.js              (extended with demographic rows)

Styles:
  atlas/ui/components/human_geography.css

Docs:
  docs/HUMAN_GEOGRAPHY_SYSTEM.md   (this file)
  docs/ADMINISTRATIVE_SYSTEM.md    (administrative-classification reference)
  docs/MODULE9_REPORT.md
```
