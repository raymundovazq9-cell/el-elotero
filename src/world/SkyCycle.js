import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SKY_PHASES } from '../theme.js';
import { svgImage } from '../assets.js';
import { fondoKey } from './haze.js';
import { buildSilhouette, silhouetteTexture, lightsTexture, haloTexture, TileLayer, PARALLAX_TILE } from './Parallax.js';

const CYCLE_METERS = 600;
const HORIZON = GAME_HEIGHT * 0.42;
const FAR_SCALE = 0.62; // los cerros SVG se dibujaron para 540 px de ancho

function darken(color, k) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(Math.round(c.red * (1 - k)), Math.round(c.green * (1 - k)), Math.round(c.blue * (1 - k)));
}

function lerpColor(a, b, t) {
  const ca = Phaser.Display.Color.ValueToColor(a);
  const cb = Phaser.Display.Color.ValueToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 1, t);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** Devuelve { top, bottom, night } interpolando tarde → atardecer → noche → tarde. */
export function skyAt(meters, cycle = CYCLE_METERS) {
  const t = (meters % cycle) / cycle;
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
 * oscurecimiento nocturno. Todo vive en un contenedor fijo a la cámara que se
 * escala al inverso del zoom, así el cielo nunca se encoge al alejar la cámara.
 */
export default class SkyCycle {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.useImages = !!opts.farDay && scene.textures.exists(opts.farDay);
    this.cycle = opts.cycle || CYCLE_METERS;
    this.lastKey = '';
    this.night = 0;

    // contenedor centrado en la pantalla; sus hijos usan coordenadas de pantalla - centro
    this.root = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(-100);
    const OX = -GAME_WIDTH / 2;
    const OY = -GAME_HEIGHT / 2;
    this.ox = OX;

    // cielo (un poco más grande que la pantalla por si el zoom baja de lo previsto)
    this.canvas = scene.textures.createCanvas('sky', 8, 256);
    this.sky = scene.add.image(OX - GAME_WIDTH * 0.25, OY - GAME_HEIGHT * 0.25, 'sky').setOrigin(0);
    this.sky.setDisplaySize(GAME_WIDTH * 1.5, GAME_HEIGHT * 1.5);
    this.root.add(this.sky);

    // estrellas
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      const s = scene.add.circle(OX + Math.random() * GAME_WIDTH, OY + Math.random() * HORIZON * 0.9, Math.random() * 1.6 + 0.8, 0xffffff, 1).setAlpha(0);
      this.stars.push(s);
      this.root.add(s);
    }
    // sol y luna con halo, recorren un arco según la hora
    haloTexture(scene, 'halo-sol', 'rgba(255,236,150,0.95)', 'rgba(255,200,80,0)');
    haloTexture(scene, 'halo-luna', 'rgba(240,244,255,0.95)', 'rgba(160,180,255,0)');
    this.sun = scene.add.image(0, 0, 'halo-sol').setScale(1.1);
    this.sunDisc = scene.add.circle(0, 0, 22, 0xfff1a8, 1);
    this.moon = scene.add.image(0, 0, 'halo-luna').setScale(0.8).setAlpha(0);
    this.moonDisc = scene.add.circle(0, 0, 20, 0xfff6e0, 1).setAlpha(0);
    this.root.add([this.sun, this.sunDisc, this.moon, this.moonDisc]);

    // cerros: tantas copias como hagan falta para cubrir el ancho (alternando espejo para que empalmen)
    const mk = (key, isSvg) => {
      const probe = isSvg ? svgImage(scene, 0, HORIZON, key) : scene.add.image(0, HORIZON, key);
      const w = isSvg ? probe.displayWidth * FAR_SCALE : GAME_WIDTH * 2;
      probe.destroy();
      const n = Math.ceil((GAME_WIDTH * 1.5) / w) + 1;
      const imgs = [];
      for (let i = 0; i < n; i++) {
        const img = isSvg ? svgImage(scene, 0, OY + HORIZON, key) : scene.add.image(0, OY + HORIZON, key);
        img.setOrigin(0, 1);
        if (isSvg) img.setScale(img.scaleX * FAR_SCALE);
        if (i % 2 === 1) img.setFlipX(true);
        imgs.push(img);
        this.root.add(img);
      }
      return imgs;
    };
    if (this.useImages) {
      this.farDay = mk(opts.farDay, false);
      this.farNight = opts.farNight && scene.textures.exists(opts.farNight) ? mk(opts.farNight, false) : null;
      for (const img of [...this.farDay, ...(this.farNight || [])]) {
        img.setDisplaySize(GAME_WIDTH * 2, (GAME_WIDTH * 2 * img.height) / img.width);
      }
    } else {
      this.farDay = mk(fondoKey(scene, 'cerros'), true);
      this.farNight = null;
    }
    this.farWidth = this.farDay[0].displayWidth;
    // relleno bajo los cerros, por si el mundo queda más abajo del horizonte al alejar la cámara
    this.ground = scene.add.rectangle(OX - GAME_WIDTH * 0.25, OY + HORIZON - 2, GAME_WIDTH * 1.5, GAME_HEIGHT, 0x3f7a48, 1).setOrigin(0);
    this.root.addAt(this.ground, 1);

    // siluetas del tema (parallax medio) y sus ventanas de noche
    this.theme = opts.theme || 'callejon';
    this.sil = buildSilhouette(this.theme);
    this.silColor = -1;
    const silY = OY + HORIZON + 12;
    silhouetteTexture(scene, `sil-${this.theme}`, this.sil.shapes, 0x000000);
    lightsTexture(scene, `luces-${this.theme}`, this.sil.lights);
    const span = GAME_WIDTH * 1.5;
    const left = OX - GAME_WIDTH * 0.25;
    this.silLayer = new TileLayer(scene, this.root, `sil-${this.theme}`, { factor: 0.3, y: silY, left, span, scale: 0.75 });
    this.lightsLayer = new TileLayer(scene, this.root, `luces-${this.theme}`, { factor: 0.3, y: silY, left, span, scale: 0.75, alpha: 0 });
    // relleno bajo las siluetas para tapar los cerros
    this.silGround = scene.add.rectangle(left, silY - 2, span, GAME_HEIGHT, 0x000000, 1).setOrigin(0);
    this.root.add(this.silGround);
    this.root.moveBelow(this.silGround, this.silLayer.images[0]); // el relleno va detrás de las siluetas

    // nubes
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = svgImage(scene, 0, 0, 'nube').setAlpha(0.9);
      c.baseX = (i / 4) * GAME_WIDTH * 1.3;
      c.baseY = 95 + ((i * 97) % 110);
      c.setScale(0.3 + ((i * 37) % 30) / 100);
      c.setAlpha(0.85);
      this.clouds.push(c);
      this.root.add(c);
      this.root.moveBelow(c, this.farDay[0]);
    }
    void PARALLAX_TILE;

    // oscurecimiento nocturno sobre el mundo (debajo del HUD)
    this.overlay = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 1.6, GAME_HEIGHT * 1.6, 0x101a40, 0)
      .setScrollFactor(0)
      .setDepth(25);

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
    const sky = skyAt(meters, this.cycle);
    this.paint(sky);
    this.night = sky.night;
    const zoom = this.scene.cameras.main.zoom || 1;
    this.root.setScale(1 / zoom);

    const w = this.farWidth;
    const n = this.farDay.length;
    const period = w * (n % 2 === 0 ? n : n + 1);
    const span = GAME_WIDTH * 1.5;
    const left = this.ox - GAME_WIDTH * 0.25;
    let off = -((scrollX * 0.08) % period);
    this.farDay.forEach((img, i) => {
      let x = off + i * w;
      while (x < -w) x += n * w;
      while (x > span) x -= n * w;
      img.setX(left + x);
    });
    if (this.farNight) {
      this.farNight.forEach((img, i) => img.setX(this.farDay[i].x).setAlpha(Math.min(1, sky.night * 1.8)));
    }

    const cw = GAME_WIDTH * 1.3;
    for (const c of this.clouds) {
      let x = c.baseX - ((scrollX * 0.03 + timeMs * 0.006) % cw);
      if (x < -120) x += cw;
      c.setPosition(this.ox + x, -GAME_HEIGHT / 2 + c.baseY);
      c.setAlpha(0.85 - sky.night * 0.6);
    }

    // siluetas: color del cielo oscurecido; se regenera solo cuando cambia
    const silColor = darken(sky.bottom, 0.34 + sky.night * 0.3);
    if (silColor !== this.silColor) {
      this.silColor = silColor;
      silhouetteTexture(this.scene, `sil-${this.theme}`, this.sil.shapes, silColor);
      this.silLayer.setTexture(`sil-${this.theme}`);
      this.silGround.setFillStyle(silColor, 1);
    }
    this.silLayer.update(scrollX);
    this.lightsLayer.update(scrollX);
    this.lightsLayer.setAlpha(Math.max(0, (sky.night - 0.1) / 0.5));

    // sol y luna: arco de izquierda a derecha durante el día; la luna sale de noche
    const t = (meters % this.cycle) / this.cycle;
    const dayT = Phaser.Math.Clamp(t / 0.52, 0, 1); // tarde → atardecer
    const arc = (k) => ({ x: this.ox + GAME_WIDTH * (0.2 + 0.6 * k), y: -GAME_HEIGHT / 2 + HORIZON + 30 - Math.sin(k * Math.PI) * 190 });
    const sp = arc(0.35 + dayT * 0.65);
    this.sun.setPosition(sp.x, sp.y).setAlpha(1 - sky.night * 1.6);
    this.sunDisc
      .setPosition(sp.x, sp.y)
      .setAlpha(1 - sky.night * 1.6)
      .setFillStyle(sky.night > 0.02 ? 0xffb347 : 0xfff1a8, 1);
    const nightT = t > 0.5 ? (t - 0.5) / 0.5 : 0;
    const mp = arc(0.2 + nightT * 0.6);
    const starA = Math.max(0, (sky.night - 0.15) / 0.4);
    for (const s of this.stars) s.setAlpha(starA);
    this.moon.setPosition(mp.x, mp.y).setAlpha(starA);
    this.moonDisc.setPosition(mp.x, mp.y).setAlpha(starA);
    this.overlay.setFillStyle(0x101a40, sky.night * 0.45);
  }

  destroy() {
    this.root.destroy(true);
    this.scene.textures.remove('sky');
    this.overlay.destroy();
  }
}
