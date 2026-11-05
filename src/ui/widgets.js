import Phaser from 'phaser';
import { COLORS, textStyle } from '../theme.js';

const FLAG_COLORS = [0xe4007c, 0x2e8b57, 0x3a86ff, 0xf7c948, 0xf2762e, 0xffffff];

/** Botón redondeado con sombra, etiqueta y animación al presionar. */
export function makeButton(scene, x, y, w, h, color, label, onClick, opts = {}) {
  const size = opts.fontSize || Math.round(h * 0.42);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.35);
  shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, h / 4);
  const face = scene.add.graphics();
  const draw = (pressed) => {
    face.clear();
    face.fillStyle(color, 1);
    face.fillRoundedRect(-w / 2, -h / 2, w, h, h / 4);
    face.lineStyle(4, 0x1a1a1a, 1);
    face.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 4);
    if (!pressed) {
      face.fillStyle(0xffffff, 0.22);
      face.fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.32, h / 6);
    }
  };
  draw(false);
  const text = scene.add.text(0, 0, label, textStyle(size, opts.textColor || COLORS.blanco)).setOrigin(0.5);
  const container = scene.add.container(x, y, [shadow, face, text]);
  container.setSize(w, h);
  const zone = scene.add.zone(x, y, w + 16, h + 16).setInteractive({ useHandCursor: true });
  let armed = false;
  const press = (v) => {
    armed = v;
    draw(v);
    container.setScale(v ? 0.95 : 1);
    shadow.setVisible(!v);
  };
  zone.on('pointerdown', () => press(true));
  zone.on('pointerout', () => press(false));
  zone.on('pointerup', () => {
    if (!armed) return;
    press(false);
    if (onClick) onClick();
  });
  container.zone = zone;
  container.label = text;
  container.setEnabled = (v) => {
    zone.input.enabled = v;
    container.setAlpha(v ? 1 : 0.5);
  };
  container.destroyAll = () => {
    zone.destroy();
    container.destroy();
  };
  return container;
}

/** Botón redondo pequeño con un ícono dibujado (pausa, música). */
export function makeIconButton(scene, x, y, r, color, drawIcon, onClick) {
  const g = scene.add.graphics();
  const paint = (pressed) => {
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(3, 5, r);
    g.fillStyle(color, pressed ? 0.8 : 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(4, 0x1a1a1a, 1);
    g.strokeCircle(0, 0, r);
    drawIcon(g, r);
  };
  paint(false);
  const container = scene.add.container(x, y, [g]);
  const zone = scene.add.zone(x, y, r * 2 + 16, r * 2 + 16).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', () => {
    paint(true);
    container.setScale(0.92);
  });
  zone.on('pointerout', () => {
    paint(false);
    container.setScale(1);
  });
  zone.on('pointerup', () => {
    paint(false);
    container.setScale(1);
    if (onClick) onClick();
  });
  container.repaint = () => paint(false);
  container.zone = zone;
  container.destroyAll = () => {
    zone.destroy();
    container.destroy();
  };
  return container;
}

/** Panel redondeado semitransparente. */
export function makePanel(scene, x, y, w, h, color = 0x000000, alpha = 0.45, radius = 18) {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(3, 0xffffff, 0.35);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

/** Tarjeta clara con borde, para menús. */
export function makeCard(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x - w / 2 + 6, y - h / 2 + 10, w, h, 26);
  g.fillStyle(COLORS.crema, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  g.lineStyle(5, 0x1a1a1a, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  return g;
}

/** Hilera de papel picado colgando entre (x1,y1) y (x2,y2). */
export function drawPapelPicado(scene, x1, y1, x2, y2, n = 12, depth = 0) {
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(3, 0x1a1a1a, 0.8);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 26 });
  }
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
  for (let i = 1; i < n; i++) {
    const p = pts[i];
    g.fillStyle(FLAG_COLORS[i % FLAG_COLORS.length], 1);
    g.fillRect(p.x - 14, p.y, 28, 34);
    g.lineStyle(2, 0x1a1a1a, 0.7);
    g.strokeRect(p.x - 14, p.y, 28, 34);
    // caladito
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(p.x, p.y + 14, 5);
    g.fillRect(p.x - 10, p.y + 24, 20, 4);
  }
  return g;
}

export function iconPause(g, r) {
  g.fillStyle(0x1a1a1a, 1);
  g.fillRoundedRect(-r * 0.42, -r * 0.45, r * 0.3, r * 0.9, 3);
  g.fillRoundedRect(r * 0.12, -r * 0.45, r * 0.3, r * 0.9, 3);
}

export function iconPlay(g, r) {
  g.fillStyle(0x1a1a1a, 1);
  g.fillTriangle(-r * 0.3, -r * 0.45, -r * 0.3, r * 0.45, r * 0.5, 0);
}

export function iconMusic(muted) {
  return (g, r) => {
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(-r * 0.25, r * 0.3, r * 0.22);
    g.fillRect(-r * 0.08, -r * 0.5, r * 0.16, r * 0.8);
    g.fillRect(-r * 0.08, -r * 0.5, r * 0.55, r * 0.16);
    if (muted) {
      g.lineStyle(5, 0xc0392b, 1);
      g.beginPath();
      g.moveTo(-r * 0.6, -r * 0.6);
      g.lineTo(r * 0.6, r * 0.6);
      g.strokePath();
    }
  };
}

export { Phaser };
