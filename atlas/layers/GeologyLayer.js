/**
 * GeologyLayer — plug-in for geological provinces + rock types.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('geology',   { apply: () => ({}) });
Atlas.layers.registerMode('provinces', { apply: () => ({}) });
Atlas.layers.registerMode('rocks',     { apply: () => ({}) });

Atlas.labels.register({
  layerId:'geological-provinces', priority: 24, cls:'lbl-province', minZoom: 1.4,
  text: (f) => f.properties.label?.split('(')[0].split(/[·—]/)[0].trim().toUpperCase()
                ?? f.properties.name.toUpperCase(),
});
Atlas.labels.register({
  layerId:'rock-types', priority: 20, cls:'lbl-rock', minZoom: 1.7,
  text: (f) => f.properties.label ?? f.properties.name,
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id:'geology',   label:'Geology' },
    { id:'provinces', label:'Provinces' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class:'lp-mode', 'data-mode':m.id, title:m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
