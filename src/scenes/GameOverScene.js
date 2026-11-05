import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makeCard } from '../ui/widgets.js';
import { svgImage } from '../assets.js';

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

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 400 });

    const card = this.add.container(cx, cy).setScale(0.6).setAlpha(0);
    const cardBg = makeCard(this, 0, 0, 600, 440);
    const title = this.add
      .text(0, -170, reason === 'volcadura' ? '¡SE VOLTEÓ!' : '¡SIN ELOTES!', textStyle(50, COLORS.rosaHex, { fontStyle: '700' }))
      .setOrigin(0.5);
    const line1 = this.add.text(-30, -108, `${meters} m  ×  ${elotes}`, textStyle(36, COLORS.negro, { stroke: COLORS.cremaHex })).setOrigin(0.5);
    const icon = svgImage(this, 70, -108, 'elote').setScale(0.7);
    const bonusText = this.add
      .text(0, -68, bonus > 0 ? `+ ${bonus} de aire` : ' ', textStyle(26, COLORS.azulHex, { stroke: COLORS.cremaHex }))
      .setOrigin(0.5);
    const scoreText = this.add.text(0, -4, `${score}`, textStyle(76, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 10 })).setOrigin(0.5);
    const recordText = this.add
      .text(0, 58, isRecord ? '¡NUEVO RÉCORD!' : `Récord: ${best}`, textStyle(30, isRecord ? COLORS.verdeHex : COLORS.negro, { stroke: COLORS.cremaHex }))
      .setOrigin(0.5);
    card.add([cardBg, title, line1, icon, bonusText, scoreText, recordText]);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut', delay: 150 });
    if (isRecord) this.tweens.add({ targets: recordText, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });

    this.time.delayedCall(700, () => {
      this.again = makeButton(this, cx + 130, cy + 150, 250, 76, COLORS.verde, 'OTRA VEZ', () => this.restart(), { fontSize: 36 });
      this.menuBtn = makeButton(this, cx - 130, cy + 150, 250, 76, COLORS.azul, 'MENÚ', () => this.menu());
    });
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop('GameOver');
    this.scene.start('Game');
  }

  menu() {
    this.scene.stop('UI');
    this.scene.stop('GameOver');
    this.scene.stop('Game');
    this.scene.start('Title');
  }
}
