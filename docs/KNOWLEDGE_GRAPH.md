# Knowledge Graph

The Rajasthan Digital Atlas ships two relationship engines, in parallel:

* **RelationsGraph** — infers relations from shared basin / district / division / name-root at boot. Zero curation. Every layer inherits it automatically.
* **KnowledgeGraph** — reads a *declarative* edge list from `atlas/data/knowledge-graph.json`. Every edge is manually authored so it can encode *typed* relationships that no algorithm would discover:

  * "Arid Climate **defines** the Thar Desert polygon"
  * "Dry Deciduous Forest is the **signature** vegetation of Ranthambore Tiger Reserve"
  * "Severe Desertification is **colocated** with Very-High Drought vulnerability"

The two graphs coexist because they answer different questions.

## Edge types

| Type | Weight | Meaning |
|---|---:|---|
| `signature` | 6 | This feature is the flagship spatial expression of the source. (Dry Deciduous Forest → Sariska Tiger Reserve.) |
| `defines`   | 5 | The source causes the target's geometry / character. (Arid Climate → Thar Desert extent.) |
| `colocated` | 4 | The two features share extent. (Arid Climate → Desert Soils.) |
| `proximity` | 3 | The two features are geographically neighbouring or hydrologically linked. (Alluvial Soils → Chambal River.) |

Weights matter because `cluster()` deduplicates: if two edges connect the same target, the higher-weighted type wins.

## File format

```jsonc
{
  "version": "1.0",
  "generated": "2026-07-06",
  "edges": [
    {
      "source": "climate-regions-arid",
      "related": [
        { "target": "thar-main",                 "type": "defines" },
        { "target": "rainfall-lt-200",           "type": "colocated" },
        { "target": "soil-types-desert",         "type": "colocated" },
        { "target": "vegetation-thorn-forest",   "type": "colocated" },
        { "target": "desert-np",                 "type": "signature" }
      ]
    }
  ]
}
```

* Source and target IDs are **canonical feature ids** — the same `feat.id` values the atlas uses everywhere.
* Edges are **undirected**. At load time the graph adds the reverse edge automatically. You never need to declare both directions.
* Every edge is scoped by feature id, not by layer id. If two layers happen to have features with the same id, the resolver returns whichever it finds first — so keep ids globally unique (which they already are — layer prefixes prevent collisions).

## Public API

```js
Atlas.knowledge.of(feature)
// → {
//     signature: [{layerId, featureId, feature}, ...],
//     defines:   [...],
//     colocated: [...],
//     proximity: [...]
//   }
// Missing edge types are omitted from the result.

Atlas.knowledge.cluster(feature)
// → [
//     { layerId, featureId, feature, type, weight },
//     ...
//   ]
// Flat, deduped, weight-sorted. Used by cross-highlighting and by the
// "Related features" section of the thematic detail panel.
```

## How cross-highlighting works

In `ThematicEditorial.js`:

```js
Atlas.bus.on('selection:changed', ({ feature }) => {
  clearHighlight(lastHighlight);
  const cluster = Atlas.knowledge.cluster(feature);
  lastHighlight = cluster.map(r => {
    Atlas.renderer.updateFeatureStyle(r.layerId, r.featureId,
      { addClass: 'related-highlight' });
    return { layerId: r.layerId, featureId: r.featureId };
  });
});
```

The `.related-highlight` CSS applies a three-cycle `@keyframes pulse` animation over 1.2 seconds — the map briefly draws the reader's attention to every semantically related feature, then settles.

## Extending

Adding a new relationship is a one-line change to `atlas/data/raw/BUILD_CLIMATE.py`'s `edges` list. Re-run the script; `atlas/data/knowledge-graph.json` regenerates. Reload the page — the new relationship is live.

**Anti-pattern:** do not hardcode relationships in JS. Every relationship is declarative. The `KnowledgeGraph.js` engine is intentionally dumb; it only walks the JSON edge list. This means:

* Reviewers can audit relationships without reading code.
* Non-programmers can extend the graph.
* Regenerating the data file is deterministic — same input, same output.

## Design choices

**Why not compute everything algorithmically?** Because some of the most important relationships require domain knowledge. The RelationsGraph correctly finds that Ranthambore NP and Bandh Baretha WLS share Bharatpur division. But it will never find that "Dry Deciduous Forest is the signature vegetation of the Aravalli tiger corridor" — that's an editorial claim requiring a botanist and a wildlife biologist. The KnowledgeGraph captures those.

**Why undirected?** Because a reader arriving at Sariska TR should be able to find Dry Deciduous Forest as easily as a reader arriving at Dry Deciduous Forest can find Sariska. Directionality would force us to declare every edge twice.

**Why only four edge types?** Enough resolution to distinguish "this defines that" from "these happen to overlap" from "this is the flagship example of that" — but few enough that a reviewer can hold them in mind.

## Statistics

Current graph size:

* **16** source features with authored edges
* **52** unique typed edges (undirected — 104 when counting both directions)

Coverage:
* Every climate region → its downstream signature features
* Every major vegetation type → its signature protected areas
* Soil families → co-located agro-climatic zones + physiography
* Rainfall extremes → downstream water and drought signatures
* Drought / desertification syndromes → their shared causes

Gap: hydrology → water-quality-adjacent species, human settlement → transport routes, historical → cultural. These arrive when Modules 5+ are built.
