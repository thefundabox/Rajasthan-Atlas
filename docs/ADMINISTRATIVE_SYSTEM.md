# Administrative System — Classification Reference

Rajasthan is organised across five parallel administrative layers, each with a
distinct authority, purpose and update cadence. This document catalogues the
five and how the atlas represents them.

---

## Layer 1 — Districts (Module 1 baseline)

**Authority:** Government of Rajasthan (District Collector under the IAS).
**Count:** 41 districts (as of 2023 gazette).
**Represented in:** `districts.geojson` (Module 1).

Districts are the primary revenue and general-administration unit. Every
higher-order classification (division, cultural region, TSP block, border zone,
corridor) is expressed as a union of districts in this atlas.

### The 2023 reorganisation

The 33-district roster from Census 2011 was expanded to 41 in 2023 through
gazette notifications. Eight new districts were carved from existing ones:

| New | Parent | Notified |
|---|---|---|
| Balotra | Barmer | 2023 |
| Beawar | Ajmer | 2023 |
| Deeg | Bharatpur | 2023 |
| Didwana-Kuchaman | Nagaur | 2023 |
| Khairthal-Tijara | Alwar | 2023 |
| Kotputli-Behror | Alwar (partial) + Jaipur (partial) + Sikar (partial) | 2023 |
| Phalodi | Jodhpur | 2023 |
| Salumbar | Udaipur | 2023 |

*Anantpur, Sanchore, Shahpura, and other proposed districts had their notifications
partially reversed after the 2023 elections and are not in the current roster.*

## Layer 2 — Revenue Divisions

**Authority:** Government of Rajasthan (Divisional Commissioner).
**Count:** 7 divisions (Jaipur, Jodhpur, Ajmer, Bikaner, Bharatpur, Kota, Udaipur).
**Represented in:** `administrative-divisions.geojson` (Module 9).

Divisions are the second-tier revenue unit above districts. Each is headed by a
Divisional Commissioner and typically groups 4–8 districts.

| Division | HQ | Districts |
|---|---|---|
| Jaipur | Jaipur | Jaipur · Alwar · Khairthal-Tijara · Sikar · Jhunjhunu · Dausa · Kotputli-Behror · Didwana-Kuchaman |
| Jodhpur | Jodhpur | Jodhpur · Jaisalmer · Barmer · Balotra · Pali · Sirohi · Jalore · Phalodi |
| Ajmer | Ajmer | Ajmer · Beawar · Nagaur · Tonk · Bhilwara |
| Bikaner | Bikaner | Bikaner · Sri Ganganagar · Hanumangarh · Churu |
| Bharatpur | Bharatpur | Bharatpur · Deeg · Dholpur · Karauli · Sawai Madhopur |
| Kota | Kota | Kota · Bundi · Baran · Jhalawar |
| Udaipur | Udaipur | Udaipur · Salumbar · Rajsamand · Chittorgarh · Banswara · Dungarpur · Pratapgarh |

## Layer 3 — Cultural Regions

**Authority:** Historical gazetteers + cultural anthropology (not a government
notification).
**Count:** 9 regions.
**Represented in:** `regional-zones.geojson` (Module 9).

Cultural regions are not a government administrative unit — they are a
historical-cultural classification rooted in the pre-independence Rajput
kingdoms and dialect boundaries. The atlas ships nine well-established regions
following gazetteer convention:

| Region | Historical seat | Dialect | Signature |
|---|---|---|---|
| Marwar | Jodhpur (Rathore) | Marwari | Mehrangarh · Marwari horse · Jodhpur handicrafts |
| Mewar | Udaipur (Sisodia) | Mewari | City of Lakes · Chittor · Nathdwara |
| Hadoti | Bundi + Kota (Hada Chauhan) | Hadoti | Chambal gorge · Kota Doria · Coaching |
| Shekhawati | Sikar / Jhunjhunu / Churu | Shekhawati | Painted havelis · Marwari trading diaspora |
| Dhundhar | Amber → Jaipur (Kachwaha) | Dhundhari | Jaipur Pink City · Jantar Mantar · Amber Fort |
| Vagad | Banswara / Dungarpur | Vagadi | Bhil culture · Mahi Bajaj Sagar · Beneshwar fair |
| Matsya | Alwar + Bharatpur | Braj/Mewati | Ancient mahajanapada · Sariska · Bharatpur |
| Godwar | Pali | Godwari (Marwari sub-dialect) | Ranakpur Jain temples · Jawai |
| Mewat | Alwar/Bharatpur west | Mewati | Meo Muslim community · Cross-border with Haryana |

**Overlap is real.** Godwar is a sub-region of Marwar. Vagad districts also
belong to Udaipur revenue division. The atlas ships all classifications and
treats them as parallel lenses.

## Layer 4 — Scheduled Areas (Fifth Schedule)

**Authority:** Constitution of India (Fifth Schedule) + Tribal Area Development
Department (TAD), GoR.
**Count:** 1 TSP block (Vagad + adjacent tribal blocks).
**Represented in:** `scheduled-areas.geojson` (Module 9).

The Fifth Schedule of the Constitution notifies specific tribal-majority regions
where PESA (Panchayats Extension to Scheduled Areas Act) applies. Rajasthan's
Fifth-Schedule area covers the Vagad Bhil-majority districts plus adjacent
tribal blocks in Udaipur, Rajsamand, Chittorgarh, Sirohi and Bhilwara.

The Tribal Sub-Plan (TSP) mandates proportionate development expenditure equal
to the ST population share within this block.

## Layer 5 — Urban local bodies

**Authority:** Government of Rajasthan Municipal Act 2009 + notifications.
**Count:** 10 municipal corporations + 4 smart cities + 15 major urban centres.
**Represented in:** `municipal-corporations.geojson` · `smart-cities.geojson` ·
`urban-centres.geojson` (Module 9).

### Municipal Corporations (10)

Following the 2019 municipal-act notifications, the three large corporations
(Jaipur, Jodhpur, Kota) were split. Current roster:

* Jaipur Greater
* Jaipur Heritage
* Jodhpur North
* Jodhpur South
* Kota North
* Kota South
* Udaipur
* Ajmer
* Bikaner
* Bharatpur

### Smart Cities Mission (4)

Selected in the India Smart Cities Mission (2015–2017):

* Jaipur (Round 1, 2015) — walled-city UNESCO conservation
* Udaipur (Round 2, 2016) — lake-front rejuvenation
* Kota (Round 3, 2017) — Chambal riverfront
* Ajmer (Round 3, 2017) — Ana Sagar rejuvenation

### Major Urban Centres (15)

Class-I towns per Census 2011 (population > 1 lakh) plus recently emerged
regional centres:

Jaipur · Jodhpur · Kota · Bikaner · Ajmer · Udaipur · Bhilwara · Alwar ·
Sri Ganganagar · Sikar · Pali · Bharatpur · Beawar · Kishangarh · Hanumangarh.

## Layer 6 — Border districts (informational)

**Authority:** Survey of India + Border Security Force (BSF).
**Count:** 6 border zones (Pakistan + Punjab + Haryana + Uttar Pradesh + Madhya Pradesh + Gujarat).
**Represented in:** `border-districts.geojson` (Module 9).

Border districts are not a formal administrative unit but a common analytical
grouping. Rajasthan has India's longest state border with Pakistan (~1070 km)
and shares interstate borders with five states. Border zones ship as the union
of districts touching each border segment.

## Where each layer fits in the Knowledge Graph

Cultural regions are the richest KG hubs — each declares its signature crops,
minerals, industries, physical features and dam/hydel anchors. Revenue divisions
and border zones are informational (no KG expansion beyond district colocation).
Urban centres, smart cities and municipal corps carry KG edges to their district,
regional zone, and industrial cluster.

## Update cadence

* **Districts** — infrequently (state gazettes at ~10-year intervals).
* **Divisions** — very rarely.
* **Cultural regions** — historical; do not change.
* **Scheduled Areas** — constitutional; require Fifth-Schedule amendment.
* **Municipal Corporations + Smart Cities + Urban Centres** — actively evolving; the roster is refreshed with each Municipal Act notification and Smart-Cities round.

When Census 2021 (or 2031) is conducted, `district-demographics.json` should be
regenerated; the rest of the module is stable.
