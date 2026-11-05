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

    // paneles superiores: metros (izq.), elotes en el carrito (centro), elotes ganados (der.)
    makePanel(this, 120, 40, 200, 52, 0x000000, 0.4);
    this.metersText = this.add.text(120, 40, '0 m', textStyle(30)).setOrigin(0.5);
    makePanel(this, cx, 40, 190, 52, 0x000000, 0.4);
    svgImage(this, cx - 58, 40, 'carrito').setScale(0.2);
    this.elotesText = this.add.text(cx + 16, 40, '0', textStyle(30)).setOrigin(0.5);
    makePanel(this, GAME_WIDTH - 210, 40, 220, 52, 0x000000, 0.4);
    svgImage(this, GAME_WIDTH - 280, 40, 'elote').setScale(0.6);
    this.scoreText = this.add.text(GAME_WIDTH - 190, 40, '0', textStyle(32, COLORS.amarilloHex)).setOrigin(0.5);

    this.pauseBtn = makeIconButton(this, GAME_WIDTH - 50, 40, 26, COLORS.crema, iconPause, () => this.pause());

    // pedales en las esquinas inferiores
    this.pedals = {
      brake: this.makePedal(112, GAME_HEIGHT - 78, 0xd62828, 'FRENO'),
      gas: this.makePedal(GAME_WIDTH - 112, GAME_HEIGHT - 78, 0x2e8b57, 'ACELERAR'),
    };
    this.input.on('pointerup', (p) => this.releasePointer(p.id));
    this.input.on('pointerupoutside', (p) => this.releasePointer(p.id));
    this.game.events.on('blur', this.releaseAll, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.releaseAll, this));

    this.hint = this.add
      .text(cx, GAME_HEIGHT - 36, 'Izquierda frena · Derecha acelera', textStyle(22, COLORS.cremaHex))
      .setOrigin(0.5);
    this.time.delayedCall(4000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 400 }));

    this.floats = [];
    const ev = this.game_.events;
    ev.on('elote-lost', () => this.showFloat('¡Se cayó un elote!', '#ff6b6b'));
    ev.on('elote-picked', (pos) => this.showPickup(pos));
    ev.on('elote-added', () => this.showFloat('¡Elote al carrito!', COLORS.amarilloHex));
    ev.on('perro-hit', () => this.showFloat('¡Guau! ¡Perro!', '#ff9f43'));
    ev.on('dona-hit', () => this.showFloat('¡Ay, la doña!', '#ff9f43'));
    ev.on('cable-hit', () => this.showFloat('¡Los cables de la CFE!', '#9be7ff'));
    ev.on('chile', () => this.showFloat('¡Chile! ¡Pícale!', '#ff6b6b'));
    ev.on('bolsa', (n) => this.showFloat(n > 0 ? `¡Bolsa de elotes! +${n}` : 'Carrito lleno', COLORS.amarilloHex));
    ev.on('camioneta-saltada', () => this.showFloat('¡Saltaste la camioneta!', '#9bffb0'));
    ev.on('landed', (gained) => this.showFloat(`¡Buen salto! +${gained}`, '#9be7ff'));
    ev.on('marometa', (flips, bonus) => this.showFloat(flips > 1 ? `¡${flips} MAROMETAS! +${bonus}` : `¡MAROMETA! +${bonus}`, '#ff6bd6'));
    ev.on('checkpoint', (m, bonus) => this.showFloat(`¡${m} m! +${bonus}`, COLORS.amarilloHex));
    ev.on('venta', (value) => this.showFloat(`¡Gracias! +${value}`, '#9bffb0'));
    ev.on('robo', (n) => this.showFloat(n > 1 ? `¡Órale! Te quitaron ${n}` : '¡Órale! Te quitaron uno', '#ff6b6b'));
    ev.on('stall-warning', () => this.showFloat('¡Se está cansando! Dale ACELERAR o reversa', '#ffb347'));
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
    const w = 190;
    const h = 118;
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
    const label = this.add.text(0, -22, text, textStyle(28)).setOrigin(0.5);
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

  /** "+1" pequeño en el lugar del elote recogido (coordenadas del mundo → pantalla). */
  showPickup(pos) {
    const cam = this.game_.cameras.main;
    const x = pos ? pos.x - cam.scrollX : GAME_WIDTH / 2;
    const y = pos ? pos.y - cam.scrollY : GAME_HEIGHT / 2;
    const t = this.add.text(x, y, '+1', textStyle(26, COLORS.amarilloHex)).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  showFloat(msg, color = '#ffffff') {
    this.floats = this.floats.filter((f) => f.active);
    const slot = this.floats.length;
    const y = GAME_HEIGHT * 0.28 + slot * 40;
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
    this.scoreText.setText(`${s.total}`);
  }
}
