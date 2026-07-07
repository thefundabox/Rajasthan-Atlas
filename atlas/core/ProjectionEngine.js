/**
 * ProjectionEngine — WGS84 (EPSG:4326) ↔ SVG user-space coordinates.
 *
 * The atlas uses an "equirectangular corrected" projection: an
 * equirectangular projection with a longitude scale multiplied by
 * cos(midlatitude) so that distances look roughly correct at the state's
 * mid-latitude. This is not a rigorous conformal projection like Lambert
 * Conformal Conic — it is chosen because:
 *
 *   (a) it is trivially invertible (needed for cursor readouts, scale bar,
 *       clicks-to-lat/lon);
 *   (b) it is visually indistinguishable from LCC across an area the size
 *       of Rajasthan at atlas scales;
 *   (c) it has zero external deps and runs in <1 ms for the whole state.
 *
 * If a future module needs a true LCC (national-scale layers, etc.) it can
 * register an alternative projection via ProjectionEngine.register(name, impl).
 *
 * @typedef {[number,number]} LonLat  — [lon, lat] in degrees
 * @typedef {[number,number]} SvgXY   — [x, y] in SVG user space
 */

import { CONFIG } from './config.js';
import { round } from './util/dom.js';

export class ProjectionEngine {
  constructor(atlas) {
    this.atlas = atlas;
    this._impls = new Map();
    this._active = null;
    this.register('equirectangular-corrected', equirectangularCorrected);
  }

  /**
   * Register an alternative projection implementation.
   * @param {string} name
   * @param {(bounds, viewBox, padding) => {forward:Function, inverse:Function, meta:Object}} impl
   */
  register(name, impl) { this._impls.set(name, impl); }

  /**
   * Configure the active projection from a bounds object. Called once at boot
   * once the manifest has been loaded.
   */
  configure({ type, bounds, viewBox, padding }) {
    const factory = this._impls.get(type);
    if (!factory) throw new Error(`ProjectionEngine: unknown projection "${type}"`);
    this._active = factory(bounds, viewBox ?? CONFIG.projection.svgViewBox, padding ?? CONFIG.projection.padding);
    this._active.type    = type;
    this._active.bounds  = bounds;
    this._active.viewBox = viewBox ?? CONFIG.projection.svgViewBox;
  }

  /** Forward: [lon, lat] → [svgX, svgY]. */
  forward(lonLat)        { return this._active.forward(lonLat); }
  /** Inverse: [svgX, svgY] → [lon, lat]. */
  inverse(svgXY)         { return this._active.inverse(svgXY); }
  /** SVG viewBox array [x, y, w, h] for the projection. */
  viewBox()              { return this._active.viewBox; }
  /** Human-readable projection metadata for the status bar & about dialog. */
  meta()                 { return this._active.meta; }
  /** Bounds this projection was configured with. */
  bounds()               { return this._active.bounds; }

  /**
   * Approximate km per SVG user-unit — used by the scale bar.
   */
  kmPerSvgUnit() {
    const b = this._active.bounds;
    const lat0 = (b.minLat + b.maxLat) / 2;
    const kmPerDegLon = CONFIG.earth.kmPerDegLonEquator * Math.cos(lat0 * Math.PI / 180);
    // Move 1° of longitude and see how many SVG units it takes.
    const [x0] = this.forward([b.minLon, lat0]);
    const [x1] = this.forward([b.minLon + 1, lat0]);
    const svgPerDeg = Math.abs(x1 - x0);
    return kmPerDegLon / svgPerDeg;
  }
}

/**
 * Equirectangular projection with cosine correction at midlatitude.
 * @param {{minLon:number,maxLon:number,minLat:number,maxLat:number}} bounds
 * @param {[number,number,number,number]} viewBox
 * @param {number} padding
 */
function equirectangularCorrected(bounds, viewBox, padding) {
  const [vbX, vbY, vbW, vbH] = viewBox;
  const lat0 = (bounds.minLat + bounds.maxLat) / 2;
  const kx = Math.cos(lat0 * Math.PI / 180);
  const spanX = (bounds.maxLon - bounds.minLon) * kx;
  const spanY = (bounds.maxLat - bounds.minLat);
  const scale = Math.min((vbW - 2 * padding) / spanX, (vbH - 2 * padding) / spanY);
  const ox = vbX + padding + ((vbW - 2 * padding) - spanX * scale) / 2;
  const oy = vbY + padding + ((vbH - 2 * padding) - spanY * scale) / 2;

  return {
    forward([lon, lat]) {
      return [
        round(ox + (lon - bounds.minLon) * kx * scale, 3),
        round(oy + (bounds.maxLat - lat) * scale,      3),
      ];
    },
    inverse([x, y]) {
      return [
        round(bounds.minLon + (x - ox) / (kx * scale), 5),
        round(bounds.maxLat - (y - oy) / scale,        5),
      ];
    },
    meta: {
      description: 'Equirectangular projection with cosine correction at midlatitude',
      lat0, scale, ox, oy, kx,
    },
  };
}
