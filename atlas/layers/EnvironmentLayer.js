/**
 * EnvironmentLayer — plug-in for the Environment & Protected Areas datasets.
 *
 * Responsibilities
 * ----------------
 *   1. Register `env` and `reader` style modes.
 *   2. Register cartographic label sources for the six environment layers.
 *   3. Provide an editorial detail renderer for environment features
 *      (hero → tags → overview → key figures → ecology chips → key facts →
 *      timeline → references → small locator map).
 *
 * Zero core-engine modifications.
 */

import { Atlas } from '../core/AtlasCore.js';
import { esc, el, svgEl } from '../core/util/dom.js';
import { qualityBadgeHTML } from '../core/util/quality.js';

/* -------------------------------------------------------------------------- */
/*  Modes                                                                     */
/* -------------------------------------------------------------------------- */

Atlas.layers.registerMode('env',  { apply: () => ({}) });
Atlas.layers.registerMode('reader', { apply: () => ({}) });

/* -------------------------------------------------------------------------- */
/*  Cartographic labels — one source per env layer with priorities and
 *  zoom-based visibility. Sanctuaries only surface once the user zooms in.
 * -------------------------------------------------------------------------- */

Atlas.labels.register({
  layerId: 'national-parks',   priority: 100, cls: 'lbl-np',
  text: (f) => f.properties.name.replace(/ National Park.*/, ''),
});
Atlas.labels.register({
  layerId: 'tiger-reserves',   priority: 90,  cls: 'lbl-tr',    minZoom: 1.4,
  text: (f) => f.properties.name.replace(/ Tiger Reserve.*/, ''),
});
Atlas.labels.register({
  layerId: 'wildlife-sanctuaries', priority: 55, cls: 'lbl-wls', minZoom: 2.0,
  text: (f) => f.properties.name.replace(/ Wildlife Sanctuary.*/, '').replace(/ WLS.*/, ''),
});
Atlas.labels.register({
  layerId: 'ramsar-sites',     priority: 85,  cls: 'lbl-ramsar',
  text: (f) => f.properties.name.replace(/ \(Ramsar Site\).*/, ''),
});
Atlas.labels.register({
  layerId: 'wetlands',         priority: 45,  cls: 'lbl-wetland', minZoom: 1.7,
  text: (f) => f.properties.name.replace(/ \(Wetland extent\).*/, '').replace(/ Wetland/, ''),
});

/* -------------------------------------------------------------------------- */
/*  Post-boot: editorial detail renderer for environment features             */
/* -------------------------------------------------------------------------- */

Atlas.bus.on('atlas:ready', () => {
  const detailSlot = document.querySelector('.detail-slot');
  const right      = document.querySelector('.a-right');

  Atlas.bus.on('selection:changed', ({ feature }) => {
    if (!feature) return;                              // empty state handled by UIManager
    if (feature.properties?.category !== 'environment') return;
    detailSlot.innerHTML = '';
    detailSlot.append(renderEditorialCard(feature, Atlas.layers.currentMode() === 'reader'));
    right?.classList.add('open');
  });

  Atlas.bus.on('layer:mode', ({ mode }) => {
    const sel = Atlas.interaction.currentSelection();
    if (!sel) return;
    const feat = Atlas.data.getFeature(sel.layerId, sel.featureId);
    if (feat?.properties?.category !== 'environment') return;
    detailSlot.innerHTML = '';
    detailSlot.append(renderEditorialCard(feat, mode === 'reader'));
  });
});

/* -------------------------------------------------------------------------- */
/*  Editorial card                                                            */
/* -------------------------------------------------------------------------- */

const KIND_LABEL = {
  national_park:      'National Park',
  tiger_reserve:      'Tiger Reserve',
  wildlife_sanctuary: 'Wildlife Sanctuary',
  ramsar_site:        'Ramsar Site',
  wetland:            'Wetland',
  biosphere_reserve:  'Biosphere Reserve',
};

function renderEditorialCard(feat, readerView) {
  const p    = feat.properties ?? {};
  const eco  = p.ecology    ?? {};
  const gov  = p.governance ?? {};
  const ex   = p.notes      ?? {};
  const kind = KIND_LABEL[p.type] ?? 'Feature';

  const wrap = el('div', { class: 'ed' });

  /* ---- Hero ---- */
  const hero = el('div', { class: 'ed-hero' });
  hero.append(el('div', { class: 'ed-kicker' }, [`${kind}${p.division ? ' · ' + p.division + ' Division' : ''}`]));
  const title = el('h2', { class: 'ed-title' });
  title.textContent = p.name ?? feat.id;
  hero.append(title);
  if (p.aliases?.length) {
    const sub = el('p', { class: 'ed-sub' });
    sub.textContent = 'Also: ' + p.aliases.join(' · ');
    hero.append(sub);
  }
  const tags = el('div', { class: 'ed-tags' });
  if (p.newDistrict)                     tags.append(tag('New (2023)', 'new'));
  if (isUnesco(feat))                    tags.append(tag('UNESCO WHS', 'unesco'));
  if (p.type === 'national_park')        tags.append(tag(`IUCN ${gov.iucn ?? 'II'}`, 'np'));
  if (p.type === 'tiger_reserve')        tags.append(tag('Project Tiger', 'tr'));
  if (p.type === 'wildlife_sanctuary')   tags.append(tag('WLS', 'wls'));
  if (p.type === 'ramsar_site')          tags.append(tag(p.designated ? `Ramsar ${p.designated.slice(0,4)}` : 'Ramsar', 'ramsar'));
  if (p.geometryQuality === 'point')     tags.append(tag('Point-only geometry', 'point'));
  const badge = el('span');
  badge.innerHTML = qualityBadgeHTML(p.geometryQuality);
  if (badge.firstChild) tags.append(badge.firstChild);
  if (tags.children.length) hero.append(tags);
  wrap.append(hero);

  /* ---- Editorial overview (composed from properties) ---- */
  const overview = composeOverview(p, kind);
  if (overview) {
    const div = el('div', { class: 'ed-section' });
    div.append(el('h3', { class: 'ed-h' }, ['Overview']));
    const para = el('p', { class: 'ed-overview' });
    para.innerHTML = overview;
    div.append(para);
    wrap.append(div);
  }

  /* ---- Key figures ---- */
  const figures = el('div', { class: 'ed-figures' });
  if (p.area != null)     figures.append(figCard('Area', formatNum(p.area), 'km²'));
  if (p.established)      figures.append(figCard('Notified', String(p.established)));
  if (p.districts?.length)figures.append(figCard(p.districts.length === 1 ? 'District' : 'Districts',
                                                 String(p.districts.length)));
  if (gov.iucn)           figures.append(figCard('IUCN category', gov.iucn));
  if (figures.children.length)
    wrap.append(section('Key figures', figures));

  /* ---- Location + administration ---- */
  const dl1 = el('dl', { class: 'ed-row' });
  if (p.districts?.length) {
    dl1.append(el('dt', {}, [p.districts.length === 1 ? 'District' : 'Districts']));
    dl1.append(el('dd', {}, [p.districts.join(', ')]));
  }
  if (p.division)    { dl1.append(el('dt', {}, ['Division']));      dl1.append(el('dd', {}, [`${p.division} Commissionerate`])); }
  if (p.state)       { dl1.append(el('dt', {}, ['State']));         dl1.append(el('dd', {}, [p.state])); }
  if (p.centroid)    { dl1.append(el('dt', {}, ['Centroid']));      dl1.append(el('dd', { class: 'mono' }, [`${p.centroid[1].toFixed(3)}°N, ${p.centroid[0].toFixed(3)}°E`])); }
  if (dl1.children.length)
    wrap.append(section('Location', dl1));

  /* ---- Ecology (editorial lede + chip lists) ---- */
  if (eco.ecosystem || eco.fauna?.length || eco.flora?.length) {
    const secBody = el('div');
    if (eco.ecosystem)
      secBody.append(el('div', { class: 'ed-ecosystem' }, [eco.ecosystem]));
    if (eco.fauna?.length) {
      secBody.append(el('div', { class: 'ed-kicker' }, ['Key fauna']));
      const chips = el('div', { class: 'ed-chips' });
      eco.fauna.forEach(f => chips.append(el('span', { class: 'ed-chip chip-fauna' }, [f])));
      secBody.append(chips);
    }
    if (eco.flora?.length) {
      secBody.append(el('div', { class: 'ed-kicker', style: { marginTop: '10px' } }, ['Key flora']));
      const chips = el('div', { class: 'ed-chips' });
      eco.flora.forEach(f => chips.append(el('span', { class: 'ed-chip chip-flora' }, [f])));
      secBody.append(chips);
    }
    wrap.append(section('Ecology', secBody));
  }

  /* ---- Conservation & governance ---- */
  if (gov.authority || gov.conservation_programme || gov.iucn || gov.status) {
    const dl2 = el('dl', { class: 'ed-row' });
    if (gov.authority)              { dl2.append(el('dt', {}, ['Authority']));  dl2.append(el('dd', {}, [gov.authority])); }
    if (gov.conservation_programme) { dl2.append(el('dt', {}, ['Programme']));  dl2.append(el('dd', {}, [gov.conservation_programme])); }
    if (gov.iucn)                   { dl2.append(el('dt', {}, ['IUCN'])); dl2.append(el('dd', {}, [gov.iucn])); }
    if (gov.status)                 { dl2.append(el('dt', {}, ['Status'])); dl2.append(el('dd', {}, [gov.status])); }
    wrap.append(section('Conservation', dl2));
  }

  /* ---- Atlas notes (key facts + learning aid + comparisons) ---- */
  if (ex.facts?.length || ex.mnemonic || ex.confusedWith?.length) {
    const body = el('div');
    if (ex.facts?.length) {
      const ul = el('ul', { class: 'ed-facts' });
      ex.facts.forEach(f => ul.append(el('li', {}, [f])));
      body.append(ul);
    }
    if (ex.mnemonic) {
      const mn = el('div', { class: 'ed-mnemonic' });
      mn.append(el('span', { class: 'tag' }, ['Remember']));
      const t = document.createElement('span'); t.textContent = ex.mnemonic;
      mn.append(t);
      body.append(mn);
    }
    if (ex.confusedWith?.length) {
      const note = el('div', { class: 'ed-note' });
      note.textContent = 'Common Confusion: ' + ex.confusedWith.join(' · ');
      body.append(note);
    }
    wrap.append(section('Key Facts', body));
    // "Why It Matters" — surfaced from significance when present
    if (ex.significance && ex.significance !== 'medium') {
      const w = el('div', { class: 'ed-mnemonic why-matters' });
      w.append(el('span', { class: 'tag' }, ['Why It Matters']));
      const t = document.createElement('span');
      t.textContent = ex.significance === 'very-high'
        ? 'This feature is one of Rajasthan\'s cornerstone landmarks — often the first mentioned in state geography and biodiversity contexts.'
        : 'This feature is a widely cited landmark in Rajasthan\'s environmental fabric.';
      w.append(t);
      wrap.append(w);
    }
  }

  /* ---- Timeline ---- */
  if (p.timeline?.length) wrap.append(section('Timeline', renderTimeline(p.timeline)));

  /* ---- Related features ---- */
  const related = Atlas.relations?.relationsFor(feat, feat.layerKey ?? '') ?? [];
  if (related.length) wrap.append(section('Related features', renderRelated(related)));

  /* ---- Small locator map (feature-in-state) ---- */
  const loc = renderLocator(feat);
  if (loc) wrap.append(section('Locator', loc));

  /* ---- References ---- */
  const src = el('div', { class: 'ed-sources' });
  (p.source ? p.source.split('+').map(s => s.trim()) : [])
    .filter(Boolean).forEach(s => src.append(el('span', { class: 'ed-source' }, [s])));
  if (p.lastUpdated) src.append(el('span', { class: 'ed-source' }, [`Retrieved ${p.lastUpdated}`]));
  if (src.children.length) wrap.append(section('References', src));

  /* ---- Editorial remarks (geometry note + free-form remark) ---- */
  if (p.geometryNote || p.remark) {
    if (p.geometryNote) wrap.append(el('div', { class: 'ed-note' }, [p.geometryNote]));
    if (p.remark)       wrap.append(el('div', { class: 'ed-note' }, [p.remark]));
  }

  return wrap;
}

/* -------------------------------------------------------------------------- */
/*  Compose an editorial overview from the feature's authoritative properties. */
/*  Kept intentionally short (2–3 sentences). No fabricated facts.            */
/* -------------------------------------------------------------------------- */

function composeOverview(p, kind) {
  const bits = [];
  const name = p.name?.replace(/\s+\((Ramsar Site|Wetland extent)\).*/, '') ?? '';
  const inWho = p.districts?.length
    ? (p.districts.length === 1
        ? `<em>${esc(p.districts[0])}</em> district`
        : `the districts of <em>${esc(p.districts.slice(0,-1).join(', '))} and ${esc(p.districts.slice(-1)[0])}</em>`)
    : null;
  const est = p.established ? `Notified in ${esc(p.established)}` : null;

  const opening = `${esc(name)} is a ${kind.toLowerCase()}${inWho ? ' spanning ' + inWho : ''}.`;
  bits.push(opening);
  if (est) bits.push(est + '.');

  if (p.type === 'ramsar_site' && p.designated) {
    bits.push(`Designated under the Ramsar Convention on ${esc(p.designated)}.`);
  }
  if (p.type === 'tiger_reserve' && p.core_km2 && p.buffer_km2) {
    bits.push(`Core area ${p.core_km2} km², buffer ${p.buffer_km2} km².`);
  }
  return bits.join(' ');
}

function tag(text, kind) {
  const t = el('span', { class: `ed-tag tag-${kind}` });
  t.textContent = text;
  return t;
}

function figCard(label, value, unit) {
  const c = el('div', { class: 'ed-fig' });
  const n = el('div', { class: 'n' });
  n.textContent = value;
  if (unit) { const u = el('span', { class: 'unit' }); u.textContent = unit; n.append(u); }
  c.append(n);
  c.append(el('div', { class: 'k' }, [label]));
  return c;
}

function section(title, body) {
  const s = el('div', { class: 'ed-section' });
  s.append(el('h3', { class: 'ed-h' }, [title]));
  s.append(body);
  return s;
}

function formatNum(n) {
  return typeof n === 'number' ? n.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : String(n);
}

function isUnesco(feat) {
  const p = feat.properties ?? {};
  const gov = p.governance ?? {};
  return /UNESCO/i.test(gov.conservation_programme || '') ||
         /World Heritage/i.test(gov.conservation_programme || '') ||
         (p.notes?.facts ?? []).some(f => /UNESCO|World Heritage/i.test(f));
}

/* -------------------------------------------------------------------------- */
/*  Timeline + Related — same look as PhysicalEditorial                       */
/* -------------------------------------------------------------------------- */

function renderTimeline(events) {
  const wrap = el('ol', { class: 'ed-timeline' });
  const sorted = [...events].sort((a, b) => String(a.year).localeCompare(String(b.year)));
  for (const ev of sorted) {
    const li = el('li', { class: `ed-tl-item tl-${ev.tag ?? 'default'}` });
    li.append(el('span', { class: 'ed-tl-year' }, [String(ev.year).slice(0, 7)]));
    li.append(el('span', { class: 'ed-tl-event' }, [ev.event]));
    wrap.append(li);
  }
  return wrap;
}

const LAYER_LABEL = {
  'districts':            'District',
  'physiography':         'Region',
  'drainage-basins':      'Basin',
  'rivers':               'River',
  'lakes':                'Lake',
  'thar':                 'Desert',
  'aravalli':             'Range',
  'peaks':                'Peak',
  'national-parks':       'NP',
  'tiger-reserves':       'TR',
  'wildlife-sanctuaries': 'WLS',
  'ramsar-sites':         'Ramsar',
  'wetlands':             'Wetland',
  'biosphere-reserves':   'Biosphere',
};

function renderRelated(items) {
  const wrap = el('div', { class: 'ed-related' });
  for (const r of items) {
    const p = r.feature.properties ?? {};
    const btn = el('button', {
      class: `ed-related-chip chip-${r.layerId}`,
      title: `${p.name} — ${r.reasons.join(', ')}`,
      onclick: () => Atlas.interaction.select(r.layerId, r.featureId, { zoom: false }),
    });
    btn.append(el('span', { class: 'ed-related-kind' }, [LAYER_LABEL[r.layerId] ?? r.layerId]));
    btn.append(el('span', { class: 'ed-related-name' }, [p.name]));
    wrap.append(btn);
  }
  return wrap;
}

/* -------------------------------------------------------------------------- */
/*  Small locator inside the detail card                                       */
/* -------------------------------------------------------------------------- */

function renderLocator(feat) {
  const districts = Atlas.layers.features('districts');
  if (!districts?.length) return null;
  const p = feat.properties ?? {};
  const proj = Atlas.projection;
  const vb = Atlas.projection.viewBox();
  const scale = 320 / vb[2];  // scale down to ~320 wide inset

  const wrap = el('div', { class: 'ed-locator' });
  const svg = svgEl('svg', {
    viewBox: `0 0 ${vb[2] * scale} ${vb[3] * scale}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  // State outline — union of district polygons
  for (const d of districts) {
    const g = d.geometry;
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates;
    let dPath = '';
    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]).map(v => v * scale));
      if (!pts.length) continue;
      dPath += `M${pts[0][0]},${pts[0][1]}` +
               pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + 'Z';
    }
    svg.append(svgEl('path', { class: 'state', d: dPath }));
  }
  // Feature — polygon or point
  const g = feat.geometry;
  if (g?.type === 'Point') {
    const [x, y] = proj.forward(g.coordinates);
    svg.append(svgEl('circle', {
      class: 'feat point',
      cx: x * scale, cy: y * scale, r: 4,
    }));
  } else if (g) {
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates;
    let dPath = '';
    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]).map(v => v * scale));
      if (!pts.length) continue;
      dPath += `M${pts[0][0]},${pts[0][1]}` +
               pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + 'Z';
    }
    svg.append(svgEl('path', { class: 'feat', d: dPath }));
  }
  wrap.append(svg);
  const cap = el('div', { class: 'caption' });
  cap.textContent = `${p.name} within Rajasthan`;
  wrap.append(cap);
  return wrap;
}
