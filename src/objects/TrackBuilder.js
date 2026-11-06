import Phaser from 'phaser';

/**
 * Pista por tramos diseñados. Cada pieza es una lista de puntos de control
 * relativos (dx acumulado, dy relativo al inicio de la pieza) y, a veces,
 * rasgos que pide al terreno (tope, rampa, escalera, hueco...). El perfil se
 * interpola con Hermite monótono (sin rebotes) y toda pieza empieza y termina
 * plana, así que las uniones no tienen quiebres.
 *
 * Niveles de dificultad n = 0..3 (por metros en aventura, 1–2 en copas):
 *   subida   pide impulso: si entras lento te regresas (reversa y toma vuelo)
 *   bajada   velocidad; en n ≥ 2 trae tope al final: hay que frenar
 *   cresta   joroba que te lanza: nivela en el aire
 *   sierra   ondas cortas: baja la velocidad o pierdes elotes
 *   valle    V: lleva impulso para la subida de enfrente
 *   trampolin  rampa + hueco: llega con velocidad
 *   meseta   plano y escalera de bajada
 */

const FLAT = 60; // tramo plano al final de cada pieza (empalme con tangente 0)
// Pendiente máxima real por nivel. Ojo: la curva Hermite con extremos planos tiene a media
// subida 1.5 veces la pendiente promedio, así que el largo se calcula con ese factor.
const MAX_SLOPE = [0.4, 0.5, 0.6, 0.7]; // subidas
const VALLE_SLOPE = [0.45, 0.52, 0.6, 0.68]; // lado de salida de los valles
const HERMITE_K = 1.5;

/** Cada pieza devuelve { pts: [{dx, dy}], feats: [{type, at, ...}] }. dy crece hacia abajo. */
export const PIECES = {
  llano(n, rnd, s) {
    const len = rnd.between(300, 500);
    const pts = [{ dx: 0, dy: 0 }];
    const k = Math.round(len / 110);
    for (let i = 1; i < k; i++) pts.push({ dx: (len * i) / k, dy: rnd.realInRange(-1, 1) * (6 + 6 * Math.min(n, 2)) * s });
    pts.push({ dx: len, dy: 0 }, { dx: len + FLAT, dy: 0 });
    return { pts, feats: [] };
  },
  subida(n, rnd, s) {
    const rise = (90 + 35 * n) * s;
    let len = rnd.between(350, 600);
    const minLen = Math.round((HERMITE_K * rise) / MAX_SLOPE[n]) + 50;
    if (len < minLen) len = minLen;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 50, dy: 0 },
        { dx: len, dy: -rise },
        { dx: len + FLAT, dy: -rise },
      ],
      feats: [],
      needsRunUp: true,
    };
  },
  bajada(n, rnd, s) {
    const drop = (80 + 40 * n) * s;
    const len = rnd.between(300, 500);
    const feats = n >= 3 ? [{ type: 'tope', at: len + 20 }] : [];
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 40, dy: 0 },
        { dx: len, dy: drop },
        { dx: len + FLAT + (n >= 3 ? 40 : 0), dy: drop },
      ],
      feats,
    };
  },
  cresta(n, rnd, s) {
    const up = (55 + 8 * n) * s;
    const down = (85 + 12 * n) * s;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 40, dy: 0 },
        { dx: 185, dy: -up },
        { dx: 305, dy: down - up },
        { dx: 305 + FLAT + 60, dy: down - up },
      ],
      feats: [],
      landing: true,
    };
  },
  dobleCresta(n, rnd, s) {
    const a = (50 + 8 * n) * s;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 40, dy: 0 },
        { dx: 140, dy: -a },
        { dx: 230, dy: -a * 0.25 },
        { dx: 330, dy: -a * 1.1 },
        { dx: 450, dy: 40 * s },
        { dx: 450 + FLAT + 60, dy: 40 * s },
      ],
      feats: [],
      landing: true,
    };
  },
  sierra(n, rnd, s) {
    const waves = rnd.between(4, 6);
    const lambda = rnd.between(90, 130);
    const amp = (14 + 3 * n) * s;
    const pts = [{ dx: 0, dy: 0 }];
    let x = 50;
    pts.push({ dx: x, dy: 0 });
    for (let i = 0; i < waves; i++) {
      x += lambda / 2;
      pts.push({ dx: x, dy: -amp });
      x += lambda / 2;
      pts.push({ dx: x, dy: 0 });
    }
    pts.push({ dx: x + FLAT, dy: 0 });
    return { pts, feats: [] };
  },
  valle(n, rnd, s) {
    const depth = (90 + 20 * n) * s;
    const half = Math.max(rnd.between(200, 260), Math.round((HERMITE_K * depth) / VALLE_SLOPE[n]));
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 30, dy: 0 },
        { dx: 30 + half, dy: depth },
        { dx: 30 + half * 2, dy: 0 },
        { dx: 30 + half * 2 + FLAT, dy: 0 },
      ],
      feats: [],
    };
  },
  trampolin(n, rnd, s) {
    const gap = 60 + 30 * Math.max(0, n - 1);
    const rampLen = 110;
    const x0 = 80;
    const land = x0 + rampLen + gap;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: land, dy: 0 },
        { dx: land + 230, dy: 70 * s },
        { dx: land + 230 + FLAT, dy: 70 * s },
      ],
      feats: [
        { type: 'rampa', at: x0, len: rampLen, h: 44 * s },
        { type: 'hueco', at: x0 + rampLen + 2, w: gap - 4, depth: 90 },
      ],
      landing: true,
    };
  },
  meseta(n, rnd, s) {
    const drop = (80 + 20 * n) * s;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 160, dy: 0 },
        { dx: 160 + 150, dy: drop },
        { dx: 160 + 150 + FLAT, dy: drop },
      ],
      feats: [{ type: 'escalera', at: 200 }],
    };
  },
  barranca(n, rnd, s) {
    const drop = (120 + 40 * n) * s;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 70, dy: 0 },
        { dx: 70 + 380, dy: drop },
        { dx: 70 + 380 + FLAT, dy: drop },
      ],
      feats: [{ type: 'barranca', at: 70 }],
      landing: true,
    };
  },
  rampaGrande(n, rnd, s) {
    const drop = (110 + 20 * n) * s;
    return {
      pts: [
        { dx: 0, dy: 0 },
        { dx: 190, dy: 0 },
        { dx: 190 + 320, dy: drop },
        { dx: 190 + 320 + FLAT + 60, dy: drop },
      ],
      feats: [{ type: 'rampaGrande', at: 10 }],
      landing: true,
    };
  },
};

const LANDING_ZONES = ['llano', 'bajada'];
const EASY = ['llano', 'bajada', 'subida', 'valle'];

export default class TrackBuilder {
  /**
   * @param {Phaser.Math.RandomDataGenerator} rnd generador sembrado (la pista es fija por semilla)
   * @param {{base:number, escala:number, piezas:object}} pista datos del escenario
   * @param {{startX:number, metersAt:(x:number)=>number, finishX?:number}} opts
   */
  constructor(rnd, pista, opts) {
    this.rnd = rnd;
    this.pista = pista;
    this.base = pista.base;
    this.scale = pista.escala || 1;
    this.startX = opts.startX;
    this.metersAt = opts.metersAt;
    this.finishX = opts.finishX || null;
    this.pts = [{ x: this.startX, y: this.base, m: 0 }]; // puntos de control con tangente m
    this.feats = []; // rasgos pedidos, en x absoluta
    this.pieces = []; // { tag, x0, x1 }
    this.prev = null;
    this.prevPrev = null;
    this.segIdx = 0;
  }

  /** Nivel de dificultad 0..3 según metros (en copas 1 y luego 2). */
  levelAt(x) {
    if (this.finishX) return x > (this.startX + this.finishX) / 2 ? 2 : 1;
    const m = this.metersAt(x);
    if (m < 120) return 0;
    if (m < 300) return 1;
    if (m < 600) return 2;
    return 3;
  }

  /** Elige la siguiente pieza respetando las reglas de encadenado. */
  pickPiece(x, n) {
    const last = this.pts[this.pts.length - 1];
    const height = this.base - last.y; // > 0 si vamos altos
    const weights = this.pista.piezas;
    const choices = [];
    for (const [tag, w] of Object.entries(weights)) {
      if (!w || !PIECES[tag]) continue;
      if (n === 0 && !EASY.includes(tag)) continue;
      if (this.pieces.length === 0 && tag !== 'llano') continue; // arranque tranquilo (copas empiezan en n=1)
      if (tag === 'trampolin' && n < 2) continue;
      if (tag === 'dobleCresta' && n < 1) continue;
      if (this.prev && this.prev.landing && !LANDING_ZONES.includes(tag)) continue;
      if (tag === 'subida' && this.prev && (this.prev.tag === 'subida' || this.prev.tag === 'sierra' || this.prev.tag === 'meseta')) continue;
      if (this.prev && this.prev.tag === tag && tag !== 'llano') continue;
      if (tag === 'llano' && this.prev && this.prevPrev && this.prev.tag === 'llano' && this.prevPrev.tag === 'llano') continue;
      // no irse muy alto ni muy bajo respecto a la base
      if (height > 140 && tag === 'subida') continue;
      if (height < -160 && ['bajada', 'cresta', 'dobleCresta', 'meseta', 'barranca', 'rampaGrande', 'trampolin'].includes(tag)) continue;
      choices.push([
        tag,
        w * (height > 60 && ['bajada', 'meseta', 'barranca', 'rampaGrande'].includes(tag) ? 2 : 1) * (height < -60 && tag === 'subida' ? 2.5 : 1),
      ]);
    }
    if (!choices.length) return 'llano';
    const total = choices.reduce((a, [, w]) => a + w, 0);
    let r = this.rnd.frac() * total;
    for (const [tag, w] of choices) {
      r -= w;
      if (r <= 0) return tag;
    }
    return choices[choices.length - 1][0];
  }

  addPiece(tag, spec) {
    const last = this.pts[this.pts.length - 1];
    const x0 = last.x;
    const y0 = last.y;
    const local = spec.pts.map((p) => ({ x: x0 + p.dx, y: y0 + p.dy }));
    // tangentes monótonas (Fritsch–Carlson) dentro de la pieza; extremos planos
    const n = local.length;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((local[i + 1].y - local[i].y) / Math.max(1, local[i + 1].x - local[i].x));
    const m = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const h = Math.hypot(a, b);
      if (h > 3) {
        m[i] = ((3 * a) / h) * d[i];
        m[i + 1] = ((3 * b) / h) * d[i];
      }
    }
    m[0] = 0;
    m[n - 1] = 0;
    for (let i = 1; i < n; i++) this.pts.push({ x: local[i].x, y: local[i].y, m: m[i] });
    for (const f of spec.feats || []) this.feats.push({ ...f, x: x0 + f.at });
    const piece = { tag, x0, x1: local[n - 1].x, landing: !!spec.landing };
    this.pieces.push(piece);
    this.prevPrev = this.prev;
    this.prev = piece;
  }

  /** Genera piezas hasta cubrir x. */
  ensure(x) {
    while (this.pts[this.pts.length - 1].x < x) {
      const lx = this.pts[this.pts.length - 1].x;
      let tag;
      let spec;
      if (this.finishX && lx > this.finishX - 700) {
        tag = 'meta';
        spec = {
          pts: [
            { dx: 0, dy: 0 },
            { dx: 400, dy: 0 },
          ],
          feats: [],
        };
      } else {
        const n = this.levelAt(lx);
        tag = this.pickPiece(lx, n);
        spec = PIECES[tag](n, this.rnd, this.scale);
      }
      this.addPiece(tag, spec);
    }
  }

  /** Altura del perfil en x (Hermite cúbico entre puntos de control). */
  heightAt(x) {
    if (x <= this.startX) return this.base;
    this.ensure(x + 700);
    const pts = this.pts;
    let i = this.segIdx;
    if (i >= pts.length - 1 || x < pts[i].x) i = 0;
    while (i < pts.length - 2 && x > pts[i + 1].x) i++;
    this.segIdx = i;
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const h = p1.x - p0.x || 1;
    const t = Phaser.Math.Clamp((x - p0.x) / h, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * p0.y + h10 * h * p0.m + h01 * p1.y + h11 * h * p1.m;
  }

  /** Rasgo pedido por alguna pieza en [x0, x1), o null. Se consume al devolverlo. */
  takeFeature(x0, x1) {
    const i = this.feats.findIndex((f) => f.x >= x0 && f.x < x1);
    if (i < 0) return null;
    return this.feats.splice(i, 1)[0];
  }

  /** Pieza bajo x (para depuración). */
  pieceAt(x) {
    const p = this.pieces.find((q) => x >= q.x0 && x < q.x1);
    return p ? p.tag : '';
  }

  /** Lista de piezas hasta x (para el log de pruebas). */
  signature(x) {
    this.ensure(x);
    return this.pieces
      .filter((p) => p.x0 < x)
      .map((p) => `${p.tag}@${Math.round(this.metersAt(p.x0))}`)
      .join(',');
  }
}
