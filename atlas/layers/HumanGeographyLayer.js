/**
 * HumanGeographyLayer — plug-in for regional cultural zones, border districts,
 * and population corridors.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('regions',              { apply: () => ({}) });
Atlas.layers.registerMode('border-districts',     { apply: () => ({}) });
Atlas.layers.registerMode('population-corridors', { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'regional-zones', priority: 26, cls: 'lbl-cultural-region', minZoom: 1.3,
  text: (f) => (f.properties.label ?? '').replace(/\s+Region$/,'').toUpperCase(),
});
Atlas.labels.register({
  layerId: 'border-districts', priority: 16, cls: 'lbl-border', minZoom: 1.4,
  text: (f) => (f.properties.label ?? '').split(/\s+Border/)[0].split(/\s+\(/)[0].toUpperCase(),
});
Atlas.labels.register({
  layerId: 'population-corridors', priority: 18, cls: 'lbl-population-corridor', minZoom: 1.5,
  text: (f) => (f.properties.label ?? '').split(/\s+Corridor$/)[0].toUpperCase(),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'regions',              label: 'Cultural Regions' },
    { id: 'border-districts',     label: 'Border Districts' },
    { id: 'population-corridors', label: 'Population Corridors' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
