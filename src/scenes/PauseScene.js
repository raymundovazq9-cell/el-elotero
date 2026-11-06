import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { COLORS, textStyle } from '../theme.js';
import { makeButton, makeCard, makeIconButton, iconMusic } from '../ui/widgets.js';
import { setMuted, isMuted } from '../audio.js';
import { wipeTo } from '../ui/transitions.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    makeCard(this, cx, cy, 420, 420);
    this.add.text(cx, cy - 150, 'PAUSA', textStyle(56, COLORS.rosaHex, { fontStyle: '700' })).setOrigin(0.5);

    makeButton(this, cx, cy - 60, 300, 76, COLORS.verde, 'CONTINUAR', () => this.resume());
    makeButton(this, cx, cy + 36, 300, 76, COLORS.naranja, 'REINICIAR', () => this.restart());
    makeButton(this, cx, cy + 132, 300, 76, COLORS.azul, 'TIENDA', () => this.menu());

    const mk = () =>
      makeIconButton(this, cx + 160, cy - 150, 28, COLORS.amarillo, iconMusic(isMuted()), () => {
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
    const data = this.scene.get('Game').startData || {};
    wipeTo(this, 'Game', data, ['UI', 'Game']);
  }

  menu() {
    wipeTo(this, 'Garage', undefined, ['UI', 'Game']);
  }
}
