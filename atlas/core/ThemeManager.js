/**
 * ThemeManager — swaps a class on the document root.
 *
 * Themes are pure CSS: light (default, no class), dark, print, high-contrast.
 * The engine never reads a colour value; every colour lives behind a CSS custom
 * property in atlas/ui/styles/theme.css. Adding a new theme = adding a CSS
 * ruleset and calling ThemeManager.register('name', 'html-class').
 *
 * Persisted in localStorage under CONFIG.theme.persistKey.
 */

import { CONFIG } from './config.js';

export class ThemeManager {
  constructor(atlas) {
    this.atlas = atlas;
    this._themes = new Map();       // id → { cls, meta }
    this._active = null;
    this.register('light',         { cls: null,               meta: { name: 'Light' } });
    this.register('dark',          { cls: 'theme-dark',       meta: { name: 'Dark' } });
    this.register('print',         { cls: 'theme-print',      meta: { name: 'Print' } });
    this.register('high-contrast', { cls: 'theme-hc',         meta: { name: 'High Contrast' } });
  }

  register(id, spec) { this._themes.set(id, spec); }
  list()             { return [...this._themes.keys()]; }
  meta(id)           { return this._themes.get(id)?.meta ?? null; }
  active()           { return this._active; }

  /** Apply a theme by id. Persists to localStorage. */
  apply(id) {
    if (!this._themes.has(id)) return false;
    const html = document.documentElement;
    // Remove every known theme class before applying the new one.
    for (const spec of this._themes.values()) {
      if (spec.cls) html.classList.remove(spec.cls);
    }
    const spec = this._themes.get(id);
    if (spec.cls) html.classList.add(spec.cls);
    this._active = id;
    try { localStorage.setItem(CONFIG.theme.persistKey, id); } catch (_) { /* ignore */ }
    this.atlas.bus.emit('theme:changed', { id });
    return true;
  }

  /** Restore persisted theme or fall back to config default. */
  restore() {
    let id = null;
    try { id = localStorage.getItem(CONFIG.theme.persistKey); } catch (_) {}
    if (!id || !this._themes.has(id)) id = CONFIG.theme.default;
    this.apply(id);
  }

  /** Cycle through registered themes in order — used by the toolbar button. */
  cycle() {
    const ids = this.list();
    const next = ids[(ids.indexOf(this._active) + 1) % ids.length];
    this.apply(next);
    return next;
  }
}
