import Phaser from 'phaser';

/**
 * Capas lejanas del fondo: siluetas del tema (azoteas, lonas, carpas, iglesia,
 * nopales) dibujadas por código en el color del cielo, ventanas que se
 * encienden de noche, y el sol/luna con halo. Las siluetas se generan como
 * textura repetible y se mueven con un factor de parallax.
 */

const TILE_W = 1400; // ancho del patrón repetible
const TILE_H = 220;

/** Formas de la silueta de un tema (deterministas por tema). */
export function buildSilhouette(theme) {
  const rnd = new Phaser.Math.RandomDataGenerator([`silueta-${theme}`]);
  const shapes = []; // { type, x, y, w, h, ... }
  const boxes = [];
  const base = TILE_H; // línea de piso del patrón
  let x = 0;
  const box = (w, h, extra = {}) => {
    const b = { type: 'box', x, y: base - h, w, h, ...extra };
    shapes.push(b);
    boxes.push(b);
    x += w;
  };
  if (theme === 'pueblo') {
    // iglesia con dos torres y cúpula, kiosco y casitas
    while (x < TILE_W) {
      if (x === 0 || (x > 600 && x < 700)) {
        shapes.push({ type: 'iglesia', x, y: base, w: 170, h: 150 });
        x += 190;
      } else if (x > 300 && x < 360) {
        shapes.push({ type: 'kiosco', x, y: base, w: 120, h: 80 });
        x += 140;
      } else box(rnd.between(60, 120), rnd.between(40, 70));
      x += rnd.between(0, 12);
    }
  } else if (theme === 'feria') {
    while (x < TILE_W) {
      const r = rnd.frac();
      if (r < 0.35) {
        shapes.push({ type: 'carpa', x, y: base, w: rnd.between(120, 200), h: rnd.between(70, 110) });
        x += 150;
      } else if (r < 0.45) {
        shapes.push({ type: 'rueda', x, y: base, w: 150, h: 150 });
        x += 170;
      } else box(rnd.between(50, 100), rnd.between(30, 60));
      x += rnd.between(10, 40);
    }
  } else if (theme === 'carretera') {
    while (x < TILE_W) {
      const r = rnd.frac();
      if (r < 0.5) {
        shapes.push({ type: 'nopal', x, y: base, w: rnd.between(30, 50), h: rnd.between(40, 80) });
        x += 60;
      } else if (r < 0.6) {
        shapes.push({ type: 'torre', x, y: base, w: 40, h: 140 });
        x += 60;
      } else box(rnd.between(60, 140), rnd.between(20, 45));
      x += rnd.between(30, 90);
    }
  } else {
    // callejon y mercado: azoteas con tinacos y antenas; el mercado añade lonas
    while (x < TILE_W) {
      const h = rnd.between(40, 95);
      box(rnd.between(60, 130), h, { tinaco: rnd.frac() < 0.5, antena: rnd.frac() < 0.35 });
      if (theme === 'mercado' && rnd.frac() < 0.4) shapes.push({ type: 'lona', x: x - 30, y: base - h - 10, w: 80, h: 26 });
      x += rnd.between(0, 10);
    }
  }
  // ventanas para la noche
  const lights = [];
  for (const b of boxes) {
    const n = Math.floor((b.w / 22) * (b.h / 30));
    for (let i = 0; i < n; i++) {
      if (rnd.frac() < 0.5) continue;
      lights.push({ x: b.x + 6 + rnd.between(0, Math.max(0, b.w - 14)), y: b.y + 8 + rnd.between(0, Math.max(0, b.h - 18)) });
    }
  }
  for (const s of shapes) {
    if (s.type === 'iglesia') lights.push({ x: s.x + 80, y: s.y - 50 }, { x: s.x + 30, y: s.y - 60 }, { x: s.x + 140, y: s.y - 60 });
    if (s.type === 'carpa') lights.push({ x: s.x + s.w / 2, y: s.y - 20 });
  }
  return { shapes, lights };
}

function drawShapes(g, shapes, color) {
  g.fillStyle(color, 1);
  for (const s of shapes) {
    if (s.type === 'box') {
      g.fillRect(s.x, s.y, s.w, s.h);
      if (s.tinaco) g.fillRoundedRect(s.x + s.w * 0.6, s.y - 14, 14, 16, 3);
      if (s.antena) {
        g.fillRect(s.x + 10, s.y - 26, 2, 26);
        g.fillRect(s.x + 2, s.y - 22, 18, 2);
      }
    } else if (s.type === 'lona') {
      g.fillTriangle(s.x, s.y + s.h, s.x + s.w / 2, s.y, s.x + s.w, s.y + s.h);
    } else if (s.type === 'carpa') {
      g.fillTriangle(s.x, s.y, s.x + s.w / 2, s.y - s.h, s.x + s.w, s.y);
      g.fillRect(s.x + s.w / 2 - 1, s.y - s.h - 16, 2, 16);
      g.fillTriangle(s.x + s.w / 2, s.y - s.h - 16, s.x + s.w / 2 + 14, s.y - s.h - 11, s.x + s.w / 2, s.y - s.h - 6);
    } else if (s.type === 'rueda') {
      const cx = s.x + s.w / 2;
      const cy = s.y - s.h / 2 - 10;
      g.lineStyle(4, color, 1);
      g.strokeCircle(cx, cy, s.w / 2 - 4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineBetween(cx, cy, cx + Math.cos(a) * (s.w / 2 - 4), cy + Math.sin(a) * (s.w / 2 - 4));
      }
      g.fillTriangle(cx - 30, s.y, cx, cy, cx + 30, s.y);
    } else if (s.type === 'iglesia') {
      const { x, y, w } = s;
      g.fillRect(x + 40, y - 90, w - 80, 90);
      g.fillRect(x, y - 120, 40, 120);
      g.fillRect(x + w - 40, y - 120, 40, 120);
      g.fillTriangle(x, y - 120, x + 20, y - 150, x + 40, y - 120);
      g.fillTriangle(x + w - 40, y - 120, x + w - 20, y - 150, x + w, y - 120);
      g.fillCircle(x + w / 2, y - 95, 28);
      g.fillRect(x + w / 2 - 2, y - 140, 4, 20);
      g.fillRect(x + w / 2 - 7, y - 134, 14, 3);
    } else if (s.type === 'kiosco') {
      const { x, y, w } = s;
      g.fillTriangle(x, y - 45, x + w / 2, y - 80, x + w, y - 45);
      for (let i = 0; i < 4; i++) g.fillRect(x + 8 + i * ((w - 16) / 3) - 3, y - 45, 6, 45);
      g.fillRect(x, y - 6, w, 6);
    } else if (s.type === 'nopal') {
      const { x, y, w, h } = s;
      g.fillEllipse(x + w / 2, y - h * 0.3, w, h * 0.6);
      g.fillEllipse(x + w * 0.2, y - h * 0.7, w * 0.6, h * 0.5);
      g.fillEllipse(x + w * 0.85, y - h * 0.8, w * 0.5, h * 0.45);
    } else if (s.type === 'torre') {
      const { x, y, w, h } = s;
      g.fillTriangle(x, y, x + w / 2, y - h, x + w, y);
      g.fillRect(x - 10, y - h * 0.6, w + 20, 4);
      g.fillRect(x - 6, y - h * 0.8, w + 12, 4);
    }
  }
}

/** Genera (o regenera) la textura de la silueta en un color. */
export function silhouetteTexture(scene, key, shapes, color) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawShapes(g, shapes, color);
  g.generateTexture(key, TILE_W, TILE_H + 10);
  g.destroy();
  return key;
}

/** Textura de ventanas encendidas (se dibuja una vez). */
export function lightsTexture(scene, key, lights) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffe08a, 1);
  for (const l of lights) g.fillRect(l.x, l.y, 6, 8);
  g.generateTexture(key, TILE_W, TILE_H + 10);
  g.destroy();
  return key;
}

/** Halo radial (sol o luna). */
export function haloTexture(scene, key, inner, outer, size = 200) {
  if (scene.textures.exists(key)) return key;
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.context;
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
  return key;
}

/** Capa repetible dentro de un contenedor: n copias de una textura desplazadas con parallax. */
export class TileLayer {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Container} root contenedor centrado en pantalla
   * @param {string} key textura
   * @param {{factor:number, y:number, left:number, span:number, scale?:number, alpha?:number}} opts
   */
  constructor(scene, root, key, opts) {
    this.scene = scene;
    this.root = root;
    this.opts = opts;
    this.scale = opts.scale || 1;
    this.w = TILE_W * this.scale;
    const n = Math.ceil(opts.span / this.w) + 2;
    this.images = [];
    for (let i = 0; i < n; i++) {
      const img = scene.add
        .image(0, opts.y, key)
        .setOrigin(0, 1)
        .setScale(this.scale)
        .setAlpha(opts.alpha ?? 1);
      this.images.push(img);
      root.add(img);
    }
  }

  setTexture(key) {
    for (const img of this.images) img.setTexture(key);
  }

  setAlpha(a) {
    for (const img of this.images) img.setAlpha(a);
  }

  update(scrollX) {
    const off = -((scrollX * this.opts.factor) % this.w) - this.w;
    this.images.forEach((img, i) => img.setX(this.opts.left + off + i * this.w));
  }

  /** Mueve estas imágenes justo debajo de otra del contenedor (orden de dibujo). */
  moveBelow(other) {
    for (const img of this.images) this.root.moveBelow(img, other);
  }
}

export const PARALLAX_TILE = { w: TILE_W, h: TILE_H };
