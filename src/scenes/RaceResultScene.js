import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makeCard } from '../ui/widgets.js';
import { svgImage } from '../assets.js';
import { confettiBurst } from '../world/Particles.js';
import { wipeTo } from '../ui/transitions.js';

const PLACE_TITLES = ['¡GANASTE LA COPA!', '¡SEGUNDO LUGAR!', '¡TERCER LUGAR!', 'ÚLTIMO LUGAR'];
const OUT_TITLES = { volcadura: '¡SE VOLTEÓ!', 'sin-elotes': '¡SIN ELOTES!', cansado: '¡SE CANSÓ!' };
const PODIUM_H = [120, 90, 64, 40];

/** Resultado de la copa: podio animado, premio y botones. */
export default class RaceResultScene extends Phaser.Scene {
  constructor() {
    super('RaceResult');
  }

  create(data) {
    const { cup, place = 4, reason = null, results = [], prize = 0, collected = 0, total = 0, bank = 0 } = data || {};
    this.cup = cup;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 400 });
    const dark = (size, color = COLORS.negro) => textStyle(size, color, { stroke: COLORS.cremaHex, strokeThickness: 2 });

    const card = this.add.container(cx, cy).setScale(0.6).setAlpha(0);
    const items = [makeCard(this, 0, 0, 760, 470)];
    const title = reason ? OUT_TITLES[reason] || 'FUERA' : PLACE_TITLES[place - 1] || PLACE_TITLES[3];
    items.push(this.add.text(0, -195, title, textStyle(44, place === 1 && !reason ? COLORS.verdeHex : COLORS.rosaHex, { fontStyle: '700' })).setOrigin(0.5));
    items.push(this.add.text(0, -152, cup ? cup.nombre : '', dark(20)).setOrigin(0.5));

    // podio: columnas por lugar, el jugador resaltado
    const base = 80;
    const podiumX = [-110, -220, 0, 110];
    const order = [1, 0, 2, 3]; // 2º, 1º, 3º, 4º de izquierda a derecha
    const g = this.add.graphics();
    items.push(g);
    results.forEach((r, i) => {
      const slot = order.indexOf(i);
      const x = podiumX[order.indexOf(i)] ?? -200 + slot * 110;
      const h = PODIUM_H[i] || 30;
      g.fillStyle(r.isPlayer ? COLORS.amarillo : 0xcfc5ad, 1);
      g.lineStyle(3, 0x1a1a1a, 1);
      g.fillRoundedRect(x - 48, base - h, 96, h, 6);
      g.strokeRoundedRect(x - 48, base - h, 96, h, 6);
      items.push(
        this.add
          .text(x, base - h + 14, `${r.place}º`, textStyle(22, COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2, fontStyle: '700' }))
          .setOrigin(0.5)
      );
      items.push(
        this.add.text(x, base - h - 16, r.name, textStyle(16, r.isPlayer ? COLORS.amarilloHex : COLORS.cremaHex, { strokeThickness: 3 })).setOrigin(0.5)
      );
      if (r.out) items.push(this.add.text(x, base - h - 36, 'fuera', dark(13, COLORS.rosaHex)).setOrigin(0.5));
      if (i === 0) items.push(this.add.text(x, base - h - 46, '🏆', { fontSize: '26px' }).setOrigin(0.5));
    });

    // premio
    const px = 250;
    items.push(this.add.text(px, -90, 'Premio', dark(22)).setOrigin(0.5));
    const prizeText = this.add.text(px, -50, '0', textStyle(44, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 6 })).setOrigin(0.5);
    items.push(prizeText);
    items.push(this.add.text(px, -8, `+${collected} recogidos`, dark(18)).setOrigin(0.5));
    items.push(this.add.text(px, 40, 'Ganaste', dark(22)).setOrigin(0.5));
    const totalText = this.add.text(px + 16, 78, '0', textStyle(40, COLORS.verdeHex, { fontStyle: '700', strokeThickness: 5 })).setOrigin(1, 0.5);
    items.push(totalText, svgImage(this, px + 46, 78, 'elote').setScale(0.7));
    items.push(this.add.text(px, 118, `Banco: ${bank}`, dark(18)).setOrigin(0.5));

    card.add(items);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut', delay: 150 });
    // conteo animado
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: 1,
      duration: 900,
      delay: 500,
      onUpdate: () => {
        prizeText.setText(`${Math.round(prize * counter.v)}`);
        totalText.setText(`${Math.round(total * counter.v)}`);
      },
    });
    if (place === 1 && !reason) this.time.delayedCall(400, () => confettiBurst(this, cx, cy - 200, 90, { depth: 50, speed: 380 }));

    this.time.delayedCall(800, () => {
      makeButton(this, cx - 250, cy + 195, 230, 66, COLORS.verde, 'OTRA VEZ', () => this.again(), { fontSize: 30 });
      makeButton(this, cx, cy + 195, 230, 66, COLORS.azul, 'COPAS', () => this.goto('Cup'), { fontSize: 30 });
      makeButton(this, cx + 250, cy + 195, 230, 66, COLORS.naranja, 'TIENDA', () => this.goto('Garage'), { fontSize: 30 });
    });
  }

  again() {
    wipeTo(this, 'Game', { mode: 'copa', cup: this.cup ? this.cup.id : 'callejon' }, ['UI', 'Game']);
  }

  goto(key) {
    wipeTo(this, key, undefined, ['UI', 'Game']);
  }
}
void Phaser;
