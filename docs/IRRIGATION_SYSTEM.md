# Irrigation System

Rajasthan's agriculture is defined by *where the water comes from*. This module ships three interlocking layers — Irrigation Sources, Major Canals (real OSM polylines), and Command Areas.

## Irrigation Sources — 6 types

Each district's dominant irrigation source is documented in the Agricultural Census 2015-16 by the Directorate of Economics & Statistics. The 6 categories:

* **Canal irrigation** — dominant in the IGNP + Gang command; extensive in the Chambal command. ~30 % of state's irrigated area.
* **Tube-well irrigation** — dominant in the eastern plain and Shekhawati; largest single source (~55 %) — but at the cost of chronic groundwater over-draft.
* **Open wells** — traditional in the Aravalli valleys and southern tribal districts; shallow aquifers.
* **Tank irrigation** — small but locally vital in southern uplands (Udaipur, Rajsamand, Sirohi).
* **Lift irrigation** — Chambal + Mahi commands; delivers water above the natural river level to command farmland.
* **Rain-fed** — western arid districts, southern tribal fringes. Around half the state's cultivated area still depends on the SW monsoon alone.

## Major Canals — real OSM geometry

Three canals ship as authoritative OSM polylines:

### Indira Gandhi Canal (IGNP)

**649 km main canal** from the Harike headworks on the Sutlej + Beas confluence, through Rajasthan's arid western districts.

* Commissioned 1958 (initiated) · 1961 (first water) · fully operational 1990s
* Serves ~19 lakh ha ultimate CCA
* Signature crops: **wheat · cotton · mustard · kinnow · guar**
* Districts served: Sri Ganganagar · Hanumangarh · Bikaner · Churu · Jodhpur · Jaisalmer · Barmer · Phalodi

Originally the Rajasthan Canal Project. Renamed the **Indira Gandhi Nahar Pariyojana** in 1984. The single largest transformation of Thar agriculture in Indian history.

### Gang Canal

**Rajasthan's first modern irrigation canal** — commissioned in 1927 by Maharaja Ganga Singh of Bikaner. Fed by the Sutlej via Firozpur headworks.

* CCA ~3.5 lakh ha
* Signature crops: wheat · cotton · mustard · gram
* Serves Sri Ganganagar

The canal inaugurated modern agriculture in northern Rajasthan two decades before independence.

### Gang Canal Link Channel

A distributary of the Gang system serving local commands in Sri Ganganagar.

## Command Areas — 5 shipped

Command areas are the *administrative footprint of irrigation* — the districts (or district portions) that receive assured canal water. Rajasthan Water Resources Department + Command Area Development Department gazette these boundaries.

| Command | Source | CCA | Signature crops | Districts served |
|---|---|---:|---|---|
| **IGNP Command** | Sutlej + Beas via Harike | ~15.2 lakh ha | Wheat · Cotton · Mustard · Kinnow · Guar | Sri Ganganagar · Hanumangarh · Bikaner · Churu · Jodhpur · Jaisalmer · Barmer · Phalodi |
| **Gang Canal Command** | Sutlej via Firozpur | ~3.5 lakh ha | Wheat · Cotton · Mustard · Guar · Gram | Sri Ganganagar |
| **Chambal Command** | Kota Barrage (Gandhi Sagar → RPS → Jawahar Sagar) | ~2.3 lakh ha | Wheat · Soybean · Mustard · Gram · Orange · Coriander | Kota · Baran · Bundi |
| **Mahi Bajaj Sagar Command** | Mahi Bajaj Sagar reservoir | ~0.8 lakh ha | Wheat · Maize · Cotton · Gram | Banswara · Dungarpur |
| **Bisalpur Command** | Bisalpur reservoir on the Banas | ~0.8 lakh ha + drinking-water for Jaipur–Ajmer–Tonk | Wheat · Mustard · Gram | Tonk · Ajmer · Beawar · Jaipur |

## The command → crop syndrome

Every command has a signature crop syndrome that the KnowledgeGraph makes explicit:

* **IGNP** → wheat + cotton + mustard + kinnow. Canal irrigation defines the whole cropping system.
* **Chambal** → wheat + soybean (Vertisol-suitable + canal water) + orange in Jhalawar.
* **Mahi** → maize (tribal staple) + wheat + cotton in the humid south-east.
* **Bisalpur** → mustard-dominant; also drinking-water for three cities.

Click any canal / command in the atlas and the whole syndrome pulses — canal ↔ command ↔ crops ↔ climate ↔ soil.

## Sources

Every attribute is cited via `properties.source`:

* **RWRD** — Rajasthan Water Resources Department project register (canal + dam capacities, commissioning dates)
* **CADD** — Command Area Development Department (command-area district mapping)
* **CWC** — Central Water Commission Dam Register (dam capacities, heights)
* **Agricultural Census 2015-16** — dominant irrigation source per district
* **OSM** — real canal polyline geometry (waterway=canal)
