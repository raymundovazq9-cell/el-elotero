import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PX_PER_METER } from '../config.js';
import Road from '../objects/Road.js';
import Cart from '../objects/Cart.js';
import EloteManager from '../objects/EloteManager.js';
import { difficultyAt } from '../objects/Difficulty.js';
import { DEBUG, isBrakeScripted } from '../debug.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.cameras.main.setBackgroundColor('#87b7e0');

    this.startX = 120;
    this.road = new Road(
      this,
      (x) => Math.max(0, (x - this.startX) / PX_PER_METER),
      DEBUG.test ? 'elotero' : undefined
    );
    this.road.buildStraight(-400, 300, 900, 20);

    this.cart = new Cart(this, this.startX, 440);
    this.elotes = new EloteManager(this, this.cart, this.road);
    this.bonus = 0;

    this.braking = false;
    this.input.on('pointerdown', () => this.setBraking(true));
    this.input.on('pointerup', () => this.setBraking(this.input.activePointer.isDown));
    this.input.on('pointerupoutside', () => this.setBraking(false));
    this.game.events.on('blur', () => this.setBraking(false));

    this.scene.launch('UI');

    const cam = this.cameras.main;
    cam.scrollX = this.cart.x - GAME_WIDTH * 0.3;
    cam.scrollY = this.cart.y - GAME_HEIGHT * 0.35;
  }

  setBraking(v) {
    this.braking = v;
    this.cart.setBraking(v);
  }

  difficultyAt(meters) {
    return difficultyAt(meters);
  }

  get meters() {
    return Math.max(0, Math.floor((this.cart.x - this.startX) / PX_PER_METER));
  }

  getStats() {
    return {
      meters: this.meters,
      elotes: this.elotes.count,
      score: this.meters * this.elotes.count + this.bonus,
      braking: this.braking,
    };
  }

  update(time, delta) {
    if (DEBUG.test) {
      this.testClock = (this.testClock || 0) + delta;
      this.setBraking(isBrakeScripted(this.testClock));
      if (!this.nextLog || this.testClock >= this.nextLog) {
        this.nextLog = (this.nextLog || 0) + 1000;
        const c = this.cart;
        console.log(
          `[test] t=${Math.round(this.testClock)} x=${c.x.toFixed(0)} y=${c.y.toFixed(0)} vx=${c.speedX.toFixed(2)} ang=${c.angleDeg.toFixed(1)} brake=${this.braking} stats=${JSON.stringify(this.getStats())}`
        );
      }
    }
    this.cart.update(delta);
    this.elotes.update();

    const cam = this.cameras.main;
    this.road.update(cam.scrollX);

    const targetX = this.cart.x - GAME_WIDTH * 0.3;
    const targetY = this.cart.y - GAME_HEIGHT * 0.35;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.15);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.12);
  }
}
