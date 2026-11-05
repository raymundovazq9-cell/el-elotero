import Phaser from 'phaser';
import { ROAD } from '../config.js';

const COLOR_ROAD = 0x5a5a5a;
const COLOR_ROAD_LINE = 0x2e2e2e;

/**
 * Calle construida a partir de polilíneas. Cada segmento entre dos puntos
 * se convierte en un rectángulo estático rotado de Matter.
 */
export default class Road {
  constructor(scene) {
    this.scene = scene;
    this.chunks = []; // { bodies: [], gfx: Graphics, startX, endX }
    this.lastPoint = { x: -400, y: 300 };
  }

  /** Crea un tramo a partir de una lista de puntos consecutivos. */
  buildChunk(points) {
    const bodies = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const body = this.segmentBody(a, b);
      if (body) bodies.push(body);
    }

    const gfx = this.scene.add.graphics();
    gfx.setDepth(-10);
    gfx.fillStyle(COLOR_ROAD, 1);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    const bottom = Math.max(...points.map((p) => p.y)) + 2000;
    gfx.lineTo(points[points.length - 1].x, bottom);
    gfx.lineTo(points[0].x, bottom);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(4, COLOR_ROAD_LINE, 1);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.strokePath();

    const chunk = {
      bodies,
      gfx,
      startX: points[0].x,
      endX: points[points.length - 1].x,
      points,
    };
    this.chunks.push(chunk);
    this.lastPoint = points[points.length - 1];
    return chunk;
  }

  segmentBody(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const angle = Math.atan2(dy, dx);
    const t = ROAD.thickness;
    // desplaza el centro hacia "abajo" de la línea (perpendicular)
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
    const points = [];
    const steps = Math.ceil(length / 200);
    for (let i = 0; i <= steps; i++) {
      const d = (length * i) / steps;
      points.push({ x: fromX + Math.cos(rad) * d, y: fromY + Math.sin(rad) * d });
    }
    return this.buildChunk(points);
  }

  destroyChunk(chunk) {
    chunk.bodies.forEach((b) => this.scene.matter.world.remove(b));
    chunk.gfx.destroy();
  }

  destroy() {
    this.chunks.forEach((c) => this.destroyChunk(c));
    this.chunks = [];
  }
}
