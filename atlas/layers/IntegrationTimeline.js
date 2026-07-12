/**
 * IntegrationTimeline — chronological UI for the Rajasthan Integration layer.
 *
 * The rajasthan-integration layer has 22 point features across 7 phases
 * (Matsya Union → SRA 1956). Rendered as flat edge-column callouts they
 * lose their most important dimension: TIME. This plug-in replaces the
 * callouts (only for this layer) with a horizontal timeline strip at the
 * top of the map, showing the 7 phases in chronological order.
 *
 * Behaviour:
 *   • When the rajasthan-integration layer is turned ON, a timeline strip
 *     appears at the top of the map. Each phase = a node with a Roman
 *     numeral, its date, and a short label.
 *   • Clicking a phase highlights that phase's point features on the map
 *     (icons enlarge) and shows a compact info card below the timeline
 *     summarising the phase (states involved + key fact).
 *   • Clicking a phase again — or selecting a different one — swaps the
 *     highlight. Clicking outside clears both.
 *
 * Interop with CalloutMode: CalloutMode.eligibleLayersForCallouts()
 * excludes rajasthan-integration when this timeline is mounted, so users
 * never see both a timeline and edge-column callouts for the same layer.
 * The point-icon overlay still paints the ①–⑦ icons at each capital's
 * location on the map.
 */

import { el } from '../core/util/dom.js';

const LAYER_ID = 'rajasthan-integration';

/* At the time of integration (1948-56) Rajasthan's units were PRINCELY
 * STATES, not districts. The modern 41-district map was formed much
 * later (Jaipur split in 1949, several new districts in 1982-2013, and
 * eight more created in 2023). This table maps each modern district to
 * the pre-1956 princely-state whose territory dominated it — used to
 * approximate the historical demarcation when a phase is selected.
 *
 * Phase 5 is the Matsya-Union merger into Greater Rajasthan and does
 * not add territory; it highlights the same districts as Phase 1.
 */
const DISTRICT_TO_PHASE = {
  // Phase 1 — Matsya Union (18 Mar 1948): Alwar + Bharatpur + Dholpur + Karauli
  'alwar':               1,
  'khairthal-tijara':    1,   // carved from Alwar 2023
  'bharatpur':           1,
  'deeg':                1,   // carved from Bharatpur 2023
  'dholpur':             1,
  'karauli':             1,

  // Phase 2 — USR (25 Mar 1948): Kota, Bundi, Banswara, Dungarpur,
  //                              Jhalawar, Pratapgarh, Tonk (+ Kishangarh, Shahpura)
  'kota':                2,
  'baran':               2,   // was part of Kota state
  'bundi':               2,
  'banswara':            2,
  'dungarpur':           2,
  'jhalawar':            2,
  'pratapgarh':          2,
  'tonk':                2,

  // Phase 3 — Mewar merger (18 Apr 1948): Udaipur State
  'udaipur':             3,
  'chittorgarh':         3,
  'rajsamand':           3,
  'salumbar':            3,   // carved from Udaipur 2023
  'bhilwara':            3,   // majority-Mewar; Shahpura was a small sub-thikana

  // Phase 4 — Greater Rajasthan (30 Mar 1949): Jaipur + Marwar + Bikaner + Jaisalmer
  'jaipur':              4,
  'dausa':               4,   // was part of Jaipur State
  'sikar':               4,   // Shekhawati under Jaipur
  'jhunjhunu':           4,   // Shekhawati under Jaipur
  'kotputli-behror':     4,   // carved from Jaipur 2023
  'sawai-madhopur':      4,   // was part of Jaipur State

  'jodhpur':             4,   // Marwar
  'pali':                4,   // Marwar
  'nagaur':              4,   // Marwar
  'barmer':              4,   // Marwar
  'jalore':              4,   // Marwar
  'balotra':             4,   // carved from Barmer 2023
  'phalodi':             4,   // carved from Jodhpur 2023
  'didwana-kuchaman':    4,   // carved from Nagaur 2023

  'bikaner':             4,   // Bikaner State
  'churu':               4,   // Bikaner State
  'hanumangarh':         4,   // Bikaner State
  'sri-ganganagar':      4,   // Bikaner State
  'jaisalmer':           4,   // Jaisalmer State

  // Phase 6 — United Rajasthan (26 Jan 1950): Sirohi partial merger
  'sirohi':              6,

  // Phase 7 — SRA (1 Nov 1956): Ajmer-Merwara Province added
  'ajmer':               7,
  'beawar':              7,   // carved from Ajmer 2023; historically Ajmer-Merwara
};
const PHASES = [
  {
    n: 1, roman: '①', date: '18 Mar 1948', shortDate: '18 Mar', shortYear: '1948',
    name: 'Matsya Union',
    states: ['Alwar', 'Bharatpur', 'Dholpur', 'Karauli'],
    blurb: 'First step in Rajasthan\'s integration. Four princely states of the Braj region merged, with Dholpur\'s Maharaja Udai Bhan Singh as Rajpramukh.',
  },
  {
    n: 2, roman: '②', date: '25 Mar 1948', shortDate: '25 Mar', shortYear: '1948',
    name: 'United State of Rajasthan',
    states: ['Kota', 'Bundi', 'Banswara', 'Dungarpur', 'Jhalawar', 'Pratapgarh', 'Tonk', 'Kishangarh', 'Shahpura'],
    blurb: 'Nine southern-eastern princely states formed the USR under Maharao Bhim Singh II of Kota — Rajasthan\'s first mini-federation.',
  },
  {
    n: 3, roman: '③', date: '18 Apr 1948', shortDate: '18 Apr', shortYear: '1948',
    name: 'Mewar joins USR',
    states: ['Udaipur (Mewar)'],
    blurb: 'Mewar — India\'s oldest continuous royal house — merged into USR under Maharana Bhupal Singh, who became Rajpramukh of the enlarged union.',
  },
  {
    n: 4, roman: '④', date: '30 Mar 1949', shortDate: '30 Mar', shortYear: '1949',
    name: 'Greater Rajasthan',
    states: ['Jaipur', 'Jodhpur', 'Bikaner', 'Jaisalmer'],
    blurb: 'The four big Rajput states joined USR. Sardar Patel inaugurated it. Jaipur became the new capital. Celebrated annually as Rajasthan Diwas (30 March).',
  },
  {
    n: 5, roman: '⑤', date: '15 May 1949', shortDate: '15 May', shortYear: '1949',
    name: 'United Greater Rajasthan',
    states: ['Matsya Union merged in'],
    blurb: 'Alwar-Bharatpur-Dholpur-Karauli (Matsya Union) merged into Greater Rajasthan, forming the Sanyukta Vishal Rajasthan.',
  },
  {
    n: 6, roman: '⑥', date: '26 Jan 1950', shortDate: '26 Jan', shortYear: '1950',
    name: 'United Rajasthan',
    states: ['Sirohi (partly)'],
    blurb: 'Formally recognised on Republic Day. Sirohi partly merged — Mount Abu / Delwara held by Bombay State. Heera Lal Shastri became Rajasthan\'s first CM.',
  },
  {
    n: 7, roman: '⑦', date: '1 Nov 1956', shortDate: '1 Nov', shortYear: '1956',
    name: 'Modern Rajasthan (SRA)',
    states: ['Ajmer-Merwara', 'Abu-Delwara', 'Sunel Tappa (in)', 'Sironj (out)'],
    blurb: 'States Reorganisation Act — Ajmer, Abu-Delwara and Sunel Tappa added; Sironj went to MP. Rajpramukh replaced by Governor. The modern boundary was fixed on this date.',
  },
];

let mounted = false;
let strip = null;
let card  = null;
let selectedPhase = null;

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  Atlas.bus.on('layer:visibility', ({ id, visible }) => {
    if (id !== LAYER_ID) return;
    if (visible) mount();
    else unmount();
  });
  // Deselect when the user clicks the map background or clears selection.
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) select(null);
  });
});

/* Public — CalloutMode reads this to decide whether to skip the layer. */
export function integrationTimelineActive() { return mounted; }
if (typeof window !== 'undefined') {
  window.__integrationTimelineActive = () => mounted;
}

function mount() {
  if (mounted) return;
  const mapEl = document.querySelector('.a-map');
  if (!mapEl) return;
  strip = el('div', { class: 'itl-strip' });
  // Title dropped — nodes carry enough context. Card compacts into a
  // single tight paragraph. Every pixel saved keeps the strip out of
  // Rajasthan's northern silhouette when the card expands.
  const row = el('div', { class: 'itl-row' });
  PHASES.forEach((p, idx) => {
    const node = el('button', {
      class: 'itl-node',
      'data-phase': String(p.n),
      onclick: () => select(p.n),
    });
    node.append(el('div', { class: 'itl-roman' }, [p.roman]));
    // Single-line date + year keeps the strip compact so the expanded
    // phase card doesn't spill over the Rajasthan silhouette.
    node.append(el('div', { class: 'itl-date' }, [`${p.shortDate} ${p.shortYear.slice(2)}`]));
    row.append(node);
    if (idx < PHASES.length - 1) row.append(el('div', { class: 'itl-connector' }));
  });
  strip.append(row);
  card = el('div', { class: 'itl-card hidden' });
  strip.append(card);
  mapEl.append(strip);
  mounted = true;
  // Refresh CalloutMode so it drops the integration layer from callouts.
  Atlas.bus.emit('layer:visibility', { id: LAYER_ID, visible: true, __rerender: true });
}

function unmount() {
  if (!mounted) return;
  if (strip?.parentNode) strip.remove();
  strip = null;
  card  = null;
  mounted = false;
  selectedPhase = null;
  clearHighlight();
}

function select(phaseN) {
  if (!strip) return;
  selectedPhase = phaseN;
  strip.querySelectorAll('.itl-node').forEach(n => {
    n.classList.toggle('active', Number(n.dataset.phase) === phaseN);
  });
  const phase = PHASES.find(p => p.n === phaseN);
  if (!phase) {
    card?.classList.add('hidden');
    clearHighlight();
    return;
  }
  card.innerHTML = '';
  // Ultra-compact single-line head: "④ Greater Rajasthan · 30 Mar 1949"
  card.append(el('div', { class: 'itl-card-head' }, [
    el('span', { class: 'itl-card-roman' }, [phase.roman]),
    el('span', { class: 'itl-card-name' },  [` ${phase.name}`]),
    el('span', { class: 'itl-card-date' },  [` · ${phase.date}`]),
  ]));
  // Two-column mini layout — states on the left, blurb on the right —
  // keeps the total card height under ~50px even for verbose phases.
  const body = el('div', { class: 'itl-card-body' });
  body.append(el('div', { class: 'itl-card-states' }, [phase.states.join(' · ')]));
  body.append(el('div', { class: 'itl-card-blurb' }, [phase.blurb]));
  card.append(body);
  card.classList.remove('hidden');
  applyHighlight(phaseN);
  applyDistrictHighlight(phaseN);
}

/* Highlight this phase's point features on the map. Adds a data-phase-hi
 * attribute to each matching point-icon in the overlay; CSS enlarges +
 * ring-highlights those icons. */
function applyHighlight(phaseN) {
  clearHighlight();
  const feats = (Atlas.layers.features(LAYER_ID) || []).filter(f => Number(f.properties?.phase) === phaseN);
  const ids = new Set(feats.map(f => f.id));
  document.querySelectorAll('.point-icon-overlay .point-icon').forEach(dot => {
    if (dot.dataset.layer === LAYER_ID && ids.has(dot.dataset.feature)) {
      dot.classList.add('itl-hi');
    }
  });
}

function clearHighlight() {
  document.querySelectorAll('.point-icon.itl-hi').forEach(dot => dot.classList.remove('itl-hi'));
  clearDistrictHighlight();
}

/* Cumulative-view highlight.
 * Each phase paints TWO things:
 *   • existing (amber)    — districts already part of the main
 *                            integrated body before this phase.
 *   • new-this-phase (bright orange) — districts joining IN this phase.
 *
 * The Matsya Union is treated as a SEPARATE confederation during
 * Phases 2-4 (they had already formed at Phase 1 but had not yet joined
 * the main body). When shown during those phases the Matsya districts
 * get a third "separate" tint. From Phase 5 onwards they are part of
 * the main body.
 */
const MAIN_BODY_PHASES = {
  1: [],                       // Matsya Union forms; main body still to come
  2: [2],                      // USR alone
  3: [2, 3],                   // USR + Mewar
  4: [2, 3, 4],                // Greater Rajasthan (Matsya still separate)
  5: [2, 3, 4, 1],             // United Greater Rajasthan (Matsya merged in)
  6: [2, 3, 4, 1, 6],          // United Rajasthan (+ Sirohi)
  7: [2, 3, 4, 1, 6, 7],       // Modern Rajasthan (+ Ajmer-Merwara)
};
const NEW_AT_PHASE = {
  1: [1],                      // Matsya Union formed
  2: [2],                      // USR formed
  3: [3],                      // Mewar joined USR
  4: [4],                      // Big four joined Greater Rajasthan
  5: [1],                      // Matsya merged into Greater Rajasthan
  6: [6],                      // Sirohi partial merger
  7: [7],                      // Ajmer-Merwara + Abu-Delwara
};
// Nothing is shown as "separate" — each phase focuses on its own event.
// Matsya Union appears as "newly added" at Phase 1 (formation) and again
// at Phase 5 (merger into Greater Rajasthan); in between it is off-map.
const SEPARATE_AT_PHASE = {
  1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
};

function applyDistrictHighlight(phaseN) {
  clearDistrictHighlight();
  if (!phaseN) return;
  const newSet       = new Set(NEW_AT_PHASE[phaseN]      || []);
  const separateSet  = new Set(SEPARATE_AT_PHASE[phaseN] || []);
  // "existing" is main-body-at-this-phase minus what's new this phase.
  const existingSet  = new Set((MAIN_BODY_PHASES[phaseN] || [])
    .filter(p => !newSet.has(p)));
  document.querySelectorAll('.layer-districts path.feature').forEach(p => {
    const belongsTo = DISTRICT_TO_PHASE[p.dataset.feature];
    if (belongsTo == null) return;
    if (newSet.has(belongsTo))      p.classList.add('itl-district-new');
    else if (existingSet.has(belongsTo)) p.classList.add('itl-district-existing');
    else if (separateSet.has(belongsTo)) p.classList.add('itl-district-separate');
  });
}

function clearDistrictHighlight() {
  document.querySelectorAll(
    '.layer-districts path.itl-district-new, ' +
    '.layer-districts path.itl-district-existing, ' +
    '.layer-districts path.itl-district-separate'
  ).forEach(p => {
    p.classList.remove('itl-district-new', 'itl-district-existing', 'itl-district-separate');
  });
}

/* ── Styles ─────────────────────────────────────────────────────── */
function injectStyles() {
  if (document.getElementById('integration-timeline-styles')) return;
  const s = document.createElement('style');
  s.id = 'integration-timeline-styles';
  s.textContent = `
    .itl-strip {
      position: absolute;
      /* Pull the strip up close to the top so the expanded phase card
       * still fits inside the map's northern whitespace without touching
       * the Rajasthan silhouette. */
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      width: min(720px, calc(100% - 40px));
      padding: 5px 12px 7px;
      background: color-mix(in srgb, var(--bg-1, #f5efe0) 96%, transparent);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.14);
      font-family: var(--sans);
      color: var(--ink-1, #3d2f10);
    }
    .itl-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--ink-2, #6b5030);
      font-weight: 600;
      text-align: center;
      margin-bottom: 3px;
    }
    .itl-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0;
    }
    .itl-node {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2px 5px;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 5px;
      cursor: pointer;
      font-family: inherit;
      color: var(--ink-1, #3d2f10);
      transition: background 0.15s, border-color 0.15s;
    }
    .itl-node:hover {
      background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 8%, transparent);
    }
    .itl-node.active {
      background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 18%, transparent);
      border-color: var(--sym-tr, #7a5a2a);
    }
    .itl-roman {
      font-size: 16px;
      line-height: 1;
      color: var(--sym-tr, #7a5a2a);
    }
    .itl-date {
      font-size: 9.5px;
      color: var(--ink-1, #3d2f10);
      margin-top: 1px;
      white-space: nowrap;
    }
    .itl-connector {
      flex: 1 1 auto;
      height: 1px;
      margin: 0 3px 10px;
      background: color-mix(in srgb, var(--ink-3, #ba9863) 55%, transparent);
    }
    .itl-card {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dotted color-mix(in srgb, var(--ink-3, #ba9863) 45%, transparent);
      font-size: 10.5px;
      line-height: 1.3;
      color: var(--ink-1, #3d2f10);
    }
    .itl-card.hidden { display: none; }
    .itl-card-head {
      font-weight: 600;
      color: var(--sym-tr, #7a5a2a);
      margin-bottom: 2px;
      font-size: 11px;
    }
    .itl-card-name  { color: var(--ink-1, #3d2f10); font-weight: 600; }
    .itl-card-date  { color: var(--ink-2, #6b5030); font-weight: 500; }
    .itl-card-roman { font-size: 13px; }
    .itl-card-body {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .itl-card-states {
      flex: 0 0 40%;
      font-size: 10px;
      color: var(--ink-2, #6b5030);
      border-right: 1px dotted color-mix(in srgb, var(--ink-3, #ba9863) 40%, transparent);
      padding-right: 8px;
    }
    .itl-card-blurb {
      flex: 1 1 auto;
      font-size: 10.5px;
      color: var(--ink-1, #3d2f10);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    /* Highlighted point icons for the selected phase's features. */
    .point-icon.itl-hi {
      transform: translate(-50%, -50%) scale(1.6);
      filter: drop-shadow(0 0 6px var(--sym-tr, #7a5a2a));
      z-index: 5;
    }
    /* Cumulative-view district colours.
     * NEW (this phase) — bright warm orange, thick stroke.
     * EXISTING (already merged in earlier phases) — muted amber.
     * SEPARATE (formed but not yet part of the main body — Matsya
     *   Union during Phases 2-4) — cool blue-grey.
     */
    .a-map svg .layer-districts path.itl-district-new {
      fill: color-mix(in srgb, #d97a2a 60%, transparent) !important;
      fill-opacity: 1 !important;
      stroke: #7a3a1a !important;
      stroke-width: 1.4 !important;
      opacity: 1 !important;
    }
    .a-map svg .layer-districts path.itl-district-existing {
      fill: color-mix(in srgb, #c9a05a 50%, transparent) !important;
      fill-opacity: 1 !important;
      stroke: #8a6c3a !important;
      stroke-width: 1 !important;
      opacity: 1 !important;
    }
    .a-map svg .layer-districts path.itl-district-separate {
      fill: color-mix(in srgb, #6b7a90 30%, transparent) !important;
      fill-opacity: 1 !important;
      stroke: #4a5a70 !important;
      stroke-width: 1 !important;
      stroke-dasharray: 3 2;
      opacity: 1 !important;
    }
    /* Legend swatches inside the phase info card. */
    .itl-swatch {
      display: inline-block;
      width: 12px; height: 10px;
      margin-right: 4px;
      vertical-align: middle;
      border-radius: 2px;
      border: 1px solid rgba(0,0,0,0.15);
    }
    .itl-sw-new       { background: color-mix(in srgb, #d97a2a 70%, transparent); }
    .itl-sw-existing  { background: color-mix(in srgb, #c9a05a 60%, transparent); }
    .itl-sw-separate  { background: color-mix(in srgb, #6b7a90 40%, transparent); }
    .itl-legend {
      margin-top: 6px;
      font-size: 10.5px;
      color: var(--ink-2, #6b5030);
      display: flex; flex-wrap: wrap; gap: 10px;
    }
    .itl-legend span { display: inline-flex; align-items: center; }
    .itl-card-note {
      margin-top: 6px;
      font-size: 10px;
      color: var(--ink-2, #6b5030);
      opacity: 0.72;
      font-style: italic;
    }
    @media (max-width: 780px) {
      .itl-strip { display: none; }
    }
  `;
  document.head.append(s);
}
