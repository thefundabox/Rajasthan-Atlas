/**
 * VegetationLayer — plug-in for the natural-vegetation dataset.
 * One layer registered, one mode, shared editorial renderer.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('vegetation', { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'vegetation',  priority: 24, cls: 'lbl-veg', minZoom: 1.3,
  text: (f) => (f.properties.label ?? f.properties.name)
                  .replace(/Tropical\s+/i, '')
                  .replace(/\s+&.*/,'').trim(),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  if (modes.querySelector('button[data-mode="vegetation"]')) return;
  modes.append(el('button', {
    class: 'lp-mode', 'data-mode': 'vegetation', title: 'Natural Vegetation',
    onclick: () => Atlas.layers.setMode('vegetation'),
  }, ['Vegetation']));
});

installThematicEditorial();
