// input.js — keyboard state for Neon Harbor: held keys, edge-triggered presses.
// One job: turn DOM keyboard events into a clean query API for the game systems.

export class KeyboardControls {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => { this.held.clear(); });
  }
  isDown(code) { return this.held.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  endFrame() { this.pressed.clear(); }
}
