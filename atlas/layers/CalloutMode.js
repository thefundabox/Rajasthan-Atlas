/**
 * CalloutMode — Sikhwal-style floating fact annotations near the map.
 *
 * Toggleable overlay that surfaces each district's most distinctive
 * enrichment fact as a floating callout box, anchored to the district
 * centroid by a leader line — the visual metaphor of a printed atlas
 * where every district has a "Did you know" box pointing at it.
 *
 * How it works:
 *   1. On boot, install a floating "Callouts" toggle button in the map
 *      chrome (top-right, below the search).
 *   2. When toggled ON, iterate every district feature, take its first
 *      fact (from properties.notes.facts[0]), and emit an <div>
 *      absolutely positioned near the district centroid. Draw an SVG
 *      leader line from the centroid to the callout box.
 *   3. On zoom/pan, recompute positions.
 *   4. When toggled OFF, tear down all callout DOM nodes.
 *
 * Placement strategy: callouts are placed radially around Rajasthan's
 * bounding box centroid, so text sits in the map margin rather than
 * covering the map itself. Uses a simple angle-based lookup per
 * district — approximating the Sikhwal layout.
 *
 * This is an additive plug-in — no engine changes. Runs entirely off
 * bus events (atlas:ready, view:changed) and the existing feature data.
 */

import { el } from '../core/util/dom.js';

const CALLOUT_LAYER_ID = 'districts';         // Which layer to callout
const MAX_CALLOUTS     = 41;                  // Cap for readability
const CALLOUT_MAX_CHARS = 110;                // Truncate long facts

let enabled = false;
let root = null;
let svgOverlay = null;
let boxes = new Map();  // featureId -> {div, angle, distance}
let toggleBtn = null;

Atlas.bus.on('atlas:ready', () => {
  installToggle();
  Atlas.bus.on('view:changed', () => { if (enabled) reposition(); });
});

function installToggle() {
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  toggleBtn = el('button', {
    class: 'callout-toggle',
    title: 'Callouts — show top facts as pinned boxes near each district (like a Sikhwal atlas page)',
    onclick: () => setEnabled(!enabled),
  }, ['🗨 Callouts']);
  mapEl.append(toggleBtn);
  injectStyles();
}

function setEnabled(on) {
  enabled = on;
  toggleBtn?.classList.toggle('active', enabled);
  if (enabled) build(); else teardown();
}

function build() {
  teardown();
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  root = el('div', { class: 'callout-root' });
  // SVG overlay for leader lines — sits BEHIND the boxes.
  svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgOverlay.setAttribute('class', 'callout-svg');
  root.append(svgOverlay);
  mapEl.append(root);

  // Enumerate every feature of the target layer.
  const layer = Atlas.layers.list().find(l => l.id === CALLOUT_LAYER_ID);
  if (!layer) return;
  const features = collectFeatures(CALLOUT_LAYER_ID);
  // Compute Rajasthan bounding-box centroid for radial placement.
  const bounds = boundsOf(features);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  let idx = 0;
  for (const feat of features) {
    if (idx >= MAX_CALLOUTS) break;
    const facts = Array.isArray(feat.properties?.notes?.facts)
      ? feat.properties.notes.facts : [];
    if (!facts.length) continue;
    const box = createBox(feat, facts[0], { cx, cy });
    boxes.set(feat.id, box);
    root.append(box.div);
    idx++;
  }
  reposition();
}

function teardown() {
  boxes.clear();
  if (root && root.parentNode) root.remove();
  root = null;
  svgOverlay = null;
}

function collectFeatures(layerId) {
  const seen = new Set();
  const out = [];
  // Iterate through the internal store — DataManager.iter(layer) is not
  // guaranteed public, so we grab features via the SVG path DOM instead.
  const paths = document.querySelectorAll(`.layer-${layerId} path[data-feature]`);
  for (const p of paths) {
    const id = p.dataset.feature;
    if (seen.has(id)) continue;
    const f = Atlas.data.getFeature(layerId, id);
    if (f) { out.push(f); seen.add(id); }
  }
  return out;
}

function boundsOf(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    const c = f.properties?.centroid;
    if (!c) continue;
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
  }
  return { minX, minY, maxX, maxY };
}

function createBox(feat, factText, { cx, cy }) {
  const centroid = feat.properties?.centroid || [cx, cy];
  // Angle from map-centroid to feature-centroid (0 = east, counter-clockwise).
  const angle = Math.atan2(-(centroid[1] - cy), centroid[0] - cx);
  const truncated = factText.length > CALLOUT_MAX_CHARS
    ? factText.slice(0, CALLOUT_MAX_CHARS - 1).trimEnd() + '…'
    : factText;
  const div = el('div', {
    class: 'callout-box',
    onclick: () => Atlas.interaction.select(CALLOUT_LAYER_ID, feat.id),
  });
  div.append(el('div', { class: 'callout-title' }, [feat.properties?.name || feat.id]));
  div.append(el('div', { class: 'callout-body' }, [truncated]));
  return { div, angle, centroid };
}

function reposition() {
  if (!root || !svgOverlay) return;
  const mapEl = document.querySelector('.a-map');
  const svg = document.getElementById('atlas-map');
  if (!mapEl || !svg) return;
  const rect = mapEl.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  // Compute the map-viewport centre in screen pixels for the radial layout.
  const centerX = svgRect.left + svgRect.width / 2 - rect.left;
  const centerY = svgRect.top + svgRect.height / 2 - rect.top;
  const radiusX = svgRect.width  * 0.55;
  const radiusY = svgRect.height * 0.55;

  svgOverlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  svgOverlay.setAttribute('width',  rect.width);
  svgOverlay.setAttribute('height', rect.height);
  svgOverlay.innerHTML = '';

  for (const [, box] of boxes) {
    // Feature centroid in screen coords via SVG viewport math.
    const anchorSVG = svgToScreen(svg, box.centroid[0], box.centroid[1]);
    const anchorX = anchorSVG.x - rect.left;
    const anchorY = anchorSVG.y - rect.top;

    // Callout position — push radially outward from map centre.
    const bx = centerX + Math.cos(box.angle) * radiusX;
    // Screen Y increases downward, so invert sin.
    const by = centerY - Math.sin(box.angle) * radiusY;
    box.div.style.left = `${bx - 90}px`;   // Box is ~180px wide, so shift left by half.
    box.div.style.top  = `${by - 22}px`;

    // Draw leader line.
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', anchorX);
    line.setAttribute('y1', anchorY);
    line.setAttribute('x2', bx);
    line.setAttribute('y2', by);
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '0.6');
    line.setAttribute('stroke-dasharray', '3 3');
    line.setAttribute('opacity', '0.5');
    svgOverlay.append(line);

    // Small anchor dot on the feature.
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', anchorX);
    dot.setAttribute('cy', anchorY);
    dot.setAttribute('r', 2.5);
    dot.setAttribute('fill', 'currentColor');
    dot.setAttribute('opacity', '0.7');
    svgOverlay.append(dot);
  }
}

function svgToScreen(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  return pt.matrixTransform(svg.getScreenCTM());
}

function injectStyles() {
  if (document.getElementById('callout-mode-styles')) return;
  const s = document.createElement('style');
  s.id = 'callout-mode-styles';
  s.textContent = `
    .callout-toggle {
      position: absolute;
      top: var(--sp-4, 16px);
      right: calc(var(--sp-4, 16px) + 60px);
      z-index: 6;
      padding: 6px 12px;
      background: var(--bg-1, #f5efe0);
      color: var(--ink-1, #3d2f10);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 6px;
      font-family: var(--sans);
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .callout-toggle:hover { filter: brightness(0.97); }
    .callout-toggle.active {
      background: var(--sym-tr, #7a5a2a);
      color: var(--bg-1, #f5efe0);
      border-color: var(--sym-tr, #7a5a2a);
    }
    .callout-root {
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 3;
      color: var(--ink-2, #6b5030);
    }
    .callout-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .callout-box {
      position: absolute;
      width: 180px;
      pointer-events: auto;
      padding: 6px 8px;
      background: var(--bg-1, rgba(245,239,224,0.94));
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 4px;
      font-family: var(--sans);
      font-size: 10.5px;
      line-height: 1.35;
      color: var(--ink-1, #3d2f10);
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      cursor: pointer;
      transition: transform 0.1s;
    }
    .callout-box:hover {
      transform: scale(1.05);
      background: var(--bg-1, #f5efe0);
      z-index: 4;
    }
    .callout-title {
      font-weight: 600;
      font-size: 11px;
      color: var(--sym-tr, #7a5a2a);
      margin-bottom: 2px;
    }
    .callout-body { color: var(--ink-1, #3d2f10); }
    @media (max-width: 900px) {
      .callout-toggle { display: none; }
    }
  `;
  document.head.append(s);
}
