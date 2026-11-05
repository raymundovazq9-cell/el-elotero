import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SKY_PHASES } from '../theme.js';
import { svgImage } from '../assets.js';

const CYCLE_METERS = 600;
const HORIZON = GAME_HEIGHT * 0.4;

function lerpColor(a, b, t) {
  const ca = Phaser.Display.Color.ValueToColor(a);
  const cb = Phaser.Display.Color.ValueToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 1, t);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** Devuelve { top, bottom, night } interpolando tarde → atardecer → noche → tarde. */
export function skyAt(meters) {
  const t = (meters % CYCLE_METERS) / CYCLE_METERS;
  let a;
  let b;
  let k;
  if (t < 0.3) {
    a = SKY_PHASES[0];
    b = SKY_PHASES[0];
    k = 0;
  } else if (t < 0.42) {
    a = SKY_PHASES[0];
    b = SKY_PHASES[1];
    k = (t - 0.3) / 0.12;
  } else if (t < 0.52) {
    a = SKY_PHASES[1];
    b = SKY_PHASES[2];
    k = (t - 0.42) / 0.1;
  } else if (t < 0.86) {
    a = SKY_PHASES[2];
    b = SKY_PHASES[2];
    k = 0;
  } else {
    a = SKY_PHASES[2];
    b = SKY_PHASES[0];
    k = (t - 0.86) / 0.14;
  }
  return {
    top: lerpColor(a.top, b.top, k),
    bottom: lerpColor(a.bottom, b.bottom, k),
    night: Phaser.Math.Linear(a.night, b.night, k),
  };
}

/**
 * Cielo degradado, capas lejanas con parallax (cerros, nubes), estrellas y
 * oscurecimiento nocturno. Todo fijo a la cámara (scrollFactor 0).
 */
export default class SkyCycle {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.useImages = !!opts.farDay && scene.textures.exists(opts.farDay);
    this.lastKey = '';
    this.night = 0;

    // cielo
    this.canvas = scene.textures.createCanvas('sky', 8, 256);
    this.sky = scene.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-100);
    this.sky.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // estrellas
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      const s = scene.add
        .circle(Math.random() * GAME_WIDTH, Math.random() * HORIZON * 0.9, Math.random() * 1.6 + 0.8, 0xffffff, 1)
        .setScrollFactor(0)
        .setDepth(-99)
        .setAlpha(0);
      this.stars.push(s);
    }
    this.moon = scene.add.circle(GAME_WIDTH - 90, 110, 26, 0xfff6c2, 1).setScrollFactor(0).setDepth(-99).setAlpha(0);

    // cerros (dos copias para el bucle; la segunda espejeada para que empalme)
    this.far = [];
    const mk = (key, isSvg) => {
      const imgs = [0, 1].map((i) => {
        const img = isSvg ? svgImage(scene, 0, HORIZON, key) : scene.add.image(0, HORIZON, key);
        img.setOrigin(0, 1).setScrollFactor(0).setDepth(-90);
        if (i === 1) img.setFlipX(true);
        return img;
      });
      return imgs;
    };
    if (this.useImages) {
      this.farDay = mk(opts.farDay, false);
      this.farNight = opts.farNight && scene.textures.exists(opts.farNight) ? mk(opts.farNight, false) : null;
      for (const img of [...this.farDay, ...(this.farNight || [])]) {
        img.setDisplaySize(GAME_WIDTH * 2, (GAME_WIDTH * 2 * img.height) / img.width);
      }
    } else {
      this.farDay = mk('cerros', true);
      this.farNight = null;
    }
    this.farWidth = this.farDay[0].displayWidth;

    // nubes
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = svgImage(scene, 0, 0, 'nube').setScrollFactor(0).setDepth(-95).setAlpha(0.9);
      c.baseX = (i / 4) * GAME_WIDTH * 1.3;
      c.baseY = 95 + ((i * 97) % 110);
      c.setScale(0.3 + ((i * 37) % 30) / 100);
      c.setAlpha(0.85);
      this.clouds.push(c);
    }

    // oscurecimiento nocturno sobre el mundo (debajo del HUD)
    this.overlay = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x101a40, 0).setOrigin(0).setScrollFactor(0).setDepth(25);

    this.paint(skyAt(0));
  }

  paint(sky) {
    const key = `${sky.top}-${sky.bottom}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const ctx = this.canvas.context;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, Phaser.Display.Color.IntegerToColor(sky.top).rgba);
    grad.addColorStop(1, Phaser.Display.Color.IntegerToColor(sky.bottom).rgba);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 256);
    this.canvas.refresh();
  }

  update(meters, scrollX, timeMs) {
    const sky = skyAt(meters);
    this.paint(sky);
    this.night = sky.night;

    const w = this.farWidth;
    const off = -((scrollX * 0.08) % (w * 2));
    this.farDay.forEach((img, i) => img.setX(off + i * w + (off + i * w < -w ? 2 * w : 0)));
    if (this.farNight) {
      this.farNight.forEach((img, i) => img.setX(this.farDay[i].x).setAlpha(Math.min(1, sky.night * 1.8)));
    }

    const cw = GAME_WIDTH * 1.3;
    for (const c of this.clouds) {
      let x = c.baseX - ((scrollX * 0.03 + timeMs * 0.006) % cw);
      if (x < -120) x += cw;
      c.setPosition(x, c.baseY);
      c.setAlpha(0.85 - sky.night * 0.6);
    }

    const starA = Math.max(0, (sky.night - 0.15) / 0.4);
    for (const s of this.stars) s.setAlpha(starA);
    this.moon.setAlpha(starA);
    this.overlay.setFillStyle(0x101a40, sky.night * 0.45);
  }

  destroy() {
    this.sky.destroy();
    this.scene.textures.remove('sky');
    this.stars.forEach((s) => s.destroy());
    this.moon.destroy();
    this.farDay.forEach((i) => i.destroy());
    if (this.farNight) this.farNight.forEach((i) => i.destroy());
    this.clouds.forEach((c) => c.destroy());
    this.overlay.destroy();
  }
}
