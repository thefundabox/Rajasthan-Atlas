/**
 * PopulationLayer — plug-in for the 7 demographic choropleth layers.
 * Every layer is a 5-class classification zone (district-approximated).
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

const DEMO_LAYERS = [
  'population-density',
  'population-growth',
  'literacy',
  'sex-ratio',
  'urbanisation',
  'scheduled-tribes',
  'scheduled-castes',
];

Atlas.layers.registerMode('demographics',       { apply: () => ({}) });
Atlas.layers.registerMode('population-density', { apply: () => ({}) });
Atlas.layers.registerMode('literacy',           { apply: () => ({}) });
Atlas.layers.registerMode('sex-ratio',          { apply: () => ({}) });
Atlas.layers.registerMode('urbanisation',       { apply: () => ({}) });
Atlas.layers.registerMode('st-sc',              { apply: () => ({}) });

for (const layerId of DEMO_LAYERS) {
  Atlas.labels.register({
    layerId, priority: 18, cls: 'lbl-demographic', minZoom: 1.7,
    text: (f) => {
      const label = f.properties.label ?? f.properties.name ?? '';
      return label.split('(')[0].trim().toUpperCase();
    },
  });
}

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'demographics', label: 'Demographics' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
