import { svgImage } from '../assets.js';

const ASPHALT = 0x4a4a4a;
const STONE_A = 0x616161;
const STONE_B = 0x575757;
const EDGE = 0x2e2e2e;
const BANQUETA = 0xcfc5ad;
const BORDILLO = 0x9e9478;
const BACHE = 0x2a2a2a;
const TABLA = 0xb07a3c;
const TABLA_LINE = 0x6b4418;

/**
 * Dibuja cada tramo de calle: banqueta al fondo, empedrado, borde, baches,
 * rampas de madera y topes. Devuelve un objeto con destroy() para el tramo.
 */
export default class RoadView {
  constructor(scene) {
    this.scene = scene;
  }

  draw(chunk) {
    const pts = chunk.points;
    const g = this.scene.add.graphics().setDepth(-10);
    const last = pts[pts.length - 1];
    const bottom = Math.max(...pts.map((p) => p.y)) + 2000;

    // banqueta (franja detrás de la calle, arriba de la línea)
    g.fillStyle(BANQUETA, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y - 16);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y - 16);
    g.lineTo(last.x + 3, last.y - 16);
    g.lineTo(last.x + 3, last.y + 6);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x, pts[i].y + 6);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, BORDILLO, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y - 16);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y - 16);
    g.strokePath();

    // asfalto
    g.fillStyle(ASPHALT, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.lineTo(last.x + 3, last.y);
    g.lineTo(last.x + 3, bottom);
    g.lineTo(pts[0].x, bottom);
    g.closePath();
    g.fillPath();

    // empedrado: dos filas de piedras bajo la superficie
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 20 || Math.abs(dx) < 8) continue; // paredes verticales de baches/escalones
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const stone = 22;
      for (let row = 0; row < 2; row++) {
        const offset = row * stone * 0.5;
        const depth = 8 + row * 14;
        for (let d = offset; d + stone * 0.8 < len; d += stone) {
          const cx = a.x + ux * (d + stone / 2) + nx * depth;
          const cy = a.y + uy * (d + stone / 2) + ny * depth;
          g.fillStyle(row % 2 ? STONE_B : STONE_A, 1);
          this.fillRotRect(g, cx, cy, stone - 4, 10, Math.atan2(dy, dx), 3);
        }
      }
    }

    // línea de superficie
    g.lineStyle(4, EDGE, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();

    // rasgos especiales
    const extras = [];
    for (const f of chunk.features || []) {
      if (f.type === 'bache') this.drawBache(g, f);
      if (f.type === 'rampa') this.drawRampa(g, f);
    }
    for (const t of chunk.topes || []) {
      extras.push(svgImage(this.scene, t.x, t.y, 'tope').setOrigin(0.5, 0.92).setRotation(t.angle).setDepth(-5));
    }

    return {
      destroy() {
        g.destroy();
        extras.forEach((e) => e.destroy());
      },
    };
  }

  fillRotRect(g, cx, cy, w, h, angle, radius = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = w / 2;
    const hh = h / 2;
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ].map(([x, y]) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos }));
    g.beginPath();
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
    g.closePath();
    g.fillPath();
    void radius;
  }

  drawBache(g, f) {
    const [p0, p1, p2, p3] = f.points;
    g.fillStyle(BACHE, 1);
    g.beginPath();
    g.moveTo(p0.x - 6, p0.y - 1);
    g.lineTo(p1.x, p1.y + 2);
    g.lineTo(p2.x, p2.y + 2);
    g.lineTo(p3.x + 6, p3.y - 1);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x1a1a1a, 0.8);
    g.beginPath();
    g.moveTo(p0.x - 14, p0.y - 4);
    g.lineTo(p0.x - 4, p0.y - 1);
    g.moveTo(p3.x + 4, p3.y - 1);
    g.lineTo(p3.x + 16, p3.y - 5);
    g.strokePath();
  }

  drawRampa(g, f) {
    const [p0, top] = f.points;
    const dx = top.x - p0.x;
    const dy = top.y - p0.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const cx = (p0.x + top.x) / 2;
    const cy = (p0.y + top.y) / 2;
    g.fillStyle(TABLA, 1);
    this.fillRotRect(g, cx + Math.sin(angle) * 5, cy - Math.cos(angle) * 5 + 5, len + 6, 12, angle);
    g.lineStyle(3, TABLA_LINE, 1);
    const n = 4;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const px = p0.x + dx * t;
      const py = p0.y + dy * t;
      g.beginPath();
      g.moveTo(px - Math.sin(angle) * 1, py + Math.cos(angle) * 1);
      g.lineTo(px - Math.sin(angle) * 11, py + Math.cos(angle) * 11);
      g.strokePath();
    }
    // soporte
    g.fillStyle(TABLA_LINE, 1);
    g.fillRect(top.x - 6, top.y, 8, f.points[2].y - top.y);
  }
}
