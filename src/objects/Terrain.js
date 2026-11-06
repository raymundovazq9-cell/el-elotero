import Phaser from 'phaser';
import { ROAD, GAME_WIDTH } from '../config.js';
import { SAFE_METERS, MAX_METERS } from './Difficulty.js';
import { DEBUG } from '../debug.js';
import { groundFilter } from './collision.js';

const COLOR_ROAD = 0x5a5a5a;
const COLOR_ROAD_LINE = 0x2e2e2e;
const COLOR_TOPE = 0xe8742a;

const STEP = 24; // px entre muestras del perfil
const SPOT_MAX = 200; // largo máximo de un "spot" libre
const STAIR = 30; // ancho de cada escalón de una escalera

/**
 * Terreno infinito de colinas (suma de senos con fases aleatorias) construido
 * por tramos. Cada segmento entre dos puntos es un rectángulo estático rotado.
 * Sobre el perfil se insertan rasgos: topes, baches, escaleras (en bajadas) y
 * rampas (antes de una bajada). En las crestas se proponen arcos de elotes.
 */
export default class Terrain {
  /**
   * @param {Phaser.Scene} scene
   * @param {(x:number)=>number} metersAt convierte X del mundo a metros recorridos
   * @param {string} [seed] semilla fija para pruebas reproducibles
   * @param {{draw:(chunk:object)=>{destroy:()=>void}}} [drawer]
   * @param {object} level datos del escenario (data/levels.js)
   */
  constructor(scene, metersAt, seed, drawer, level, opts = {}) {
    this.scene = scene;
    this.finishX = opts.finishX || null; // pista finita (copas): se aplana hacia la meta y deja de generar
    this.drawer = drawer || null;
    this.level = level;
    this.metersAt = metersAt || (() => 0);
    this.rnd = new Phaser.Math.RandomDataGenerator(seed ? [seed] : undefined);
    this.chunks = [];
    this.lastPoint = { x: 0, y: level.terreno.base };
    this.lastFeatureX = -Infinity;
    this.minFeatureGap = 200;
    this.profileStartX = 0;

    const t = level.terreno;
    this.waves = t.amp.map((amp, i) => ({
      amp,
      lambda: t.lambda[i] * this.rnd.realInRange(0.85, 1.15),
      phase: this.rnd.realInRange(0, Math.PI * 2),
    }));
  }

  // ---------- perfil ----------

  ampMul(x) {
    const t = this.level.terreno;
    // en pistas finitas (copas) las colinas casi no crecen: la carrera es de velocidad, no de mejoras
    const maxMul = this.finishX ? Math.min(t.maxMul, 1.1) : t.maxMul;
    const grow = Math.min(maxMul, 1 + t.crecimiento * Math.max(0, this.metersAt(x))) * (this.finishX ? 0.7 : 1);
    // entrada suave: las colinas crecen de 0 a 1 en los primeros 500 px después del piso plano
    const k = Phaser.Math.Clamp((x - this.profileStartX) / 500, 0, 1);
    const ease = k * k * (3 - 2 * k);
    // hacia la meta las colinas se apagan en 400 px y después queda plano
    const fade = this.finishX ? Phaser.Math.Clamp((this.finishX - 300 - x) / 400, 0, 1) : 1;
    return grow * ease * fade;
  }

  /** Altura (y) del perfil puro en x, antes de rasgos. */
  profile(x) {
    const mul = this.ampMul(x);
    let y = this.level.terreno.base;
    for (const w of this.waves) y += w.amp * mul * Math.sin(((x - this.profileStartX) * Math.PI * 2) / w.lambda + w.phase);
    return y;
  }

  slopeAt(x) {
    return (this.profile(x + 4) - this.profile(x - 4)) / 8;
  }

  /** Multiplicador de probabilidad de rasgos según metros (1 → 2). */
  chanceMul(meters) {
    return 1 + Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);
  }

  // ---------- generación ----------

  /**
   * Piso plano inicial de `length` px desde fromX; el perfil arranca al final
   * de ese piso sin salto (se desplaza la fase para que coincida).
   */
  start(fromX, length) {
    const endX = fromX + length;
    this.profileStartX = endX;
    const y = this.profile(endX); // == base, porque la amplitud arranca en 0
    const points = [];
    const steps = Math.ceil(length / 100);
    for (let i = 0; i <= steps; i++) points.push({ x: fromX + (length * i) / steps, y });
    const chunk = this.buildChunk(points);
    this.scene.events.emit('chunk', chunk);
    return chunk;
  }

  generateChunk() {
    const rnd = this.rnd;
    const r = this.level.rasgos;
    const pts = [{ ...this.lastPoint }];
    const topes = [];
    const features = [];
    const arcs = [];
    const spots = [];
    let x = this.lastPoint.x;
    const targetX = x + ROAD.chunkLength;
    let run = null; // tramo liso acumulado para spots
    let prevSlope = this.slopeAt(x);

    const flushRun = () => {
      if (!run) return;
      const total = run.x1 - run.x0;
      const pieces = Math.max(1, Math.round(total / SPOT_MAX));
      const len = total / pieces;
      for (let i = 0; i < pieces; i++) {
        const sx = run.x0 + len * (i + 0.5);
        const slope = this.slopeAt(sx);
        const angle = Math.atan(slope);
        spots.push({
          x: sx,
          y: this.profile(sx),
          angle,
          len,
          d: { x: Math.cos(angle), y: Math.sin(angle) },
          n: { x: -Math.sin(angle), y: Math.cos(angle) },
        });
      }
      run = null;
    };

    while (x < targetX) {
      const nx = x + STEP;
      const y0 = this.profile(x);
      const y1 = this.profile(nx);
      const slope = (y1 - y0) / STEP; // > 0 bajando (y crece hacia abajo)
      const meters = this.metersAt(nx);
      const mul = this.chanceMul(meters);
      const canFeature = meters > SAFE_METERS && x - this.lastFeatureX > this.minFeatureGap && (!this.finishX || x < this.finishX - 500);

      // cresta: deja de subir y empieza a bajar → arco de elotes
      if (prevSlope < -0.04 && slope > 0.04 && meters > 15 && (!this.finishX || x < this.finishX - 300) && rnd.frac() < r.arco) {
        arcs.push(...this.makeArc(x));
      }
      prevSlope = slope;

      if (canFeature) {
        const roll = rnd.frac();
        let acc = 0;
        const raceK = this.finishX ? 0.6 : 1; // en copas, menos rasgos: que gane el que mejor maneja
        const hit = (p) => {
          acc += p * mul * raceK;
          return roll < acc;
        };
        const diffT = Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);

        if (slope > -0.12 && slope < 0.3 && hit(DEBUG.noTopes ? 0 : r.tope)) {
          const mid = (x + nx) / 2;
          const a = Math.atan(slope);
          const radius = 12 + 8 * diffT;
          topes.push({ x: mid + Math.sin(a) * 2, y: this.profile(mid) - Math.cos(a) * 2, r: radius, angle: a });
          pts.push({ x: nx, y: y1 });
          this.lastFeatureX = nx;
          flushRun();
          x = nx;
          continue;
        }
        if (Math.abs(slope) < 0.35 && hit(r.bache)) {
          const depth = 12 + 6 * diffT; // menor que la altura libre de cualquier carrito
          const w = 60 + 30 * diffT;
          const from = pts.length - 1;
          pts.push({ x: x + depth, y: this.profile(x + depth) + depth });
          pts.push({ x: x + w - depth, y: this.profile(x + w - depth) + depth });
          pts.push({ x: x + w, y: this.profile(x + w) });
          features.push({ type: 'bache', points: pts.slice(from, from + 4) });
          this.lastFeatureX = x + w;
          flushRun();
          x = x + w;
          continue;
        }
        if (slope > 0.28 && hit(r.escalera)) {
          const from = pts.length - 1;
          let sx = x;
          let steps = 0;
          while (steps < 5 && sx + STAIR <= targetX + STEP) {
            const yFlat = this.profile(sx);
            const yNext = this.profile(sx + STAIR);
            if (yNext < yFlat + 6) break; // ya no baja: fin de la escalera
            pts.push({ x: sx + STAIR, y: yFlat });
            pts.push({ x: sx + STAIR, y: yNext });
            sx += STAIR;
            steps++;
          }
          if (steps > 0) {
            features.push({ type: 'escalera', points: pts.slice(from) });
            this.lastFeatureX = sx;
            flushRun();
            x = sx;
            continue;
          }
        }
        // barranca: meseta corta y caída vertical en una bajada que sigue bajando
        if (slope > 0.2 && meters > 60 && r.barranca && hit(r.barranca)) {
          const drop = 40 + 50 * diffT;
          const ledge = 50;
          if (this.profile(x + ledge + 260) >= y0 + drop + 10) {
            const from = pts.length - 1;
            const flatY = y0 + drop;
            pts.push({ x: x + ledge, y: y0 });
            pts.push({ x: x + ledge, y: flatY });
            let lx = x + ledge;
            while (lx - (x + ledge) < 260 && this.profile(lx + STEP) < flatY) {
              lx += STEP;
              pts.push({ x: lx, y: flatY });
            }
            lx += STEP;
            pts.push({ x: lx, y: Math.max(flatY, this.profile(lx)) });
            features.push({ type: 'barranca', points: pts.slice(from), drop });
            this.lastFeatureX = lx + 80;
            flushRun();
            x = lx;
            continue;
          }
        }
        // rampa grande: solo si la calle baja bastante después (aterrizaje en bajada)
        if (Math.abs(slope) < 0.15 && r.rampaGrande && this.profile(x + 350) > y0 + 60 && hit(r.rampaGrande)) {
          const len = 170;
          const h = 60 + 40 * diffT;
          const from = pts.length - 1;
          const top = { x: x + len, y: this.profile(x + len) - h };
          const end = { x: x + len, y: this.profile(x + len) + 2 };
          pts.push(top, end);
          features.push({ type: 'rampa', big: true, points: pts.slice(from, from + 3) });
          arcs.push(...this.makeJumpArc(pts[from], top));
          this.lastFeatureX = x + len + 260;
          flushRun();
          x = x + len;
          continue;
        }
        if (Math.abs(slope) < 0.15 && this.profile(x + 220) > y0 + 40 && hit(r.rampa)) {
          const len = 110;
          const h = 30 + 24 * diffT;
          const from = pts.length - 1;
          const top = { x: x + len, y: this.profile(x + len) - h };
          const end = { x: x + len, y: this.profile(x + len) + 2 };
          pts.push(top, end);
          features.push({ type: 'rampa', points: pts.slice(from, from + 3) });
          this.lastFeatureX = x + len + 140; // espacio para aterrizar
          flushRun();
          x = x + len;
          continue;
        }
      }

      pts.push({ x: nx, y: y1 });
      if (Math.abs(slope) < 0.4) {
        if (!run) run = { x0: x, x1: nx };
        else run.x1 = nx;
      } else {
        flushRun();
      }
      x = nx;
    }
    flushRun();

    const chunk = this.buildChunk(pts, { features, topes });
    chunk.spots = spots;
    chunk.arcs = arcs;
    for (const t of topes) {
      chunk.bodies.push(
        this.scene.matter.add.circle(t.x, t.y, t.r, {
          isStatic: true,
          friction: 0.6,
          label: 'tope',
          collisionFilter: groundFilter(),
          render: { fillColor: COLOR_TOPE, lineColor: 0x7a3a10 },
        })
      );
    }
    this.scene.events.emit('chunk', chunk);
    return chunk;
  }

  /**
   * Elotes a la salida de una rampa, sobre la parábola de un salto típico
   * (12 px/paso en la dirección de la rampa; la gravedad de Matter da ~0.33 px/paso²).
   */
  makeJumpArc(base, top) {
    const dx = top.x - base.x;
    const dy = top.y - base.y;
    const len = Math.hypot(dx, dy) || 1;
    const v = 12;
    const vx = (v * dx) / len;
    const vy = (v * dy) / len;
    const g = 0.333;
    const pts = [];
    for (let k = 1; k <= 6; k++) {
      const t = 2 + k * 2.6;
      const px = top.x + vx * t;
      const py = top.y - 34 + vy * t + 0.5 * g * t * t;
      pts.push({ x: px, y: Math.min(py, this.profile(px) - 30) });
    }
    return pts;
  }

  /** Arco de elotes que sale de una cresta siguiendo una parábola. */
  makeArc(xc) {
    const n = 6;
    const yTop = this.profile(xc);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const px = xc + 24 + k * 30;
      const arcY = yTop - 36 - 64 * Math.sin((k / (n - 1)) * Math.PI);
      pts.push({ x: px, y: Math.min(arcY, this.profile(px) - 30) });
    }
    return pts;
  }

  /** Mantiene tramos por delante de la cámara y borra los que quedaron atrás. */
  update(scrollX) {
    const aheadX = scrollX + GAME_WIDTH + ROAD.chunkLength * ROAD.chunksAhead;
    while (this.lastPoint.x < aheadX && (!this.finishX || this.lastPoint.x < this.finishX + 1800)) this.generateChunk();

    const behindX = scrollX - ROAD.cleanupBehind;
    while (this.chunks.length && this.chunks[0].endX < behindX) {
      this.destroyChunk(this.chunks.shift());
    }
  }

  // ---------- construcción ----------

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
      arcs: [],
      features: extra.features || [],
      topes: extra.topes || [],
    };
    chunk.gfx = this.drawer ? this.drawer.draw(chunk) : this.defaultDraw(points);
    this.chunks.push(chunk);
    this.lastPoint = last;
    return chunk;
  }

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
    return this.scene.matter.add.rectangle(cx, cy, len + 4, t, {
      isStatic: true,
      angle,
      friction: ROAD.friction,
      label: 'road',
      collisionFilter: groundFilter(),
      render: { visible: false },
    });
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
