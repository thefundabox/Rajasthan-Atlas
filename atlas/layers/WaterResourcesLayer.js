/**
 * WaterResourcesLayer — plug-in for dams + groundwater status.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('water',       { apply: () => ({}) });
Atlas.layers.registerMode('dams',        { apply: () => ({}) });
Atlas.layers.registerMode('groundwater', { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'dams',        priority: 40, cls: 'lbl-dam',     minZoom: 1.6,
  text: (f) => (f.properties.name ?? '').replace(/\s+Dam.*/, '').replace(/\s+Bandh.*/,'').replace(/\s+Barrage.*/,''),
});
Atlas.labels.register({
  layerId:  'groundwater', priority: 15, cls: 'lbl-gw',      minZoom: 1.8,
  text: (f) => f.properties.label?.split(' ')[0].toUpperCase() ?? '',
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'water',       label: 'Water' },
    { id: 'dams',        label: 'Dams' },
    { id: 'groundwater', label: 'Groundwater' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
