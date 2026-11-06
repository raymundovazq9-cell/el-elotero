import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const STRIPES = [0xe4007c, 0xf7c948, 0x2e8b57, 0x3a86ff, 0xf2762e];

/**
 * Cortina de lona entre escenas: entra por la izquierda, detiene las escenas
 * indicadas, arranca la siguiente y sale por la derecha.
 * data: { next, data, stop: [claves] }
 */
export default class WipeScene extends Phaser.Scene {
  constructor() {
    super('Wipe');
  }

  create({ next, data = undefined, stop = [] }) {
    this.scene.bringToTop();
    const w = GAME_WIDTH + 160;
    const g = this.add.graphics();
    const stripeW = 90;
    for (let i = 0, x = -80; x < w; i++, x += stripeW) {
      g.fillStyle(STRIPES[i % STRIPES.length], 1);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + stripeW, 0);
      g.lineTo(x + stripeW - 40, GAME_HEIGHT);
      g.lineTo(x - 40, GAME_HEIGHT);
      g.closePath();
      g.fillPath();
    }
    g.lineStyle(6, 0x1a1a1a, 1);
    g.lineBetween(w - 2, 0, w - 42, GAME_HEIGHT);
    g.x = -w - 40;
    this.tweens.add({
      targets: g,
      x: 0,
      duration: 320,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        for (const k of stop) if (this.scene.isActive(k) || this.scene.isPaused(k)) this.scene.stop(k);
        this.scene.run(next, data);
        this.scene.bringToTop();
        this.tweens.add({ targets: g, x: w + 60, duration: 340, delay: 60, ease: 'Cubic.easeOut', onComplete: () => this.scene.stop() });
      },
    });
  }
}
void Phaser;
