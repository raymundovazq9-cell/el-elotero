import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.cameras.main.setBackgroundColor('#87b7e0');
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'EL ELOTERO\n(base lista)', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const ball = this.matter.add.circle(GAME_WIDTH / 2, 100, 20, { restitution: 0.8 });
    this.matter.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, GAME_WIDTH, 40, { isStatic: true });
    this.ball = ball;
  }
}
