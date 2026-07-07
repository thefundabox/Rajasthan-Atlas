/**
 * SoilLayer — plug-in for soil types, desertification, drought vulnerability.
 *
 * Delegates detail rendering to ThematicEditorial (shared with ClimateLayer +
 * VegetationLayer). The three earth-context layers share consistent styling.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('soils',           { apply: () => ({}) });
Atlas.layers.registerMode('desertification', { apply: () => ({}) });
Atlas.layers.registerMode('drought',         { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'soil-types',             priority: 18, cls: 'lbl-soil', minZoom: 1.6,
  text: (f) => (f.properties.label ?? f.properties.name).split(/[(]/)[0].trim(),
});
Atlas.labels.register({
  layerId:  'desertification',        priority: 16, cls: 'lbl-desertification', minZoom: 1.8,
  text: (f) => f.properties.label ?? f.properties.name,
});
Atlas.labels.register({
  layerId:  'drought-vulnerability',  priority: 15, cls: 'lbl-drought', minZoom: 2.0,
  text: (f) => f.properties.label ?? f.properties.name,
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'soils',           label: 'Soils'        },
    { id: 'desertification', label: 'Desertification' },
    { id: 'drought',         label: 'Drought'      },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
