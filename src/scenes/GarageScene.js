import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { svgImage, SVG_SCALE } from '../assets.js';
import { Save } from '../save.js';
import { CARTS, cartById } from '../data/carts.js';
import { LEVELS, levelById } from '../data/levels.js';
import { UPGRADES, MAX_LEVEL, upgradePrice, applyUpgrades } from '../data/upgrades.js';
import { buildCartPreview } from '../views/CartPreview.js';
import { CLOTHES_TYPES, clothesOf, clothKey } from '../data/clothes.js';
import { makeButton, makeIconButton, makePanel, iconMusic } from '../ui/widgets.js';
import { setMuted, isMuted, Sfx, unlockAudio } from '../audio.js';
import { Music } from '../music.js';
import { DEBUG } from '../debug.js';
import { dailyMissions, todayKey } from '../data/missions.js';

const TABS = [
  { id: 'carrito', label: 'CARRITO' },
  { id: 'mejoras', label: 'MEJORAS' },
  { id: 'ropa', label: 'ROPA' },
  { id: 'lugar', label: 'LUGAR' },
  { id: 'misiones', label: 'MISIONES' },
];

const PANEL_X = 400; // inicio del panel derecho
const PANEL_W = GAME_WIDTH - PANEL_X - 20;
const ROW_H = 58;
const ROWS_Y = 172;

/** Tienda: carrito en vivo a la izquierda y pestañas de compra a la derecha. */
export default class GarageScene extends Phaser.Scene {
  constructor() {
    super('Garage');
  }

  create(data) {
    this.tab = (data && data.tab) || DEBUG.tab || this.tab || 'carrito';
    this.content = [];
    this.cameras.main.setBackgroundColor('#2a3f6b');

    // fondo: pared de taller con franja
    const g = this.add.graphics();
    g.fillStyle(0x1b2a49, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x24365e, 1);
    for (let i = 0; i < 12; i++) g.fillRect(0, 60 + i * 40, GAME_WIDTH, 20);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, 430, 380, 110);
    g.fillStyle(0xcfc5ad, 1);
    g.fillRect(0, 418, 380, 14);

    // barra superior
    this.backBtn = makeButton(this, 70, 40, 110, 52, COLORS.azul, 'ATRÁS', () => this.back(), { fontSize: 24 });
    this.add.text(250, 40, 'TIENDA', textStyle(40, COLORS.amarilloHex, { fontStyle: '700' })).setOrigin(0.5);
    makePanel(this, GAME_WIDTH - 150, 40, 250, 52, 0x000000, 0.4);
    svgImage(this, GAME_WIDTH - 250, 40, 'elote').setScale(0.75);
    this.bankText = this.add.text(GAME_WIDTH - 215, 40, '', textStyle(30, COLORS.amarilloHex)).setOrigin(0, 0.5);

    // pestañas
    this.tabButtons = {};
    TABS.forEach((t, i) => {
      const x = PANEL_X + 56 + i * 108;
      this.tabButtons[t.id] = makeButton(this, x, 108, 102, 48, COLORS.naranja, t.label, () => this.setTab(t.id), { fontSize: 17 });
    });
    makePanel(this, PANEL_X + PANEL_W / 2, 306, PANEL_W, 326, 0x000000, 0.35, 22);

    this.playBtn = makeButton(this, 190, 480, 300, 80, COLORS.verde, '¡A VENDER!', () => this.play(), { fontSize: 38 });
    this.musicBtn = makeIconButton(this, GAME_WIDTH - 46, 500, 26, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());

    this.input.once('pointerdown', () => {
      unlockAudio();
      Music.setVolume(0.3);
      Music.setTempo(96);
      Music.start();
    });
    this.events.once('shutdown', () => Music.stop());

    this.refresh();
    this.cameras.main.fadeIn(250);
  }

  toggleMusic() {
    setMuted(!isMuted());
    this.musicBtn.destroyAll();
    this.musicBtn = makeIconButton(this, GAME_WIDTH - 46, 500, 26, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());
  }

  /** Redibuja el carrito de la izquierda, el banco y la pestaña activa. */
  refresh() {
    this.bankText.setText(`${Save.bank}`);
    this.buildPreview();
    for (const t of TABS) this.tabButtons[t.id].setAlpha(t.id === this.tab ? 1 : 0.6);
    this.renderTab();
  }

  buildPreview() {
    if (this.preview) this.preview.destroy();
    if (this.previewTexts) this.previewTexts.forEach((t) => t.destroy());
    const cart = cartById(Save.data.cart);
    const up = applyUpgrades(cart.fisica, Save.upgradesFor(cart.id));
    this.preview = buildCartPreview(this, cart, { x: 200, y: 395, elotes: up.startElotes });
    this.preview.spin(1800);
    const level = levelById(Save.data.level);
    this.previewTexts = [
      this.add.text(190, 95, cart.nombre, textStyle(32, COLORS.cremaHex)).setOrigin(0.5),
      this.add.text(190, 130, `${level.nombre} · récord ${Save.bestFor(level.id)} m`, textStyle(20, COLORS.cremaHex)).setOrigin(0.5),
    ];
  }

  setTab(id) {
    if (this.tab === id) return;
    this.tab = id;
    Sfx.clac();
    this.refresh();
  }

  clearContent() {
    for (const o of this.content) {
      if (o.destroyAll) o.destroyAll();
      else o.destroy();
    }
    this.content = [];
  }

  renderTab() {
    this.clearContent();
    if (this.tab === 'carrito') this.renderCarts();
    else if (this.tab === 'mejoras') this.renderUpgrades();
    else if (this.tab === 'ropa') this.renderClothes();
    else if (this.tab === 'lugar') this.renderLevels();
    else if (this.tab === 'misiones') this.renderMissions();
  }

  /** Las tres misiones del día con su premio y si ya se cumplieron. */
  renderMissions() {
    const key = DEBUG.missionSeed || todayKey();
    const done = Save.missionsDone(key);
    this.content.push(this.add.text(PANEL_X + PANEL_W / 2, ROWS_Y - 14, 'Misiones de hoy (cada una se cumple en una sola partida)', textStyle(16, COLORS.cremaHex)).setOrigin(0.5));
    dailyMissions(key).forEach((m, i) => {
      const ok = done.includes(m.id);
      const y = this.row(i + 0.6, m.texto, ok ? 'Cumplida' : `Premio: ${m.premio} elotes`, {
        color: ok ? COLORS.verde : COLORS.azul,
        label: ok ? '✓ LISTA' : `${m.premio}`,
        disabled: true,
      });
      if (!ok) this.content.push(svgImage(this, PANEL_X + PANEL_W - 190, y, 'elote').setScale(0.5));
      this.content[this.content.length - (ok ? 1 : 2)].setAlpha(1);
    });
  }

  /** Tres columnas (sombreros, mandiles, playeras) con una ficha por prenda. */
  renderClothes() {
    const colW = (PANEL_W - 30) / 3;
    CLOTHES_TYPES.forEach((t, col) => {
      const cx = PANEL_X + 15 + colW * (col + 0.5);
      this.content.push(this.add.text(cx, ROWS_Y - 14, t.nombre, textStyle(22, COLORS.amarilloHex)).setOrigin(0.5));
      clothesOf(t.id).forEach((c, i) => {
        const key = clothKey(c.tipo, c.id);
        const owned = Save.owns('clothes', key);
        const equipped = Save.data.clothes.equipped[c.tipo] === c.id;
        const y = ROWS_Y + 28 + i * 50;
        let color = COLORS.naranja;
        let label = `${c.nombre.replace(/^(Sombrero de |Mandil |Playera |Camisa de |Máscara de )/, '')}  ·  ${c.precio}`;
        let onClick = () => this.tryBuy(c.precio, () => {
          Save.own('clothes', key);
          Save.equip(c.tipo, c.id);
        });
        let disabled = Save.bank < c.precio;
        if (equipped) {
          color = COLORS.verde;
          label = `${c.nombre.replace(/^(Sombrero de |Mandil |Playera |Camisa de |Máscara de )/, '')}  ✓`;
          disabled = true;
        } else if (owned) {
          color = COLORS.azul;
          label = c.nombre.replace(/^(Sombrero de |Mandil |Playera |Camisa de |Máscara de )/, '');
          onClick = () => {
            Save.equip(c.tipo, c.id);
            Sfx.clac();
            this.refresh();
          };
          disabled = false;
        }
        const b = makeButton(this, cx, y, colW - 14, 42, color, label, onClick, { fontSize: 17 });
        if (disabled) b.setEnabled(false);
        if (equipped) b.setAlpha(1);
        this.content.push(b);
      });
    });
  }

  /** Fila genérica: título, descripción y un botón a la derecha. */
  row(i, title, desc, btn) {
    const y = ROWS_Y + i * ROW_H;
    const x0 = PANEL_X + 20;
    this.content.push(this.add.text(x0, y - 12, title, textStyle(24, COLORS.cremaHex)).setOrigin(0, 0.5));
    this.content.push(
      this.add.text(x0, y + 14, desc, textStyle(14, '#cfd8e6', { strokeThickness: 2, align: 'left', wordWrap: { width: PANEL_W - 230 } })).setOrigin(0, 0.5)
    );
    if (btn) {
      const b = makeButton(this, PANEL_X + PANEL_W - 90, y, 150, 46, btn.color, btn.label, btn.onClick, { fontSize: 20 });
      if (btn.disabled) b.setEnabled(false);
      this.content.push(b);
    }
    return y;
  }

  buyButton(price, owned, selected, onBuy, onSelect) {
    if (selected) return { color: COLORS.verde, label: 'EN USO', disabled: true };
    if (owned) return { color: COLORS.azul, label: 'ELEGIR', onClick: onSelect };
    return { color: COLORS.naranja, label: `${price}`, onClick: () => this.tryBuy(price, onBuy), disabled: Save.bank < price };
  }

  tryBuy(price, onBuy) {
    if (!Save.spend(price)) {
      this.toast(`Te faltan ${price - Save.bank} elotes`);
      return;
    }
    Sfx.eloteRecogido();
    onBuy();
    this.refresh();
  }

  renderCarts() {
    CARTS.forEach((c, i) => {
      const owned = Save.owns('cart', c.id);
      const selected = Save.data.cart === c.id;
      const btn = this.buyButton(c.precio, owned, selected, () => Save.own('cart', c.id) || Save.select('cart', c.id), () => {
        Save.select('cart', c.id);
        Sfx.clac();
        this.refresh();
      });
      const y = this.row(i, c.nombre, c.descripcion, btn);
      if (!owned) this.content.push(svgImage(this, PANEL_X + PANEL_W - 190, y, 'elote').setScale(0.5));
    });
  }

  renderUpgrades() {
    const cartId = Save.data.cart;
    UPGRADES.forEach((u, i) => {
      const lv = Save.upgradeLevel(cartId, u.id);
      const price = upgradePrice(cartId, lv);
      const btn =
        price === null
          ? { color: COLORS.verde, label: 'MÁXIMO', disabled: true }
          : { color: COLORS.naranja, label: `${price}`, disabled: Save.bank < price, onClick: () => this.tryBuy(price, () => Save.setUpgrade(cartId, u.id, lv + 1)) };
      const y = this.row(i, u.nombre, u.descripcion, btn);
      // barra de 6 segmentos
      const g = this.add.graphics();
      const bx = PANEL_X + PANEL_W - 320;
      for (let k = 0; k < MAX_LEVEL; k++) {
        g.fillStyle(k < lv ? COLORS.amarillo : 0x000000, k < lv ? 1 : 0.4);
        g.fillRoundedRect(bx + k * 18, y - 8, 14, 16, 3);
        g.lineStyle(2, 0x1a1a1a, 1);
        g.strokeRoundedRect(bx + k * 18, y - 8, 14, 16, 3);
      }
      this.content.push(g);
      if (price !== null) this.content.push(svgImage(this, PANEL_X + PANEL_W - 190, y, 'elote').setScale(0.5));
    });
  }

  renderLevels() {
    LEVELS.forEach((l, i) => {
      const owned = Save.owns('level', l.id);
      const selected = Save.data.level === l.id;
      const btn = this.buyButton(l.precio, owned, selected, () => Save.own('level', l.id) || Save.select('level', l.id), () => {
        Save.select('level', l.id);
        Sfx.clac();
        this.refresh();
      });
      const best = Save.bestFor(l.id);
      const y = this.row(i, l.nombre, `${l.descripcion}${best ? `  ·  récord ${best} m` : ''}`, btn);
      if (!owned) this.content.push(svgImage(this, PANEL_X + PANEL_W - 190, y, 'elote').setScale(0.5));
    });
  }

  toast(msg) {
    const t = this.add.text(PANEL_X + PANEL_W / 2, 470, msg, textStyle(24, '#ff6b6b')).setOrigin(0.5);
    this.tweens.add({ targets: t, y: 440, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  play() {
    unlockAudio();
    Sfx.inicio();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  back() {
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }
}

export { SVG_SCALE };
