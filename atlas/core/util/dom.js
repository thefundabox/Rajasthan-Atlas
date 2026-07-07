/**
 * DOM helpers. Intentionally tiny — this project rejects heavy DOM libs.
 */

const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML-escape a value for safe innerHTML insertion. Never trust upstream data. */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => HTML_ESC[c]);

/**
 * Build an element with attrs & optional children (Text | Element | string).
 * @param {string} tag
 * @param {Object<string, string|number|boolean>} [attrs]
 * @param {(Node|string)[]} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class' || k === 'className') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v === false || v == null) { /* skip */ }
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

/**
 * Build an SVG element in the SVG namespace.
 */
export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

/**
 * Round to n decimal places without floating-point noise.
 */
export const round = (n, d = 2) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};
