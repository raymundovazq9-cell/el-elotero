import { CART } from '../config.js';

/**
 * Detecta que el carrito ya no avanza (atorado en una subida o contra algo).
 * Emite 'stall-warning' a la mitad del tiempo y 'stall' al cumplirse.
 */
export default class Stall {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    this.maxX = cart.x;
    this.ms = 0;
    this.warned = false;
    this.done = false;
  }

  /** Avance mínimo (px) para considerar que sigue progresando. */
  static PROGRESS_PX = 3;

  update(deltaMs) {
    if (this.done) return;
    if (this.cart.x > this.maxX + Stall.PROGRESS_PX) {
      this.maxX = Math.max(this.maxX, this.cart.x);
      if (this.warned) this.scene.events.emit('stall-clear');
      this.ms = 0;
      this.warned = false;
      return;
    }
    this.ms += deltaMs;
    if (!this.warned && this.ms >= CART.stallMs / 2) {
      this.warned = true;
      this.scene.events.emit('stall-warning');
    }
    if (this.ms >= CART.stallMs) {
      this.done = true;
      this.scene.events.emit('stall');
    }
  }

  get fraction() {
    return Math.min(1, this.ms / CART.stallMs);
  }
}
