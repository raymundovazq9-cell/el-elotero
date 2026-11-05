import Phaser from 'phaser';
import { SCORE } from '../config.js';

/**
 * Lleva la cuenta del tiempo en el aire y de la rotación acumulada del carrito
 * para premiar saltos largos ('landed') y marometas ('marometa').
 */
export default class Tricks {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    this.airMs = 0;
    this.rotation = 0;
    this.prevAngle = cart.chassis.angle;
    this.flips = 0;
  }

  get airborne() {
    return this.airMs >= SCORE.airMinMs;
  }

  update(deltaMs) {
    const angle = this.cart.chassis.angle;
    const dAngle = Phaser.Math.Angle.Wrap(angle - this.prevAngle);
    this.prevAngle = angle;

    if (!this.cart.grounded) {
      this.airMs += deltaMs;
      this.rotation += dAngle;
      return;
    }
    if (this.airMs >= SCORE.airMinMs && !this.cart.tipped) {
      const flips = Math.floor(Math.abs(this.rotation) / (Math.PI * 2 * SCORE.flipFraction));
      if (flips > 0) {
        this.flips += flips;
        this.scene.events.emit('marometa', flips, flips * SCORE.flipBonus, this.rotation < 0 ? 'atras' : 'adelante');
      }
      if (this.airMs >= SCORE.airBonusMinMs) {
        const gained = Math.round((this.airMs / 1000) * SCORE.airBonusPerSecond);
        this.scene.events.emit('landed', gained, this.airMs);
      }
    }
    this.airMs = 0;
    this.rotation = 0;
  }
}
