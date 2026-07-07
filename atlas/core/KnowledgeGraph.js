/**
 * KnowledgeGraph — declarative typed relations across atlas layers.
 *
 * Unlike RelationsGraph (which infers relations from shared basin / district /
 * name-root), the KnowledgeGraph loads an authored declarative edge list from
 * `atlas/data/knowledge-graph.json` and exposes typed traversal:
 *
 *   Atlas.knowledge.of(feature)      → { defines: [...], colocated: [...],
 *                                        signature: [...], proximity: [...] }
 *   Atlas.knowledge.cluster(feature) → flat, deduped, ranked list for
 *                                      cross-highlighting.
 *
 * The graph is undirected — an edge declared from A→B is queryable in either
 * direction. Symmetry is applied at load time.
 *
 * Zero core-engine surface. Instantiated in AtlasCore, populated at
 * `atlas:ready`. Reads via public Atlas.layers / Atlas.data APIs.
 */

const TYPE_WEIGHT = {
  signature:  6,
  defines:    5,
  colocated:  4,
  proximity:  3,
};

export class KnowledgeGraph {
  constructor(atlas) {
    this.atlas = atlas;
    this._edges  = new Map();   // sourceKey → Array<{ target, targetKey, type }>
    this._loaded = false;
    atlas.bus.on('atlas:ready', () => this._load());
  }

  async _load() {
    if (this._loaded) return;
    try {
      const raw = await fetch('atlas/data/knowledge-graph.json').then(r => r.json());
      for (const edgeGroup of raw.edges) {
        const src = edgeGroup.source;
        for (const rel of edgeGroup.related) {
          this._pushEdge(src, rel.target, rel.type);
          this._pushEdge(rel.target, src, rel.type);   // undirected
        }
      }
      this._loaded = true;
      this.atlas.bus.emit('knowledge:built', { edges: this._edges.size });
    } catch (err) {
      console.warn('[KnowledgeGraph] no knowledge-graph.json; skipping', err);
    }
  }

  _pushEdge(src, tgt, type) {
    if (!this._edges.has(src)) this._edges.set(src, []);
    this._edges.get(src).push({ target: tgt, type });
  }

  /**
   * Resolve every edge's target-feature-id into (layerId, featureId, feature)
   * by scanning every layer's features until one has the matching id.
   * Result cached per source.
   */
  _resolveTarget(targetId) {
    if (!this._targetCache) this._targetCache = new Map();
    if (this._targetCache.has(targetId)) return this._targetCache.get(targetId);
    for (const cfg of this.atlas.layers.list()) {
      const feat = this.atlas.data.getFeature(cfg.id, targetId);
      if (feat) {
        const resolved = { layerId: cfg.id, featureId: targetId, feature: feat };
        this._targetCache.set(targetId, resolved);
        return resolved;
      }
    }
    this._targetCache.set(targetId, null);
    return null;
  }

  /**
   * @param {AtlasFeature} feature
   * @returns {Object<edgeType, Array<{layerId, featureId, feature}>>}
   */
  of(feature) {
    const key = feature.id;
    const edges = this._edges.get(key) ?? [];
    const grouped = {};
    for (const e of edges) {
      const t = this._resolveTarget(e.target);
      if (!t) continue;
      if (!grouped[e.type]) grouped[e.type] = [];
      grouped[e.type].push(t);
    }
    return grouped;
  }

  /**
   * Flat, deduped, weight-ranked list of every feature semantically related to
   * this one. Used by the cross-highlight subscriber to pulse them on the map.
   */
  cluster(feature) {
    const grouped = this.of(feature);
    const seen = new Map();
    for (const [type, list] of Object.entries(grouped)) {
      const w = TYPE_WEIGHT[type] ?? 1;
      for (const t of list) {
        const key = `${t.layerId}::${t.featureId}`;
        const prev = seen.get(key);
        if (!prev || prev.weight < w) {
          seen.set(key, { ...t, type, weight: w });
        }
      }
    }
    return [...seen.values()].sort((a, b) => b.weight - a.weight);
  }
}
