import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const FONT = { fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 5, align: 'center' };
export const BEST_KEY = 'elotero.best';

export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* sin almacenamiento */
  }
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    const { meters = 0, elotes = 0, score = 0, bonus = 0, reason = '' } = data || {};
    const best = loadBest();
    const isRecord = score > best;
    if (isRecord) saveBest(score);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 200, reason === 'volcadura' ? '¡SE VOLTEÓ!' : '¡SIN ELOTES!', { ...FONT, fontSize: '52px', color: '#ff6b6b' }).setOrigin(0.5);
    this.add.text(cx, 300, `${meters} m  ×  ${elotes} 🌽`, { ...FONT, fontSize: '34px' }).setOrigin(0.5);
    if (bonus > 0) this.add.text(cx, 345, `+ ${bonus} de aire`, { ...FONT, fontSize: '26px', color: '#9be7ff' }).setOrigin(0.5);
    this.add.text(cx, 430, `${score}`, { ...FONT, fontSize: '80px', color: '#ffe680' }).setOrigin(0.5);
    this.add
      .text(cx, 510, isRecord ? '¡NUEVO RÉCORD!' : `Récord: ${best}`, { ...FONT, fontSize: '30px', color: isRecord ? '#7CFC00' : '#dddddd' })
      .setOrigin(0.5);

    const tap = this.add.text(cx, 720, 'Toca para volver a intentar', { ...FONT, fontSize: '28px' }).setOrigin(0.5).setAlpha(0);
    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: tap, alpha: 1, duration: 400, yoyo: true, repeat: -1 });
      this.input.once('pointerdown', () => this.restart());
    });
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop('GameOver');
    this.scene.start('Game');
  }
}
