/**
 * SearchUI — DOM adapter around SearchEngine.
 *
 * SearchEngine is a pure ranker; this class binds it to the input, results
 * dropdown, and keyboard navigation in the header. Also emits `search:pick`
 * over the bus so any module can react (default reaction: InteractionManager
 * selects + zooms).
 */

import { esc, el } from './util/dom.js';

export class SearchUI {
  constructor(atlas, rootEl) {
    this.atlas    = atlas;
    this.root     = rootEl;
    this.input    = rootEl.querySelector('input');
    this.clearBtn = rootEl.querySelector('.clear');
    this.results  = rootEl.querySelector('.search-results');
    this.focusIdx = -1;
    this._bind();
    // Default handler: select & zoom.
    this.atlas.bus.on('search:pick', ({ layerId, featureId }) => {
      this.atlas.interaction.select(layerId, featureId, { zoom: true });
    });
  }

  _bind() {
    this.input.addEventListener('input',  () => this._render(this.input.value));
    this.input.addEventListener('focus',  () => { if (this.input.value.trim()) this._render(this.input.value); });
    this.input.addEventListener('keydown', (ev) => this._onKey(ev));
    this.clearBtn.addEventListener('click', () => this.clear());
    document.addEventListener('click', (ev) => {
      if (!this.root.contains(ev.target)) this._hide();
    });
  }

  clear() {
    this.input.value = '';
    this.root.classList.remove('has-value');
    this._hide();
    this.input.focus();
  }

  _hide() { this.results.classList.remove('on'); this.focusIdx = -1; }

  _render(value) {
    const q = value.trim();
    this.root.classList.toggle('has-value', !!q);
    this.results.innerHTML = '';
    this.focusIdx = -1;
    if (!q) { this._hide(); return; }
    const rows = this.atlas.search.search(q);
    if (rows.length === 0) {
      this.results.append(el('div', { class: 'empty' }, [`No match for "${q}"`]));
    } else {
      rows.forEach((row, i) => {
        const { feature, layer } = row;
        const p = feature.properties ?? {};
        const rowEl = el('div', {
          class: 'row', dataset: { layer: layer.id, feature: feature.id },
          onmousedown: (ev) => { ev.preventDefault(); this._pick(layer.id, feature.id); },
          onmouseenter: () => this._focus(i),
        });
        const name = el('span', { class: 'name' });
        name.innerHTML = esc(p.name) + (p.newDistrict ? ' <span class="tt-tag">new</span>' : '');
        rowEl.append(name);
        rowEl.append(el('span', { class: 'meta' }, [
          `${esc(layer.name)}${p.division ? ' · ' + esc(p.division) + ' div' : ''}` +
          (p.headquarters ? ' · HQ ' + esc(p.headquarters) : ''),
        ]));
        this.results.append(rowEl);
      });
    }
    this.results.classList.add('on');
  }

  _focus(i) {
    const rows = this.results.querySelectorAll('.row');
    rows.forEach(r => r.classList.remove('focus'));
    if (i >= 0 && i < rows.length) { rows[i].classList.add('focus'); this.focusIdx = i; }
  }
  _pick(layerId, featureId) {
    const feat = this.atlas.data.getFeature(layerId, featureId);
    if (feat) this.input.value = feat.properties?.name ?? featureId;
    this.root.classList.add('has-value');
    this._hide();
    this.atlas.bus.emit('search:pick', { layerId, featureId });
  }
  _onKey(ev) {
    const rows = this.results.querySelectorAll('.row');
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this._focus(Math.min(this.focusIdx + 1, rows.length - 1)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); this._focus(Math.max(this.focusIdx - 1, 0)); }
    else if (ev.key === 'Enter') {
      const target = this.focusIdx >= 0 ? rows[this.focusIdx] : (rows.length === 1 ? rows[0] : null);
      if (target) this._pick(target.dataset.layer, target.dataset.feature);
    }
    else if (ev.key === 'Escape') this.clear();
  }
}
