# Water Resources System

Two water-resource layers ship in Module 5 alongside canals + commands — Major Dams (12 features) and Groundwater Status (4 CGWB classes).

## Major Dams

12 dams shipped, spanning the state's major surface-water infrastructure. Coordinates from RWRD project pages + CWC Dam Register. Where an OSM reservoir polygon exists, the dam ships as a polygon (Rana Pratap Sagar); otherwise as a point marked `geometryQuality: "point"`.

| Dam | River | Purpose | Capacity | Height | Commissioned | District |
|---|---|---|---:|---:|---|---|
| **Bisalpur** | Banas | Drinking + irrigation | 1,095 MCM | 39.5 m | 1999 | Tonk |
| **Rana Pratap Sagar** | Chambal | Hydropower + irrigation | 2,900 MCM | 53.8 m | 1970 | Chittorgarh |
| **Jawahar Sagar** | Chambal | Hydropower + regulation | 60 MCM | 45 m | 1972 | Kota |
| **Kota Barrage** | Chambal | Irrigation headworks — feeds Chambal command | 99 MCM | 37 m | 1960 | Kota |
| **Gandhi Sagar** (MP influence) | Chambal | Regulates Chambal for Rajasthan | 7,746 MCM | 62 m | 1960 | Mandsaur (MP) |
| **Mahi Bajaj Sagar** | Mahi | Hydropower + Banswara command | 2,172 MCM | 74.5 m | 1985 | Banswara |
| **Jakham** | Jakham | Irrigation + drinking-water | 285 MCM | 81 m | 1986 | Pratapgarh |
| **Jawai Bandh** | Jawai | Irrigation + Marwar drinking-water (leopard reservoir) | 208 MCM | 61.3 m | 1957 | Pali |
| **Panchna** | Bhadravati | Irrigation + Ranthambore water | 63 MCM | — | 1990s | Karauli |
| **Ramgarh (Alwar)** | Ruparel | Historic Jaipur supply | 74 MCM | — | 1903 | Alwar |
| **Meja** | Kothari | Bhilwara drinking-water | 108 MCM | — | 1980s | Bhilwara |
| **Som Kamla Amba** | Som | Southern tribal irrigation | 165 MCM | — | 1979 | Dungarpur |

### Gandhi Sagar note

Gandhi Sagar sits across the MP border but is included because it *defines* the Chambal flow into Rajasthan. The atlas flags this via `properties.geometryNote` — the reader sees explicitly why an out-of-state feature is present.

## Groundwater Status — CGWB 2023

The Central Ground Water Board classifies each district by the ratio of **water drawn / natural annual recharge**. Four categories ship:

| Class | Draft vs. recharge | Districts (belt) |
|---|---|---|
| **Over-exploited** | draft > 100 % | Shekhawati (Sikar, Jhunjhunu) · eastern plain (Jaipur, Dausa, Alwar, Khairthal-Tijara, Kotputli-Behror) · Nagaur · Didwana-Kuchaman · Ajmer · Beawar · Jodhpur |
| **Critical** | 90–100 % | Pali · Jalore · Sirohi · Bhilwara · Tonk · Sawai Madhopur · Karauli |
| **Semi-critical** | 70–90 % | Bharatpur · Deeg · Dholpur · Chittorgarh · Rajsamand · Balotra |
| **Safe** | < 70 % | Sri Ganganagar · Hanumangarh (canal-fed) · Kota · Baran · Bundi · Jhalawar · Banswara · Dungarpur · Udaipur · Salumbar · Pratapgarh · Barmer · Bikaner · Churu · Jaisalmer · Phalodi (rain-fed, low draft) |

### The syndrome the atlas reveals

The **over-exploited** districts are precisely the ones where tube-well irrigation dominates + high-value rabi cropping (wheat + mustard) coincides. The KnowledgeGraph makes this explicit — click **Over-exploited** and the cluster surfaces Tube-well irrigation (defines), Wheat + Mustard (colocated), Shekhawati Mixed zone (colocated), Eastern Plains zone (colocated).

Conversely, click **Safe** and the cluster surfaces canal-command districts + rain-fed western districts — the two extremes that draw less groundwater, for opposite reasons.

## The upstream → downstream chain

The atlas can teach hydrological connectivity via three clicks:

1. Click **Gandhi Sagar Dam** — flags "MP · defines Chambal flow into Rajasthan".
2. Click **Rana Pratap Sagar** (real OSM polygon) — Chambal impoundment, hydropower + irrigation.
3. Click **Kota Barrage** — feeds the Chambal command.

Every dam's KnowledgeGraph edge to its river (`type: defines`) + its command area (`type: defines`) makes this chain traversable from any starting point.

## Sources

* **RWRD** — Rajasthan Water Resources Department project register (dam capacities, heights, commissioning)
* **CWC** — Central Water Commission Dam Register (independent verification)
* **CGWB** — Central Ground Water Board — Dynamic Groundwater Resources 2023 (district classification)
* **OSM** — reservoir polygon for Rana Pratap Sagar; point locations of most dams cross-checked with OSM
