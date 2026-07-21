/**
 * TourGuide — a guided, spotlight step-through of the atlas.
 *
 * Adds a "Take a tour" button to the header. Clicking it (or opening the
 * map with ?tour=1) walks the user through the main features with a
 * dimmed backdrop, a spotlight cut-out over the relevant control, and a
 * tooltip card with Back / Next / Skip. Fully bilingual (EN + हिं).
 *
 * Zero engine changes. Additive plug-in — pure DOM overlay.
 */

import { Atlas }   from '../core/AtlasCore.js';
import { el }      from '../core/util/dom.js';
import { t, getLang } from '../core/i18n.js';

const pick = (en, hi) => (getLang() === 'hi' && hi != null) ? hi : en;
const $ = (sel) => (sel ? document.querySelector(sel) : null);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ── Step script ──────────────────────────────────────────────────
 * sel      — CSS selector to spotlight (null = centered, dim whole screen)
 * title/body (+ _hi) — bilingual copy
 * before   — optional async fn to put the UI in the right state first
 */
const STEPS = [
  {
    sel: null,
    title: 'Welcome to the Rajasthan Atlas',
    title_hi: 'राजस्थान एटलस में आपका स्वागत है',
    body: 'A study companion for Rajasthan — 41 districts, 90+ layers and 500+ features. This 60-second tour shows you around.',
    body_hi: 'राजस्थान के लिए एक अध्ययन साथी — 41 जिले, 90+ लेयर और 500+ विशेषताएँ। यह 60-सेकंड का टूर आपको सब दिखाएगा।',
    before: () => closeAllPanels(),
  },
  {
    sel: '.lp-toggle',
    title: 'Layers',
    title_hi: 'लेयर',
    body: 'Open the Layers panel to browse 90+ datasets — rivers, forts, crops, tiger reserves and more.',
    body_hi: 'लेयर पैनल खोलें और 90+ डेटासेट देखें — नदियाँ, दुर्ग, फसलें, टाइगर रिज़र्व और बहुत कुछ।',
    place: 'right',
  },
  {
    sel: '.lp-panel',
    title: 'Tick to show',
    title_hi: 'दिखाने के लिए टिक करें',
    body: 'Tick any dataset to overlay it on the map. Untick to hide it. Toggle as many as you like.',
    body_hi: 'किसी भी डेटासेट को टिक कर मानचित्र पर दिखाएँ, अनटिक कर छिपाएँ। जितने चाहें चालू करें।',
    before: async () => { openLayers(); await wait(280); },
    place: 'right',
  },
  {
    sel: '.search-wrap',
    title: 'Search anything',
    title_hi: 'कुछ भी खोजें',
    body: 'Type a district or feature name to jump straight to it — Jaipur, Chambal, Kumbhalgarh…',
    body_hi: 'किसी जिले या विशेषता का नाम टाइप कर सीधे वहाँ पहुँचें — जयपुर, चंबल, कुंभलगढ़…',
    before: async () => { closeAllPanels(); await wait(150); },
    place: 'bottom',
  },
  {
    sel: '.a-right, .detail-slot',
    title: 'District profiles',
    title_hi: 'जिला प्रोफ़ाइल',
    body: 'Click any district for a full profile — Census 2011, the records it holds, and its five Panch Gaurav identities.',
    body_hi: 'किसी भी जिले पर क्लिक कर पूरी प्रोफ़ाइल देखें — जनगणना 2011, उसके रिकॉर्ड, और उसकी पाँच पंच गौरव पहचान।',
    before: async () => { try { Atlas.interaction.select('districts', 'jaipur'); } catch (_) {} await wait(400); },
    place: 'left',
  },
  {
    sel: '[data-action="revision"]',
    title: 'Revise',
    title_hi: 'रिवाइज़',
    body: 'Auto-generated study cards and concept chains — extremes, records and cause-to-effect stories.',
    body_hi: 'स्वतः-निर्मित अध्ययन कार्ड और अवधारणा शृंखलाएँ — चरम, रिकॉर्ड और कारण-से-प्रभाव कथाएँ।',
    before: () => closeAllPanels(),
    place: 'bottom',
  },
  {
    sel: '[data-action="compare"]',
    title: 'Compare',
    title_hi: 'तुलना',
    body: 'Put any two features side by side — rainfall, soils, demographics and the key differences between them.',
    body_hi: 'किन्हीं दो विशेषताओं को आमने-सामने रखें — वर्षा, मृदा, जनसांख्यिकी और उनके बीच के मुख्य अंतर।',
    place: 'bottom',
  },
  {
    sel: '[data-action="stats"]',
    title: 'Statistics',
    title_hi: 'सांख्यिकी',
    body: 'The atlas by the numbers — protected-area coverage, extremes and live totals from the dataset.',
    body_hi: 'आँकड़ों में एटलस — संरक्षित-क्षेत्र कवरेज, चरम और डेटासेट से लाइव योग।',
    place: 'bottom',
  },
  {
    sel: '[data-action="lang"]',
    title: 'English ⇄ हिंदी',
    title_hi: 'English ⇄ हिंदी',
    body: 'Switch the entire atlas between English and Hindi at any time — every layer, card and menu.',
    body_hi: 'पूरे एटलस को कभी भी अंग्रेज़ी और हिंदी के बीच बदलें — हर लेयर, कार्ड और मेन्यू।',
    place: 'bottom',
  },
  {
    sel: null,
    title: "You're all set",
    title_hi: 'आप तैयार हैं',
    body: 'That\'s the tour. Explore freely — click, toggle and search. You can re-open this tour anytime.',
    body_hi: 'यही था टूर। खुलकर खोजें — क्लिक करें, टॉगल करें, खोजें। यह टूर आप कभी भी दोबारा खोल सकते हैं।',
    before: () => closeAllPanels(),
  },
];

/* ── UI-state helpers ─────────────────────────────────────────── */
function openLayers()   { document.querySelector('.layers-popover')?.classList.add('open'); }
function closeAllPanels() {
  document.querySelector('.layers-popover')?.classList.remove('open');
  document.querySelector('.stats-overlay')?.classList.remove('open');
  document.querySelector('.revision-overlay')?.classList.remove('open');
  // Also close the right-hand district detail panel — the district step opens
  // it, and left open it covers the header buttons the next steps point at.
  document.querySelector('.a-right')?.classList.remove('open');
}

/* ── State ─────────────────────────────────────────────────────── */
let idx = 0;
let root = null;   // overlay container
let active = false;

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  addLauncher();
  // Deep-link: map.html?tour=1 launches the tour once the header exists.
  if (new URLSearchParams(location.search).get('tour')) {
    let n = 0;
    const go = () => (document.querySelector('.a-header') ? start() : (++n < 15 && setTimeout(go, 200)));
    setTimeout(go, 400);
  }
});

function addLauncher() {
  const nav = document.querySelector('.a-header .h-nav');
  if (!nav || nav.querySelector('[data-action="tour"]')) return;
  const btn = el('button', {
    class: 'h-btn h-tour', 'data-action': 'tour',
    title: t('Take a tour'),
    onclick: () => start(),
  }, ['🧭 ', el('span', { class: 'label' }, [t('Take a tour')])]);
  nav.insertBefore(btn, nav.firstChild);
}

/* ── Tour lifecycle ───────────────────────────────────────────── */
function start() {
  if (active) return;
  active = true; idx = 0;
  root = el('div', { class: 'tour-root' });
  root.append(
    // stopPropagation so tour clicks never reach document-level handlers such
    // as UIManager's "click outside closes the Layers popover" listener —
    // otherwise advancing a step would instantly re-close a panel we opened.
    el('div', { class: 'tour-block', onclick: (e) => e.stopPropagation() }),
    el('div', { class: 'tour-spot' }),
    el('div', { class: 'tour-pop', onclick: (e) => e.stopPropagation() }),
  );
  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', reposition);
  render();
}

function end() {
  active = false;
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', reposition);
  root?.remove(); root = null;
  try { localStorage.setItem('atlas-tour-seen', '1'); } catch (_) {}
}

function onKey(e) {
  if (!active) return;
  if (e.key === 'Escape') { e.preventDefault(); end(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
}

async function next() { if (idx < STEPS.length - 1) { idx++; await render(); } else end(); }
async function prev() { if (idx > 0)               { idx--; await render(); } }

async function render() {
  const step = STEPS[idx];
  if (step.before) { try { await step.before(); } catch (_) {} }
  place(step);
}

function reposition() { if (active) place(STEPS[idx]); }

function place(step) {
  if (!root) return;
  const spot = root.querySelector('.tour-spot');
  const pop  = root.querySelector('.tour-pop');
  const block = root.querySelector('.tour-block');
  const target = $(step.sel);
  const r = target?.getBoundingClientRect();
  const isSpot = !!(r && r.width && r.height);

  // Spotlight cut-out (or full dim for centered steps)
  if (isSpot) {
    const pad = 6;
    spot.style.display = 'block';
    spot.style.top    = `${r.top - pad}px`;
    spot.style.left   = `${r.left - pad}px`;
    spot.style.width  = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;
    block.classList.remove('dim');
  } else {
    spot.style.display = 'none';
    block.classList.add('dim');
  }

  // Tooltip card
  pop.innerHTML = '';
  pop.append(el('div', { class: 'tour-count' }, [`${idx + 1} / ${STEPS.length}`]));
  pop.append(el('h3', { class: 'tour-title' }, [pick(step.title, step.title_hi)]));
  pop.append(el('p',  { class: 'tour-body' },  [pick(step.body,  step.body_hi)]));
  const nav = el('div', { class: 'tour-nav' });
  nav.append(el('button', { class: 'tour-skip', onclick: end }, [t('Skip')]));
  const right = el('div', { class: 'tour-nav-right' });
  if (idx > 0) right.append(el('button', { class: 'tour-back', onclick: prev }, [t('Back')]));
  right.append(el('button', { class: 'tour-next', onclick: next },
    [idx === STEPS.length - 1 ? t('Done') : t('Next')]));
  nav.append(right);
  pop.append(nav);

  // Position the card near the target (or centred)
  const pw = pop.offsetWidth || 320, ph = pop.offsetHeight || 160;
  const gap = 14, vw = innerWidth, vh = innerHeight;
  let top, left;
  if (isSpot) {
    const place = step.place || 'bottom';
    if (place === 'right' && r.right + gap + pw < vw)      { left = r.right + gap; top = r.top; }
    else if (place === 'left' && r.left - gap - pw > 0)    { left = r.left - gap - pw; top = r.top; }
    else if (place === 'top' && r.top - gap - ph > 0)      { left = r.left; top = r.top - gap - ph; }
    else if (r.bottom + gap + ph < vh)                     { left = r.left; top = r.bottom + gap; }
    else                                                   { left = r.left; top = Math.max(gap, r.top - gap - ph); }
    left = Math.min(Math.max(gap, left), vw - pw - gap);
    top  = Math.min(Math.max(gap, top),  vh - ph - gap);
  } else {
    left = (vw - pw) / 2; top = (vh - ph) / 2;
  }
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
}

/* ── Styles ───────────────────────────────────────────────────── */
function injectStyles() {
  if (document.getElementById('tour-guide-styles')) return;
  const s = document.createElement('style');
  s.id = 'tour-guide-styles';
  s.textContent = `
    .tour-root { position: fixed; inset: 0; z-index: 100000; }
    .tour-block { position: fixed; inset: 0; z-index: 1; pointer-events: auto; background: transparent; }
    .tour-block.dim { background: rgba(20,16,10,0.66); }
    .tour-spot {
      position: fixed; z-index: 2; pointer-events: none; border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(20,16,10,0.60);
      outline: 2px solid #e0a94b; outline-offset: 2px;
      transition: top .25s ease, left .25s ease, width .25s ease, height .25s ease;
    }
    .tour-pop {
      position: fixed; z-index: 3; width: min(340px, calc(100vw - 28px));
      background: var(--panel-bg, #fbf7ee); color: var(--ink, #2a2118);
      border: 1px solid rgba(0,0,0,0.12); border-radius: 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.30); padding: 16px 18px 14px;
      font-family: inherit; transition: top .25s ease, left .25s ease;
    }
    .tour-count { font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
      opacity: .55; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
    .tour-title { margin: 0 0 6px; font-size: 18px; font-weight: 650; line-height: 1.25; }
    .tour-body  { margin: 0 0 14px; font-size: 14px; line-height: 1.5; opacity: .88; }
    .tour-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .tour-nav-right { display: flex; gap: 8px; }
    .tour-pop button {
      font: inherit; font-size: 13px; cursor: pointer; border-radius: 8px;
      padding: 7px 14px; border: 1px solid transparent; background: transparent; color: inherit;
    }
    .tour-skip { opacity: .6; padding-left: 2px !important; }
    .tour-skip:hover { opacity: 1; }
    .tour-back { border-color: rgba(0,0,0,0.18); }
    .tour-next { background: #c8892e; color: #fff; font-weight: 600; }
    .tour-next:hover { background: #b3771f; }
    .h-tour { white-space: nowrap; }
    @media (prefers-color-scheme: dark) {
      .tour-pop { background: #211b13; color: #f2ead9; border-color: rgba(255,255,255,0.12); }
      .tour-back { border-color: rgba(255,255,255,0.22); }
    }
    @media (max-width: 640px) { .tour-pop { width: calc(100vw - 24px); } }
  `;
  document.head.append(s);
}

// Expose for the landing page / external triggers.
if (typeof window !== 'undefined') window.__atlasStartTour = start;
