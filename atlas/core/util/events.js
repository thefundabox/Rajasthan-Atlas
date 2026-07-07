/**
 * EventBus — tiny synchronous pub/sub for cross-module comms.
 *
 * Every AtlasCore module gets a shared bus so they can emit events (e.g.
 * `layer:added`, `selection:changed`, `theme:changed`) without holding
 * direct references to each other. Keeps the dependency graph a DAG.
 */
export class EventBus {
  constructor() { this._listeners = new Map(); }

  /** Subscribe. Returns an unsubscribe function. */
  on(topic, fn) {
    if (!this._listeners.has(topic)) this._listeners.set(topic, new Set());
    this._listeners.get(topic).add(fn);
    return () => this.off(topic, fn);
  }

  /** Unsubscribe. */
  off(topic, fn) {
    const set = this._listeners.get(topic);
    if (set) set.delete(fn);
  }

  /** Fire. Listeners run in registration order; exceptions are logged, not rethrown. */
  emit(topic, payload) {
    const set = this._listeners.get(topic);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); }
      catch (err) { console.error(`[EventBus] listener for "${topic}" threw:`, err); }
    }
  }
}
