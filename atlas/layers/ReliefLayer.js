/**
 * ReliefLayer — plug-in for Aravalli, Thar Desert, and named peaks.
 *
 * Registers:
 *   • Labels for the Aravalli main axis (small caps, larger), Thar Desert
 *     (uppercase spread), and named peaks (small caps, brown).
 *   • A `relief` style mode.
 *   • Editorial detail renderer for mountain_range, desert, and peak types.
 */

import { Atlas } from '../core/AtlasCore.js';
import { renderPhysicalCard } from './PhysicalEditorial.js';

Atlas.layers.registerMode('relief', { apply: () => ({}) });

/* ---------- Labels ---------- */
Atlas.labels.register({
  layerId:  'thar',     priority: 95, cls: 'lbl-desert',
  text: () => 'THAR DESERT',
});
Atlas.labels.register({
  layerId:  'aravalli', priority: 92, cls: 'lbl-aravalli',
  orient:   'along',                              // rotate to the range's axis
  text: () => 'ARAVALLI RANGE',
});
Atlas.labels.register({
  layerId:  'peaks',    priority: 75, cls: 'lbl-peak', minZoom: 1.6,
  filter:   (f) => f.properties.named,
  text:     (f) => `${f.properties.name.replace(/, Abu$/, '')} · ${f.properties.elevation_m} m`,
});
Atlas.labels.register({
  layerId:  'peaks',    priority: 50, cls: 'lbl-peak-quiet', minZoom: 2.5,
  filter:   (f) => !f.properties.named,
  text:     (f) => `▲ ${f.properties.elevation_m} m`,
});

/* ---------- Post-boot: detail-panel override ---------- */
Atlas.bus.on('atlas:ready', () => {
  const detailSlot = document.querySelector('.detail-slot');
  const right      = document.querySelector('.a-right');
  if (!detailSlot) return;
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) return;
    const t = feature.properties?.type;
    if (t !== 'mountain_range' && t !== 'desert' && t !== 'peak') return;
    detailSlot.innerHTML = '';
    detailSlot.append(renderPhysicalCard(feature));
    right?.classList.add('open');
  });
});
