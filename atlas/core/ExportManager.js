/**
 * ExportManager — public API surface for exports.
 *
 * At this refactor phase we only define the contract. Implementations are
 * stubbed to make it obvious in devtools that they are not wired yet — every
 * method throws a NOT_IMPLEMENTED error. Future modules will fill these in.
 *
 * Reason the shape exists now: downstream UI (toolbar Print button, future
 * "Export PNG" button) can already reference these methods, and swapping in
 * the real implementation is a one-file change.
 */

const NI = (name) => { throw new Error(`ExportManager.${name} — not implemented yet`); };

export class ExportManager {
  constructor(atlas) { this.atlas = atlas; }

  /** Serialize the current view to a stand-alone SVG string. */
  async toSVG(opts = {})  { NI('toSVG'); }
  /** Rasterise via canvas to a PNG Blob at the given pixel size. */
  async toPNG(opts = {})  { NI('toPNG'); }
  /** Build a print-ready PDF (uses jsPDF or window.print — TBD). */
  async toPDF(opts = {})  { NI('toPDF'); }
  /** Dump a layer's features back to GeoJSON. Trivial once implemented. */
  async toJSON(layerId)   { NI('toJSON'); }

  /**
   * The one export that DOES work today: browser print. Keeps the toolbar
   * Print button functional pre-implementation.
   */
  print() { window.print(); }
}
