/**
 * IrrigationLayer — plug-in for irrigation sources + major canals + command areas.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('irrigation',   { apply: () => ({}) });
Atlas.layers.registerMode('canals',       { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'irrigation-sources', priority: 18, cls: 'lbl-irrigation', minZoom: 1.8,
  text: (f) => f.properties.label ?? f.properties.name,
});
Atlas.labels.register({
  layerId:  'major-canals',       priority: 55, cls: 'lbl-canal',      minZoom: 1.3,
  orient:   'along',
  text: (f) => f.properties.name,
});
Atlas.labels.register({
  layerId:  'command-areas',      priority: 20, cls: 'lbl-command',    minZoom: 1.5,
  text: (f) => (f.properties.label ?? f.properties.name)
                  .replace(/\s+Command.*/i,'').replace(/\(.*\)/,'').trim(),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'irrigation', label: 'Irrigation' },
    { id: 'canals',     label: 'Canals' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
