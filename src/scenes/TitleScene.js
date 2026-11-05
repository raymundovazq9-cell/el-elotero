import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Save } from '../save.js';
import { unlockAudio, Sfx, setMuted, isMuted } from '../audio.js';
import { Music } from '../music.js';
import { COLORS, textStyle } from '../theme.js';
import { svgImage } from '../assets.js';
import { buildCartPreview } from '../views/CartPreview.js';
import { cartById } from '../data/carts.js';
import SkyCycle from '../world/SkyCycle.js';
import { makeButton, makeIconButton, drawPapelPicado, iconMusic } from '../ui/widgets.js';

const STREET_Y = GAME_HEIGHT - 100; // línea de la banqueta

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
    g.fillRect(0, STREET_Y, GAME_WIDTH, 30);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, STREET_Y + 30, GAME_WIDTH, GAME_HEIGHT - STREET_Y - 30);
    g.lineStyle(4, 0x2e2e2e, 1);
    g.lineBetween(0, STREET_Y + 30, GAME_WIDTH, STREET_Y + 30);
    g.fillStyle(0x616161, 1);
    for (let i = 0; i < 46; i++) g.fillRoundedRect(i * 22 + (i % 2) * 11, STREET_Y + 40 + (i % 2) * 14, 18, 10, 3);

    // casas decorativas
    const colors = [0xe4007c, 0x3a86ff, 0xf7c948, 0x2e8b57, 0xf2762e, 0x8e44ad, 0x1abc9c, 0xe4007c, 0x3a86ff];
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * 110;
      const h = 110 + ((i * 53) % 60);
      g.fillStyle(colors[i], 1);
      g.fillRect(x - 55, STREET_Y - h, 110, h);
      g.lineStyle(4, 0x1a1a1a, 1);
      g.strokeRect(x - 55, STREET_Y - h, 110, h);
      g.fillStyle(0x7fb3e6, 1);
      g.fillRect(x - 30, STREET_Y - h + 26, 24, 30);
      g.fillRect(x + 6, STREET_Y - h + 26, 24, 30);
      g.fillStyle(0x6b3e1e, 1);
      g.fillRect(x - 14, STREET_Y - 60, 28, 60);
    }

    drawPapelPicado(this, -10, 14, GAME_WIDTH + 10, 14, 22, 5);

    // logo
    const title = this.add
      .text(cx, 110, 'EL ELOTERO', textStyle(84, COLORS.amarilloHex, { fontStyle: '700', strokeThickness: 10 }))
      .setOrigin(0.5)
      .setRotation(-0.04);
    this.add.text(cx, 178, 'Sube y baja las colinas del barrio sin tirar los elotes', textStyle(24, COLORS.blanco)).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // elotero con carrito (el modelo activo)
    const cart = buildCartPreview(this, cartById(Save.data.cart), { x: cx + 260, y: STREET_Y - 2, elotes: 7 });
    cart.spin();
    this.tweens.add({ targets: cart, y: STREET_Y - 6, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // botones
    const best = Save.bestFor(Save.data.level);
    this.add
      .text(cx, 222, best > 0 ? `Récord: ${best} m` : 'Sin récord todavía', textStyle(26, COLORS.cremaHex))
      .setOrigin(0.5);
    svgImage(this, 70, 56, 'elote').setScale(0.8);
    this.add.text(104, 56, `${Save.bank}`, textStyle(30, COLORS.amarilloHex)).setOrigin(0, 0.5);

    makeButton(this, cx, 300, 300, 90, COLORS.verde, 'JUGAR', () => this.play(), { fontSize: 44 });

    this.toggleMusic = () => {
      setMuted(!isMuted());
      this.musicBtn.destroyAll();
      this.musicBtn = makeIconButton(this, GAME_WIDTH - 56, 56, 30, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());
    };
    this.musicBtn = makeIconButton(this, GAME_WIDTH - 56, 56, 30, COLORS.amarillo, iconMusic(isMuted()), () => this.toggleMusic());

    this.add
      .text(cx, 372, 'FRENO a la izquierda  ·  ACELERAR a la derecha', textStyle(18, COLORS.cremaHex))
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
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Garage'));
  }
}
