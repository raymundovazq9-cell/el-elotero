import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { svgImage } from '../assets.js';
import { makePanel, makeIconButton, iconPause, makeCard } from '../ui/widgets.js';
import { Save } from '../save.js';

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

    this.hint = this.add.text(cx, GAME_HEIGHT - 36, 'Izquierda frena · Derecha acelera', textStyle(22, COLORS.cremaHex)).setOrigin(0.5);
    this.time.delayedCall(4000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 400 }));
    // primera partida: tarjeta con los controles en el aire (se va al pisar un pedal)
    this.firstCard = null;
    if (Save.data.totals.runs === 0 && !this.game_.race) {
      const dark = (size, color = COLORS.negro) => textStyle(size, color, { stroke: COLORS.cremaHex, strokeThickness: 2 });
      this.firstCard = this.add.container(cx, GAME_HEIGHT * 0.42, [
        makeCard(this, 0, 0, 600, 150),
        this.add.text(0, -40, 'ACELERAR empuja y, en el aire, levanta la nariz', dark(22)).setOrigin(0.5),
        this.add.text(0, 0, 'FRENO frena, da reversa y, en el aire, baja la nariz', dark(22)).setOrigin(0.5),
        this.add.text(0, 44, 'Recoge elotes y no tires los del carrito', dark(20, COLORS.rosaHex)).setOrigin(0.5),
      ]);
    }

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
    const SALTOS = { camioneta: '¡Saltaste la camioneta!', tamalero: '¡Saltaste al tamalero!', trailer: '¡Saltaste el tráiler!' };
    ev.on('vehiculo-saltado', (kind) => this.showFloat(SALTOS[kind] || '¡Qué salto!', '#9bffb0'));
    ev.on('balon-hit', () => this.showFloat('¡Gol! Te pegó el balón', '#ff9f43'));
    ev.on('charco', () => this.showFloat('¡Charco!', '#9be7ff'));
    ev.on('landed', (gained) => this.showFloat(`¡Buen salto! +${gained}`, '#9be7ff'));
    ev.on('caballito', (bonus) => this.showFloat(`¡Caballito! +${bonus}`, '#ffd166'));
    ev.on('perfecto', (bonus) => this.showFloat(`¡Aterrizaje perfecto! +${bonus}`, '#9bffb0'));
    ev.on('combo', (n) => this.showCombo(n));
    ev.on('combo-roto', () => this.hideCombo());
    ev.on('marometa', (flips, bonus) => this.showFloat(flips > 1 ? `¡${flips} MAROMETAS! +${bonus}` : `¡MAROMETA! +${bonus}`, '#ff6bd6'));
    ev.on('checkpoint', (m, bonus) => this.showFloat(`¡${m} m! +${bonus}`, COLORS.amarilloHex));
    ev.on('venta', (value) => this.showFloat(`¡Gracias! +${value}`, '#9bffb0'));
    ev.on('robo', (n) => this.showFloat(n > 1 ? `¡Órale! Te quitaron ${n}` : '¡Órale! Te quitaron uno', '#ff6b6b'));
    ev.on('stall-warning', () => {
      const g = this.scene.get('Game');
      const uphill = g && g.cart && (g.cart.groundAngle || 0) < -0.2;
      this.showFloat(uphill ? '¡Subida fuerte! Da reversa y toma vuelo' : '¡Se está cansando! Dale ACELERAR o reversa', '#ffb347');
    });
    ev.on('gameover', () => {
      this.releaseAll();
      this.hint.setVisible(false);
      this.pauseBtn.setVisible(false);
      this.pauseBtn.zone.input.enabled = false;
      for (const p of Object.values(this.pedals)) p.container.setVisible(false);
    });

    // carrera: lugar, barra de progreso con cabezas y cuenta regresiva
    this.raceUI = null;
    if (this.game_.race) this.buildRaceUI();
    ev.on('race-count', (n) => this.showCount(`${n}`));
    ev.on('race-go', () => this.showCount('¡VAMOS!', true));
    ev.on('race-player-finish', (place) =>
      this.showFloat(place === 1 ? '¡Llegaste primero!' : `Llegaste en ${place}º`, place === 1 ? '#9bffb0' : COLORS.amarilloHex)
    );
    ev.on('race-over', () => {
      this.releaseAll();
      for (const p of Object.values(this.pedals)) p.container.setVisible(false);
      this.pauseBtn.setVisible(false);
      this.pauseBtn.zone.input.enabled = false;
    });

    // combo y tiempo en el aire (bajo el HUD, centrados)
    this.comboText = this.add
      .text(cx, 96, '', textStyle(40, '#ff6bd6', { strokeThickness: 6 }))
      .setOrigin(0.5)
      .setAlpha(0);
    this.airText = this.add.text(cx, 134, '', textStyle(24, '#9be7ff')).setOrigin(0.5).setAlpha(0);

    this.cameras.main.fadeIn(300);
  }

  buildRaceUI() {
    const cx = GAME_WIDTH / 2;
    this.metersText.setText('');
    this.placeText = this.add.text(120, 40, '', textStyle(34, COLORS.amarilloHex, { fontStyle: '700' })).setOrigin(0.5);
    this.toFinishText = this.add.text(cx, 76, '', textStyle(18, COLORS.cremaHex)).setOrigin(0.5);
    // barra de progreso
    const w = 300;
    const y = 96;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(cx - w / 2 - 8, y - 8, w + 16, 16, 8);
    g.fillStyle(0xcfc5ad, 1);
    g.fillRect(cx - w / 2, y - 2, w, 4);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0x1a1a1a : 0xffffff, 1);
      g.fillRect(cx + w / 2 - 2, y - 9 + i * 3, 10, 3);
    }
    this.raceUI = { w, y, cx, g, markers: [] };
    this.lastPlace = 0;
  }

  showCount(text, go = false) {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, text, textStyle(go ? 72 : 96, go ? '#9bffb0' : COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 10 }))
      .setOrigin(0.5)
      .setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: go ? 600 : 500, duration: 300, onComplete: () => t.destroy() });
  }

  updateRaceUI(info) {
    const r = this.raceUI;
    if (!r || !info) return;
    const sufijo = ['º', 'º', 'º', 'º'];
    this.placeText.setText(`${info.place}${sufijo[info.place - 1] || 'º'} de ${info.total}`);
    if (info.place !== this.lastPlace) {
      if (this.lastPlace) {
        this.placeText.setScale(1.4);
        this.tweens.add({ targets: this.placeText, scale: 1, duration: 250, ease: 'Back.easeOut' });
      }
      this.lastPlace = info.place;
    }
    this.toFinishText.setText(info.state === 'countdown' ? '¡Prepárate!' : info.toFinish > 0 ? `${info.toFinish} m a la meta` : '¡Meta!');
    // marcadores (uno por corredor): círculo con inicial
    while (r.markers.length < info.progress.length) {
      const i = r.markers.length;
      const p = info.progress[i];
      const c = this.add
        .circle(0, r.y, p.isPlayer ? 11 : 8, p.isPlayer ? COLORS.amarillo : 0xe4007c, 1)
        .setStrokeStyle(2, 0x1a1a1a, 1)
        .setDepth(p.isPlayer ? 2 : 1);
      const t = this.add
        .text(0, r.y, p.name[0], textStyle(p.isPlayer ? 13 : 10, COLORS.negro, { strokeThickness: 0 }))
        .setOrigin(0.5)
        .setDepth(3);
      r.markers.push({ c, t });
    }
    info.progress.forEach((p, i) => {
      const x = r.cx - r.w / 2 + r.w * p.t;
      r.markers[i].c.setPosition(x, r.y);
      r.markers[i].t.setPosition(x, r.y);
    });
  }

  showCombo(n) {
    this.comboText.setText(`COMBO ×${n}`).setAlpha(1).setScale(1.5);
    if (this.comboTween) this.comboTween.stop();
    this.comboTween = this.tweens.add({ targets: this.comboText, scale: 1, duration: 320, ease: 'Back.easeOut' });
    if (this.comboFade) this.comboFade.remove();
    this.comboFade = this.time.delayedCall(2500, () => this.hideCombo());
  }

  hideCombo() {
    if (this.comboText.alpha === 0) return;
    this.tweens.add({ targets: this.comboText, alpha: 0, scale: 0.6, duration: 250 });
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
    if (down && this.firstCard) {
      this.tweens.add({
        targets: this.firstCard,
        alpha: 0,
        y: this.firstCard.y - 40,
        duration: 350,
        onComplete: () => this.firstCard && this.firstCard.destroy(),
      });
      this.firstCard = null;
    }
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
    const x = pos ? (pos.x - cam.worldView.x) * cam.zoom : GAME_WIDTH / 2;
    const y = pos ? (pos.y - cam.worldView.y) * cam.zoom : GAME_HEIGHT / 2;
    const t = this.add.text(x, y, '+1', textStyle(26, COLORS.amarilloHex)).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  showFloat(msg, color = '#ffffff') {
    this.floats = this.floats.filter((f) => f.active);
    const slot = this.floats.length;
    const y = GAME_HEIGHT * 0.28 + slot * 40;
    const t = this.add
      .text(GAME_WIDTH / 2, y, msg, textStyle(34, color))
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.4);
    this.floats.push(t);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
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
    if (this.raceUI) this.updateRaceUI(g.raceInfo());
    else this.metersText.setText(`${s.meters} m`);
    this.elotesText.setText(`${s.elotes}`);
    this.scoreText.setText(`${s.total}`);
    // tiempo en el aire en vivo
    const air = g.tricks && !g.over ? g.tricks.airMs : 0;
    if (air >= 400) {
      this.airText.setText(`${(air / 1000).toFixed(1)} s en el aire`).setAlpha(1);
    } else if (this.airText.alpha > 0) {
      this.airText.setAlpha(Math.max(0, this.airText.alpha - 0.08));
    }
  }
}
