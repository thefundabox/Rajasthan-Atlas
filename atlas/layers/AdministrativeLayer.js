/**
 * AdministrativeLayer — plug-in for revenue divisions, scheduled areas,
 * municipal corporations, smart cities, urban centres.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('administrative',           { apply: () => ({}) });
Atlas.layers.registerMode('divisions',                { apply: () => ({}) });
Atlas.layers.registerMode('scheduled-areas',          { apply: () => ({}) });
Atlas.layers.registerMode('urban',                    { apply: () => ({}) });
Atlas.layers.registerMode('municipal-corporations',   { apply: () => ({}) });
Atlas.layers.registerMode('smart-cities',             { apply: () => ({}) });
Atlas.layers.registerMode('urban-centres',            { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'administrative-divisions', priority: 20, cls: 'lbl-division', minZoom: 1.3,
  text: (f) => (f.properties.label ?? '').replace(/\s+Division$/,'').toUpperCase(),
});
Atlas.labels.register({
  layerId: 'scheduled-areas', priority: 18, cls: 'lbl-scheduled-area', minZoom: 1.5,
  text: () => 'TSP AREA',
});
Atlas.labels.register({
  layerId: 'municipal-corporations', priority: 46, cls: 'lbl-municipal-corp', minZoom: 2.0,
  text: (f) => f.properties.name.replace(/^Jaipur|^Jodhpur|^Kota|^Udaipur|^Ajmer|^Bikaner|^Bharatpur/, '')
                                .replace(/^\s*Municipal Corporation\s*—?\s*/i,'')
                                .replace(/^\s*—\s*/, '')
                                || 'MC',
});
Atlas.labels.register({
  layerId: 'smart-cities', priority: 48, cls: 'lbl-smart-city', minZoom: 1.6,
  text: (f) => f.properties.name.replace(/\s+Smart City$/i,'').toUpperCase(),
});
Atlas.labels.register({
  layerId: 'urban-centres', priority: 54, cls: 'lbl-urban-centre', minZoom: 1.5,
  text: (f) => f.properties.name.split(/\s+—|\s+\(/)[0].trim(),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'administrative', label: 'Administrative' },
    { id: 'urban',          label: 'Urban Centres' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
