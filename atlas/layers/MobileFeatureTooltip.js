/**
 * MobileFeatureTooltip — lightweight tap-preview for point features
 * on mobile, replacing the sikhwal callout columns.
 *
 * On mobile (≤ 640 px), tapping a point-icon on the map used to open
 * the full bottom-sheet immediately, which was heavy for casual
 * exploration. Instead this plug-in shows a small floating card
 * anchored near the tap — icon + layer + name + first fact + a
 * "See full details →" button. Tap the button (or the card body)
 * to open the full sheet. Tap the map background to dismiss.
 *
 * Also hides the sikhwal callout columns on mobile — they're a
 * desktop-only marginal-notes pattern that doesn't fit a phone.
 */

const MOBILE_MQ = window.matchMedia('(max-width: 640px)');

let currentTip = null;
let installed = false;

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  if (MOBILE_MQ.matches) install();
  MOBILE_MQ.addEventListener?.('change', e => {
    if (e.matches && !installed) install();
    if (!e.matches && installed) uninstall();
  });
});

function install() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', onCapturedClick, true);   // capture phase
  document.addEventListener('click', onBubbledClick, false);   // bubble phase — for dismiss
  document.body.classList.add('mobile-tap-preview-on');
}

function uninstall() {
  if (!installed) return;
  installed = false;
  document.removeEventListener('click', onCapturedClick, true);
  document.removeEventListener('click', onBubbledClick, false);
  dismiss();
  document.body.classList.remove('mobile-tap-preview-on');
}

/* Capture-phase interceptor: fires BEFORE the .point-icon's own
 * onclick handler (which would normally call Atlas.interaction.select
 * and open the sheet). We short-circuit that and show a preview
 * instead. */
function onCapturedClick(ev) {
  const icon = ev.target.closest('.point-icon');
  if (!icon) return;
  // If the tap is inside an already-open tooltip's "See details" button,
  // let it through (that button handles its own action).
  if (ev.target.closest('.m-tap-tooltip')) return;
  ev.stopImmediatePropagation();
  ev.preventDefault();
  showTooltipFor(icon);
}

/* Bubble-phase dismisser: any click OUTSIDE a live tooltip clears it.
 * The capture-phase icon handler always stops propagation, so this
 * bubble handler fires for map-background / everything else. */
function onBubbledClick(ev) {
  if (!currentTip) return;
  if (currentTip.contains(ev.target)) return;
  if (ev.target.closest('.point-icon')) return; // another icon tapped — the
                                                  // capture handler will
                                                  // handle it
  dismiss();
}

function showTooltipFor(icon) {
  dismiss();
  const layerId = icon.dataset.layer;
  const featureId = icon.dataset.feature;
  const feature = Atlas.data.getFeature(layerId, featureId);
  if (!feature) return;
  const cfg = Atlas.layers.list().find(l => l.id === layerId);
  const layerName = cfg?.name || layerId;
  const iconEmoji = feature.properties?.icon || cfg?.icon || '•';
  const name = feature.properties?.name || featureId;
  const facts = Array.isArray(feature.properties?.notes?.facts)
    ? feature.properties.notes.facts : [];
  let fact = facts[0] || '';
  if (fact.length > 140) fact = fact.slice(0, 138).trimEnd() + '…';

  const tip = document.createElement('div');
  tip.className = 'm-tap-tooltip';
  tip.innerHTML = `
    <div class="mtt-head">
      <span class="mtt-icon">${escapeHtml(iconEmoji)}</span>
      <div class="mtt-body">
        <div class="mtt-layer">${escapeHtml(layerName)}</div>
        <div class="mtt-name">${escapeHtml(name)}</div>
      </div>
      <button class="mtt-close" aria-label="Close">×</button>
    </div>
    ${fact ? `<div class="mtt-fact">${escapeHtml(fact)}</div>` : ''}
    <button class="mtt-more">See full details →</button>
  `;
  document.body.append(tip);
  positionNear(tip, icon);
  currentTip = tip;

  tip.querySelector('.mtt-close').addEventListener('click', ev => {
    ev.stopPropagation();
    dismiss();
  });
  tip.querySelector('.mtt-more').addEventListener('click', ev => {
    ev.stopPropagation();
    dismiss();
    try { Atlas.interaction.select(layerId, featureId, { zoom: false }); } catch (_) {}
  });
}

function positionNear(tip, icon) {
  const iconRect = icon.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const vpH = window.innerHeight;
  const vpW = window.innerWidth;
  const margin = 12;

  // Prefer ABOVE the icon (out of the way of thumb). Fall back to below.
  const roomAbove = iconRect.top;
  const roomBelow = vpH - iconRect.bottom;
  let top;
  if (roomAbove > tipRect.height + margin + 12) {
    top = iconRect.top - tipRect.height - margin;
    tip.classList.add('mtt-above');
  } else if (roomBelow > tipRect.height + margin + 12) {
    top = iconRect.bottom + margin;
    tip.classList.add('mtt-below');
  } else {
    // Neither fits — dock at top of viewport (below the header).
    top = 68;
    tip.classList.add('mtt-below');
  }

  // Horizontally centre on the icon, clamp to viewport.
  const centreX = iconRect.left + iconRect.width / 2;
  let left = centreX - tipRect.width / 2;
  left = Math.max(margin, Math.min(vpW - tipRect.width - margin, left));

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

function dismiss() {
  if (currentTip?.parentNode) currentTip.remove();
  currentTip = null;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function injectStyles() {
  if (document.getElementById('mobile-feature-tooltip-styles')) return;
  const s = document.createElement('style');
  s.id = 'mobile-feature-tooltip-styles';
  s.textContent = `
    @media (max-width: 640px) {
      /* Hide the sikhwal callout apparatus entirely on mobile — it's a
       * desktop marginal-notes pattern. The point-icon overlay still
       * paints the emoji icons on the map; interaction is now the
       * MobileFeatureTooltip below. */
      .sikhwal-col-left,
      .sikhwal-col-right,
      .sikhwal-root { display: none !important; }

      /* Floating tap-preview card */
      .m-tap-tooltip {
        position: fixed;
        z-index: 30;
        width: min(280px, calc(100vw - 24px));
        background: var(--card, #fff);
        border: 1px solid var(--hair, rgba(0,0,0,0.14));
        border-radius: 14px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.16);
        padding: 12px 14px;
        font-family: var(--sans);
        font-size: 13px;
        color: var(--ink, #2d2823);
        pointer-events: auto;
      }
      /* Tail — points at the icon */
      .m-tap-tooltip::after {
        content: "";
        position: absolute;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        width: 10px; height: 10px;
        background: var(--card, #fff);
        border: 1px solid var(--hair, rgba(0,0,0,0.14));
      }
      .m-tap-tooltip.mtt-above::after {
        bottom: -6px;
        border-top: none; border-left: none;
      }
      .m-tap-tooltip.mtt-below::after {
        top: -6px;
        border-bottom: none; border-right: none;
      }

      .m-tap-tooltip .mtt-head {
        display: flex; align-items: flex-start; gap: 10px;
      }
      .m-tap-tooltip .mtt-icon {
        font-size: 20px; line-height: 1;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .m-tap-tooltip .mtt-body {
        flex: 1; min-width: 0;
      }
      .m-tap-tooltip .mtt-layer {
        font-size: 10px; font-weight: 700;
        color: var(--ink-3, #6d6558);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 2px;
      }
      .m-tap-tooltip .mtt-name {
        font-family: var(--serif, Georgia);
        font-size: 15px;
        font-weight: 600;
        color: var(--ink, #2d2823);
        line-height: 1.2;
        word-wrap: break-word;
      }
      .m-tap-tooltip .mtt-close {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: rgba(0,0,0,0.05);
        border: none;
        color: var(--ink-2, #4a4438);
        font-size: 16px; line-height: 1;
        flex-shrink: 0;
      }
      .m-tap-tooltip .mtt-fact {
        margin-top: 8px;
        font-size: 12.5px;
        line-height: 1.45;
        color: var(--ink-2, #4a4438);
      }
      .m-tap-tooltip .mtt-more {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 10px 14px;
        background: var(--indigo-600, #4f46e5);
        color: white;
        border: none;
        border-radius: 10px;
        font-family: var(--sans);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .m-tap-tooltip .mtt-more:active { transform: scale(0.98); }
    }
  `;
  document.head.append(s);
}
