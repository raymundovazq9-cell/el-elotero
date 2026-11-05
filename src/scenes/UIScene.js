import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const FONT = { fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');

    this.metersText = this.add.text(16, 14, '0 m', { ...FONT, fontSize: '34px' });
    this.elotesText = this.add.text(GAME_WIDTH - 16, 14, '🌽 0', { ...FONT, fontSize: '34px' }).setOrigin(1, 0);
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 60, '0', { ...FONT, fontSize: '28px', color: '#ffe680' })
      .setOrigin(0.5, 0);

    this.brakeBox = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 70, 220, 56, 0xd62828, 0.85)
      .setStrokeStyle(3, 0xffffff)
      .setVisible(false);
    this.brakeText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'FRENO', { ...FONT, fontSize: '30px' })
      .setOrigin(0.5)
      .setVisible(false);

    this.hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 140, 'Mantén presionado para frenar', {
        ...FONT,
        fontSize: '22px',
      })
      .setOrigin(0.5);
    this.time.delayedCall(3500, () => this.hint.setVisible(false));

    this.game_.events.on('elote-lost', () => this.showFloat('¡Se cayó un elote!', '#ff6b6b'));
    this.game_.events.on('elote-picked', () => this.showFloat('¡+1 elote!', '#ffe680'));
    this.game_.events.on('elote-full', () => this.showFloat('Carrito lleno', '#dddddd'));
    this.game_.events.on('perro-hit', () => this.showFloat('¡Guau! ¡Perro!', '#ff9f43'));
  }

  showFloat(msg, color = '#ffffff') {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, msg, { ...FONT, fontSize: '36px', color })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: t.y - 60,
      duration: 250,
      yoyo: false,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, delay: 500, duration: 300, onComplete: () => t.destroy() });
      },
    });
  }

  update() {
    const g = this.game_;
    if (!g || !g.getStats) return;
    const s = g.getStats();
    this.metersText.setText(`${s.meters} m`);
    this.elotesText.setText(`🌽 ${s.elotes}`);
    this.scoreText.setText(`${s.score}`);
    this.brakeBox.setVisible(s.braking);
    this.brakeText.setVisible(s.braking);
  }
}
