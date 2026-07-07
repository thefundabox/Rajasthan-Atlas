/**
 * PowerPlantsLayer — plug-in for the point layers:
 * power-plants (thermal / nuclear / hydel / gas), solar-parks, wind-farms.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('power-plants', { apply: () => ({}) });
Atlas.layers.registerMode('solar',        { apply: () => ({}) });
Atlas.layers.registerMode('wind',         { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'power-plants', priority: 56, cls: 'lbl-power-plant', minZoom: 1.6,
  text: (f) => {
    const n = f.properties.name;
    return n.split(/\s+—\s+/)[0]
            .replace(/\s+(Thermal Power Station|Super Thermal Power Station|Power Station|Hydroelectric Station|Gas TPS|Gas Power Station|Combined Cycle Gas Turbine \(CCGT\)|TPS)$/i,'')
            .replace(/^Rajasthan Atomic Power Station.*/,'RAPS');
  },
});
Atlas.labels.register({
  layerId: 'solar-parks', priority: 52, cls: 'lbl-solar-park', minZoom: 1.7,
  text: (f) => f.properties.name
                  .replace(/\s+Solar (Park|Cluster).*/i,'')
                  .replace(/\s+\(.+\)$/,''),
});
Atlas.labels.register({
  layerId: 'wind-farms', priority: 50, cls: 'lbl-wind-farm', minZoom: 1.8,
  text: (f) => f.properties.name
                  .replace(/\s+Wind (Farm|Zone|Cluster|Belt).*/i,'')
                  .replace(/\s+\(.+\)$/,''),
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'power-plants', label: 'Power Plants' },
    { id: 'solar',        label: 'Solar' },
    { id: 'wind',         label: 'Wind' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
