/**
 * MiningLayer — plug-in for major mines + mining clusters + petroleum/gas.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('mining',    { apply: () => ({}) });
Atlas.layers.registerMode('petroleum', { apply: () => ({}) });

Atlas.labels.register({
  layerId:'major-mines',      priority: 55, cls:'lbl-mine', minZoom: 1.5,
  text: (f) => f.properties.name
                  .replace(/\s+(Mine|Mines|Quarries|Complex|Cluster|Group)$/i,'')
                  .replace(/\s+Mining\s+Complex/i,''),
});
Atlas.labels.register({
  layerId:'mining-clusters',  priority: 16, cls:'lbl-cluster', minZoom: 1.5,
  text: (f) => f.properties.label?.split('—')[0].split(/Cluster/i)[0].trim() ?? f.properties.name,
});
Atlas.labels.register({
  layerId:'petroleum-gas',    priority: 45, cls:'lbl-petroleum', minZoom: 1.6,
  text: (f) => f.properties.name
                  .replace(/\s+Field$/i,'')
                  .replace(/\s*\(Rajasthan block\)/i,''),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id:'mining',    label:'Mining' },
    { id:'petroleum', label:'Petroleum' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class:'lp-mode', 'data-mode':m.id, title:m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
