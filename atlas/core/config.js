/**
 * Atlas — global configuration.
 * Single source of truth for zoom limits, animation timings, palette hooks,
 * default projection, IO paths. NO module may hardcode any of these values.
 * Editing this file changes engine behaviour globally with zero side-effects.
 */
export const CONFIG = Object.freeze({
  version: '1.0.0',

  /** Absolute paths (relative to app root) for the metadata & schema files. */
  io: Object.freeze({
    atlasManifest:  'atlas/data/atlas.json',
    featureSchema:  'atlas/data/schemas/feature.schema.json',
  }),

  /** Default coordinate reference system. All in-memory geometry is in this CRS. */
  projection: Object.freeze({
    crs:            'EPSG:4326',
    displayType:    'equirectangular-corrected',
    svgViewBox:     [0, 0, 1000, 1000],
    padding:        20,
  }),

  /** Zoom & pan. */
  zoom: Object.freeze({
    min:            1.0,      // 1 = full extent
    max:            25.0,     // ~25× zoom in
    wheelStep:      1.15,
    buttonStep:     1.3,
    fitPadding:     0.35,     // proportion of bbox to pad on fit-to-bbox
  }),

  /** Animation. */
  motion: Object.freeze({
    hover:          120,      // ms
    themeSwap:      160,
    tooltipFade:    90,
  }),

  /** Default theme, keys registered in ThemeManager. */
  theme: Object.freeze({
    default:        'light',
    persistKey:     'rajatlas.theme',
  }),

  /** Layer render defaults — overridable per-layer at registration time. */
  layerDefaults: Object.freeze({
    strokeWidth:    0.6,
    strokeHover:    1.1,
    strokeSelected: 1.4,
  }),

  /** Spatial index granularity — QuadTree parameters. */
  spatialIndex: Object.freeze({
    maxPointsPerNode: 8,
    maxDepth:         12,
  }),

  /** Search. */
  search: Object.freeze({
    maxResults:       8,
    minQueryLength:   1,
  }),

  /** Kilometres per degree of longitude at 0° latitude. Used for scale bar. */
  earth: Object.freeze({
    kmPerDegLonEquator: 111.320,
  }),
});
