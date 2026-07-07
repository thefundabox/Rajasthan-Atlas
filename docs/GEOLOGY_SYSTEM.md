# Geology System

Rajasthan is a natural geological classroom — it exposes rocks spanning **~3 billion years of Earth history**, from the Archaean cratonic basement to Quaternary aeolian dunes. The Geology system ships two layers that together tell that story: **Geological Provinces** and **Rock Types**.

## Geological Provinces — 8 shipped

Each province is the union of the districts where it dominantly outcrops. Every feature carries `age`, `lithology`, `formation`, and `significance` in properties.

| Province | Age | Signature lithology | Where in Rajasthan |
|---|---|---|---|
| **Bhilwara Supergroup (Archaean craton)** | ~3.3–2.5 Ga | Banded Gneissic Complex, granulites | Bhilwara · Rajsamand · Ajmer |
| **Aravalli Supergroup** | ~2.5–1.6 Ga | Metasediments, phosphorites, dolomites | Udaipur · Rajsamand · Chittorgarh · Bhilwara · Dungarpur |
| **Delhi Supergroup** | ~1.4–1.0 Ga | Metasediments + main Aravalli ridge | Sirohi · Ajmer · Sikar · Jhunjhunu · Alwar · Jaipur |
| **Malani Igneous Suite** | ~750 Ma | Rhyolite + granite (anorogenic magmatism) | Jalore · Sirohi · Barmer · Balotra · Pali |
| **Marwar Supergroup** | ~800–500 Ma | Sandstones + limestones + evaporites | Nagaur · Bikaner · Jaisalmer · Jodhpur |
| **Vindhyan Supergroup** | ~1.4–0.6 Ga | Sandstones + limestones (Kota Stone) | Kota · Bundi · Baran · Chittorgarh · Karauli |
| **Deccan Trap (SE edge)** | ~65 Ma | Basalt flows | Jhalawar · Baran (edge) |
| **Quaternary Alluvium + Aeolian** | < 10 000 yr | River alluvium + sand dunes | Eastern plains + Thar |

## Rock Types — 5 groups

* **Igneous** — Malani rhyolite, Jalore-Siwana granite, Erinpura granite
* **Metamorphic** — Aravalli phyllite, Delhi quartzite, Makrana marble, Alwar slate
* **Sedimentary** — Vindhyan sandstone, Kota Stone limestone, Jodhpur sandstone, Marwar evaporites
* **Alluvial (Quaternary)** — Banas–Chambal alluvium, Yamuna sub-basin sands
* **Aeolian (Wind-borne desert)** — Barchans, longitudinal dunes, Thar sand sheets

Each rock feature carries `engineering` properties, `weathering` characteristics, and `major_examples`.

## The chain — every province defines its downstream story

The Knowledge Graph makes this explicit. Click **Aravalli Supergroup** in the atlas and the cluster returns:

* **Zawar Mines · Rajpura Dariba · Jhamarkotra** — signature mines
* **Lead-Zinc belt · Phosphate belt** — the belts the province *defines*
* **Metamorphic rocks** — the rock type the province defines
* **Marble belt** — colocated (Aravalli carbonates → marble)
* **Aravalli Hills physiographic region** — same body of rock, viewed as landform

Click **Delhi Supergroup** → Rampura Agucha + Khetri + Copper belt + Aravalli main axis.

Click **Malani Igneous Suite** → Granite belt + Jalore granite mine + igneous rocks + granite as a building stone.

Click **Marwar Supergroup** → Gypsum belt + Nagaur gypsum + Jodhpur red sandstone.

Click **Vindhyan Supergroup** → Kota Stone + Limestone belt + Sandstone belt.

Click **Deccan Trap edge** → Igneous rocks + **Black soils** (basalt weathering!) + SE Plateau region.

Click **Quaternary Aeolian** → Thar Desert + Desert soils.

Every geological province is now the *root* of a causal chain the reader can trace with clicks. That is the pedagogical goal of Module 6.

## Sources

* **GSI** — Geological Survey of India stratigraphy of Rajasthan; province boundaries and lithology
* **DMG Rajasthan** — Directorate of Mines & Geology geological memoir

Every polygon is district-approximated (`geometryQuality: "generalised (district-approximated)"`). Real GSI 1:50 000 geological polygons exist in the National Geoscience Data Repository but require registration + institutional access — swap them in when available and re-run.
