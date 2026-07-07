/**
 * HandicraftsLayer — plug-in for SEZs + GI-tagged handicraft clusters.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('sez',           { apply: () => ({}) });
Atlas.layers.registerMode('handicrafts',   { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'special-economic-zones', priority: 48, cls: 'lbl-sez', minZoom: 1.7,
  text: (f) => {
    const n = f.properties.name;
    // Keep it terse: "MWC-J", "Sitapura", "Boranada", "Somany"
    if (/Mahindra/i.test(n)) return 'MWC · JAIPUR';
    return n.split(/\s+—\s+/)[0].split(/\s+SEZ/i)[0].trim().toUpperCase();
  },
});
Atlas.labels.register({
  layerId: 'handicraft-clusters', priority: 44, cls: 'lbl-handicraft', minZoom: 1.9,
  text: (f) => f.properties.name.split(/\s+—\s+/)[0]
                  .replace(/\s+Hand Printing$/i,' Print')
                  .replace(/\s+\(.+\)$/,''),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'handicrafts', label: 'Handicrafts' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
