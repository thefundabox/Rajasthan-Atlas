/**
 * Security — client-side copy / download deterrents + a provenance notice.
 *
 * HONEST SCOPE: this is DETERRENCE, not prevention. Any public web page can
 * still be read via View-Source, the Network tab, or a scraper — the browser
 * must download the HTML/JS/JSON to run the atlas at all. These handlers raise
 * the effort for CASUAL copying (right-click "Save as", drag-out, Ctrl+C,
 * Ctrl+S, Ctrl+U, F12). The real protection is the CC BY-NC-SA 4.0 licence
 * plus the RAS provenance canary embedded in the HTML head and every
 * /atlas/data/*.json _meta block — that's what proves ownership if content
 * ever reappears elsewhere.
 *
 * Additive, self-running module. Loaded on both index.html and map.html.
 */

const SERIAL = 'RAS-2026-ATL-a7b3f9c2';

/* 1) Provenance notice — anyone who opens the console sees ownership + terms. */
try {
  console.info('%c Rajasthan Atlas  © 2025–2026 RAS Only ',
    'font-weight:700;font-size:13px;color:#fff;background:#a04d1e;padding:3px 6px;border-radius:3px');
  console.info(
    'Licensed CC BY-NC-SA 4.0 — free for NON-COMMERCIAL use WITH visible attribution to '
    + '"RAS Only" and a link to the canonical URL. Reproducing the content, wordings or data '
    + `without attribution violates the licence. Provenance serial: ${SERIAL}.`);
} catch (_) { /* console unavailable — ignore */ }

/* Editable fields must keep normal behaviour (search box, etc.). */
const editable = (el) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/* 2) Block the right-click context menu (its "Save as / View source / Inspect"). */
document.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });

/* 3) Block copy / cut / drag of content — but leave form fields alone. */
for (const type of ['copy', 'cut']) {
  document.addEventListener(type, (e) => { if (!editable(e.target)) e.preventDefault(); }, { capture: true });
}
document.addEventListener('dragstart', (e) => e.preventDefault(), { capture: true });

/* 4) Block source-download / devtools keyboard shortcuts.
 *    Single-key app shortcuts (s, l, x, v, arrows…) are untouched — we only
 *    intercept modifier combos, F12, and the devtools chords. */
document.addEventListener('keydown', (e) => {
  const k = (e.key || '').toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  const inField = editable(e.target);
  if (k === 'f12') { e.preventDefault(); return; }                       // devtools
  if (mod && (k === 's' || k === 'u' || k === 'p')) { e.preventDefault(); return; } // save / view-source / print
  if (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); return; } // devtools (Win/Linux)
  if (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c' || k === 'u')) { e.preventDefault(); return; } // devtools / view-source (Mac)
  if (mod && !inField && (k === 'c' || k === 'a')) { e.preventDefault(); return; }  // copy / select-all outside inputs
}, { capture: true });

/* 5) CSS deterrents: no text selection (except inputs), no image/link drag,
 *    and a blank + attributed page when printed. */
const style = document.createElement('style');
style.id = 'ras-security';
style.textContent = `
  html { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
  input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
  img, svg, a { -webkit-user-drag: none; user-drag: none; }
  @media print {
    body { display: none !important; }
    html::after { content: "© 2025–2026 RAS Only · Rajasthan Atlas · CC BY-NC-SA 4.0 · ${SERIAL} — printing is disabled."; font: 14px sans-serif; }
  }
`;
(document.head || document.documentElement).appendChild(style);
