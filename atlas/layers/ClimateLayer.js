/**
 * ClimateLayer — plug-in for rainfall, temperature, climate regions,
 * agro-climatic zones.
 *
 * Registers labels + modes; delegates detail rendering to ThematicEditorial.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('climate',    { apply: () => ({}) });
Atlas.layers.registerMode('rainfall',   { apply: () => ({}) });
Atlas.layers.registerMode('agro',       { apply: () => ({}) });

Atlas.labels.register({
  layerId:  'rainfall',           priority: 30, cls: 'lbl-climate', minZoom: 1.4,
  text: (f) => f.properties.label ?? f.properties.name,
});
Atlas.labels.register({
  layerId:  'climate-regions',     priority: 25, cls: 'lbl-climate', minZoom: 1.0,
  text: (f) => f.properties.label?.toUpperCase() ?? f.properties.name.toUpperCase(),
});
Atlas.labels.register({
  layerId:  'agro-climatic-zones', priority: 22, cls: 'lbl-agro',    minZoom: 1.7,
  text: (f) => f.properties.zone_id?.toUpperCase() ?? '',
});
Atlas.labels.register({
  layerId:  'temperature',         priority: 20, cls: 'lbl-climate', minZoom: 2.0,
  text: (f) => `${f.properties.mean_c ?? ''}°C`,
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'rainfall',  label: 'Rainfall',   key: 'R' },
    { id: 'climate',   label: 'Climate',    key: 'C' },
    { id: 'agro',      label: 'Agro-Zones', key: 'A' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

// Install the shared editorial renderer (idempotent — subscribes once).
installThematicEditorial();
