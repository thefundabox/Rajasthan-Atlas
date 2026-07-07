/**
 * AtlasCore — the singleton composition root.
 *
 * Imports every manager, instantiates them, wires the shared EventBus, and
 * exposes a stable global via `window.Atlas`. Every future feature — quiz
 * engine, protected areas layer, sync module, tutorial — goes through this
 * object; nothing bypasses it.
 *
 * Boot sequence (in order):
 *   1. Load atlas.json manifest.
 *   2. Configure ProjectionEngine from manifest bounds.
 *   3. Attach Renderer + InteractionManager to a host <svg>.
 *   4. Restore theme.
 *   5. Register the built-in `districts` layer + built-in style modes.
 *   6. Attach UI chrome (toolbar, panels, status bar, search).
 */

import { CONFIG }               from './config.js';
import { EventBus }             from './util/events.js';
import { DataManager }          from './DataManager.js';
import { ProjectionEngine }     from './ProjectionEngine.js';
import { Renderer }             from './Renderer.js';
import { LayerManager }         from './LayerManager.js';
import { SearchEngine }         from './SearchEngine.js';
import { ThemeManager }         from './ThemeManager.js';
import { InteractionManager }   from './InteractionManager.js';
import { UIManager }            from './UIManager.js';
import { ExportManager }        from './ExportManager.js';
import { SearchUI }             from './SearchUI.js';
import { LabelManager }         from './LabelManager.js';
import { StatsManager }         from './StatsManager.js';
import { RelationsGraph }       from './RelationsGraph.js';
import { KnowledgeGraph }       from './KnowledgeGraph.js';
import { svgEl }                from './util/dom.js';

class AtlasCoreClass {
  constructor() {
    this.version    = CONFIG.version;
    this.config     = CONFIG;
    this.bus        = new EventBus();

    this.data        = new DataManager(this);
    this.projection  = new ProjectionEngine(this);
    this.renderer    = new Renderer(this);
    this.layers      = new LayerManager(this);
    this.search      = new SearchEngine(this);
    this.theme       = new ThemeManager(this);
    this.interaction = new InteractionManager(this);
    this.labels      = new LabelManager(this);
    this.stats       = new StatsManager(this);
    this.relations   = new RelationsGraph(this);
    this.knowledge   = new KnowledgeGraph(this);
    this.ui          = new UIManager(this);
    this.export      = new ExportManager(this);
    this.manifest    = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Boot the atlas into the given root element.
   * @param {HTMLElement} root — usually document.body
   */
  async boot(root) {
    try {
      this.manifest = await this._loadManifest();

      this.projection.configure({
        type:    this.manifest.projection.display.type,
        bounds:  this.manifest.projection.bounds,
        viewBox: CONFIG.projection.svgViewBox,
        padding: CONFIG.projection.padding,
      });

      // Create the host SVG in the .a-map container.
      const mapEl = root.querySelector('.a-map');
      const svg   = svgEl('svg', {
        id: 'atlas-map', xmlns: 'http://www.w3.org/2000/svg',
        role: 'img', 'aria-label': this.manifest.name,
      });
      mapEl.prepend(svg);

      this.renderer.attachTo(svg);
      this.interaction.attachTo(svg);
      this.labels.attachTo(svg);
      this.theme.restore();

      this._registerBuiltInModes();

      // Load & register every layer declared in the manifest.
      for (const layerCfg of this.manifest.layers) {
        await this.registerLayer(layerCfg);
      }

      this.ui.attachTo(root);
      // Search UI has its own class because it's a header widget, not chrome
      // around the map. Wire it after UIManager because the header markup
      // is expected to exist.
      new SearchUI(this, root.querySelector('.search'));

      // Sensible default mode.
      this.layers.setMode('base');
      this.bus.emit('atlas:ready', { manifest: this.manifest });
    } catch (err) {
      this._showBootError(root, err);
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API — the surface the user's spec asked for                */
  /* ------------------------------------------------------------------ */

  /** `Atlas.registerLayer({ id, name, type, data, ... })` — thin alias. */
  registerLayer(config) { return this.layers.register(config); }

  /** Human-facing metadata for the "about" dialog / status bar. */
  info() {
    return {
      name:       this.manifest?.name,
      version:    this.version,
      projection: this.projection.meta(),
      layers:     this.layers.list().map(l => ({ id: l.id, name: l.name })),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Built-in style modes                                              */
  /* ------------------------------------------------------------------ */

  /**
   * These are the three modes shipped with Module 1:
   *   base     — flat neutral
   *   division — choropleth by division (uses [data-division] attr in CSS)
   *   new      — highlight retained-new districts
   *
   * All three are CSS-driven: LayerManager toggles a `mode-<id>` class on
   * the root <svg> and CSS selectors keyed off feature dataset attributes
   * do the rest. Zero re-render, zero per-feature style recomputation.
   */
  _registerBuiltInModes() {
    this.layers.registerMode('base',     { apply: () => ({}) });
    this.layers.registerMode('division', { apply: () => ({}) });
    this.layers.registerMode('new',      { apply: () => ({}) });
  }

  /* ------------------------------------------------------------------ */
  /*  IO helpers                                                        */
  /* ------------------------------------------------------------------ */

  async _loadManifest() {
    const r = await fetch(CONFIG.io.atlasManifest);
    if (!r.ok) throw new Error(`atlas.json fetch failed (${r.status})`);
    return r.json();
  }

  _showBootError(root, err) {
    const mapEl = root.querySelector('.a-map');
    if (!mapEl) { console.error(err); return; }
    mapEl.innerHTML =
      `<div style="padding:2rem;color:var(--ink-muted);font-family:var(--font-serif);">
         <h3 style="margin-top:0">Atlas boot failed</h3>
         <p>Check the browser console for details. If you're serving via
            <code>file://</code>, use <code>python3 -m http.server</code> instead —
            ES modules and <code>fetch()</code> need an HTTP origin.</p>
         <pre style="white-space:pre-wrap;color:var(--accent)">${String(err)}</pre>
       </div>`;
    console.error('[AtlasCore] boot failed:', err);
  }
}

/** The atlas is a singleton — one per document. */
export const Atlas = new AtlasCoreClass();
// Also expose on window for devtools / cross-frame handles.
if (typeof window !== 'undefined') window.Atlas = Atlas;
