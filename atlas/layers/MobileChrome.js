/**
 * MobileChrome — installs mobile-only affordances:
 *   1. Hamburger button in the compact header that reveals a small
 *      dropdown menu (Study Home / Interactive Map / Revise).
 *   2. FAB stack in the bottom-right corner (Layers · Search · Reset).
 *   3. Sheet snap driver — tap the drag handle on the open detail sheet
 *      to cycle peek → half → full → peek. Layout is all CSS; this
 *      plug-in just cycles a data-snap attribute.
 *   4. Search FAB → focuses the (mobile-hidden) header search input by
 *      un-hiding it as a temporary overlay.
 *
 * All bindings are guarded by matchMedia("(max-width: 640px)") so they
 * no-op on desktop.
 */

const MOBILE_MQ = window.matchMedia('(max-width: 640px)');

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
  mountHamburger();
  mountMobileMenu();
  mountFabStack();
  mountSheetDriver();
  mountMobileSearchOverlay();
  mountLayersOverlayHeader();
  document.body.classList.add('mobile-chrome-on');
}

function uninstall() {
  if (!installed) return;
  installed = false;
  document.querySelector('.m-hamburger')?.remove();
  document.querySelector('.m-menu-drop')?.remove();
  document.querySelector('.m-fabs')?.remove();
  document.querySelector('.m-search-overlay')?.remove();
  document.querySelector('.m-layers-overlay-head')?.remove();
  document.body.classList.remove('mobile-chrome-on');
}

/* ── Hamburger + menu ────────────────────────────────────────────── */

function mountHamburger() {
  const header = document.querySelector('.a-header');
  if (!header) return;
  // Prepend to the header's inner brand div so it sits on the LEFT.
  const brand = header.querySelector('div');
  if (!brand) return;
  const btn = document.createElement('button');
  btn.className = 'm-hamburger';
  btn.setAttribute('aria-label', 'Open menu');
  btn.innerHTML = '☰';
  btn.addEventListener('click', ev => {
    ev.stopPropagation();
    toggleMenu();
  });
  brand.prepend(btn);
}

function mountMobileMenu() {
  const drop = document.createElement('nav');
  drop.className = 'm-menu-drop';
  drop.hidden = true;
  drop.innerHTML = `
    <a href="./" data-role="menu-item">🏠 Study Home</a>
    <a href="./map.html" data-role="menu-item" class="active">🗺 Interactive Map</a>
    <a href="./map.html?revise=1" data-role="menu-item">📖 Revise</a>
    <div class="m-menu-divider"></div>
    <a href="./LICENSE" data-role="menu-item">© RAS Only · License</a>
  `;
  document.body.append(drop);
  // Close on any outside click.
  document.addEventListener('click', ev => {
    if (drop.hidden) return;
    if (!drop.contains(ev.target) && !ev.target.closest('.m-hamburger')) closeMenu();
  });
}

function toggleMenu() {
  const drop = document.querySelector('.m-menu-drop');
  if (!drop) return;
  drop.hidden = !drop.hidden;
}
function closeMenu() {
  const drop = document.querySelector('.m-menu-drop');
  if (drop) drop.hidden = true;
}

/* ── Layers overlay header (title + close ×) ─────────────────────── */

function mountLayersOverlayHeader() {
  const panel = document.querySelector('.layers-popover .lp-panel');
  if (!panel || panel.querySelector('.m-layers-overlay-head')) return;
  const head = document.createElement('div');
  head.className = 'm-layers-overlay-head';
  head.innerHTML = `
    <div class="m-layers-overlay-title">Layers</div>
    <button class="m-layers-close" aria-label="Close layers">← Back to map</button>
  `;
  panel.prepend(head);
  head.querySelector('.m-layers-close').addEventListener('click', ev => {
    ev.stopPropagation();
    document.querySelector('.layers-popover')?.classList.remove('open');
  });
}

/* ── FAB stack ───────────────────────────────────────────────────── */

function mountFabStack() {
  const map = document.querySelector('.a-map');
  if (!map) return;
  const stack = document.createElement('div');
  stack.className = 'm-fabs';
  stack.innerHTML = `
    <button class="m-fab m-fab--primary" data-fab="layers" aria-label="Layers">≣</button>
    <button class="m-fab" data-fab="search" aria-label="Search">🔍</button>
    <button class="m-fab" data-fab="reset" aria-label="Reset view">⌂</button>
  `;
  map.append(stack);
  stack.addEventListener('click', ev => {
    const btn = ev.target.closest('.m-fab');
    if (!btn) return;
    // Stop propagation so the document-level "click outside → close"
    // handler on the Layers popover doesn't fire on our own toggle click.
    ev.stopPropagation();
    const action = btn.dataset.fab;
    if (action === 'layers') {
      const pop = document.querySelector('.layers-popover');
      pop?.classList.toggle('open');
    } else if (action === 'search') {
      openMobileSearch();
    } else if (action === 'reset') {
      try { Atlas.interaction.reset(); } catch (_) {}
    }
  });
}

/* ── Sheet snap driver ───────────────────────────────────────────── */
/* CSS-only max-height snapping wouldn't apply for reasons that
 * defeat any straightforward workaround (declared rules match, but
 * computed max-height stuck at the base 92vh); so we drive the sheet
 * height with inline `top` (fixed-positioned, bottom:0 → top controls
 * how tall the sheet is). Each snap corresponds to a different `top`. */
const SNAP_HEIGHT = {
  peek: '132px',   // just the eyebrow + name + drag handle
  half: '60vh',    // summary + first section
  full: '92vh',    // whole detail
};

function mountSheetDriver() {
  const sheet = document.querySelector('.a-right');
  if (!sheet) return;
  if (!sheet.dataset.snap) sheet.dataset.snap = 'half';
  applySnap(sheet);
  sheet.addEventListener('click', ev => {
    const rect = sheet.getBoundingClientRect();
    if (ev.clientY - rect.top > 30) return;
    cycleSnap(sheet);
  });
  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (feature) {
      sheet.dataset.snap = 'half';
      applySnap(sheet);
    } else {
      sheet.style.height = '';
      sheet.style.maxHeight = '';
    }
  });
}

function applySnap(sheet) {
  if (!MOBILE_MQ.matches) {
    sheet.style.height = '';
    sheet.style.maxHeight = '';
    return;
  }
  const snap = sheet.dataset.snap || 'half';
  const h = SNAP_HEIGHT[snap] || SNAP_HEIGHT.half;
  // Setting BOTH height and max-height (with !important priority) is
  // the only combo that reliably beats the base .a-right stylesheet
  // rules in this codebase. Inline max-height alone was ignored;
  // inline height alone was ignored — both together win.
  sheet.style.setProperty('height', h, 'important');
  sheet.style.setProperty('max-height', h, 'important');
}

function cycleSnap(sheet) {
  const cur = sheet.dataset.snap || 'half';
  const next = { half: 'full', full: 'peek', peek: 'half' }[cur] || 'half';
  sheet.dataset.snap = next;
  applySnap(sheet);
}

/* ── Mobile search overlay ───────────────────────────────────────── */

function mountMobileSearchOverlay() {
  // The desktop search input lives inside .a-header .search-wrap which
  // we've hidden. On mobile-search-open we clone its input into a
  // full-width overlay so the existing UIManager search logic still
  // handles typeahead — we just re-parent the presentation.
  const overlay = document.createElement('div');
  overlay.className = 'm-search-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="m-search-header">
      <button class="m-search-close" aria-label="Close search">←</button>
      <div class="m-search-slot"></div>
    </div>
  `;
  document.body.append(overlay);
  overlay.querySelector('.m-search-close')
    .addEventListener('click', closeMobileSearch);
  overlay.addEventListener('click', ev => {
    if (ev.target === overlay) closeMobileSearch();
  });
}

function openMobileSearch() {
  const overlay = document.querySelector('.m-search-overlay');
  const slot = overlay?.querySelector('.m-search-slot');
  const desktopSearch = document.querySelector('.a-header .search-wrap');
  if (!overlay || !slot || !desktopSearch) return;
  // Move the search-wrap into the overlay slot so UIManager's search
  // handlers keep working.
  slot.append(desktopSearch);
  desktopSearch.classList.add('m-search-mounted');
  overlay.hidden = false;
  // Focus the input after render.
  requestAnimationFrame(() => {
    overlay.querySelector('input[type="search"]')?.focus();
  });
}

function closeMobileSearch() {
  const overlay = document.querySelector('.m-search-overlay');
  const slot = overlay?.querySelector('.m-search-slot');
  const brand = document.querySelector('.a-header > div:first-child');
  if (!overlay || !slot || !brand) return;
  // Return search-wrap to its original home in the header.
  const search = slot.querySelector('.search-wrap');
  if (search) {
    search.classList.remove('m-search-mounted');
    // Re-append to header (its original parent). Not the brand div,
    // the header itself — so its `flex: 0 0 300px` shape re-applies
    // on desktop.
    brand.parentElement.append(search);
  }
  overlay.hidden = true;
}

/* ── Styles ──────────────────────────────────────────────────────── */

function injectStyles() {
  if (document.getElementById('mobile-chrome-styles')) return;
  const s = document.createElement('style');
  s.id = 'mobile-chrome-styles';
  s.textContent = `
    /* All rules are mobile-only. Guard with a media query so nothing
     * leaks into the desktop layout. */
    @media (max-width: 640px) {
      /* Hamburger button in the compact header */
      .m-hamburger {
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        background: transparent;
        border: 1px solid var(--hair);
        border-radius: 8px;
        color: var(--ink);
        font-size: 16px; line-height: 1;
        flex-shrink: 0;
      }
      .m-hamburger:active { background: var(--card-quiet); }

      /* Dropdown menu (opens from below the header) */
      .m-menu-drop {
        position: fixed;
        top: 60px; left: 12px;
        min-width: 200px;
        background: var(--card);
        border: 1px solid var(--hair);
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.16);
        z-index: 60;
        font-family: var(--sans);
        font-size: 14px;
      }
      .m-menu-drop[hidden] { display: none; }
      .m-menu-drop a {
        display: block;
        padding: 10px 14px;
        text-decoration: none;
        color: var(--ink);
        border-radius: 8px;
      }
      .m-menu-drop a:active,
      .m-menu-drop a:hover { background: var(--card-quiet); }
      .m-menu-drop a.active { color: var(--indigo-600, #4f46e5); font-weight: 600; }
      .m-menu-divider {
        height: 1px; background: var(--hair);
        margin: 6px 8px;
      }

      /* FAB stack — bottom-right */
      .m-fabs {
        position: absolute;
        right: 12px; bottom: 12px;
        display: flex; flex-direction: column;
        gap: 10px;
        z-index: 6;
        transition: bottom 0.2s;
      }
      /* Shift the FAB stack (and the bottom-left compass) above the
       * timeline ribbon whenever a timeline is mounted AND no detail
       * sheet is currently open (a sheet hides the ribbon anyway). */
      body.itl-active:not(:has(.a-right.open)) .m-fabs,
      body.rdt-active:not(:has(.a-right.open)) .m-fabs {
        bottom: 140px;
      }
      body.itl-active:not(:has(.a-right.open)) .a-map .overlay.north,
      body.rdt-active:not(:has(.a-right.open)) .a-map .overlay.north {
        bottom: 140px;
      }
      .m-fab {
        width: 48px; height: 48px;
        border-radius: 50%;
        background: var(--card);
        border: 1px solid var(--hair);
        color: var(--ink);
        font-size: 18px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.12);
        cursor: pointer;
        line-height: 1;
      }
      .m-fab:active { transform: scale(0.95); }
      .m-fab--primary {
        background: var(--indigo-600, #4f46e5);
        color: white;
        border-color: var(--indigo-600, #4f46e5);
      }

      /* Layers overlay header — a sticky back-to-map bar so the user
       * always has a visible way to leave the layers panel. */
      .m-layers-overlay-head {
        position: sticky;
        top: 0;
        z-index: 3;
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 4px 12px;
        margin: -16px -16px 12px;
        padding-left: 16px; padding-right: 12px;
        background: var(--paper);
        border-bottom: 1px solid var(--hair);
      }
      .m-layers-overlay-title {
        font-family: var(--serif);
        font-size: 18px;
        font-weight: 500;
        color: var(--ink);
        letter-spacing: -0.005em;
      }
      .m-layers-close {
        background: var(--indigo-600, #4f46e5);
        color: white;
        border: none;
        border-radius: 999px;
        padding: 8px 14px;
        font-family: var(--sans);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex; align-items: center; gap: 4px;
      }
      .m-layers-close:active { transform: scale(0.98); }

      /* Mobile search overlay */
      .m-search-overlay {
        position: fixed; inset: 0;
        background: var(--paper);
        z-index: 50;
        display: flex; flex-direction: column;
      }
      .m-search-overlay[hidden] { display: none; }
      .m-search-header {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--hair);
        background: var(--paper);
      }
      .m-search-close {
        width: 40px; height: 40px;
        background: transparent;
        border: 1px solid var(--hair);
        border-radius: 10px;
        color: var(--ink);
        font-size: 18px; line-height: 1;
        flex-shrink: 0;
      }
      .m-search-slot { flex: 1; }
      .m-search-overlay .search-wrap {
        flex: 1 1 auto !important;
        width: 100% !important;
        margin: 0 !important;
      }
      .m-search-overlay .search-wrap .search {
        width: 100%;
      }
      .m-search-overlay .search-wrap input[type="search"] {
        width: 100%;
        padding: 12px 14px 12px 36px;
        font-size: 15px;
        border-radius: 10px;
        border: 1px solid var(--indigo-600, #4f46e5);
      }
      .m-search-overlay .search-wrap .search-results {
        position: static !important;
        margin-top: 8px;
        max-height: none;
        border: none;
        box-shadow: none;
      }
    }
  `;
  document.head.append(s);
}
