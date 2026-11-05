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

    this.pedals = {
      brake: this.makePedal(118, GAME_HEIGHT - 110, 0xd62828, 'FRENO'),
      gas: this.makePedal(GAME_WIDTH - 118, GAME_HEIGHT - 110, 0x2e8b57, 'ACELERAR'),
    };
    this.brakeBox = this.pedals.brake.box;
    this.brakeText = this.pedals.brake.label;
    this.input.on('pointerup', (p) => this.releasePointer(p.id));
    this.input.on('pointerupoutside', (p) => this.releasePointer(p.id));
    this.game.events.on('blur', this.releaseAll, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.releaseAll, this));

    this.hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 210, 'Pisa los pedales: izquierda frena, derecha acelera', {
        ...FONT,
        fontSize: '20px',
      })
      .setOrigin(0.5);
    this.time.delayedCall(4000, () => this.hint.setVisible(false));

    this.game_.events.on('elote-lost', () => this.showFloat('¡Se cayó un elote!', '#ff6b6b'));
    this.game_.events.on('elote-picked', () => this.showFloat('¡+1 elote!', '#ffe680'));
    this.game_.events.on('elote-full', () => this.showFloat('Carrito lleno', '#dddddd'));
    this.game_.events.on('perro-hit', () => this.showFloat('¡Guau! ¡Perro!', '#ff9f43'));
    this.game_.events.on('landed', (gained) => this.showFloat(`¡+aire! +${gained}`, '#9be7ff'));
    this.game_.events.on('gameover', () => {
      this.releaseAll();
      this.hint.setVisible(false);
    });
  }

  /** Botón grande con seguimiento del pointer que lo pisó (multitouch). */
  makePedal(x, y, color, text) {
    const w = 200;
    const h = 120;
    const box = this.add.rectangle(x, y, w, h, color, 0.8).setStrokeStyle(4, 0xffffff);
    const label = this.add.text(x, y, text, { ...FONT, fontSize: '28px' }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w + 30, h + 50).setInteractive();
    const pedal = { box, label, zone, pointerId: null, down: false, color };
    zone.on('pointerdown', (p) => {
      pedal.pointerId = p.id;
      this.setPedal(pedal, true);
    });
    zone.on('pointerover', (p) => {
      if (p.isDown) {
        pedal.pointerId = p.id;
        this.setPedal(pedal, true);
      }
    });
    zone.on('pointerout', (p) => {
      if (pedal.pointerId === p.id) this.setPedal(pedal, false);
    });
    return pedal;
  }

  setPedal(pedal, down) {
    pedal.down = down;
    if (!down) pedal.pointerId = null;
    pedal.box.setFillStyle(pedal.color, down ? 1 : 0.8);
    pedal.box.setScale(down ? 0.94 : 1);
    pedal.label.setScale(down ? 0.94 : 1);
    this.pushPedals();
  }

  releasePointer(id) {
    for (const pedal of Object.values(this.pedals)) {
      if (pedal.pointerId === id) this.setPedal(pedal, false);
    }
  }

  releaseAll() {
    for (const pedal of Object.values(this.pedals)) this.setPedal(pedal, false);
  }

  pushPedals() {
    const g = this.game_;
    if (!g || !g.setPedals) return;
    g.uiBrake = this.pedals.brake.down;
    g.uiGas = this.pedals.gas.down;
    g.setPedals(g.uiBrake, g.uiGas);
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
    const s = g.over ? g.final : g.getStats();
    this.metersText.setText(`${s.meters} m`);
    this.elotesText.setText(`🌽 ${s.elotes}`);
    this.scoreText.setText(`${s.score}`);
    if (g.over) {
      this.pedals.brake.box.setVisible(false);
      this.pedals.brake.label.setVisible(false);
      this.pedals.gas.box.setVisible(false);
      this.pedals.gas.label.setVisible(false);
    }
  }
}
