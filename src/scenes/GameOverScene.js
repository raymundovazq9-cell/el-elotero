import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makeCard } from '../ui/widgets.js';
import { svgImage } from '../assets.js';
import { levelById } from '../data/levels.js';

const TITLES = {
  volcadura: '¡SE VOLTEÓ!',
  'sin-elotes': '¡SIN ELOTES!',
  cansado: '¡SE CANSÓ!',
};

const LINES = [
  ['recogidos', 'Elotes recogidos'],
  ['metros', 'Bono por metros'],
  ['marometas', 'Marometas'],
  ['aire', 'Tiempo en el aire'],
  ['ventas', 'Ventas a clientes'],
  ['misiones', 'Misiones cumplidas'],
];

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    const { meters = 0, earned = {}, total = 0, reason = '', isRecord = false, best = 0, bank = 0, level = 'callejon', missions = [] } = data || {};
    const dark = textStyle(24, COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2 });

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 400 });

    const card = this.add.container(cx, cy).setScale(0.6).setAlpha(0);
    const items = [makeCard(this, 0, 0, 720, 460)];
    items.push(this.add.text(0, -190, TITLES[reason] || TITLES['sin-elotes'], textStyle(48, COLORS.rosaHex, { fontStyle: '700' })).setOrigin(0.5));

    // columna izquierda: metros y récord
    items.push(this.add.text(-180, -120, `${meters} m`, textStyle(64, COLORS.azulHex, { fontStyle: '700', stroke: COLORS.cremaHex, strokeThickness: 3 })).setOrigin(0.5));
    items.push(this.add.text(-180, -72, levelById(level).nombre, dark).setOrigin(0.5));
    const recordText = this.add
      .text(-180, -30, isRecord ? '¡NUEVO RÉCORD!' : `Récord: ${best} m`, textStyle(26, isRecord ? COLORS.verdeHex : COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2 }))
      .setOrigin(0.5);
    items.push(recordText);

    // columna derecha: desglose de elotes ganados
    let y = -135;
    for (const [key, label] of LINES) {
      const v = earned[key] || 0;
      if (!v) continue;
      items.push(this.add.text(40, y, label, dark).setOrigin(0, 0.5));
      items.push(this.add.text(330, y, `+${v}`, textStyle(24, COLORS.verdeHex, { stroke: COLORS.cremaHex, strokeThickness: 2 })).setOrigin(1, 0.5));
      y += 34;
    }
    if (y === -135) {
      items.push(this.add.text(185, y, 'Esta vez no ganaste elotes', dark).setOrigin(0.5));
      y += 34;
    }
    items.push(this.add.text(40, y + 14, 'Ganaste', textStyle(30, COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2 })).setOrigin(0, 0.5));
    items.push(this.add.text(290, y + 14, `+${total}`, textStyle(44, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 6 })).setOrigin(1, 0.5));
    items.push(svgImage(this, 332, y + 14, 'elote').setScale(0.8));

    missions.forEach((m, i) => {
      items.push(this.add.text(-180, 80 + i * 24, `✓ ${m.texto}`, textStyle(16, COLORS.verdeHex, { stroke: COLORS.cremaHex, strokeThickness: 2 })).setOrigin(0.5));
    });
    items.push(this.add.text(-180, 40, `Banco: ${bank}`, textStyle(26, COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2 })).setOrigin(0.5));
    items.push(svgImage(this, -180 + 80 + String(bank).length * 7, 40, 'elote').setScale(0.6));

    card.add(items);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut', delay: 150 });
    if (isRecord) this.tweens.add({ targets: recordText, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });

    this.time.delayedCall(700, () => {
      this.again = makeButton(this, cx + 150, cy + 160, 260, 76, COLORS.verde, 'OTRA VEZ', () => this.restart(), { fontSize: 36 });
      this.shopBtn = makeButton(this, cx - 150, cy + 160, 260, 76, COLORS.naranja, 'TIENDA', () => this.shop(), { fontSize: 36 });
    });
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop('GameOver');
    this.scene.start('Game');
  }

  shop() {
    this.scene.stop('UI');
    this.scene.stop('GameOver');
    this.scene.stop('Game');
    this.scene.start('Garage');
  }
}
