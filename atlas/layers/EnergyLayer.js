/**
 * EnergyLayer — plug-in for energy-mix zones + renewable-energy zones +
 * transmission corridors. Delegates detail rendering to ThematicEditorial.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('energy',                  { apply: () => ({}) });
Atlas.layers.registerMode('energy-mix',              { apply: () => ({}) });
Atlas.layers.registerMode('renewables',              { apply: () => ({}) });
Atlas.layers.registerMode('transmission',            { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'energy-mix', priority: 24, cls: 'lbl-energy-mix', minZoom: 1.4,
  text: (f) => f.properties.label?.split(/[·(—]/)[0].trim().toUpperCase()
                ?? f.properties.name.toUpperCase(),
});
Atlas.labels.register({
  layerId: 'renewable-zones', priority: 22, cls: 'lbl-renewable', minZoom: 1.5,
  text: (f) => f.properties.label?.split('(')[0].trim().toUpperCase() ?? '',
});
Atlas.labels.register({
  layerId: 'transmission-corridors', priority: 20, cls: 'lbl-transmission', minZoom: 1.6,
  text: (f) => f.properties.label?.split(/[—-]/)[0].trim().toUpperCase() ?? '',
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'energy',     label: 'Energy' },
    { id: 'renewables', label: 'Renewables' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
