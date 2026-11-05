import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Road from '../objects/Road.js';
import Cart from '../objects/Cart.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.cameras.main.setBackgroundColor('#87b7e0');

    this.road = new Road(this);
    this.road.buildStraight(-400, 300, 6000, 22);

    this.cart = new Cart(this, 120, 440);

    this.cameras.main.setZoom(1);
  }

  update(time, delta) {
    this.cart.update(delta);

    const cam = this.cameras.main;
    const targetX = this.cart.x - GAME_WIDTH * 0.3;
    const targetY = this.cart.y - GAME_HEIGHT * 0.35;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.15);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.12);
  }
}
