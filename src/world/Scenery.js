import { svgImage } from '../assets.js';

const HOUSE_COLORS = [0xe4007c, 0x3a86ff, 0xf7c948, 0x2e8b57, 0xf2762e, 0x8e44ad, 0xfff4d6, 0x1abc9c];
const FLAG_COLORS = [0xe4007c, 0x2e8b57, 0x3a86ff, 0xf7c948, 0xf2762e, 0xffffff];

const DEPTH_HOUSE = -50;
const DEPTH_POST = -40;
const DEPTH_PROPS = -45;
const DEPTH_FLAGS = 20;

/**
 * Coloca por tramo las casas, postes con cables, puestos y gente detrás de la
 * calle, y papel picado al frente. Todo se destruye junto con el tramo.
 */
export default class Scenery {
  constructor(scene, road) {
    this.scene = scene;
    this.road = road;
    this.rnd = road.rnd;
    this.cursorX = -Infinity;
    this.nextPostX = 0;
    this.lastPost = null; // { x, y } punta del poste anterior
    this.windows = []; // capas de ventanas para encender de noche
    this.lamps = [];
    this.nightAlpha = 0;

    scene.events.on('chunk', this.onChunk, this);
    scene.events.on('chunk-destroyed', this.onChunkDestroyed, this);
  }

  sidewalkY(x) {
    const y = this.road.surfaceYAt(x);
    return y === null ? null : y - 16;
  }

  onChunk(chunk) {
    const items = [];
    const rnd = this.rnd;
    let x = Math.max(this.cursorX, chunk.startX + 10);
    if (this.nextPostX === 0) this.nextPostX = chunk.startX + 120;

    while (x < chunk.endX - 80) {
      const w = rnd.between(120, 180);
      const xr = Math.min(x + w, chunk.endX);
      const yBase = this.sidewalkY(xr);
      if (yBase === null) break;
      items.push(...this.addHouse(x + w / 2, yBase + 2, w));

      // algo en la banqueta frente a la casa, de vez en cuando
      const roll = rnd.frac();
      if (roll < 0.18) {
        const px = x + w * 0.5;
        const py = this.sidewalkY(px);
        if (py !== null) items.push(svgImage(this.scene, px, py + 4, 'puesto').setOrigin(0.5, 1).setDepth(DEPTH_PROPS));
      } else if (roll < 0.42) {
        const px = x + w * rnd.realInRange(0.2, 0.8);
        const py = this.sidewalkY(px);
        if (py !== null) {
          const s = svgImage(this.scene, px, py + 4, 'senora').setOrigin(0.5, 1).setDepth(DEPTH_PROPS);
          if (rnd.frac() < 0.5) s.setFlipX(true);
          items.push(s);
        }
      }
      x += w + rnd.between(6, 30);
    }
    this.cursorX = x;

    // postes con cables y papel picado
    const g = this.scene.add.graphics().setDepth(DEPTH_POST - 1);
    const gf = this.scene.add.graphics().setDepth(DEPTH_FLAGS);
    items.push(g, gf);
    while (this.nextPostX < chunk.endX - 20) {
      const px = this.nextPostX;
      const py = this.sidewalkY(px);
      if (py === null) break;
      const post = svgImage(this.scene, px, py + 2, 'poste').setOrigin(0.5, 1).setDepth(DEPTH_POST);
      items.push(post);
      const lamp = this.scene.add.circle(px + 14, py - 142, 10, 0xfff1a8, 0).setDepth(DEPTH_POST + 1);
      this.lamps.push(lamp);
      items.push(lamp);
      const top = { x: px, y: py - 190 };
      if (this.lastPost && px - this.lastPost.x < 520) {
        this.drawCables(g, this.lastPost, top);
        if (this.flagTurn) this.drawFlags(gf, this.lastPost, top);
        this.flagTurn = !this.flagTurn;
      }
      this.lastPost = top;
      this.nextPostX += rnd.between(300, 420);
    }

    chunk.scenery = items;
    this.applyNight();
  }

  /** Textura de pared de un color (generada una vez; el tinte no funciona en Canvas). */
  wallTexture(color) {
    const key = `casa-pared-${color.toString(16)}`;
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.lineStyle(6, 0x1a1a1a, 1);
      g.fillRect(16, 60, 288, 240);
      g.strokeRect(16, 60, 288, 240);
      g.fillRoundedRect(4, 44, 312, 28, 6);
      g.strokeRoundedRect(4, 44, 312, 28, 6);
      g.generateTexture(key, 320, 300);
      g.destroy();
    }
    return key;
  }

  addHouse(cx, yBase, w) {
    const rnd = this.rnd;
    const variant = rnd.frac() < 0.55 ? 'a' : 'b';
    const color = HOUSE_COLORS[rnd.between(0, HOUSE_COLORS.length - 1)];
    const scaleX = w / 160;
    const scale = rnd.realInRange(0.95, 1.2);
    const pared = this.scene.add.image(cx, yBase, this.wallTexture(color)).setOrigin(0.5, 1).setDepth(DEPTH_HOUSE);
    const det = svgImage(this.scene, cx, yBase, `casa-detalles-${variant}`).setOrigin(0.5, 1).setDepth(DEPTH_HOUSE + 0.1);
    const win = svgImage(this.scene, cx, yBase, `casa-ventanas-${variant}`).setOrigin(0.5, 1).setDepth(DEPTH_HOUSE + 0.2).setAlpha(0);
    for (const img of [pared, det, win]) img.setScale(scaleX * 0.5, scale * 0.5);
    this.windows.push(win);
    return [pared, det, win];
  }

  drawCables(g, a, b) {
    g.lineStyle(2, 0x222222, 0.9);
    for (let i = 0; i < 2; i++) {
      const off = i * 14;
      const sag = 26 + i * 6;
      g.beginPath();
      g.moveTo(a.x, a.y + off);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + sag;
      g.lineTo(mx, my);
      g.lineTo(b.x, b.y + off);
      g.strokePath();
    }
  }

  drawFlags(g, a, b) {
    const n = 10;
    g.lineStyle(2, 0x333333, 0.8);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const sag = Math.sin(t * Math.PI) * 40;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + 30 + (b.y - a.y) * t + sag });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    for (let i = 1; i < n; i++) {
      const p = pts[i];
      g.fillStyle(FLAG_COLORS[i % FLAG_COLORS.length], 0.92);
      g.fillRect(p.x - 9, p.y, 18, 22);
      g.lineStyle(1.5, 0x1a1a1a, 0.6);
      g.strokeRect(p.x - 9, p.y, 18, 22);
    }
  }

  /** 0 = día, 1 = noche: enciende ventanas y faroles. */
  setNight(alpha) {
    this.nightAlpha = alpha;
    this.applyNight();
  }

  applyNight() {
    this.windows = this.windows.filter((w) => w.active);
    this.lamps = this.lamps.filter((l) => l.active);
    for (const w of this.windows) w.setAlpha(this.nightAlpha * 0.95);
    for (const l of this.lamps) l.setFillStyle(0xfff1a8, this.nightAlpha * 0.9);
  }

  onChunkDestroyed(chunk) {
    (chunk.scenery || []).forEach((o) => o.destroy());
    chunk.scenery = [];
  }

  destroy() {
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.events.off('chunk-destroyed', this.onChunkDestroyed, this);
  }
}
