/**
 * SpatialIndex — a bbox QuadTree.
 *
 * Purpose:
 *   - fast search  (bounding-box overlap in O(log n) expected)
 *   - nearest feature
 *   - hit testing  (find candidate features under a point)
 *   - zoom queries (features whose bbox intersects the current viewport)
 *
 * Coordinates are in EPSG:4326 lon/lat, matching the DataManager's storage.
 * Features are inserted by their bbox — the exact-geometry test is done by the
 * caller after the shortlist returns.
 *
 * Deliberately simple: node holds up to CONFIG.spatialIndex.maxPointsPerNode
 * entries before subdividing; max depth prevents pathological splits.
 */

import { CONFIG } from './config.js';

export class SpatialIndex {
  /**
   * @param {[number,number,number,number]} bounds [minX, minY, maxX, maxY]
   */
  constructor(bounds, opts = {}) {
    this._root  = new QuadNode(bounds, 0);
    this._opts  = {
      maxPointsPerNode: opts.maxPointsPerNode ?? CONFIG.spatialIndex.maxPointsPerNode,
      maxDepth:         opts.maxDepth         ?? CONFIG.spatialIndex.maxDepth,
    };
    this._entries = new Map();  // id → {bbox, feature}
  }

  /** Number of entries. */
  size() { return this._entries.size; }
  /** Rebuild-in-place — cheap re-insert. */
  clear() { this._root._children = null; this._root._items = []; this._entries.clear(); }

  /**
   * Insert a feature by its bbox.
   * @param {string} id
   * @param {[number,number,number,number]} bbox  [minLon, minLat, maxLon, maxLat]
   * @param {Object} feature  payload returned by search()
   */
  insert(id, bbox, feature) {
    const entry = { id, bbox, feature };
    this._entries.set(id, entry);
    this._root.insert(entry, this._opts);
  }

  /** Bulk insert. */
  bulk(items) { for (const it of items) this.insert(it.id, it.bbox, it.feature); }

  /**
   * Return all features whose bbox intersects the query bbox.
   * A feature that straddles a quadtree split is stored in multiple nodes;
   * we dedupe by entry id before returning so callers see each feature once.
   * @param {[number,number,number,number]} bbox
   */
  query(bbox) {
    const raw = [];
    this._root.query(bbox, raw);
    const seen = new Set();
    const out = [];
    for (const e of raw) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e.feature);
    }
    return out;
  }

  /**
   * Return all features whose bbox contains the given point.
   */
  hit(lon, lat) {
    return this.query([lon, lat, lon, lat]);
  }

  /**
   * Nearest feature by centroid distance (linear scan through query result).
   * For k-NN across large datasets, this would need refinement — plenty for
   * this atlas's scale.
   */
  nearest(lon, lat, radius = Infinity) {
    const bbox = [lon - radius, lat - radius, lon + radius, lat + radius];
    const raw = this._root.queryRaw(bbox);
    const seen = new Set();
    let best = null; let bestD = Infinity;
    for (const e of raw) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const cx = (e.bbox[0] + e.bbox[2]) / 2;
      const cy = (e.bbox[1] + e.bbox[3]) / 2;
      const d  = Math.hypot(cx - lon, cy - lat);
      if (d < bestD) { bestD = d; best = e.feature; }
    }
    return best;
  }
}

/* ------------------------------------------------------------------------- */
/*  Node — internal                                                          */
/* ------------------------------------------------------------------------- */

class QuadNode {
  constructor(bounds, depth) {
    this._bounds   = bounds;   // [minX, minY, maxX, maxY]
    this._depth    = depth;
    this._items    = [];
    this._children = null;
  }

  insert(entry, opts) {
    if (!bboxIntersects(this._bounds, entry.bbox)) return;
    if (this._children) {
      for (const ch of this._children) ch.insert(entry, opts);
      return;
    }
    this._items.push(entry);
    if (this._items.length > opts.maxPointsPerNode && this._depth < opts.maxDepth) {
      this._split(opts);
    }
  }

  _split(opts) {
    const [x0, y0, x1, y1] = this._bounds;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    this._children = [
      new QuadNode([x0, y0, mx, my], this._depth + 1),
      new QuadNode([mx, y0, x1, my], this._depth + 1),
      new QuadNode([x0, my, mx, y1], this._depth + 1),
      new QuadNode([mx, my, x1, y1], this._depth + 1),
    ];
    const items = this._items; this._items = [];
    for (const it of items) for (const ch of this._children) ch.insert(it, opts);
  }

  query(bbox, out) {
    if (!bboxIntersects(this._bounds, bbox)) return;
    if (this._children) { for (const ch of this._children) ch.query(bbox, out); return; }
    for (const it of this._items) {
      if (bboxIntersects(it.bbox, bbox)) out.push(it);
    }
  }
  queryRaw(bbox) { const out = []; this.query(bbox, out); return out; }
}

function bboxIntersects(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}
