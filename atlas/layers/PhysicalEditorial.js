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
import { t, tf, tfacts, getLang } from '../core/i18n.js';

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
  const p      = feat.properties ?? {};
  const kindEn = KIND_LABEL[p.type] ?? 'Physical feature';
  const kind   = t(kindEn);
  const notes = p.notes    ?? {};
  const eco   = p.ecology  ?? {};
  const gov   = p.governance ?? {};

  const wrap = el('div', { class: 'ed' });

  /* ---- Hero ---- */
  const hero = el('div', { class: 'ed-hero' });
  hero.append(el('div', { class: 'ed-kicker' }, [kickerLine(p, kind)]));
  const title = el('h2', { class: 'ed-title' }); title.textContent = tf(p, 'name') ?? feat.id;
  hero.append(title);
  const aliases = tf(p, 'aliases');
  if (aliases?.length) {
    const sub = el('p', { class: 'ed-sub' });
    sub.textContent = t('Also: ') + aliases.join(' · ');
    hero.append(sub);
  }
  const tags = el('div', { class: 'ed-tags' });
  if (p.perennial === true)    tags.append(tag(t('Perennial'), 'ramsar'));
  if (p.perennial === false)   tags.append(tag(t('Seasonal'), 'wls'));
  if (p.salinity === 'saline') tags.append(tag(t('Saline'), 'tr'));
  if (p.lake_type === 'natural')    tags.append(tag(t('Natural'), 'np'));
  if (p.lake_type === 'artificial') tags.append(tag(t('Artificial'), 'wls'));
  if (p.geometryQuality === 'generalised') tags.append(tag(t('Generalised boundary'), 'point'));
  if (p.geometryQuality === 'point')       tags.append(tag(t('Point feature'), 'point'));
  // Quality tier badge — always present so readers can gauge geometry trust.
  const badge = el('span');
  badge.innerHTML = qualityBadgeHTML(p.geometryQuality);
  if (badge.firstChild) tags.append(badge.firstChild);
  if (tags.children.length) hero.append(tags);
  wrap.append(hero);

  /* ---- Overview ---- */
  const overview = composeOverview(p, kind, kindEn);
  if (overview) {
    wrap.append(section(t('Overview'),
      Object.assign(el('p', { class: 'ed-overview' }), { innerHTML: overview })));
  }

  /* ---- Key figures ---- */
  const figures = el('div', { class: 'ed-figures' });
  const dincl = tf(p, 'districts_included');
  if (p.length_km != null)   figures.append(figCard(t('Length'), fmt(p.length_km), 'km'));
  if (p.area != null)        figures.append(figCard(t('Area'),   fmt(p.area),      'km²'));
  if (p.elevation_m != null) figures.append(figCard(t('Elevation'), fmt(p.elevation_m), 'm'));
  if (p.districts_included?.length)
    figures.append(figCard(t('Districts'), String(p.districts_included.length)));
  if (p.basin)               figures.append(figCard(t('Basin'), tf(p, 'basin')));
  if (p.trend)               figures.append(figCard(t('Trend'), tf(p, 'trend')));
  if (p.highest_peak)        figures.append(figCard(t('Highest'), `${tf(p.highest_peak, 'name')} — ${p.highest_peak.ele_m} m`));
  if (p.established)         figures.append(figCard(t('Built'), p.established));
  if (figures.children.length)
    wrap.append(section(t('Key figures'), figures));

  /* ---- Physical characteristics ---- */
  const phys = el('dl', { class: 'ed-row' });
  if (p.headwaters)  { phys.append(el('dt', {}, [t('Source')])); phys.append(el('dd', {}, [tf(p, 'headwaters')])); }
  if (p.mouth)       { phys.append(el('dt', {}, [t('Outlet')])); phys.append(el('dd', {}, [tf(p, 'mouth')])); }
  if (p.tributaries?.length) {
    phys.append(el('dt', {}, [t('Tributaries')]));
    phys.append(el('dd', {}, [tf(p, 'tributaries').join(', ')]));
  }
  if (p.range)       { phys.append(el('dt', {}, [t('Range')])); phys.append(el('dd', {}, [tf(p, 'range')])); }
  if (p.district)    { phys.append(el('dt', {}, [t('District')])); phys.append(el('dd', {}, [tf(p, 'district')])); }
  if (p.sub_regions?.length) {
    phys.append(el('dt', {}, [t('Sub-regions')]));
    phys.append(el('dd', {}, [tf(p, 'sub_regions').join(' · ')]));
  }
  if (p.segments?.length) {
    phys.append(el('dt', {}, [t('Segments')]));
    phys.append(el('dd', {}, [tf(p, 'segments').join(' · ')]));
  }
  if (dincl?.length) {
    phys.append(el('dt', {}, [t('Districts')]));
    phys.append(el('dd', {}, [dincl.slice(0, 8).join(', ') +
                              (dincl.length > 8 ? '…' : '')]));
  }
  if (phys.children.length)
    wrap.append(section(t('Physical characteristics'), phys));

  /* ---- Ecology ---- */
  const ecosystem = tf(eco, 'ecosystem');
  const fauna = tf(eco, 'fauna');
  const flora = tf(eco, 'flora');
  if (ecosystem || fauna?.length || flora?.length) {
    const body = el('div');
    if (ecosystem)     body.append(el('div', { class: 'ed-ecosystem' }, [ecosystem]));
    if (fauna?.length) {
      body.append(el('div', { class: 'ed-kicker' }, [t('Key fauna')]));
      const chips = el('div', { class: 'ed-chips' });
      fauna.forEach(f => chips.append(el('span', { class: 'ed-chip chip-fauna' }, [f])));
      body.append(chips);
    }
    if (flora?.length) {
      body.append(el('div', { class: 'ed-kicker', style: { marginTop: '10px' } }, [t('Key flora')]));
      const chips = el('div', { class: 'ed-chips' });
      flora.forEach(f => chips.append(el('span', { class: 'ed-chip chip-flora' }, [f])));
      body.append(chips);
    }
    wrap.append(section(t('Ecology'), body));
  }

  /* ---- Governance ---- */
  if (gov.authority || gov.status) {
    const dl = el('dl', { class: 'ed-row' });
    if (gov.authority) { dl.append(el('dt', {}, [t('Authority')])); dl.append(el('dd', {}, [tf(gov, 'authority')])); }
    if (gov.status)    { dl.append(el('dt', {}, [t('Status')]));    dl.append(el('dd', {}, [t(tf(gov, 'status'))])); }
    wrap.append(section(t('Governance'), dl));
  }

  /* ---- Atlas notes (facts + mnemonic + comparisons) ---- */
  const facts = tfacts(p);
  const mnemonic = tf(notes, 'mnemonic');
  if (facts.length || mnemonic || notes.confusedWith?.length) {
    const body = el('div');
    if (facts.length) {
      const ul = el('ul', { class: 'ed-facts' });
      facts.forEach(f => ul.append(el('li', {}, [f])));
      body.append(ul);
    }
    if (mnemonic) {
      const mn = el('div', { class: 'ed-mnemonic' });
      mn.append(el('span', { class: 'tag' }, [t('Remember')]));
      const sp = document.createElement('span'); sp.textContent = mnemonic;
      mn.append(sp);
      body.append(mn);
    }
    if (notes.confusedWith?.length) {
      const note = el('div', { class: 'ed-note' });
      note.textContent = t('Common Confusion: ') + (tf(notes, 'confusedWith') ?? notes.confusedWith).join(' · ');
      body.append(note);
    }
    wrap.append(section(t('Key Facts'), body));
  }

  /* ---- Timeline ---- */
  if (p.timeline?.length) wrap.append(section(t('Timeline'), renderTimeline(p.timeline)));

  /* ---- Related features ---- */
  const related = Atlas.relations?.relationsFor(feat, feat.layerKey ?? '') ?? [];
  if (related.length) wrap.append(section(t('Related features'), renderRelated(related)));

  /* ---- Locator ---- */
  const loc = renderLocator(feat);
  if (loc) wrap.append(section(t('Locator'), loc));

  /* ---- References ---- */
  const src = el('div', { class: 'ed-sources' });
  (p.source ? p.source.split('+').map(s => s.trim()) : [])
    .filter(Boolean).forEach(s => src.append(el('span', { class: 'ed-source' }, [s])));
  if (p.lastUpdated) src.append(el('span', { class: 'ed-source' }, [`${t('Retrieved ')}${p.lastUpdated}`]));
  if (src.children.length) wrap.append(section(t('References'), src));

  /* ---- Data-quality remarks ---- */
  if (p.geometryNote) wrap.append(el('div', { class: 'ed-note' }, [tf(p, 'geometryNote')]));
  if (p.remark)       wrap.append(el('div', { class: 'ed-note' }, [tf(p, 'remark')]));

  return wrap;
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function kickerLine(p, kind) {
  const bits = [kind];
  if (p.basin)  bits.push(tf(p, 'basin') + ' ' + t('basin'));
  if (p.range)  bits.push(tf(p, 'range'));
  return bits.join(' · ');
}

function composeOverview(p, kind, kindEn) {
  const bits = [];
  const hi   = getLang() === 'hi';
  const name = (tf(p, 'name') ?? '').replace(/\s+(River|Lake|River|नदी|झील|\(.*\))/g, '');
  const dcount = p.districts_included?.length ?? 0;

  if (hi) {
    const basin = tf(p, 'basin');
    switch (p.type) {
      case 'river':
        bits.push(`${esc(name)} ${esc(basin ?? '')} बेसिन की एक ${p.perennial ? 'बारहमासी' : 'मौसमी'} नदी है, जो लगभग ${p.length_km ?? '—'} किमी लंबी है — <em>${esc(tf(p, 'headwaters') ?? '—')}</em> से इसके उद्गम से <em>${esc(tf(p, 'mouth') ?? '—')}</em> पर मुहाने तक।`);
        if (p.tributaries?.length) bits.push(`प्रमुख सहायक नदियों में ${esc(tf(p, 'tributaries').slice(0,4).join(', '))} शामिल हैं।`);
        break;
      case 'lake':
        bits.push(`${esc(name)} ${p.lake_type === 'artificial' ? 'एक कृत्रिम' : 'एक प्राकृतिक'} ${esc(p.salinity === 'saline' ? 'खारी' : 'मीठे पानी की')} झील है${basin ? ', ' + esc(basin) + ' बेसिन के भीतर' : ''}${p.established ? ', जो ' + esc(p.established) + ' में निर्मित हुई' : ''}।`);
        break;
      case 'mountain_range':
        bits.push(`${esc(name)} राजस्थान से होकर लगभग ${esc(tf(p, 'trend') ?? 'द.प.–उ.पू.')} दिशा में ${p.length_km ?? '—'} किमी तक फैली है।`);
        if (p.highest_peak) bits.push(`इसका सर्वोच्च बिंदु <em>${esc(tf(p.highest_peak, 'name'))}</em> है, ${p.highest_peak.ele_m} मी पर।`);
        break;
      case 'desert':
        bits.push(`${esc(name)} राजस्थान के लगभग 60 प्रतिशत भाग को ढकता है, जो पश्चिमी जिलों में फैला है।`);
        break;
      case 'peak':
        bits.push(`${esc(name)} ${esc(tf(p, 'range') ?? 'अरावली')} श्रेणी में ${p.elevation_m ?? '—'} मी तक उठती है${p.district ? ', ' + esc(tf(p, 'district')) + ' जिले में' : ''}।`);
        break;
      case 'physiographic_region':
        bits.push(`${esc(name)} ${dcount} जिलों में फैला है।`);
        break;
      case 'drainage_basin':
        bits.push(`${esc(name)} राजस्थान के ${dcount} जिलों में फैला है।`);
        break;
    }
    return bits.join(' ');
  }

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
      bits.push(`${esc(name)} covers ${dcount} districts.`);
      break;
    case 'drainage_basin':
      bits.push(`${esc(name)} spans ${dcount} districts of Rajasthan.`);
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
    li.append(el('span', { class: 'ed-tl-event' }, [tf(ev, 'event')]));
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
    const relName = tf(p, 'name');
    const btn = el('button', {
      class: `ed-related-chip chip-${r.layerId}`,
      title: `${relName} — ${r.reasons.join(', ')}`,
      onclick: () => Atlas.interaction.select(r.layerId, r.featureId, { zoom: false }),
    });
    btn.append(el('span', { class: 'ed-related-kind' }, [t(LAYER_LABEL[r.layerId] ?? r.layerId)]));
    btn.append(el('span', { class: 'ed-related-name' }, [relName]));
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
  cap.textContent = `${tf(feat.properties, 'name')} ${t('within Rajasthan')}`;
  wrap.append(cap);
  return wrap;
}
