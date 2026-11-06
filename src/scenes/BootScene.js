import Phaser from 'phaser';
import { DEBUG } from '../debug.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { loadAssets } from '../assets.js';
import { COLORS, FONT_FAMILY } from '../theme.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.cameras.main.setBackgroundColor(COLORS.nocheHex);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const bar = this.add.graphics();
    const box = this.add.graphics();
    box.lineStyle(4, 0xffffff, 1);
    box.strokeRoundedRect(cx - 160, cy - 18, 320, 36, 12);
    this.add.text(cx, cy - 50, 'Cargando...', { fontFamily: FONT_FAMILY, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.load.on('progress', (v) => {
      bar.clear();
      bar.fillStyle(COLORS.amarillo, 1);
      bar.fillRoundedRect(cx - 154, cy - 12, 308 * v, 24, 8);
    });

    loadAssets(this.load);
  }

  async create() {
    this.input.addPointer(1);
    try {
      await Promise.race([
        Promise.all([document.fonts.load('600 32px Fredoka'), document.fonts.load('400 32px Fredoka'), document.fonts.load('700 32px Fredoka')]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* seguimos con la fuente de respaldo */
    }
    if (DEBUG.test) this.scene.start('Game', DEBUG.mode === 'copa' ? { mode: 'copa', cup: DEBUG.cup || 'callejon' } : {});
    else this.scene.start(DEBUG.scene || 'Title');
  }
}
