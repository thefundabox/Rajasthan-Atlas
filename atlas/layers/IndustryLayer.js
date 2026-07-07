/**
 * IndustryLayer — plug-in for industrial regions + sectoral clusters.
 * Mirrors the GeologyLayer plug-in in structure. Delegates detail rendering
 * to ThematicEditorial.
 */
import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { installThematicEditorial } from './ThematicEditorial.js';

Atlas.layers.registerMode('industry',           { apply: () => ({}) });
Atlas.layers.registerMode('industrial-regions', { apply: () => ({}) });
Atlas.layers.registerMode('industrial-clusters',{ apply: () => ({}) });

Atlas.labels.register({
  layerId: 'industrial-regions', priority: 24, cls: 'lbl-industrial-region', minZoom: 1.4,
  text: (f) => f.properties.label?.split('—')[0].split(/[·(]/)[0].trim().toUpperCase()
                ?? f.properties.name.toUpperCase(),
});
Atlas.labels.register({
  layerId: 'industrial-clusters', priority: 20, cls: 'lbl-industrial-cluster', minZoom: 1.6,
  text: (f) => f.properties.label?.replace(/\s+Cluster$/,'').replace(/\s+&\s+.*$/,'') ?? '',
});

Atlas.bus.on('atlas:ready', () => {
  const modes = document.querySelector('.lp-modes');
  if (!modes) return;
  for (const m of [
    { id: 'industry', label: 'Industry' },
  ]) {
    if (modes.querySelector(`button[data-mode="${m.id}"]`)) continue;
    modes.append(el('button', {
      class: 'lp-mode', 'data-mode': m.id, title: m.label,
      onclick: () => Atlas.layers.setMode(m.id),
    }, [m.label]));
  }
});

installThematicEditorial();
