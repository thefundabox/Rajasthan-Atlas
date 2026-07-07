# Agriculture System

Three agriculture layers ship in Module 5 — Major Crops, Cropping Seasons, and Agro-Economic Zones. All are district-approximated because the underlying published sources (RAD/DES/ICAR) release crop maps as raster PDFs and district-level statistics, not as surveyed GeoJSON.

## Major Crops — the 12 shipped

| Crop | Season | Districts (top belt) | Signature soil / climate |
|---|---|---|---|
| Wheat | Rabi | Sri Ganganagar–Hanumangarh · Chambal command · Bharatpur–Alwar | Alluvial · sub-humid + semi-arid |
| Mustard | Rabi | Bharatpur–Deeg–Alwar · Ganganagar–Hanumangarh | Alluvial · semi-arid |
| Pearl Millet (Bajra) | Kharif | Jaisalmer–Barmer–Bikaner–Churu · Nagaur · Shekhawati | Desert soils · arid–semi-arid · **rain-fed** |
| Maize | Kharif | Banswara–Dungarpur–Pratapgarh · Udaipur–Salumbar | Red loamy · sub-humid–humid |
| Gram (chickpea) | Rabi | Kota–Baran–Bundi · Bikaner–Churu | Black + alluvial · semi-arid |
| Soybean | Kharif | **Hadoti triangle** (Kota + Baran + Jhalawar) | Black cotton (Vertisols) · sub-humid |
| Cotton | Kharif | Sri Ganganagar–Hanumangarh (**canal-fed only**) | Alluvial + black · canal-command |
| Groundnut | Kharif | Jodhpur · Bikaner · Sikar–Jhunjhunu | Sandy loam · well-irrigated |
| Barley | Rabi | Jaipur · Sikar · Alwar · Ajmer · Nagaur | Alluvial + saline-tolerant |
| Pulses (moong/moth/urad) | Kharif | Western Thar | Desert · rain-fed |
| Other Oilseeds | Mixed | Pali · Jodhpur · Nagaur | Semi-arid |
| Horticulture | Mixed | Kinnow (Ganganagar) · Orange (Jhalawar) · Isabgol (Nagaur) · Guar (Jodhpur belt) | Wide — depends on the crop |

Each crop feature carries `related_soil`, `related_climate`, `related_irrig` arrays that the KnowledgeGraph consumes for cross-highlighting.

## Cropping seasons

Three features: **Kharif** (Jun–Oct, monsoon), **Rabi** (Oct–Mar, winter), **Zaid** (Mar–Jun, summer). Each season's feature is the union of every district where it is significant, plus `signature_crops`.

## Agro-Economic Zones — 7 farming-system groupings

Not to be confused with the RAU 10-zone Agro-Climatic classification (Module 4). These are **farming-system zones** from the Rajasthan Agriculture Department that read as syndromes:

1. **North-West Canal Belt** (Ganganagar + Hanumangarh) — intensive wheat–cotton–kinnow, cropping intensity > 180 %.
2. **Arid Livestock & Bajra Belt** (Jaisalmer + Barmer + Bikaner + Churu + Jodhpur + Nagaur) — rain-fed bajra + goat/sheep pastoralism, cropping intensity ~90 %.
3. **Shekhawati Mixed** (Sikar + Jhunjhunu + Kotputli-Behror) — groundnut + bajra + mustard, tube-well dominant.
4. **Eastern Plains Mustard + Wheat** (Alwar + Bharatpur + Deeg + Karauli + Sawai Madhopur + Dholpur + Jaipur + Dausa + Tonk) — high-intensity rotation.
5. **Central Mixed Semi-arid** (Ajmer + Beawar + Pali + Jalore + Sirohi + Bhilwara) — well-based mixed cropping.
6. **Southern Tribal Maize Belt** (Banswara + Dungarpur + Udaipur + Salumbar + Pratapgarh + Rajsamand) — subsistence maize + soybean.
7. **Hadoti Soybean + Wheat Plateau** (Kota + Baran + Bundi + Jhalawar + Chittorgarh) — Vertisol-based intensive rotation.

Each carries `system` (short description), `intensity` (cropping intensity band), and `dominant` crops list.

## How the KnowledgeGraph reflects agriculture

Every crop is linked to its soil, climate, irrigation source, and season via **automatically-generated typed edges** in `BUILD_AGRICULTURE.py`. Reading them:

```
Mustard  →  Alluvial (colocated) · Semi-arid (colocated) · Canal irrigation (colocated)
         →  Tube-well irrigation (colocated) · IGNP Command (signature) · Bisalpur Command (signature)
         →  Rabi season (signature) · North-West Canal Belt (signature)
         →  Eastern Plains Mustard + Wheat zone (signature)

Cotton   →  Canal irrigation (colocated) · Alluvial soils (colocated) · Semi-arid (colocated)
         →  IGNP Command (signature) · North-West Canal Belt (signature)
         →  Kharif season (signature)

Bajra    →  Desert soils (colocated) · Arid climate (colocated) · Rain-fed (colocated)
         →  Arid Livestock & Bajra Belt (signature) · Kharif season (signature)
```

Clicking any of the 12 crops on the map pulses the entire syndrome — the reader sees the causal chain visually.

## Design contract

* **Every district assignment cites the source.** The `districts_included` list per crop / zone comes from the Rajasthan Agricultural Statistics 2023 gazette + ICAR reports. Never invented.
* **Nothing shipped when unsourced.** If a district's dominant crop couldn't be verified, it is omitted from that crop's belt.
* **The KG expansion is data, not code.** New edges live in `BUILD_AGRICULTURE.py`'s `build_kg_expansion()` and merge into the main `knowledge-graph.json` — never overwrite it.

## Anti-patterns

* Do not invent a crop that isn't in the RAD list. Rajasthan grows a wide variety; only well-attested belts should appear here.
* Do not add real crop-area GeoJSON without documenting the source; approximated polygons and surveyed ones must be flagged differently.
* Do not remove the `related_*` arrays from a crop entry — the KnowledgeGraph reads them at build time.
