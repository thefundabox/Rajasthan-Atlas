# Mining System

Three mining-focused layers ship in Module 6 — **15 Major Mines** as points, **6 Mining Clusters** as district groupings, and the **Petroleum & Gas** layer (Barmer Basin polygon + 4 field points).

## Major Mines — 15 shipped

Each mine is a point feature at documented coordinates (RWRD / operator public disclosures / IBM). Every one carries `mineral`, `operator`, `district`, `status`, `production` (where public), and multi-fact `notes.facts`.

### Lead-Zinc-Silver (Hindustan Zinc Ltd. cluster)

* **Rampura Agucha** — Bhilwara — *world's largest single zinc mine* (~4 Mt ore/yr). Discovered by GSI 1977.
* **Zawar Complex** — Udaipur — one of the *world's oldest zinc-smelting sites* (~2 500 years). Retort smelting evidence from 12th century CE.
* **Rajpura Dariba** — Rajsamand — SEDEX Zn-Pb-Ag in Aravalli SG dolomite.
* **Sindesar Khurd** — Rajsamand — HZL's *largest silver-producing mine*.
* **Kayad** — Ajmer — newest of the HZL cluster (2013).

### Copper

* **Khetri Copper Complex** — Jhunjhunu — India's largest primary copper source (HCL underground mines + smelter).

### Marble

* **Makrana Marble Quarries** — Nagaur — supplied the marble for the **Taj Mahal (1632–1653)**, Victoria Memorial, and Sabarmati Ashram interiors.
* **Kishangarh Marble Cluster** — Ajmer — Asia's largest marble *mandi* (trading centre).

### Phosphate

* **Jhamarkotra Rock-Phosphate** — Udaipur — India's *largest rock-phosphate mine*; stromatolitic phosphorite ~1.6 Ga old.

### Lignite

* **Kapurdi–Jalipa Lignite** — Barmer — fuels the 1080 MW Raj West thermal plant.
* **Palana + Gurha Lignite** — Bikaner — one of India's oldest identified lignite reserves (mid-19th century). Feeds Barsingsar thermal plant.

### Building & Industrial

* **Nagaur Gypsum Belt** — India's largest gypsum-producing district; feeds cement + SSP fertiliser plants.
* **Jalore Granite Cluster** — Malani Igneous Suite exports.
* **Kota Stone Quarries** — Ramganj Mandi + Suket, Kota — Vindhyan limestone dimension stone.

## Mining Clusters — 6 shipped

Each cluster is a district grouping representing a *mining economy*, not a single mine:

1. **Udaipur Zinc-Phosphate Cluster** — HZL + RSMDC — largest formal-sector mineral employer in the state
2. **Nagaur–Ajmer Marble Cluster** — thousands of small quarries + Kishangarh mandi
3. **Khetri Copper Cluster** — HCL smelter + concentrator township
4. **Barmer Oil–Lignite Cluster** — Cairn Vedanta + RSMDC + granite quarries
5. **Kota Limestone–Sandstone Cluster** — Ramganj Mandi + Suket + cement plants at Chittorgarh + Kota
6. **Jodhpur–Dholpur Sandstone Cluster** — traditional quarrying towns of Marwar

Each cluster carries `dominant` minerals, `employment` significance, and `issues` (environmental concerns) — the three axes of a mining economy.

## Petroleum & Gas

* **Barmer Basin** — generalised polygon covering the RJ-ON-90/1 block. India's largest onshore oil discovery since 1985 (Cairn Energy, 2004; commercial production 2009). Contributes ~25 % of India's domestic crude.
* **Mangala Field** — point — Cairn/Vedanta. Peak ~150 000 barrels/day.
* **Bhagyam + Aishwariya Fields** — Cairn secondary fields.
* **Raageshwari Gas Field** — Barmer basin gas + condensate.
* **Jaisalmer Basin Gas** — ONGC (Manihari Tibba etc.) — supplies local power stations.

## The complete chain

Click **Rampura Agucha Mine** and the Knowledge Graph cluster returns:

* **Lead-Zinc belt** (colocated) · **Udaipur Zinc-Phosphate Cluster** (colocated)
* **Delhi Supergroup** (colocated — the province hosting the deposit)
* Plus every other HZL mine (via belt membership)

Click **Barmer Basin** → the four field points + Barmer-Oil-Lignite Cluster + Marwar Supergroup + sedimentary rocks.

Click **Kota Stone** → Sandstone belt + Vindhyan Basin + Sandstone as a building stone + Kota Limestone-Sandstone Cluster.

Every mine now sits inside a **five-level hierarchy** that the reader can traverse:

> **Rock System → Geological Province → Mineral Belt → Mine → Mining Cluster → Industry**

## Sources

Every point coordinate is cited to its operator (Hindustan Zinc, Hindustan Copper, RSMDC, Cairn Vedanta, ONGC) or to IBM's Indian Mineral Yearbook + DMG Rajasthan's mine register. When a coordinate is in doubt, that mine is not shipped in the atlas — never invented.
