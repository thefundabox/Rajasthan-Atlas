/**
 * LocatorInset — a small always-visible mini-map (India → Rajasthan) with the
 * current viewport box overlaid.
 *
 * Plug-in module; does not touch AtlasCore. Subscribes to `atlas:ready` and
 * `view:changed`, then draws into a floating .overlay.locator element.
 */

import { Atlas } from '../core/AtlasCore.js';
import { svgEl } from '../core/util/dom.js';

// Simplified India outline (very coarse — this is illustrative, not GIS-grade).
// Coordinates are lon/lat, hand-approximated silhouette. Enough to give the
// user "you are here". Rajasthan drawn from the actual atlas manifest bounds.
const INDIA_SILHOUETTE = [
  [77.5, 35.5], [78.4, 34.9], [79.2, 34.4], [78.0, 33.0], [77.6, 32.5],
  [78.8, 31.4], [80.6, 30.8], [81.6, 30.4], [83.0, 29.2], [84.0, 27.9],
  [85.8, 27.0], [87.8, 27.9], [88.8, 27.4], [88.9, 26.7], [89.9, 25.6],
  [90.6, 25.2], [91.5, 25.1], [92.6, 25.0], [94.2, 24.3], [94.7, 24.7],
  [95.2, 26.5], [96.6, 27.3], [97.3, 28.2], [96.2, 28.6], [95.4, 28.5],
  [94.8, 27.0], [92.6, 24.0], [91.3, 22.8], [91.7, 22.3], [91.5, 21.4],
  [90.5, 21.7], [89.1, 22.1], [88.1, 21.5], [86.9, 21.2], [86.5, 20.2],
  [85.2, 19.7], [83.6, 18.3], [82.3, 17.0], [81.0, 16.3], [80.5, 15.7],
  [80.3, 13.5], [79.9, 12.0], [78.5, 8.6],  [77.1, 8.1],  [75.5, 11.6],
  [74.2, 13.9], [73.0, 15.9], [72.7, 17.7], [72.6, 19.2], [72.7, 20.1],
  [72.9, 21.1], [70.0, 21.6], [69.0, 22.1], [68.0, 22.8], [68.8, 23.8],
  [70.1, 24.5], [70.4, 25.9], [71.0, 27.0], [70.6, 28.0], [72.3, 28.7],
  [73.5, 29.9], [74.5, 31.0], [75.5, 32.5], [76.4, 34.0], [77.5, 35.5],
];

// Rajasthan approximate outline (denser than India). Use bounding-box based
// simplified shape; more accurate would use the districts collection but this
// is intentionally rough since it's a tiny locator.
const RAJASTHAN_APPROX = [
  [70.10, 27.90], [70.60, 28.60], [72.20, 28.70], [73.90, 30.20], [75.50, 30.20],
  [75.90, 28.90], [77.20, 28.60], [77.60, 27.60], [78.20, 26.90], [77.30, 26.20],
  [76.90, 25.20], [76.90, 24.40], [77.50, 23.90], [76.10, 23.10], [74.50, 23.10],
  [73.60, 24.20], [72.50, 24.20], [71.60, 24.90], [70.20, 25.10], [69.50, 26.20],
  [70.10, 27.90],
];

Atlas.bus.on('atlas:ready', () => install());

function install() {
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;

  const container = document.createElement('div');
  container.className = 'overlay locator';
  container.innerHTML = '<div class="lbl">Locator</div>';
  mapEl.append(container);

  const svg = svgEl('svg', { viewBox: '0 0 140 140', preserveAspectRatio: 'xMidYMid meet' });
  container.append(svg);

  // Local mini-projection for India — always same viewport, doesn't depend on
  // the atlas's main projection.
  const lons = INDIA_SILHOUETTE.map(p => p[0]);
  const lats = INDIA_SILHOUETTE.map(p => p[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const lat0 = (minLat + maxLat) / 2;
  const kx = Math.cos(lat0 * Math.PI / 180);
  const spanX = (maxLon - minLon) * kx;
  const spanY = (maxLat - minLat);
  const pad = 6;
  const scale = Math.min((140 - 2*pad) / spanX, (140 - 2*pad) / spanY);
  const ox = pad + ((140 - 2*pad) - spanX * scale) / 2;
  const oy = pad + ((140 - 2*pad) - spanY * scale) / 2;
  const project = ([lon, lat]) => [
    ox + (lon - minLon) * kx * scale,
    oy + (maxLat - lat) * scale,
  ];

  const pathD = (points) => {
    const p = points.map(project);
    return `M${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}` +
           p.slice(1).map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z';
  };

  svg.append(svgEl('path', { class: 'india',     d: pathD(INDIA_SILHOUETTE) }));
  svg.append(svgEl('path', { class: 'rajasthan', d: pathD(RAJASTHAN_APPROX) }));

  const viewport = svgEl('path', { class: 'viewport' });
  svg.append(viewport);

  // Track the atlas's current viewport → map onto the locator's frame.
  const drawViewport = () => {
    const view = Atlas.interaction.currentViewBox();
    if (!view) return;
    // Convert viewport corners (in atlas SVG space) back to lon/lat.
    const proj = Atlas.projection;
    const corners = [
      proj.inverse([view.x,          view.y]),
      proj.inverse([view.x + view.w, view.y]),
      proj.inverse([view.x + view.w, view.y + view.h]),
      proj.inverse([view.x,          view.y + view.h]),
      proj.inverse([view.x,          view.y]),
    ];
    viewport.setAttribute('d', pathD(corners));
  };
  Atlas.bus.on('view:changed', drawViewport);
  drawViewport();
}
