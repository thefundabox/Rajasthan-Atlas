/**
 * Renderer — geometry → SVG.
 *
 * The renderer knows about GeoJSON geometry types and CSS classes. It does NOT
 * know about districts, parks, rivers, tigers, or specific feature types. Every
 * feature-specific decision is passed in as (a) a style function that returns
 * classes + attributes, or (b) as declarative dataset attributes on the emitted
 * <path>.
 *
 * Public surface:
 *   const g = renderer.renderLayer({ id:'districts', features, style })
 *   renderer.attachTo(svgRoot)               // mounts one <g> per layer
 *   renderer.updateFeatureStyle(id, cls)     // toggle classes on a single path
 *   renderer.removeLayer(id)
 */

import { CONFIG } from './config.js';
import { svgEl } from './util/dom.js';

export class Renderer {
  constructor(atlas) {
    this.atlas   = atlas;
    this._svg    = null;
    this._root   = null;                   // <g id="atlas-layers">
    this._layers = new Map();              // layerId → { g, paths: Map<featureId, path> }
  }

  /** Mount into a host SVG element and prepare the layer container. */
  attachTo(svg) {
    this._svg = svg;
    const vb  = this.atlas.projection.viewBox();
    svg.setAttribute('viewBox', vb.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this._root = svgEl('g', { id: 'atlas-layers' });
    svg.append(this._root);
  }

  /**
   * Render a layer of features.
   * @param {{id:string, features:AtlasFeature[], style?:function, zIndex?:number}} spec
   * @returns {SVGGElement}
   */
  renderLayer(spec) {
    if (this._layers.has(spec.id)) this.removeLayer(spec.id);

    const g = svgEl('g', {
      id: `layer-${spec.id}`,
      'data-layer': spec.id,
      class: `layer layer-${spec.id}`,
    });
    const paths = new Map();

    for (const feat of spec.features) {
      const d = this._featureToPathD(feat);
      if (!d) continue;
      const style = spec.style ? spec.style(feat) : {};
      const path = svgEl('path', {
        id:              `${spec.id}--${feat.id}`,
        'data-layer':    spec.id,
        'data-feature':  feat.id,
        'data-name':     feat.properties?.name ?? '',
        'data-division': feat.properties?.division ?? '',
        'data-new':      feat.properties?.newDistrict ? 'true' : 'false',
        class:           ['feature', ...(style.classes ?? [])].join(' '),
        d,
        ...(style.attrs ?? {}),
      });
      g.append(path);
      paths.set(feat.id, path);
    }

    this._root.append(g);
    this._layers.set(spec.id, { g, paths, spec });
    return g;
  }

  /** Toggle a class on one feature's path. Used by InteractionManager for hover/selection. */
  updateFeatureStyle(layerId, featureId, { addClass, removeClass } = {}) {
    const layer = this._layers.get(layerId);
    const path = layer?.paths.get(featureId);
    if (!path) return;
    if (removeClass) for (const c of asArr(removeClass)) path.classList.remove(c);
    if (addClass)    for (const c of asArr(addClass))    path.classList.add(c);
  }

  /** Set visibility for an entire layer. */
  setLayerVisible(layerId, visible) {
    const layer = this._layers.get(layerId);
    if (!layer) return;
    layer.g.style.display = visible ? '' : 'none';
    layer.g.classList.toggle('layer-active', !!visible);
  }

  /** Move a layer's <g> to the top / bottom of the render order. */
  setLayerOrder(layerId, position) {
    const layer = this._layers.get(layerId);
    if (!layer) return;
    if (position === 'top')    this._root.append(layer.g);
    if (position === 'bottom') this._root.prepend(layer.g);
  }

  removeLayer(layerId) {
    const layer = this._layers.get(layerId);
    if (!layer) return;
    layer.g.remove();
    this._layers.delete(layerId);
  }

  /** Enumerate layers currently rendered. */
  layers() { return [...this._layers.keys()]; }

  /* --------------------------------------------------------------------- */
  /*  Geometry → SVG path "d" string                                       */
  /* --------------------------------------------------------------------- */

  _featureToPathD(feat) {
    const g = feat.geometry;
    if (!g) return '';
    const proj = this.atlas.projection;
    switch (g.type) {
      case 'Polygon':          return this._polygonD(g.coordinates, proj);
      case 'MultiPolygon':     return g.coordinates.map(p => this._polygonD(p, proj)).join('');
      case 'LineString':       return this._lineD(g.coordinates, proj);
      case 'MultiLineString':  return g.coordinates.map(l => this._lineD(l, proj)).join('');
      case 'Point':            return this._pointD(g.coordinates, proj);
      case 'MultiPoint':       return g.coordinates.map(p => this._pointD(p, proj)).join('');
      default:                 return '';
    }
  }

  _polygonD(rings, proj) {
    return rings.map(ring => {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]));
      if (!pts.length) return '';
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]},${pts[i][1]}`;
      return d + 'Z';
    }).join('');
  }
  _lineD(coords, proj) {
    const pts = coords.map(([lon, lat]) => proj.forward([lon, lat]));
    if (!pts.length) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]},${pts[i][1]}`;
    return d;
  }
  _pointD([lon, lat], proj, r = 2.5) {
    const [x, y] = proj.forward([lon, lat]);
    return `M${x-r},${y}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 -${r*2},0`;
  }
}

function asArr(v) { return Array.isArray(v) ? v : [v]; }
