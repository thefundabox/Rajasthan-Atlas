/**
 * PhysiographyLayer — plug-in for physiographic regions, drainage basins,
 * and the umbrella "physical" mode.
 *
 * Registers:
 *   • Region labels (large small-caps letter-spaced, subtle).
 *   • A `physical` umbrella mode that dims districts and PAs so the
 *     underlying landscape reads clearly.
 *   • A `physiography` mode that emphasises the regional structure.
 *   • Detail renderer for physiographic_region + drainage_basin types.
 *   • Toolbar buttons for the three physical modes.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { renderPhysicalCard } from './PhysicalEditorial.js';

Atlas.layers.registerMode('physical',      { apply: () => ({}) });
Atlas.layers.registerMode('physiography',  { apply: () => ({}) });

/* ---------- Labels ---------- */
Atlas.labels.register({
  layerId:  'physiography', priority: 20, cls: 'lbl-region',
  minZoom:  1.0, maxZoom: 3.5,
  text: (f) => f.properties.name
                 .replace(/\s*\(.*\)$/, '')
                 .replace(/Region$/, '')
                 .trim()
                 .toUpperCase(),
});
Atlas.labels.register({
  layerId:  'drainage-basins', priority: 15, cls: 'lbl-basin',
  minZoom:  1.4, maxZoom: 3.0,
  text: (f) => f.properties.name
                 .replace(/\s*(Basin|Drainage).*/, '')
                 .toUpperCase(),
});

/* ---------- Toolbar wiring ---------- */
Atlas.bus.on('atlas:ready', () => {
  const toolbar = document.querySelector('.a-toolbar, .lp-modes');
  if (!toolbar) return;

  // The modes popover already has generic buttons; add physical-family modes.
  const modes = document.querySelector('.lp-modes');
  if (modes) {
    const add = (id, label) => {
      if (modes.querySelector(`button[data-mode="${id}"]`)) return;
      const b = el('button', {
        class: 'lp-mode', 'data-mode': id,
        title: label, onclick: () => Atlas.layers.setMode(id),
      }, [label]);
      modes.append(b);
    };
    add('physical',     'Physical');
    add('hydrology',    'Hydrology');
    add('relief',       'Relief');
    add('physiography', 'Physiography');
  }

  // Shortcuts
  Atlas.interaction.registerShortcut('6', () => Atlas.layers.setMode('physical'));
  Atlas.interaction.registerShortcut('7', () => Atlas.layers.setMode('hydrology'));
  Atlas.interaction.registerShortcut('8', () => Atlas.layers.setMode('relief'));
  Atlas.interaction.registerShortcut('9', () => Atlas.layers.setMode('physiography'));

  /* Detail renderer for physiographic region / drainage basin */
  const detailSlot = document.querySelector('.detail-slot');
  const right      = document.querySelector('.a-right');
  if (!detailSlot) return;
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) return;
    const t = feature.properties?.type;
    if (t !== 'physiographic_region' && t !== 'drainage_basin') return;
    detailSlot.innerHTML = '';
    detailSlot.append(renderPhysicalCard(feature));
    right?.classList.add('open');
  });
});
