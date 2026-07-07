/**
 * HydrologyLayer — plug-in for rivers and lakes.
 *
 * Registers:
 *   • Cartographic labels for rivers (italic serif, blue) and lakes.
 *   • A `hydrology` style mode: districts recede, physical regions and basins
 *     dim, rivers and lakes come forward.
 *   • Editorial detail renderer for river / lake selections.
 */

import { Atlas } from '../core/AtlasCore.js';
import { esc, el }  from '../core/util/dom.js';
import { renderPhysicalCard } from './PhysicalEditorial.js';

/* ---------- Modes ---------- */
Atlas.layers.registerMode('hydrology', { apply: () => ({}) });

/* ---------- Labels ---------- */
Atlas.labels.register({
  layerId:  'rivers', priority: 60, cls: 'lbl-river', minZoom: 1.3,
  orient:   'along',                              // rotate to local tangent
  text: (f) => f.properties.name.replace(/\s+River$/, ''),
});
Atlas.labels.register({
  layerId:  'lakes',  priority: 65, cls: 'lbl-lake', minZoom: 1.5,
  text: (f) => f.properties.name.replace(/\s+Lake$/, ''),
});

/* ---------- Post-boot: detail-panel override for physical/hydrology types ---------- */
Atlas.bus.on('atlas:ready', () => {
  const detailSlot = document.querySelector('.detail-slot');
  const right      = document.querySelector('.a-right');
  if (!detailSlot) return;
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) return;
    const t = feature.properties?.type;
    if (t !== 'river' && t !== 'lake') return;
    detailSlot.innerHTML = '';
    detailSlot.append(renderPhysicalCard(feature));
    right?.classList.add('open');
  });
});
