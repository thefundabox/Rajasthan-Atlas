/**
 * AgricultureLayer — plug-in for crops · cropping seasons · agro-economic zones.
 * Delegates detail rendering to ThematicEditorial (shared with climate/soil).
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('agriculture',      { apply: () => ({}) });
Atlas.layers.registerMode('crops',            { apply: () => ({}) });
Atlas.layers.registerMode('cropping-seasons', { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'major-crops',         priority: 22, cls: 'lbl-crop', minZoom: 1.7,
  text: (f) => f.properties.label ?? f.properties.name,
});
Atlas.labels.register({
  layerId:  'agro-economic-zones', priority: 18, cls: 'lbl-agroecon', minZoom: 1.5,
  text: (f) => f.properties.label ?? f.properties.name,
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'agriculture', label: 'Agriculture' },
    { id: 'crops',       label: 'Crops' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
