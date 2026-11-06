import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makePanel, makeCard } from '../ui/widgets.js';
import { CUPS } from '../data/cups.js';
import { levelById } from '../data/levels.js';
import { Save } from '../save.js';
import { Sfx, unlockAudio } from '../audio.js';
import { svgImage } from '../assets.js';
import { wipeTo } from '../ui/transitions.js';

const CARD_W = 270;
const CARD_H = 300;

/** Elegir copa: una tarjeta por escenario (bloqueada si no lo tienes), trofeos y ¡CORRER! */
export default class CupScene extends Phaser.Scene {
  constructor() {
    super('Cup');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b2a49');
    const g = this.add.graphics();
    g.fillStyle(0x24365e, 1);
    for (let i = 0; i < 12; i++) g.fillRect(0, 60 + i * 40, GAME_WIDTH, 20);

    makeButton(this, 70, 40, 110, 52, COLORS.azul, 'ATRÁS', () => this.back(), { fontSize: 24 });
    this.add.text(GAME_WIDTH / 2, 40, 'COPAS', textStyle(40, COLORS.amarilloHex, { fontStyle: '700' })).setOrigin(0.5);
    makePanel(this, GAME_WIDTH - 150, 40, 250, 52, 0x000000, 0.4);
    svgImage(this, GAME_WIDTH - 250, 40, 'elote').setScale(0.75);
    this.add.text(GAME_WIDTH - 215, 40, `${Save.bank}`, textStyle(30, COLORS.amarilloHex)).setOrigin(0, 0.5);
    this.add
      .text(GAME_WIDTH / 2, 82, 'Carrera corta contra 3 eloteros del barrio. Gana el que llegue primero a la meta.', textStyle(17, COLORS.cremaHex))
      .setOrigin(0.5);

    const available = CUPS.filter((c) => true);
    this.selected =
      this.selected && available.find((c) => c.id === this.selected) ? this.selected : (available.find((c) => Save.owns('level', c.level)) || available[0]).id;
    this.cards = [];
    const total = available.length;
    const gap = 20;
    const x0 = GAME_WIDTH / 2 - ((CARD_W + gap) * (total - 1)) / 2;
    available.forEach((cup, i) => this.cards.push(this.makeCard(cup, x0 + i * (CARD_W + gap), 262)));

    this.runBtn = makeButton(this, GAME_WIDTH / 2, 478, 320, 76, COLORS.verde, '¡CORRER!', () => this.run(), { fontSize: 36 });
    this.refresh();
    this.cameras.main.fadeIn(250);
  }

  makeCard(cup, x, y) {
    const level = levelById(cup.level);
    const owned = Save.owns('level', cup.level);
    const st = Save.cupStats(cup.id);
    const items = [makeCard(this, 0, 0, CARD_W, CARD_H)];
    const dark = (size, color = COLORS.negro) => textStyle(size, color, { stroke: COLORS.cremaHex, strokeThickness: 2 });
    items.push(
      this.add.text(0, -118, cup.nombre, textStyle(24, COLORS.rosaHex, { fontStyle: '700', stroke: COLORS.cremaHex, strokeThickness: 3 })).setOrigin(0.5)
    );
    items.push(this.add.text(0, -84, `${level.nombre} · ${cup.metros} m`, dark(18)).setOrigin(0.5));
    // trofeos
    const trophies = Math.min(st.ganadas, 5);
    for (let i = 0; i < 5; i++) {
      const tx = -60 + i * 30;
      const t = this.add
        .text(tx, -44, '🏆', { fontSize: '24px' })
        .setOrigin(0.5)
        .setAlpha(i < trophies ? 1 : 0.2);
      items.push(t);
    }
    items.push(this.add.text(0, -10, st.carreras ? `${st.ganadas} ganadas de ${st.carreras}` : 'Sin carreras todavía', dark(16)).setOrigin(0.5));
    items.push(this.add.text(0, 16, st.mejorLugar ? `Mejor lugar: ${st.mejorLugar}º` : '', dark(16)).setOrigin(0.5));
    items.push(this.add.text(0, 58, 'Premio al 1º', dark(16)).setOrigin(0.5));
    items.push(this.add.text(-16, 88, `${cup.premio}`, textStyle(34, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 5 })).setOrigin(1, 0.5));
    items.push(svgImage(this, 12, 88, 'elote').setScale(0.7));
    if (!owned) {
      items.push(this.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0.45));
      items.push(this.add.text(0, 120, `Compra ${level.nombre} en LUGAR`, textStyle(15, COLORS.cremaHex)).setOrigin(0.5));
      items.push(this.add.text(0, 30, '🔒', { fontSize: '44px' }).setOrigin(0.5));
    }
    const c = this.add.container(x, y, items);
    const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (!owned) return;
      this.selected = cup.id;
      Sfx.clac();
      this.refresh();
    });
    const ring = this.add.graphics();
    ring.lineStyle(6, COLORS.amarillo, 1);
    ring.strokeRoundedRect(-CARD_W / 2 - 4, -CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 24);
    c.add(ring);
    return { cup, container: c, ring, owned };
  }

  refresh() {
    for (const c of this.cards) {
      const sel = c.cup.id === this.selected;
      c.ring.setVisible(sel);
      c.container.setScale(sel ? 1.04 : 1);
    }
    const cup = this.cards.find((c) => c.cup.id === this.selected);
    this.runBtn.setEnabled(!!cup && cup.owned);
  }

  run() {
    unlockAudio();
    Sfx.inicio();
    wipeTo(this, 'Game', { mode: 'copa', cup: this.selected });
  }

  back() {
    wipeTo(this, 'Garage');
  }
}
void Phaser;
