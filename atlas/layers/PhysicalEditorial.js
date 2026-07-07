/**
 * PhysicalEditorial — shared editorial detail renderer for physical-geography
 * features (rivers, lakes, mountain range, desert, peaks, physiographic
 * regions, drainage basins).
 *
 * The renderer picks section content per feature type so a river reads about
 * hydrology, a peak about elevation, and a physiographic region about its
 * districts. Zero direct engine dependencies.
 */

import { Atlas }    from '../core/AtlasCore.js';
import { esc, el, svgEl } from '../core/util/dom.js';
import { qualityBadgeHTML } from '../core/util/quality.js';

const KIND_LABEL = {
  river:                 'River',
  lake:                  'Lake',
  desert:                'Desert',
  mountain_range:        'Mountain Range',
  peak:                  'Peak',
  physiographic_region:  'Physiographic Region',
  drainage_basin:        'Drainage Basin',
};

export function renderPhysicalCard(feat) {
  const p    = feat.properties ?? {};
  const kind = KIND_LABEL[p.type] ?? 'Physical feature';
  const notes = p.notes    ?? {};
  const eco   = p.ecology  ?? {};
  const gov   = p.governance ?? {};

  const wrap = el('div', { class: 'ed' });

  /* ---- Hero ---- */
  const hero = el('div', { class: 'ed-hero' });
  hero.append(el('div', { class: 'ed-kicker' }, [kickerLine(p, kind)]));
  const title = el('h2', { class: 'ed-title' }); title.textContent = p.name ?? feat.id;
  hero.append(title);
  if (p.aliases?.length) {
    const sub = el('p', { class: 'ed-sub' });
    sub.textContent = 'Also: ' + p.aliases.join(' · ');
    hero.append(sub);
  }
  const tags = el('div', { class: 'ed-tags' });
  if (p.perennial === true)    tags.append(tag('Perennial', 'ramsar'));
  if (p.perennial === false)   tags.append(tag('Seasonal', 'wls'));
  if (p.salinity === 'saline') tags.append(tag('Saline', 'tr'));
  if (p.lake_type === 'natural')    tags.append(tag('Natural', 'np'));
  if (p.lake_type === 'artificial') tags.append(tag('Artificial', 'wls'));
  if (p.geometryQuality === 'generalised') tags.append(tag('Generalised boundary', 'point'));
  if (p.geometryQuality === 'point')       tags.append(tag('Point feature', 'point'));
  // Quality tier badge — always present so readers can gauge geometry trust.
  const badge = el('span');
  badge.innerHTML = qualityBadgeHTML(p.geometryQuality);
  if (badge.firstChild) tags.append(badge.firstChild);
  if (tags.children.length) hero.append(tags);
  wrap.append(hero);

  /* ---- Overview ---- */
  const overview = composeOverview(p, kind);
  if (overview) {
    wrap.append(section('Overview',
      Object.assign(el('p', { class: 'ed-overview' }), { innerHTML: overview })));
  }

  /* ---- Key figures ---- */
  const figures = el('div', { class: 'ed-figures' });
  if (p.length_km != null)   figures.append(figCard('Length', fmt(p.length_km), 'km'));
  if (p.area != null)        figures.append(figCard('Area',   fmt(p.area),      'km²'));
  if (p.elevation_m != null) figures.append(figCard('Elevation', fmt(p.elevation_m), 'm'));
  if (p.districts_included?.length)
    figures.append(figCard('Districts', String(p.districts_included.length)));
  if (p.basin)               figures.append(figCard('Basin', p.basin));
  if (p.trend)               figures.append(figCard('Trend', p.trend));
  if (p.highest_peak)        figures.append(figCard('Highest', `${p.highest_peak.name} — ${p.highest_peak.ele_m} m`));
  if (p.established)         figures.append(figCard('Built', p.established));
  if (figures.children.length)
    wrap.append(section('Key figures', figures));

  /* ---- Physical characteristics ---- */
  const phys = el('dl', { class: 'ed-row' });
  if (p.headwaters)  { phys.append(el('dt', {}, ['Source'])); phys.append(el('dd', {}, [p.headwaters])); }
  if (p.mouth)       { phys.append(el('dt', {}, ['Outlet'])); phys.append(el('dd', {}, [p.mouth])); }
  if (p.tributaries?.length) {
    phys.append(el('dt', {}, ['Tributaries']));
    phys.append(el('dd', {}, [p.tributaries.join(', ')]));
  }
  if (p.range)       { phys.append(el('dt', {}, ['Range'])); phys.append(el('dd', {}, [p.range])); }
  if (p.district)    { phys.append(el('dt', {}, ['District'])); phys.append(el('dd', {}, [p.district])); }
  if (p.sub_regions?.length) {
    phys.append(el('dt', {}, ['Sub-regions']));
    phys.append(el('dd', {}, [p.sub_regions.join(' · ')]));
  }
  if (p.segments?.length) {
    phys.append(el('dt', {}, ['Segments']));
    phys.append(el('dd', {}, [p.segments.join(' · ')]));
  }
  if (p.districts_included?.length) {
    phys.append(el('dt', {}, ['Districts']));
    phys.append(el('dd', {}, [p.districts_included.slice(0, 8).join(', ') +
                              (p.districts_included.length > 8 ? '…' : '')]));
  }
  if (phys.children.length)
    wrap.append(section('Physical characteristics', phys));

  /* ---- Ecology ---- */
  if (eco.ecosystem || eco.fauna?.length || eco.flora?.length) {
    const body = el('div');
    if (eco.ecosystem)     body.append(el('div', { class: 'ed-ecosystem' }, [eco.ecosystem]));
    if (eco.fauna?.length) {
      body.append(el('div', { class: 'ed-kicker' }, ['Key fauna']));
      const chips = el('div', { class: 'ed-chips' });
      eco.fauna.forEach(f => chips.append(el('span', { class: 'ed-chip chip-fauna' }, [f])));
      body.append(chips);
    }
    if (eco.flora?.length) {
      body.append(el('div', { class: 'ed-kicker', style: { marginTop: '10px' } }, ['Key flora']));
      const chips = el('div', { class: 'ed-chips' });
      eco.flora.forEach(f => chips.append(el('span', { class: 'ed-chip chip-flora' }, [f])));
      body.append(chips);
    }
    wrap.append(section('Ecology', body));
  }

  /* ---- Governance ---- */
  if (gov.authority || gov.status) {
    const dl = el('dl', { class: 'ed-row' });
    if (gov.authority) { dl.append(el('dt', {}, ['Authority'])); dl.append(el('dd', {}, [gov.authority])); }
    if (gov.status)    { dl.append(el('dt', {}, ['Status']));    dl.append(el('dd', {}, [gov.status])); }
    wrap.append(section('Governance', dl));
  }

  /* ---- Atlas notes (facts + mnemonic + comparisons) ---- */
  if (notes.facts?.length || notes.mnemonic || notes.confusedWith?.length) {
    const body = el('div');
    if (notes.facts?.length) {
      const ul = el('ul', { class: 'ed-facts' });
      notes.facts.forEach(f => ul.append(el('li', {}, [f])));
      body.append(ul);
    }
    if (notes.mnemonic) {
      const mn = el('div', { class: 'ed-mnemonic' });
      mn.append(el('span', { class: 'tag' }, ['Remember']));
      const t = document.createElement('span'); t.textContent = notes.mnemonic;
      mn.append(t);
      body.append(mn);
    }
    if (notes.confusedWith?.length) {
      const note = el('div', { class: 'ed-note' });
      note.textContent = 'Common Confusion: ' + notes.confusedWith.join(' · ');
      body.append(note);
    }
    wrap.append(section('Key Facts', body));
  }

  /* ---- Timeline ---- */
  if (p.timeline?.length) wrap.append(section('Timeline', renderTimeline(p.timeline)));

  /* ---- Related features ---- */
  const related = Atlas.relations?.relationsFor(feat, feat.layerKey ?? '') ?? [];
  if (related.length) wrap.append(section('Related features', renderRelated(related)));

  /* ---- Locator ---- */
  const loc = renderLocator(feat);
  if (loc) wrap.append(section('Locator', loc));

  /* ---- References ---- */
  const src = el('div', { class: 'ed-sources' });
  (p.source ? p.source.split('+').map(s => s.trim()) : [])
    .filter(Boolean).forEach(s => src.append(el('span', { class: 'ed-source' }, [s])));
  if (p.lastUpdated) src.append(el('span', { class: 'ed-source' }, [`Retrieved ${p.lastUpdated}`]));
  if (src.children.length) wrap.append(section('References', src));

  /* ---- Data-quality remarks ---- */
  if (p.geometryNote) wrap.append(el('div', { class: 'ed-note' }, [p.geometryNote]));
  if (p.remark)       wrap.append(el('div', { class: 'ed-note' }, [p.remark]));

  return wrap;
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function kickerLine(p, kind) {
  const bits = [kind];
  if (p.basin)  bits.push(p.basin + ' basin');
  if (p.range)  bits.push(p.range);
  return bits.join(' · ');
}

function composeOverview(p, kind) {
  const bits = [];
  const name = (p.name ?? '').replace(/\s+(River|Lake|\(.*\))/g, '');
  switch (p.type) {
    case 'river':
      bits.push(`${esc(name)} is a ${p.perennial ? 'perennial' : 'seasonal'} river of the ${esc(p.basin ?? '')} basin, roughly ${p.length_km ?? '—'} km long from its source in <em>${esc(p.headwaters ?? '—')}</em> to its outlet at <em>${esc(p.mouth ?? '—')}</em>.`);
      if (p.tributaries?.length) bits.push(`Major tributaries include ${esc(p.tributaries.slice(0,4).join(', '))}.`);
      break;
    case 'lake':
      bits.push(`${esc(name)} is a${p.lake_type === 'artificial' ? 'n artificial' : ' natural'} ${esc(p.salinity ?? 'freshwater')} lake${p.basin ? ' within the ' + esc(p.basin) + ' basin' : ''}${p.established ? ', constructed in ' + esc(p.established) : ''}.`);
      break;
    case 'mountain_range':
      bits.push(`${esc(name)} runs approximately ${esc(p.trend ?? 'SW–NE')} for ${p.length_km ?? '—'} km through Rajasthan.`);
      if (p.highest_peak) bits.push(`Its highest point is <em>${esc(p.highest_peak.name)}</em> at ${p.highest_peak.ele_m} m.`);
      break;
    case 'desert':
      bits.push(`${esc(name)} covers roughly 60 percent of Rajasthan, extending across the western districts.`);
      break;
    case 'peak':
      bits.push(`${esc(name)} rises to ${p.elevation_m ?? '—'} m in the ${esc(p.range ?? 'Aravalli')} range${p.district ? ', ' + esc(p.district) + ' district' : ''}.`);
      break;
    case 'physiographic_region':
      bits.push(`${esc(name)} covers ${p.districts_included?.length ?? 0} districts.`);
      break;
    case 'drainage_basin':
      bits.push(`${esc(name)} spans ${p.districts_included?.length ?? 0} districts of Rajasthan.`);
      break;
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
  n.textContent = String(value);
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
function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : String(n);
}

/* -------------------------------------------------------------------------- */
/*  Timeline                                                                  */
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

/* -------------------------------------------------------------------------- */
/*  Related features — clickable chips grouped by layer                       */
/* -------------------------------------------------------------------------- */

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

/* Compact locator — feature over the districts silhouette */
function renderLocator(feat) {
  const districts = Atlas.layers.features('districts');
  if (!districts?.length) return null;
  const proj = Atlas.projection;
  const vb = proj.viewBox();
  const scale = 320 / vb[2];

  const wrap = el('div', { class: 'ed-locator' });
  const svg = svgEl('svg', {
    viewBox: `0 0 ${vb[2] * scale} ${vb[3] * scale}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
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
  const g = feat.geometry;
  if (g?.type === 'Point') {
    const [x, y] = proj.forward(g.coordinates);
    svg.append(svgEl('circle', { class: 'feat point', cx: x * scale, cy: y * scale, r: 4 }));
  } else if (g?.type === 'LineString') {
    const pts = g.coordinates.map(c => proj.forward(c).map(v => v * scale));
    const d = `M${pts[0][0]},${pts[0][1]}` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join('');
    svg.append(svgEl('path', { class: 'feat line', d }));
  } else if (g?.type === 'MultiLineString') {
    let d = '';
    for (const line of g.coordinates) {
      const pts = line.map(c => proj.forward(c).map(v => v * scale));
      d += `M${pts[0][0]},${pts[0][1]}` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join('');
    }
    svg.append(svgEl('path', { class: 'feat line', d }));
  } else if (g) {
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates;
    let d = '';
    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => proj.forward([lon, lat]).map(v => v * scale));
      if (!pts.length) continue;
      d += `M${pts[0][0]},${pts[0][1]}` +
           pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + 'Z';
    }
    svg.append(svgEl('path', { class: 'feat', d }));
  }
  wrap.append(svg);
  const cap = el('div', { class: 'caption' });
  cap.textContent = `${feat.properties.name} within Rajasthan`;
  wrap.append(cap);
  return wrap;
}
