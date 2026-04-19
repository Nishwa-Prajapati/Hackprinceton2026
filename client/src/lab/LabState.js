// Singleton cross-system event bus.
// Three.js code emits; React components subscribe via labState.on().
class LabState extends EventTarget {
  emit(type, data = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail: data }));
  }

  // Returns an unsubscribe function so React effects can clean up cleanly.
  on(type, handler) {
    const wrapper = e => handler(e.detail);
    this.addEventListener(type, wrapper);
    return () => this.removeEventListener(type, wrapper);
  }
}

export const labState = new LabState();
