import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { loadBest } from './GameOverScene.js';
import { unlockAudio, Sfx } from '../audio.js';

const FONT = { fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 5, align: 'center' };

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#87b7e0');
    const cx = GAME_WIDTH / 2;

    // calle decorativa
    const g = this.add.graphics();
    g.fillStyle(0x5a5a5a, 1);
    g.fillTriangle(0, 560, GAME_WIDTH, 800, GAME_WIDTH, GAME_HEIGHT);
    g.fillRect(0, 560, GAME_WIDTH, GAME_HEIGHT - 560);
    g.fillStyle(0x87b7e0, 1);
    g.fillTriangle(0, 560, GAME_WIDTH, 560, GAME_WIDTH, 800);

    this.add.image(cx, 170, 'elote').setScale(1.5);
    this.add.text(cx, 280, 'EL ELOTERO', { ...FONT, fontSize: '72px', color: '#ffe680' }).setOrigin(0.5);
    this.add.text(cx, 345, 'Baja la calle sin perder los elotes', { ...FONT, fontSize: '24px' }).setOrigin(0.5);

    this.add
      .text(cx, 440, 'Mantén presionado: FRENAR\nSuelta: AVANZAR', { ...FONT, fontSize: '26px', lineSpacing: 8 })
      .setOrigin(0.5);

    const best = loadBest();
    this.add.text(cx, 540, best > 0 ? `Récord: ${best}` : 'Sin récord todavía', { ...FONT, fontSize: '28px', color: '#dddddd' }).setOrigin(0.5);

    const tap = this.add.text(cx, 700, 'Toca para empezar', { ...FONT, fontSize: '34px' }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => {
      unlockAudio();
      Sfx.inicio();
      this.scene.start('Game');
    });
  }
}
