/**
 * MineralsLayer — plug-in for mineral belts + building stones.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('minerals',       { apply: () => ({}) });
Atlas.layers.registerMode('mineral-belts',  { apply: () => ({}) });
Atlas.layers.registerMode('building-stones',{ apply: () => ({}) });

Atlas.labels.register({
  layerId:'mineral-belts', priority: 22, cls:'lbl-mineral', minZoom: 1.6,
  text: (f) => f.properties.label?.replace(/\s+Belt$/,'').toUpperCase() ?? '',
});
Atlas.labels.register({
  layerId:'building-stones', priority: 18, cls:'lbl-stone', minZoom: 2.0,
  text: (f) => f.properties.label ?? f.properties.name,
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id:'minerals',        label:'Minerals' },
    { id:'building-stones', label:'Building Stones' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class:'lp-mode', 'data-mode':m.id, title:m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
