import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makeCard, makeIconButton, iconMusic } from '../ui/widgets.js';
import { setMuted, isMuted } from '../audio.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 40;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    makeCard(this, cx, cy, 400, 440);
    this.add.text(cx, cy - 160, 'PAUSA', textStyle(56, COLORS.rosaHex, { fontStyle: '700' })).setOrigin(0.5);

    makeButton(this, cx, cy - 60, 300, 80, COLORS.verde, 'CONTINUAR', () => this.resume());
    makeButton(this, cx, cy + 40, 300, 80, COLORS.naranja, 'REINICIAR', () => this.restart());
    makeButton(this, cx, cy + 140, 300, 80, COLORS.azul, 'MENÚ', () => this.menu());

    const mk = () =>
      makeIconButton(this, cx + 150, cy - 160, 28, COLORS.amarillo, iconMusic(isMuted()), () => {
        setMuted(!isMuted());
        this.musicBtn.destroyAll();
        this.musicBtn = mk();
      });
    this.musicBtn = mk();
  }

  resume() {
    this.scene.stop();
    this.scene.resume('Game');
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop();
    this.scene.stop('Game');
    this.scene.start('Game');
  }

  menu() {
    this.scene.stop('UI');
    this.scene.stop();
    this.scene.stop('Game');
    this.scene.start('Title');
  }
}
