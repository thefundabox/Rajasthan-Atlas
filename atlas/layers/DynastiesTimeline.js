/**
 * DynastiesTimeline — accordion UI for the Rajput Dynasties layer.
 *
 * Same left-side accordion pattern as IntegrationTimeline, but each row
 * is a DYNASTY (not a phase-in-time). Clicking a dynasty highlights the
 * modern districts that lay within its peak territorial extent.
 *
 * Only one of the two timelines is active at a time. If the user turns
 * on Rajput Dynasties while Integration is already active, we turn off
 * the integration layer (so the strip cedes the left slot cleanly).
 */

import { el } from '../core/util/dom.js';

const LAYER_ID = 'rajput-dynasties';
const OTHER_TIMELINE_LAYER = 'rajasthan-integration';

/* Each dynasty maps to the modern districts that lay within its
 * peak territorial extent. Overlap is possible — a district could
 * legitimately map to several dynasties across time — but we assign it
 * to the dynasty most identified with it in standard Rajputana
 * historiography. Cadet branches (Alwar Kachhawahas, Kishangarh
 * Rathores, Sirohi Deoras, Dholpur Jats) are folded into their parent. */
const DISTRICT_TO_DYNASTY = {
  // Chauhans of Shakambhari–Ajmer (peak: 12th c. Prithviraj III)
  'ajmer':               'dyn-chauhans-ajmer',
  'beawar':              'dyn-chauhans-ajmer',

  // Sisodias / Guhilas of Mewar (Chittor → Udaipur, 728–1949)
  'udaipur':             'dyn-sisodias-mewar',
  'chittorgarh':         'dyn-sisodias-mewar',
  'rajsamand':           'dyn-sisodias-mewar',
  'salumbar':            'dyn-sisodias-mewar',
  'bhilwara':            'dyn-sisodias-mewar',
  'pratapgarh':          'dyn-sisodias-mewar',
  'banswara':            'dyn-sisodias-mewar', // Vagad — a Sisodia cadet branch
  'dungarpur':           'dyn-sisodias-mewar', // Vagad — a Sisodia cadet branch

  // Rathores of Marwar (Jodhpur — 1226–1949)
  'jodhpur':             'dyn-rathores-marwar',
  'pali':                'dyn-rathores-marwar',
  'nagaur':              'dyn-rathores-marwar', // held by Rathores from 15th c.
  'barmer':              'dyn-rathores-marwar',
  'jalore':              'dyn-rathores-marwar',
  'balotra':             'dyn-rathores-marwar',
  'phalodi':             'dyn-rathores-marwar',
  'didwana-kuchaman':    'dyn-rathores-marwar',
  'sirohi':              'dyn-rathores-marwar', // Sirohi Deora Chauhans were Marwar tributaries

  // Rathores of Bikaner (1488–1949, split from Marwar)
  'bikaner':             'dyn-rathores-bikaner',
  'churu':               'dyn-rathores-bikaner',
  'hanumangarh':         'dyn-rathores-bikaner',
  'sri-ganganagar':      'dyn-rathores-bikaner',

  // Kachhawahas of Amber–Jaipur (1128–1949)
  'jaipur':              'dyn-kachhawahas-jaipur',
  'dausa':               'dyn-kachhawahas-jaipur',
  'sikar':               'dyn-kachhawahas-jaipur', // Shekhawati — a Kachhawaha sub-branch
  'jhunjhunu':           'dyn-kachhawahas-jaipur',
  'kotputli-behror':     'dyn-kachhawahas-jaipur',
  'sawai-madhopur':      'dyn-kachhawahas-jaipur',
  'alwar':               'dyn-kachhawahas-jaipur', // Naruka Kachhawaha cadet branch (1770)
  'khairthal-tijara':    'dyn-kachhawahas-jaipur',

  // Bhatis of Jaisalmer (1156–1949)
  'jaisalmer':           'dyn-bhatis-jaisalmer',

  // Hadas of Bundi–Kota (1241–1949; split 1631)
  'bundi':               'dyn-hadas-bundi-kota',
  'kota':                'dyn-hadas-bundi-kota',
  'baran':               'dyn-hadas-bundi-kota', // was part of Kota state
  'jhalawar':            'dyn-hadas-bundi-kota', // split from Kota 1838

  // Jats of Bharatpur (1670s–1949)
  'bharatpur':           'dyn-jats-bharatpur',
  'deeg':                'dyn-jats-bharatpur',
  'dholpur':             'dyn-jats-bharatpur', // Dholpur Jats — sister branch

  // Yaduvanshis of Karauli (1348–1949)
  'karauli':             'dyn-yaduvanshis-karauli',

  // Nawabs of Tonk (1806–1949)
  'tonk':                'dyn-nawabs-tonk',
};

/* Presentation order — chronological by founding, matching a natural
 * teaching sequence: Chauhans first (7th c.), Nawabs last (1806). */
const DYNASTIES = [
  { id: 'dyn-chauhans-ajmer',      name: 'Chauhans of Ajmer',     periodShort: '7th c. – 1192',   color: '#a94a4a' },
  { id: 'dyn-sisodias-mewar',      name: 'Sisodias of Mewar',     periodShort: '728 – 1949',      color: '#c15a2a' },
  { id: 'dyn-kachhawahas-jaipur',  name: 'Kachhawahas of Jaipur', periodShort: '1128 – 1949',     color: '#c98a3a' },
  { id: 'dyn-bhatis-jaisalmer',    name: 'Bhatis of Jaisalmer',   periodShort: '1156 – 1949',     color: '#d9a54a' },
  { id: 'dyn-rathores-marwar',     name: 'Rathores of Marwar',    periodShort: '1226 – 1949',     color: '#8a5a2a' },
  { id: 'dyn-hadas-bundi-kota',    name: 'Hadas of Bundi–Kota',   periodShort: '1241 – 1949',     color: '#6a4a2a' },
  { id: 'dyn-yaduvanshis-karauli', name: 'Yaduvanshis of Karauli', periodShort: '1348 – 1949',    color: '#5a6a3a' },
  { id: 'dyn-rathores-bikaner',    name: 'Rathores of Bikaner',   periodShort: '1488 – 1949',     color: '#4a5a6a' },
  { id: 'dyn-jats-bharatpur',      name: 'Jats of Bharatpur',     periodShort: '1670s – 1949',    color: '#4a6a5a' },
  { id: 'dyn-nawabs-tonk',         name: 'Nawabs of Tonk',        periodShort: '1806 – 1949',     color: '#5a4a6a' },
];

let mounted = false;
let strip = null;
let selectedId = null;

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  Atlas.bus.on('layer:visibility', ({ id, visible }) => {
    if (id !== LAYER_ID) return;
    if (visible) mount();
    else unmount();
  });
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) select(null);
  });
});

export function dynastiesTimelineActive() { return mounted; }
if (typeof window !== 'undefined') {
  window.__dynastiesTimelineActive = () => mounted;
}

function mount() {
  if (mounted) return;
  // If the integration timeline is up, turn its layer off so we don't
  // stack two accordions in the same left slot.
  if (window.__integrationTimelineActive?.()) {
    Atlas.layers.setVisible(OTHER_TIMELINE_LAYER, false);
  }

  strip = el('div', { class: 'rdt-strip' });
  strip.append(el('div', { class: 'rdt-title' }, [
    'Rajput Dynasties',
    el('div', { class: 'rdt-title-sub' }, ['click a house — its districts light up']),
  ]));
  const list = el('div', { class: 'rdt-list' });
  DYNASTIES.forEach(d => {
    const row = el('div', { class: 'rdt-row', 'data-dyn': d.id });
    const btn = el('button', {
      class: 'rdt-node',
      'data-dyn': d.id,
      onclick: () => select(d.id === selectedId ? null : d.id),
    });
    btn.append(el('span', { class: 'rdt-crown', style: `color:${d.color}` }, ['👑']));
    const label = el('span', { class: 'rdt-label' });
    label.append(el('span', { class: 'rdt-name' }, [d.name]));
    label.append(el('span', { class: 'rdt-date' }, [d.periodShort]));
    btn.append(label);
    row.append(btn);
    const detail = el('div', { class: 'rdt-detail hidden' });
    row.append(detail);
    list.append(row);
  });
  strip.append(list);
  document.body.append(strip);
  mounted = true;
  document.body.classList.add('rdt-active', 'itl-active');
}

function unmount() {
  if (!mounted) return;
  if (strip?.parentNode) strip.remove();
  strip = null;
  mounted = false;
  selectedId = null;
  document.body.classList.remove('rdt-active');
  // Only clear itl-active if the integration timeline isn't also using it.
  if (!window.__integrationTimelineActive?.()) {
    document.body.classList.remove('itl-active');
  }
  clearHighlight();
}

function select(dynId) {
  if (!strip) return;
  selectedId = dynId;
  strip.querySelectorAll('.rdt-row').forEach(row => {
    const isActive = row.dataset.dyn === dynId;
    row.querySelector('.rdt-node').classList.toggle('active', isActive);
    const detail = row.querySelector('.rdt-detail');
    detail.classList.toggle('hidden', !isActive);
    if (isActive) {
      const feats = Atlas.layers.features(LAYER_ID) || [];
      const dyn   = feats.find(f => f.id === dynId);
      const props = dyn?.properties || {};
      detail.innerHTML = '';
      if (props.capital) {
        detail.append(el('div', { class: 'rdt-detail-line' }, [
          el('span', { class: 'rdt-detail-label' }, ['Capital: ']),
          props.capital,
        ]));
      }
      if (props.founder) {
        detail.append(el('div', { class: 'rdt-detail-line' }, [
          el('span', { class: 'rdt-detail-label' }, ['Founder: ']),
          props.founder,
        ]));
      }
      if (props.peakRuler) {
        detail.append(el('div', { class: 'rdt-detail-line' }, [
          el('span', { class: 'rdt-detail-label' }, ['Peak: ']),
          props.peakRuler,
        ]));
      }
      const districtCount = countDistrictsFor(dynId);
      if (districtCount) {
        detail.append(el('div', { class: 'rdt-detail-note' }, [
          `${districtCount} modern district${districtCount === 1 ? '' : 's'} in territory`,
        ]));
      }
    }
  });
  if (!dynId) {
    clearHighlight();
    return;
  }
  applyPointHighlight(dynId);
  applyDistrictHighlight(dynId);
}

function countDistrictsFor(dynId) {
  let n = 0;
  for (const v of Object.values(DISTRICT_TO_DYNASTY)) if (v === dynId) n++;
  return n;
}

function applyPointHighlight(dynId) {
  document.querySelectorAll('.point-icon.itl-hi').forEach(dot => dot.classList.remove('itl-hi'));
  document.querySelectorAll('.point-icon-overlay .point-icon').forEach(dot => {
    if (dot.dataset.layer === LAYER_ID && dot.dataset.feature === dynId) {
      dot.classList.add('itl-hi');
    }
  });
}

function applyDistrictHighlight(dynId) {
  clearDistrictHighlight();
  if (!dynId) return;
  document.querySelectorAll('.layer-districts path.feature').forEach(p => {
    if (DISTRICT_TO_DYNASTY[p.dataset.feature] === dynId) {
      p.classList.add('rdt-district-in');
    }
  });
}

function clearHighlight() {
  document.querySelectorAll('.point-icon.itl-hi').forEach(dot => dot.classList.remove('itl-hi'));
  clearDistrictHighlight();
}

function clearDistrictHighlight() {
  document.querySelectorAll('.layer-districts path.rdt-district-in').forEach(p => {
    p.classList.remove('rdt-district-in');
  });
}

/* ── Styles ────────────────────────────────────────────────────── */
function injectStyles() {
  if (document.getElementById('dynasties-timeline-styles')) return;
  const s = document.createElement('style');
  s.id = 'dynasties-timeline-styles';
  s.textContent = `
    .rdt-strip {
      position: fixed;
      top: 165px;
      left: 12px;
      bottom: 12px;
      width: 220px;
      z-index: 11;
      padding: 10px 12px;
      overflow-y: auto;
      background: color-mix(in srgb, var(--bg-1, #f5efe0) 96%, transparent);
      border: 1px solid var(--ink-3, #ba9863);
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.14);
      font-family: var(--sans);
      color: var(--ink-1, #3d2f10);
      box-sizing: border-box;
    }
    .rdt-strip::-webkit-scrollbar { width: 6px; }
    .rdt-strip::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--ink-3, #ba9863) 55%, transparent);
      border-radius: 3px;
    }
    .rdt-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--sym-tr, #7a5a2a);
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.25;
    }
    .rdt-title-sub {
      font-size: 10px;
      color: var(--ink-2, #6b5030);
      font-weight: 500;
      letter-spacing: 0.03em;
      text-transform: none;
      margin-top: 1px;
    }
    .rdt-list { display: flex; flex-direction: column; gap: 4px; }
    .rdt-row  { position: relative; }
    .rdt-node {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 5px 8px;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 5px;
      cursor: pointer;
      font-family: inherit;
      color: var(--ink-1, #3d2f10);
      text-align: left;
      transition: background 0.15s, border-color 0.15s;
    }
    .rdt-node:hover {
      background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 8%, transparent);
    }
    .rdt-node.active {
      background: color-mix(in srgb, var(--sym-tr, #7a5a2a) 18%, transparent);
      border-color: var(--sym-tr, #7a5a2a);
    }
    .rdt-crown {
      font-size: 15px;
      line-height: 1;
      flex: 0 0 auto;
      filter: saturate(1.2);
    }
    .rdt-label {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-width: 0;
    }
    .rdt-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--ink-1, #3d2f10);
      line-height: 1.2;
    }
    .rdt-date {
      font-size: 9.5px;
      color: var(--ink-2, #6b5030);
      margin-top: 1px;
    }
    .rdt-detail {
      padding: 4px 10px 8px 30px;
      font-size: 10.5px;
      color: var(--ink-1, #3d2f10);
      line-height: 1.4;
    }
    .rdt-detail.hidden { display: none; }
    .rdt-detail-line { margin-top: 2px; }
    .rdt-detail-label { color: var(--ink-2, #6b5030); font-weight: 500; }
    .rdt-detail-note {
      margin-top: 4px;
      font-size: 10px;
      color: var(--sym-tr, #7a5a2a);
      font-style: italic;
    }
    /* Dynasty district highlight — a single warm tint (no cumulative
     * layer, so no need for existing/new distinction). */
    .a-map svg .layer-districts path.rdt-district-in {
      fill: color-mix(in srgb, #b56a3a 55%, transparent) !important;
      fill-opacity: 1 !important;
      stroke: #6a3a1a !important;
      stroke-width: 1.3 !important;
      opacity: 1 !important;
    }
    @media (max-width: 780px) and (min-width: 641px) {
      .rdt-strip { display: none; }
    }
    /* Mobile ribbon — mirror of IntegrationTimeline's mobile rules. */
    @media (max-width: 640px) {
      .rdt-strip {
        top: auto !important;
        left: 0 !important; right: 0 !important; bottom: 0 !important;
        width: 100vw !important; max-width: 100vw !important;
        height: 128px !important; max-height: 128px !important;
        border-radius: 14px 14px 0 0 !important;
        border-left: none !important; border-right: none !important;
        border-bottom: none !important;
        padding: 8px 12px 4px !important;
        overflow-y: hidden !important;
        z-index: 22 !important;
        box-shadow: 0 -4px 14px rgba(0,0,0,0.08) !important;
      }
      .rdt-title { font-size: 10.5px !important; margin-bottom: 6px !important; display: flex; justify-content: space-between; align-items: baseline; }
      .rdt-title-sub { display: inline !important; font-size: 9.5px; margin-top: 0; text-transform: none; letter-spacing: 0.02em; }
      .rdt-list { flex-direction: row !important; gap: 6px !important; overflow-x: auto; padding-bottom: 4px; }
      .rdt-row { flex-shrink: 0; width: 118px; }
      .rdt-node {
        flex-direction: column !important;
        align-items: center !important;
        gap: 2px !important;
        height: 66px;
        padding: 6px 8px !important;
        border-radius: 8px !important;
      }
      .rdt-node.active { border-width: 2px !important; }
      .rdt-crown { font-size: 18px !important; }
      .rdt-label { align-items: center !important; text-align: center; }
      .rdt-name { font-size: 10px !important; line-height: 1.2 !important; }
      .rdt-date { font-size: 9px !important; }
      .rdt-detail {
        position: fixed !important;
        left: 12px; right: 12px;
        bottom: 136px;
        padding: 10px 12px !important;
        background: var(--bg-1, #f5efe0);
        border: 1px solid var(--ink-3, #ba9863);
        border-radius: 10px;
        max-height: 40vh;
        overflow-y: auto;
        z-index: 23;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.08);
      }
      .rdt-detail.hidden { display: none !important; }
      body:has(.a-right.open) .rdt-strip { transform: translateY(100%); transition: transform 0.2s; }
    }
  `;
  document.head.append(s);
}
