import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { loadBest } from './GameOverScene.js';
import { unlockAudio, Sfx, setMuted, isMuted } from '../audio.js';
import { Music } from '../music.js';
import { COLORS, textStyle } from '../theme.js';
import { svgImage } from '../assets.js';
import SkyCycle from '../world/SkyCycle.js';
import { makeButton, makeIconButton, drawPapelPicado, iconMusic } from '../ui/widgets.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.sky = new SkyCycle(this, {});
    this.sky.update(0, 0, 0);

    // calle de fondo
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0xcfc5ad, 1);
    g.fillRect(0, 700, GAME_WIDTH, 40);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, 730, GAME_WIDTH, GAME_HEIGHT - 730);
    g.lineStyle(4, 0x2e2e2e, 1);
    g.lineBetween(0, 730, GAME_WIDTH, 730);
    g.fillStyle(0x616161, 1);
    for (let i = 0; i < 26; i++) g.fillRoundedRect(i * 22 + ((i % 2) * 11), 740 + (i % 2) * 14, 18, 10, 3);

    // casas decorativas
    const colors = [0xe4007c, 0x3a86ff, 0xf7c948, 0x2e8b57, 0xf2762e];
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 110;
      const h = 130 + ((i * 53) % 60);
      g.fillStyle(colors[i], 1);
      g.fillRect(x - 55, 700 - h, 110, h);
      g.lineStyle(4, 0x1a1a1a, 1);
      g.strokeRect(x - 55, 700 - h, 110, h);
      g.fillStyle(0x7fb3e6, 1);
      g.fillRect(x - 30, 700 - h + 30, 24, 30);
      g.fillRect(x + 6, 700 - h + 30, 24, 30);
      g.fillStyle(0x6b3e1e, 1);
      g.fillRect(x - 14, 700 - 60, 28, 60);
    }

    drawPapelPicado(this, -10, 40, GAME_WIDTH + 10, 40, 14, 5);
    drawPapelPicado(this, -10, 110, GAME_WIDTH + 10, 90, 12, 5);

    // logo
    const title = this.add
      .text(cx, 250, 'EL ELOTERO', textStyle(84, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 10 }))
      .setOrigin(0.5)
      .setRotation(-0.05);
    this.add.text(cx, 320, 'Baja la calle sin tirar los elotes', textStyle(26, COLORS.blanco)).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // elotero con carrito
    const cart = this.add.container(cx + 40, 668);
    const carrito = svgImage(this, 0, 0, 'carrito').setOrigin(80 / 160, 67 / 100);
    const w1 = svgImage(this, -44, 26, 'rueda');
    const w2 = svgImage(this, 44, 26, 'rueda');
    const elotes = [];
    for (let i = 0; i < 7; i++) {
      const e = svgImage(this, -36 + (i % 4) * 24 + (i >= 4 ? 12 : 0), -24 - Math.floor(i / 4) * 17, 'elote').setScale(0.42);
      elotes.push(e);
    }
    const legB = svgImage(this, -98, 2, 'elotero-pierna').setOrigin(8 / 20, 2 / 46).setRotation(0.5);
    const legF = svgImage(this, -98, 2, 'elotero-pierna').setOrigin(8 / 20, 2 / 46).setRotation(-0.4);
    const torso = svgImage(this, -98, 2, 'elotero-torso').setOrigin(40 / 80, 86 / 100).setRotation(-0.22);
    cart.add([legB, torso, legF, carrito, w1, w2, ...elotes]);
    this.tweens.add({ targets: [w1, w2], rotation: Math.PI * 2, duration: 1400, repeat: -1 });
    this.tweens.add({ targets: cart, y: 664, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // botones
    const best = loadBest();
    this.add
      .text(cx, 392, best > 0 ? `Récord: ${best}` : 'Sin récord todavía', textStyle(28, COLORS.cremaHex))
      .setOrigin(0.5);

    makeButton(this, cx, 480, 300, 96, COLORS.verde, 'JUGAR', () => this.play(), { fontSize: 44 });

    this.musicBtn = makeIconButton(this, GAME_WIDTH - 60, 480, 32, COLORS.amarillo, iconMusic(isMuted()), () => {
      setMuted(!isMuted());
      this.musicBtn.destroyAll();
      this.musicBtn = makeIconButton(this, GAME_WIDTH - 60, 480, 32, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());
    });
    this.toggleMusic = () => {
      setMuted(!isMuted());
      this.musicBtn.destroyAll();
      this.musicBtn = makeIconButton(this, GAME_WIDTH - 60, 480, 32, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());
    };

    this.add
      .text(cx, 560, 'FRENO a la izquierda  ·  ACELERAR a la derecha', textStyle(18, COLORS.cremaHex))
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      unlockAudio();
      Music.setVolume(0.35);
      Music.start();
    });
    this.cameras.main.fadeIn(350);
    this.events.once('shutdown', () => {
      this.sky.destroy();
      Music.stop();
    });
  }

  play() {
    unlockAudio();
    Sfx.inicio();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}
