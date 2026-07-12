/**
 * RelatedHighlighter — cross-layer map highlighting on feature selection.
 *
 * When ANY feature is selected, walk its properties for district
 * references (`districts_included` array first, then a comma-split
 * `district` scalar) and paint those district polygons on the main
 * map with a subtle emerald tint + ring. Clears on selection change or
 * clear-selection.
 *
 * Skips 'districts' layer itself — a selected district is already styled
 * by the core's `.selected` class; don't double-paint.
 *
 * Coexists with the two timeline plug-ins (IntegrationTimeline,
 * DynastiesTimeline) — their `.itl-district-*` classes take visual
 * precedence over this one; the CSS below uses a subtler tone.
 */

const HIGHLIGHT_CLASS = 'rh-related';

/* Canonical id lookup — matches DistrictProfile's canonical namespace.
 * The 41-district set with common display-variant aliases. */
const NAME_TO_ID = {
  'ajmer':'ajmer','alwar':'alwar','balotra':'balotra','banswara':'banswara',
  'baran':'baran','barmer':'barmer','beawar':'beawar','bharatpur':'bharatpur',
  'bhilwara':'bhilwara','bikaner':'bikaner','bundi':'bundi',
  'chittor':'chittorgarh','chittorgarh':'chittorgarh',
  'churu':'churu','dausa':'dausa','deeg':'deeg','dholpur':'dholpur',
  'didwana-kuchaman':'didwana-kuchaman','didwana kuchaman':'didwana-kuchaman',
  'dungarpur':'dungarpur','hanumangarh':'hanumangarh','jaipur':'jaipur',
  'jaisalmer':'jaisalmer','jalore':'jalore','jhalawar':'jhalawar',
  'jhunjhunu':'jhunjhunu','jodhpur':'jodhpur','karauli':'karauli',
  'khairthal-tijara':'khairthal-tijara','khairthal tijara':'khairthal-tijara',
  'kota':'kota','kotputli-behror':'kotputli-behror','kotputli behror':'kotputli-behror',
  'nagaur':'nagaur','pali':'pali','phalodi':'phalodi','pratapgarh':'pratapgarh',
  'rajsamand':'rajsamand','salumbar':'salumbar',
  'sawai-madhopur':'sawai-madhopur','sawai madhopur':'sawai-madhopur',
  'sikar':'sikar','sirohi':'sirohi',
  'sri-ganganagar':'sri-ganganagar','sri ganganagar':'sri-ganganagar','ganganagar':'sri-ganganagar',
  'tonk':'tonk','udaipur':'udaipur',
};

function toDistrictId(name) {
  if (!name) return null;
  const cleaned = String(name)
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/^(southern|northern|eastern|western)\s+/i, '')
    .trim()
    .toLowerCase();
  return NAME_TO_ID[cleaned] || null;
}

function collectRelatedDistricts(props) {
  const ids = new Set();
  if (Array.isArray(props?.districts_included)) {
    for (const d of props.districts_included) {
      const id = toDistrictId(d);
      if (id) ids.add(id);
    }
  }
  if (typeof props?.district === 'string') {
    // Split on comma, arrow, semicolon, slash for multi-district strings.
    for (const part of props.district.split(/,|→|;|\//)) {
      const id = toDistrictId(part);
      if (id) ids.add(id);
    }
  }
  return ids;
}

Atlas.bus.on('atlas:ready', () => {
  injectStyles();
  Atlas.bus.on('selection:changed', ({ layerId, feature }) => {
    clearHighlight();
    if (!feature || layerId === 'districts') return;
    const ids = collectRelatedDistricts(feature.properties);
    if (!ids.size) return;
    applyHighlight(ids);
  });
});

function applyHighlight(idSet) {
  document.querySelectorAll('.layer-districts path.feature').forEach(p => {
    if (idSet.has(p.dataset.feature)) p.classList.add(HIGHLIGHT_CLASS);
  });
}

function clearHighlight() {
  document.querySelectorAll(`.layer-districts path.${HIGHLIGHT_CLASS}`)
    .forEach(p => p.classList.remove(HIGHLIGHT_CLASS));
}

function injectStyles() {
  if (document.getElementById('related-highlighter-styles')) return;
  const s = document.createElement('style');
  s.id = 'related-highlighter-styles';
  s.textContent = `
    /* Emerald-tinted district polygon — matches DESIGN.md "structured
     * success" palette. Applied on top of the district's own fill so
     * cultural-region colouring underneath still shows through. */
    .a-map svg .layer-districts path.${HIGHLIGHT_CLASS} {
      fill: color-mix(in srgb, #6EE7B7 32%, transparent) !important;
      fill-opacity: 1 !important;
      stroke: #047857 !important;
      stroke-width: 1.3 !important;
      opacity: 1 !important;
      transition: fill 0.18s ease, stroke 0.18s ease;
    }
    /* If a district is BOTH the selected feature AND in the related set,
     * the .selected class from core takes precedence — no conflict. */
  `;
  document.head.append(s);
}
