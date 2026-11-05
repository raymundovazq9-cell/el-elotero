import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { svgImage } from '../assets.js';
import { makePanel, makeIconButton, iconPause } from '../ui/widgets.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');
    const cx = GAME_WIDTH / 2;

    // paneles superiores
    makePanel(this, 110, 44, 190, 56, 0x000000, 0.4);
    this.metersText = this.add.text(110, 44, '0 m', textStyle(30)).setOrigin(0.5);
    makePanel(this, GAME_WIDTH - 110, 44, 190, 56, 0x000000, 0.4);
    svgImage(this, GAME_WIDTH - 170, 44, 'elote').setScale(0.6);
    this.elotesText = this.add.text(GAME_WIDTH - 98, 44, '0', textStyle(30)).setOrigin(0.5);
    makePanel(this, cx, 104, 220, 52, 0x000000, 0.4);
    this.scoreText = this.add.text(cx, 104, '0', textStyle(32, COLORS.amarilloHex)).setOrigin(0.5);

    this.pauseBtn = makeIconButton(this, GAME_WIDTH - 44, 150, 26, COLORS.crema, iconPause, () => this.pause());

    // pedales
    this.pedals = {
      brake: this.makePedal(118, GAME_HEIGHT - 105, 0xd62828, 'FRENO'),
      gas: this.makePedal(GAME_WIDTH - 118, GAME_HEIGHT - 105, 0x2e8b57, 'ACELERAR'),
    };
    this.input.on('pointerup', (p) => this.releasePointer(p.id));
    this.input.on('pointerupoutside', (p) => this.releasePointer(p.id));
    this.game.events.on('blur', this.releaseAll, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.releaseAll, this));

    this.hint = this.add
      .text(cx, GAME_HEIGHT - 215, 'Izquierda frena · Derecha acelera', textStyle(22, COLORS.cremaHex))
      .setOrigin(0.5);
    this.time.delayedCall(4000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 400 }));

    this.floats = [];
    const ev = this.game_.events;
    ev.on('elote-lost', () => this.showFloat('¡Se cayó un elote!', '#ff6b6b'));
    ev.on('elote-picked', () => this.showFloat('¡+1 elote!', COLORS.amarilloHex));
    ev.on('elote-full', () => this.showFloat('Carrito lleno', '#dddddd'));
    ev.on('perro-hit', () => this.showFloat('¡Guau! ¡Perro!', '#ff9f43'));
    ev.on('landed', (gained) => this.showFloat(`¡Aire! +${gained}`, '#9be7ff'));
    ev.on('gameover', () => {
      this.releaseAll();
      this.hint.setVisible(false);
      this.pauseBtn.setVisible(false);
      this.pauseBtn.zone.input.enabled = false;
      for (const p of Object.values(this.pedals)) p.container.setVisible(false);
    });

    this.cameras.main.fadeIn(300);
  }

  pause() {
    if (this.game_.over) return;
    this.releaseAll();
    this.scene.pause('Game');
    this.scene.launch('Pause');
  }

  /** Pedal grande con seguimiento del pointer que lo pisó (multitouch). */
  makePedal(x, y, color, text) {
    const w = 210;
    const h = 130;
    const g = this.add.graphics();
    const paint = (down) => {
      g.clear();
      if (!down) {
        g.fillStyle(0x000000, 0.35);
        g.fillRoundedRect(-w / 2 + 4, -h / 2 + 10, w, h, 24);
      }
      g.fillStyle(color, down ? 1 : 0.9);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
      g.lineStyle(5, 0x1a1a1a, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
      if (!down) {
        g.fillStyle(0xffffff, 0.2);
        g.fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, 34, 14);
      }
      // ranuras de pedal
      g.fillStyle(0x1a1a1a, 0.25);
      for (let i = -2; i <= 2; i++) g.fillRoundedRect(i * 30 - 10, 14, 20, 30, 6);
    };
    paint(false);
    const label = this.add.text(0, -24, text, textStyle(30)).setOrigin(0.5);
    const container = this.add.container(x, y, [g, label]);
    const zone = this.add.zone(x, y, w + 40, h + 70).setInteractive();
    const pedal = { container, label, zone, pointerId: null, down: false, paint };
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
    pedal.paint(down);
    pedal.container.setScale(down ? 0.95 : 1);
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
    this.floats = this.floats.filter((f) => f.active);
    const slot = this.floats.length;
    const y = GAME_HEIGHT * 0.3 + slot * 44;
    const t = this.add.text(GAME_WIDTH / 2, y, msg, textStyle(34, color)).setOrigin(0.5).setAlpha(0);
    this.floats.push(t);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: y - 50,
      duration: 250,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: y - 80, delay: 550, duration: 300, onComplete: () => t.destroy() });
      },
    });
  }

  update() {
    const g = this.game_;
    if (!g || !g.getStats) return;
    const s = g.over ? g.final : g.getStats();
    this.metersText.setText(`${s.meters} m`);
    this.elotesText.setText(`${s.elotes}`);
    this.scoreText.setText(`${s.score}`);
  }
}
