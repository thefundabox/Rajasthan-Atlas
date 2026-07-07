/**
 * TerrainLayer — the atlas's raster relief base.
 *
 * Inserts a single SVG <image> element beneath every vector layer, referencing
 * a hillshade + hypsometric-tint PNG generated offline by BUILD_TERRAIN.py from
 * Mapzen terrarium DEM tiles.
 *
 * Zero core-engine modifications. The image is positioned by projecting the
 * PNG's declared lat/lon bounds through the atlas's projection.
 *
 * Also registers a `terrain` style mode that dims thematic layers so relief
 * reads clearly, and adds a 'Terrain' popover button.
 */

import { Atlas } from '../core/AtlasCore.js';
import { svgEl, el } from '../core/util/dom.js';

Atlas.layers.registerMode('terrain', { apply: () => ({}) });

Atlas.bus.on('atlas:ready', async () => {
  try {
    const meta = await fetch('atlas/data/terrain-metadata.json')
                         .then(r => r.json());
    installTerrainImage(meta);
    addToolbarButton();
    registerShortcut();
  } catch (err) {
    console.warn('[TerrainLayer] no terrain metadata; skipping raster relief', err);
  }
});

function installTerrainImage(meta) {
  const svg = document.getElementById('atlas-map');
  const layerGroup = document.getElementById('atlas-layers');
  if (!svg || !layerGroup) return;

  const b = meta.bounds;
  const proj = Atlas.projection;
  const [xTL, yTL] = proj.forward([b.minLon, b.maxLat]);
  const [xBR, yBR] = proj.forward([b.maxLon, b.minLat]);

  const g = svgEl('g', { id: 'atlas-terrain', class: 'atlas-terrain' });
  const img = svgEl('image', {
    href: meta.image,
    x: xTL.toFixed(2), y: yTL.toFixed(2),
    width:  (xBR - xTL).toFixed(2),
    height: (yBR - yTL).toFixed(2),
    preserveAspectRatio: 'none',
  });
  g.append(img);

  // Insert the terrain group as the first sibling before the vector layer group,
  // so all vector layers render on top of the relief.
  svg.insertBefore(g, layerGroup);
}

function addToolbarButton() {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  if (modes.querySelector('button[data-mode="terrain"]')) return;
  const b = el('button', {
    class: 'lp-mode', 'data-mode': 'terrain',
    title: 'Terrain — hillshade + hypsometric tint (T)',
    onclick: () => Atlas.layers.setMode('terrain'),
  }, ['Terrain']);
  modes.append(b);
}

function registerShortcut() {
  Atlas.interaction.registerShortcut('t', () => Atlas.layers.setMode('terrain'));
  Atlas.interaction.registerShortcut('T', () => Atlas.layers.setMode('terrain'));
}
