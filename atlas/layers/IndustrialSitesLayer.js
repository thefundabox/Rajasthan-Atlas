/**
 * IndustrialSitesLayer — plug-in for RIICO industrial areas + flagship
 * major-industry points. Points are shown as diamonds like the mines layer.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('industrial-areas',   { apply: () => ({}) });
Atlas.layers.registerMode('major-industries',   { apply: () => ({}) });

Atlas.labels.register({
  layerId: 'industrial-areas', priority: 50, cls: 'lbl-industrial-area', minZoom: 1.8,
  text: (f) => f.properties.name
                  .replace(/\s+Industrial Area(\s+\([^)]*\))?$/i,'')
                  .replace(/\s+\(Jaipur\)$|\s+\(Jodhpur\)$/i,''),
});
Atlas.labels.register({
  layerId: 'major-industries', priority: 52, cls: 'lbl-major-industry', minZoom: 1.7,
  text: (f) => {
    const n = f.properties.name;
    // Trim to the flagship name — everything before the em-dash / hyphen.
    return n.split(/\s+—\s+/)[0].split(/\s+-\s+/)[0]
            .replace(/\s+Plant$/i,'')
            .replace(/\s+Cements?$/i,'');
  },
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'industrial-areas', label: 'RIICO Estates' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
