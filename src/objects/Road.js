import Phaser from 'phaser';
import { ROAD, GAME_WIDTH } from '../config.js';
import { difficultyAt, SAFE_METERS } from './Difficulty.js';

const COLOR_ROAD = 0x5a5a5a;
const COLOR_ROAD_LINE = 0x2e2e2e;
const COLOR_TOPE = 0xe8742a;

/**
 * Calle infinita construida a partir de polilíneas. Cada segmento entre dos
 * puntos se convierte en un rectángulo estático rotado de Matter. Las
 * irregularidades (baches, escalones, rampas) se insertan en la polilínea y
 * los topes son cuerpos extra sobre la superficie.
 */
export default class Road {
  /**
   * @param {Phaser.Scene} scene
   * @param {(x:number)=>number} metersAt convierte X del mundo a metros recorridos
   * @param {string} [seed] semilla fija para pruebas reproducibles
   */
  constructor(scene, metersAt, seed, drawer = null) {
    this.scene = scene;
    this.drawer = drawer;
    this.metersAt = metersAt || (() => 0);
    this.rnd = new Phaser.Math.RandomDataGenerator(seed ? [seed] : undefined);
    this.chunks = []; // { bodies, gfx, startX, endX, points, spots }
    this.lastPoint = { x: -400, y: 300 };
    this.slopeDeg = (ROAD.slopeMinDeg + ROAD.slopeMaxDeg) / 2;
    this.lastFeatureX = -Infinity;
    this.minFeatureGap = 170;
  }

  // ---------- generación ----------

  /** Genera un tramo nuevo a partir del último punto (pendiente en paseo aleatorio). */
  generateChunk() {
    const pts = [{ ...this.lastPoint }];
    const topes = [];
    const features = []; // { type, points } para dibujar baches/escalones/rampas
    const spots = []; // posiciones libres (sin rasgos) para colocar cosas encima
    let { x, y } = this.lastPoint;
    const targetX = x + ROAD.chunkLength;

    while (x < targetX) {
      const len = this.rnd.between(ROAD.segmentMin, ROAD.segmentMax);
      this.slopeDeg = Phaser.Math.Clamp(
        this.slopeDeg + this.rnd.realInRange(-ROAD.slopeStep, ROAD.slopeStep),
        ROAD.slopeMinDeg,
        ROAD.slopeMaxDeg
      );
      const rad = Phaser.Math.DegToRad(this.slopeDeg);
      const d = { x: Math.cos(rad), y: Math.sin(rad) };
      const n = { x: -Math.sin(rad), y: Math.cos(rad) };
      const start = { x, y };
      x += d.x * len;
      y += d.y * len;
      pts.push({ x, y });

      const meters = this.metersAt(x);
      const diff = difficultyAt(meters);
      const canFeature = meters > SAFE_METERS && x - this.lastFeatureX > this.minFeatureGap;

      // tope a la mitad del segmento recién puesto
      if (canFeature && this.rnd.frac() < diff.topeChance) {
        const mid = { x: (start.x + x) / 2, y: (start.y + y) / 2 };
        topes.push({ x: mid.x + n.x * 2, y: mid.y + n.y * 2, r: diff.topeRadius, angle: rad });
        this.lastFeatureX = x;
        continue;
      }

      // rasgo en la polilínea justo después del segmento
      if (canFeature) {
        const roll = this.rnd.frac();
        if (roll < diff.bacheChance) {
          const from = pts.length - 1;
          const p = this.addBache(pts, { x, y }, d, n, diff);
          features.push({ type: 'bache', points: pts.slice(from, from + 4) });
          x = p.x;
          y = p.y;
          this.lastFeatureX = x;
          continue;
        }
        if (roll < diff.bacheChance + diff.escalonChance) {
          const from = pts.length - 1;
          y += diff.escalonDrop;
          pts.push({ x, y });
          features.push({ type: 'escalon', points: pts.slice(from, from + 2) });
          this.lastFeatureX = x;
          continue;
        }
        if (roll < diff.bacheChance + diff.escalonChance + diff.rampaChance) {
          const from = pts.length - 1;
          const p = this.addRampa(pts, { x, y }, d, n, rad, diff);
          features.push({ type: 'rampa', points: pts.slice(from, from + 3) });
          x = p.x;
          y = p.y;
          this.lastFeatureX = x + 120; // espacio extra para aterrizar
          continue;
        }
      }

      // segmento limpio: candidato para elotes/perros/coches
      spots.push({ x: (start.x + x) / 2, y: (start.y + y) / 2, angle: rad, len, d, n });
    }

    const chunk = this.buildChunk(pts, { features, topes });
    chunk.spots = spots;
    for (const t of topes) {
      chunk.bodies.push(
        this.scene.matter.add.circle(t.x, t.y, t.r, {
          isStatic: true,
          friction: 0.6,
          label: 'tope',
          render: { fillColor: COLOR_TOPE, lineColor: 0x7a3a10 },
        })
      );
    }
    this.scene.events.emit('chunk', chunk);
    return chunk;
  }

  addBache(pts, p, d, n, diff) {
    const depth = diff.bacheDepth;
    const w = diff.bacheWidth;
    // paredes a ~45° para que la rueda pueda salir rodando
    pts.push({ x: p.x + d.x * depth + n.x * depth, y: p.y + d.y * depth + n.y * depth });
    pts.push({ x: p.x + d.x * (w - depth) + n.x * depth, y: p.y + d.y * (w - depth) + n.y * depth });
    const end = { x: p.x + d.x * w, y: p.y + d.y * w };
    pts.push(end);
    return end;
  }

  addRampa(pts, p, d, n, rad, diff) {
    const h = diff.rampaHeight;
    const len = diff.rampaLength;
    // subida: avanza a lo largo de la pendiente y se levanta h hacia -n
    const top = { x: p.x + d.x * len - n.x * h, y: p.y + d.y * len - n.y * h };
    pts.push(top);
    // caída vertical hasta donde iría la calle original
    const yLine = p.y + Math.tan(rad) * (top.x - p.x);
    const end = { x: top.x, y: yLine + 8 };
    pts.push(end);
    return end;
  }

  /** Mantiene tramos por delante de la cámara y borra los que quedaron atrás. */
  update(scrollX) {
    const aheadX = scrollX + GAME_WIDTH + ROAD.chunkLength * ROAD.chunksAhead;
    while (this.lastPoint.x < aheadX) this.generateChunk();

    const behindX = scrollX - ROAD.cleanupBehind;
    while (this.chunks.length && this.chunks[0].endX < behindX) {
      this.destroyChunk(this.chunks.shift());
    }
  }

  // ---------- construcción ----------

  /** Crea un tramo a partir de una lista de puntos consecutivos. */
  buildChunk(points, extra = {}) {
    const bodies = [];
    for (let i = 0; i < points.length - 1; i++) {
      const body = this.segmentBody(points[i], points[i + 1]);
      if (body) bodies.push(body);
    }
    const last = points[points.length - 1];
    const chunk = {
      bodies,
      gfx: null,
      startX: points[0].x,
      endX: last.x,
      points,
      spots: [],
      features: extra.features || [],
      topes: extra.topes || [],
    };
    chunk.gfx = this.drawer ? this.drawer.draw(chunk) : this.defaultDraw(points);
    this.chunks.push(chunk);
    this.lastPoint = last;
    return chunk;
  }

  /** Dibujo básico (relleno gris) cuando no hay RoadView. */
  defaultDraw(points) {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(-10);
    const last = points[points.length - 1];
    const bottom = Math.max(...points.map((p) => p.y)) + 2000;
    gfx.fillStyle(COLOR_ROAD, 1);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.lineTo(last.x + 3, last.y);
    gfx.lineTo(last.x + 3, bottom);
    gfx.lineTo(points[0].x, bottom);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(4, COLOR_ROAD_LINE, 1);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.strokePath();
    return gfx;
  }

  segmentBody(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const angle = Math.atan2(dy, dx);
    const t = ROAD.thickness;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const cx = (a.x + b.x) / 2 + nx * (t / 2);
    const cy = (a.y + b.y) / 2 + ny * (t / 2);
    return this.scene.matter.add.rectangle(cx, cy, len + 6, t, {
      isStatic: true,
      angle,
      friction: ROAD.friction,
      label: 'road',
      render: { visible: false },
    });
  }

  /** Piso recto con pendiente fija (usado como base inicial). */
  buildStraight(fromX, fromY, length, slopeDeg) {
    const rad = Phaser.Math.DegToRad(slopeDeg);
    this.slopeDeg = slopeDeg;
    const points = [];
    const steps = Math.ceil(length / 200);
    for (let i = 0; i <= steps; i++) {
      const dist = (length * i) / steps;
      points.push({ x: fromX + Math.cos(rad) * dist, y: fromY + Math.sin(rad) * dist });
    }
    const chunk = this.buildChunk(points);
    this.scene.events.emit('chunk', chunk);
    return chunk;
  }

  /** Altura de la calle (y) en una X dada, buscando en los tramos vivos. */
  surfaceYAt(x) {
    for (const c of this.chunks) {
      if (x < c.startX || x > c.endX) continue;
      const pts = c.points;
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const span = pts[i + 1].x - pts[i].x || 1;
          const k = (x - pts[i].x) / span;
          return pts[i].y + (pts[i + 1].y - pts[i].y) * k;
        }
      }
    }
    return null;
  }

  destroyChunk(chunk) {
    chunk.bodies.forEach((b) => this.scene.matter.world.remove(b));
    chunk.gfx.destroy();
    (chunk.extras || []).forEach((e) => e.destroy());
    this.scene.events.emit('chunk-destroyed', chunk);
  }

  destroy() {
    this.chunks.forEach((c) => this.destroyChunk(c));
    this.chunks = [];
  }
}
