/**
 * Quality tier — map a feature's `geometryQuality` to a star rating and label.
 *
 * Tiers (highest to lowest):
 *   5 · Surveyed         — reserved for future ground-truth datasets
 *   4 · OSM verified     — real OSM geometry (polygon / polyline / point node)
 *   3 · OSM community    — community-mapped extent (e.g. natural=desert)
 *   3 · Generalised      — district-boundary approximation / synthesised axis
 *   2 · Point-only       — a polygon should exist but hasn't been published
 *
 * Kept as a util so all detail renderers (env, physical, district) can call it.
 * No engine dependency.
 */

/** @param {string} gq   value of `feature.properties.geometryQuality` */
export function qualityTier(gq) {
  switch (gq) {
    case 'polygon':
    case 'multipolygon':
    case 'polyline':
    case 'linestring':
      return { stars: 4, id: 'osm',        label: 'OSM verified' };
    case 'point':
      return { stars: 2, id: 'point',      label: 'Point-only'  };
    case 'osm-generalised':
      return { stars: 4, id: 'osm-comm',   label: 'OSM community' };
    case 'generalised':
      return { stars: 3, id: 'generalised',label: 'Generalised'  };
    default:
      return { stars: 4, id: 'osm',        label: 'OSM' };
  }
}

const FILLED = '★';
const EMPTY  = '☆';

/**
 * Build the badge HTML (as a plain string; safe because the source is our own enum).
 * @param {string} gq
 * @returns {string} — a <span class="ed-quality q{n} q-{id}"> ... </span>
 */
export function qualityBadgeHTML(gq) {
  const t = qualityTier(gq);
  const stars = FILLED.repeat(t.stars) + EMPTY.repeat(5 - t.stars);
  return `<span class="ed-quality q${t.stars} q-${t.id}" title="Geometry quality: ${t.label}">` +
         `<span class="stars">${stars}</span>` +
         `<span class="lbl">${t.label}</span>` +
         `</span>`;
}
