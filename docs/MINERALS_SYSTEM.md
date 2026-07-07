# Minerals System

Rajasthan is India's most mineralised state — the **#1 producer of lead, zinc, silver, marble, gypsum, wollastonite, rock-phosphate**, and among the top for cement-grade limestone. This module ships two layers that map the mineral fabric: **Mineral Belts** (10) and **Building Stones** (6).

## Mineral Belts — 10 shipped

Each belt is the union of the districts where it dominates. Every feature carries `genesis` (why the mineral is there), `economic` (why it matters), and `districts_included`.

| Belt | Genesis | Signature districts | Economic weight |
|---|---|---|---|
| **Lead-Zinc** | SEDEX in Aravalli SG carbonates | Udaipur · Rajsamand · Bhilwara · Chittorgarh | ~99 % of India's lead + zinc |
| **Copper** | Volcanogenic + shear-hosted in Delhi SG | Sikar · Jhunjhunu | India's largest primary copper source |
| **Marble** | Metamorphism of Aravalli carbonates | Nagaur · Rajsamand · Ajmer · Sirohi | ~90 % of India's marble reserves |
| **Granite** | Malani Igneous Suite + Erinpura intrusions | Jalore · Sirohi · Barmer | India's premier granite export cluster |
| **Limestone** | Vindhyan + Marwar platform sediments | Chittorgarh · Kota · Bundi · Nagaur · Jodhpur | Feeds cement industry — top-3 producing state |
| **Gypsum** | Marwar Supergroup evaporites | Nagaur · Bikaner · Barmer · Jaisalmer | ~99 % of India's gypsum |
| **Lignite** | Palaeogene sedimentary basin coals | Barmer · Bikaner | Feeds lignite thermal power plants |
| **Phosphate** | Stromatolitic phosphorite (Aravalli SG) | Udaipur · Salumbar · Jaisalmer | Jhamarkotra = India's largest rock-phosphate mine |
| **Wollastonite** | Contact-metamorphic aureoles | Sirohi · Sikar · Ajmer | ~100 % of India's wollastonite |
| **Sandstone** | Vindhyan + Marwar sandstones | Kota · Dholpur · Karauli · Jodhpur · Nagaur | Kota Stone + Dholpur beige + Jodhpur red |

## Building Stones — 6 dimension-stone belts

Same districts as the mineral belts but classified by their commercial dimension-stone identity: **Marble · Granite · Sandstone · Slate · Quartzite · Limestone**.

Each stone entry lists `flagship` (representative quarry), `colours`, `heritage` (buildings famously made from it):

* **Marble** — flagship Makrana (source of the Taj Mahal), Rajsamand green, Kishangarh trading hub
* **Granite** — Jalore pink, Barmer grey, Sirohi rose — modern export cluster
* **Sandstone** — Dholpur beige, Karauli red, Jodhpur red, Kota Stone — Red Fort Delhi + Umaid Bhawan built from these
* **Slate** — Alwar & Chittorgarh — roofing + flooring
* **Quartzite** — Delhi SG ridges (Alwar, Sikar, Jhunjhunu, Jaipur) — construction aggregate
* **Limestone (dimension)** — Kota Stone + Jaisalmer yellow limestone (Sonar Fort)

## The chain — every belt has a rock-system parent and a mining-cluster child

Click **Marble Belt** → **Makrana Mine** (signature) · **Kishangarh** (signature) · **Nagaur–Ajmer Marble Cluster** (signature) · **Metamorphic rocks** (defines) · **Marble as building stone** (defines) · **Aravalli SG** (colocated).

Click **Copper Belt** → **Khetri Copper Complex** (signature) · **Khetri Copper Cluster** (signature) · **Delhi Supergroup** (defines the belt).

Click **Gypsum Belt** → **Nagaur Gypsum** (signature) · **Marwar Supergroup** (defines) · **Nagaur–Ajmer cluster** (colocated).

The Knowledge Graph now tracks 4 edge types per belt: `defines` (province → belt), `signature` (belt → mine + cluster), `colocated` (belt ↔ other belts nearby), and `proximity` (adjacent belts).

## Sources

* **DMG Rajasthan** — Directorate of Mines & Geology district-level mineral inventory
* **IBM** — Indian Bureau of Mines Indian Mineral Yearbook (production statistics)
* **RSMDC** — Rajasthan State Mineral Development Corporation (public-sector mines)
* **HZL, HCL** — Hindustan Zinc / Hindustan Copper public disclosures

Every belt polygon is district-approximated. When authoritative GSI 1:50 000 belt polygons become available, drop them into `atlas/data/mineral-belts.geojson` and re-run — no code change.
