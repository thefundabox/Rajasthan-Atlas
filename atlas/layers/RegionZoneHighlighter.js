/**
 * RegionZoneHighlighter — colour the districts of every feature in a
 * point layer that carries `districts_included`.
 *
 * Some point layers (Language / Dialect Regions, Tribal Groups,
 * Livestock Breeds, National Highways) mark WHICH districts each
 * feature belongs to via a `districts_included` array. When you toggle
 * such a layer on, users expect to *see* the regional zones, not just
 * a scatter of pin icons. This plug-in walks every visible feature of
 * every allow-listed layer and tints the matching district polygons
 * on the map with a per-feature colour picked from a small qualitative
 * palette (12 hues). When the layer is hidden, the tint clears.
 *
 * Coexists with RelatedHighlighter (which paints on selection with a
 * stronger emerald tint — that wins because its rule has `!important`
 * and higher specificity).
 *
 * Coexists with Renderer's fill for a district's own layer — this
 * plug-in paints via inline `style` so it composes over any base fill.
 * Clearing removes the style attribute only if this plug-in set it.
 */

// Same 41-district canonical namespace used by RelatedHighlighter.
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
  'rajsamand':'rajsamand','salumbar':'salumbar','sirohi':'sirohi',
  'sawai-madhopur':'sawai-madhopur','sawai madhopur':'sawai-madhopur',
  'sikar':'sikar',
  'sri-ganganagar':'sri-ganganagar','sri ganganagar':'sri-ganganagar','ganganagar':'sri-ganganagar',
  'tonk':'tonk','udaipur':'udaipur',
};

// Point layers whose features carry `districts_included`. When any of
// these is visible, paint each feature's districts in a distinct hue.
const ALLOWED_LAYERS = new Set([
  'language-regions',
  'tribal-groups',
  'livestock-breeds',
  'national-highways',
  'painting-schools',
]);

// A qualitative 12-hue palette — soft enough that district labels
// remain readable at 32 % opacity. Mixed warm + cool.
const PALETTE = [
  '#e8a06a', '#7fbfae', '#b48fd6', '#e0b04a',
  '#8fbf6a', '#e08b8b', '#6ab8d6', '#c69a68',
  '#a68152', '#4a8ab0', '#9d7fbf', '#7fa66a',
];

const TINT_CLASS = 'rzh-tinted';

function toDistrictId(name) {
  if (!name) return null;
  const cleaned = String(name)
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/^(southern|northern|eastern|western)\s+/i, '')
    .trim()
    .toLowerCase();
  return NAME_TO_ID[cleaned] || null;
}

function refresh() {
  clearTints();
  for (const cfg of Atlas.layers.list()) {
    if (!cfg.visible) continue;
    if (!ALLOWED_LAYERS.has(cfg.id)) continue;
    const feats = Atlas.layers.features(cfg.id) || [];
    feats.forEach((feat, i) => {
      const colour = PALETTE[i % PALETTE.length];
      const districts = Array.isArray(feat.properties?.districts_included)
        ? feat.properties.districts_included : [];
      for (const raw of districts) {
        const id = toDistrictId(raw);
        if (!id) continue;
        applyTint(id, colour);
      }
    });
  }
}

function applyTint(districtId, colour) {
  const path = document.querySelector(
    `.layer-districts path.feature[data-feature="${CSS.escape(districtId)}"]`
  );
  if (!path) return;
  // Last-writer-wins across layers is fine — the more recently toggled
  // layer's colours dominate. Cheap, visually intelligible.
  path.classList.add(TINT_CLASS);
  path.style.fill = colour;
  path.style.fillOpacity = '0.32';
}

function clearTints() {
  document.querySelectorAll(`.layer-districts path.${TINT_CLASS}`).forEach(p => {
    p.classList.remove(TINT_CLASS);
    p.style.fill = '';
    p.style.fillOpacity = '';
  });
}

Atlas.bus.on('atlas:ready', () => {
  refresh();
  Atlas.bus.on('layer:visibility', () => refresh());
  Atlas.bus.on('layer:added',      () => refresh());
});
