import Phaser from 'phaser';
import { labelOf } from './EloteManager.js';
import { svgImage } from '../assets.js';
import { SCORE } from '../config.js';
import { MAX_METERS, SAFE_METERS } from './Difficulty.js';
import { groundFilter } from './collision.js';

export const CROSSER = {
  triggerDistance: 460, // px por delante del carrito para que "salga"
  lifetimeMs: 1800, // tiempo que tarda en cruzar
  slowFactor: 0.3,
  shake: 5,
};

export const COCHE = { width: 150, height: 34, ramp: 55 };
export const CAMIONETA = { width: 190, height: 46, ramp: 60, speed: 1.7, triggerDistance: 760, cleanupBehind: 900 };
export const ZONE = { width: 150, height: 70, slowSpeed: 3.2 };
export const CABLE = { height: 150, links: 7, span: 260, shake: 11 };
export const POSTE = { radius: 12 };

const MIN_SALE_COUNT = 2; // nunca vender el último elote

/**
 * Personajes y obstáculos del barrio colocados en los "spots" libres de cada
 * tramo según los pesos del escenario:
 *   perro / doña: cruzan la calle de repente (te frenan y sacuden los elotes)
 *   cholo: si pasas lento por su zona te quita elotes
 *   cliente: si pasas lento por su zona te compra un elote (+3)
 *   coche: estacionado (lomo grande); poste caído (CFE) atravesado
 *   camioneta del gas: avanza lenta en tu carril, se salta o se rebota
 *   cable CFE: colgado bajo después de una rampa; tocarlo sacude los elotes
 *   chile: empujón de 2 s; bolsa: repone 2 elotes al carrito
 */
export default class Actors {
  constructor(scene, cart, road, elotes, level, opts = {}) {
    this.scene = scene;
    this.cart = cart;
    this.road = road;
    this.elotes = elotes;
    this.level = level;
    this.weights = { bolsa: 0.015, ...level.actores };
    if (opts.race) {
      // en las copas no hay que pasar lento: fuera cholos y clientes
      this.weights.cholo = 0;
      this.weights.cliente = 0;
    }
    this.crossers = [];
    this.zones = new Map(); // body -> { kind, img, done }
    this.pickups = new Map(); // body -> { kind, img, tween }
    this.cables = new Map(); // body -> cable
    this.trucks = []; // camionetas en movimiento
    this.pendingTrucks = [];
    this.hits = 0;
    this.robos = 0;
    this.ventas = 0;
    this.saltos = 0;

    scene.events.on('chunk', this.onChunk, this);
    scene.events.on('chunk-destroyed', this.onChunkDestroyed, this);
    scene.matter.world.on('collisionstart', this.onCollisionStart, this);
    scene.matter.world.on('collisionactive', this.onCollisionActive, this);
  }

  // ---------- colocación ----------

  onChunk(chunk) {
    const rnd = this.road.rnd;
    // cables CFE: después de una rampa, colgados entre dos postes
    for (const f of chunk.features || []) {
      if (f.type === 'rampa' && rnd.frac() < this.weights.cable * 6) this.addCable(chunk, f.points[1].x + 80);
    }
    for (const s of chunk.spots) {
      if (s.used) continue;
      const meters = this.road.metersAt(s.x);
      if (meters < SAFE_METERS + 10) continue;
      const mul = 1 + Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);
      const kind = this.pick(rnd.frac(), mul, s);
      if (!kind) continue;
      s.used = true;
      this.place(kind, chunk, s);
    }
  }

  /** Elige un actor por pesos; devuelve null si no toca nada. */
  pick(roll, mul, s) {
    let acc = 0;
    for (const [kind, w] of Object.entries(this.weights)) {
      if (!w) continue;
      if (kind === 'cable') continue; // va aparte, junto a las rampas
      if ((kind === 'coche' || kind === 'camioneta') && s.len < COCHE.width + 30) continue;
      // lomos y postes caídos solo en plano o bajada: en subida atoran al carrito
      if ((kind === 'coche' || kind === 'camioneta' || kind === 'poste') && s.angle < -0.1) continue;
      acc += w * mul;
      if (roll < acc) return kind;
    }
    return null;
  }

  place(kind, chunk, s) {
    if (kind === 'perro' || kind === 'dona') {
      this.crossers.push({ kind, x: s.x, y: s.y, n: s.n, angle: s.angle, chunk, state: 'waiting', timer: 0 });
    } else if (kind === 'cholo' || kind === 'cliente') {
      this.addZone(kind, chunk, s);
    } else if (kind === 'coche') {
      this.addCoche(chunk, s);
    } else if (kind === 'camioneta') {
      this.pendingTrucks.push({ x: s.x, chunk });
    } else if (kind === 'poste') {
      this.addPoste(chunk, s);
    } else if (kind === 'chile' || kind === 'bolsa') {
      this.addPickup(kind, chunk, s);
    }
  }

  extras(chunk) {
    chunk.extras = chunk.extras || [];
    return chunk.extras;
  }

  addZone(kind, chunk, s) {
    const m = this.scene.matter;
    const lift = ZONE.height / 2;
    const body = m.add.rectangle(s.x - s.n.x * lift, s.y - s.n.y * lift, ZONE.width, ZONE.height, {
      isStatic: true,
      isSensor: true,
      angle: s.angle,
      label: 'zona',
      render: { visible: false },
    });
    chunk.bodies.push(body);
    const gy = this.road.surfaceYAt(s.x);
    const img = svgImage(this.scene, s.x, (gy === null ? s.y : gy) - 10, kind)
      .setOrigin(0.5, 1)
      .setDepth(-44);
    const bubble = this.scene.add
      .text(s.x, img.y - 100, kind === 'cliente' ? '¡Elotes!' : '...', {
        fontFamily: 'Fredoka, Arial',
        fontSize: '20px',
        color: kind === 'cliente' ? '#2e8b57' : '#c0392b',
        stroke: '#fff4d6',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(-43);
    this.extras(chunk).push(img, bubble);
    this.zones.set(body, { kind, img, bubble, done: false, x: s.x });
  }

  addCoche(chunk, s) {
    const body = this.trapezoid(s.x, s.y, s.angle, COCHE, 'coche');
    chunk.bodies.push(body);
    this.extras(chunk).push(svgImage(this.scene, s.x, s.y, 'coche').setOrigin(0.5, 0.93).setRotation(s.angle).setDepth(-4));
  }

  /** Cuerpo estático en forma de lomo (trapecio) apoyado sobre la calle. */
  trapezoid(x, y, angle, dims, label, isStatic = true) {
    const m = this.scene.matter;
    const { width: w, height: h, ramp: r } = dims;
    const local = [
      { x: -w / 2, y: 0 },
      { x: -w / 2 + r, y: -h },
      { x: w / 2 - r, y: -h },
      { x: w / 2, y: 0 },
    ];
    const c = m.vertices.centre(local);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cx = x + c.x * cos - c.y * sin;
    const cy = y + c.x * sin + c.y * cos;
    return m.add.fromVertices(cx, cy, local, { isStatic, angle, friction: 0.8, label, collisionFilter: groundFilter(), render: { visible: false } });
  }

  addPoste(chunk, s) {
    const m = this.scene.matter;
    const x = s.x - s.n.x * POSTE.radius;
    const y = s.y - s.n.y * POSTE.radius;
    const body = m.add.circle(x, y, POSTE.radius, {
      isStatic: true,
      friction: 0.7,
      label: 'poste-caido',
      collisionFilter: groundFilter(),
      render: { visible: false },
    });
    chunk.bodies.push(body);
    this.extras(chunk).push(svgImage(this.scene, x, y, 'poste-caido').setOrigin(0.5, 0.6).setRotation(s.angle).setDepth(-4));
  }

  addPickup(kind, chunk, s) {
    const m = this.scene.matter;
    const lift = 34;
    const x = s.x - s.n.x * lift;
    const y = s.y - s.n.y * lift;
    const body = m.add.circle(x, y, 16, { isStatic: true, isSensor: true, label: kind, render: { visible: false } });
    chunk.bodies.push(body);
    const img = svgImage(this.scene, x, y, kind).setDepth(-3);
    const tween = this.scene.tweens.add({ targets: img, y: y - 8, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.extras(chunk).push(img);
    this.pickups.set(body, { kind, img, tween });
  }

  addCable(chunk, x1) {
    const m = this.scene.matter;
    const x2 = x1 + CABLE.span;
    const y1 = this.road.surfaceYAt(x1);
    const y2 = this.road.surfaceYAt(x2);
    if (y1 === null || y2 === null) return;
    const topY1 = y1 - 16 - 190;
    const topY2 = y2 - 16 - 190;
    const midGround = this.road.surfaceYAt((x1 + x2) / 2) ?? (y1 + y2) / 2;
    const sag = Math.max(20, midGround - CABLE.height - (topY1 + topY2) / 2);
    const bodies = [];
    const pts = [];
    for (let i = 0; i <= CABLE.links; i++) {
      const t = i / CABLE.links;
      const px = x1 + (x2 - x1) * t;
      const py = topY1 + (topY2 - topY1) * t + Math.sin(t * Math.PI) * sag;
      pts.push({ x: px, y: py });
      if (i > 0 && i < CABLE.links) {
        const b = m.add.circle(px, py, 7, { isStatic: true, isSensor: true, label: 'cable', render: { visible: false } });
        bodies.push(b);
        chunk.bodies.push(b);
      }
    }
    const g = this.scene.add.graphics().setDepth(-2);
    g.lineStyle(4, 0x1a1a1a, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    const mid = pts[Math.floor(pts.length / 2)];
    g.fillStyle(0xf7c948, 1);
    g.fillRoundedRect(mid.x - 22, mid.y + 4, 44, 20, 4);
    g.lineStyle(2, 0x1a1a1a, 1);
    g.strokeRoundedRect(mid.x - 22, mid.y + 4, 44, 20, 4);
    const sign = this.scene.add
      .text(mid.x, mid.y + 14, 'CFE', { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#1a1a1a' })
      .setOrigin(0.5)
      .setDepth(-1.9);
    const p1 = svgImage(this.scene, x1, y1 - 14, 'poste')
      .setOrigin(0.5, 1)
      .setDepth(-2.5);
    const p2 = svgImage(this.scene, x2, y2 - 14, 'poste')
      .setOrigin(0.5, 1)
      .setDepth(-2.5);
    this.extras(chunk).push(g, sign, p1, p2);
    const cable = { done: false, x: (x1 + x2) / 2, y: mid.y };
    for (const b of bodies) this.cables.set(b, cable);
  }

  // ---------- camioneta del gas ----------

  spawnTruck(p) {
    const m = this.scene.matter;
    const y = this.road.surfaceYAt(p.x);
    if (y === null) return;
    const angle = Math.atan(this.road.slopeAt(p.x));
    const body = this.trapezoid(p.x, y, angle, CAMIONETA, 'camioneta');
    const img = svgImage(this.scene, p.x, y, 'camioneta-gas').setOrigin(0.5, 0.86).setRotation(angle).setDepth(-0.2);
    this.trucks.push({ body, img, x: p.x });
    this.scene.events.emit('camioneta-appear');
  }

  moveTruck(t) {
    const m = this.scene.matter;
    t.x += CAMIONETA.speed;
    const y = this.road.surfaceYAt(t.x);
    if (y === null) return;
    const angle = Math.atan(this.road.slopeAt(t.x));
    const c = m.vertices.centre([
      { x: -CAMIONETA.width / 2, y: 0 },
      { x: -CAMIONETA.width / 2 + CAMIONETA.ramp, y: -CAMIONETA.height },
      { x: CAMIONETA.width / 2 - CAMIONETA.ramp, y: -CAMIONETA.height },
      { x: CAMIONETA.width / 2, y: 0 },
    ]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    m.body.setPosition(t.body, { x: t.x + c.x * cos - c.y * sin, y: y + c.x * sin + c.y * cos });
    m.body.setAngle(t.body, angle);
    t.img.setPosition(t.x, y).setRotation(angle);
    // salto sobre la camioneta: el carrito pasa por arriba sin tocarla
    if (!t.jumped && this.cart.x > t.x + CAMIONETA.width / 2 && !this.cart.grounded) {
      t.jumped = true;
      this.saltos += 1;
      this.scene.events.emit('camioneta-saltada');
    }
    if (this.cart.x > t.x + CAMIONETA.width / 2) t.jumped = true;
  }

  removeTruck(t) {
    this.scene.matter.world.remove(t.body);
    t.img.destroy();
  }

  // ---------- perros y doñas ----------

  activateCrosser(p) {
    const m = this.scene.matter;
    const h = p.kind === 'perro' ? 24 : 60;
    const w = p.kind === 'perro' ? 40 : 34;
    const lift = h / 2 + 2;
    const x = p.x - p.n.x * lift;
    const y = p.y - p.n.y * lift;
    p.body = m.add.rectangle(x, y, w, h, { isStatic: true, isSensor: true, angle: p.angle, label: 'crosser', render: { visible: false } });
    p.img = svgImage(this.scene, x, y, p.kind)
      .setOrigin(0.5, p.kind === 'perro' ? 0.75 : 0.95)
      .setRotation(p.angle)
      .setDepth(-3);
    p.tween = this.scene.tweens.add({ targets: p.img, y: y - 5, duration: p.kind === 'perro' ? 110 : 180, yoyo: true, repeat: -1 });
    p.label = this.scene.add
      .text(x, y - (p.kind === 'perro' ? 52 : 92), '!', {
        fontFamily: 'Fredoka, Arial',
        fontSize: '40px',
        color: '#ff3b3b',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    p.state = 'active';
    p.timer = CROSSER.lifetimeMs;
    this.scene.events.emit('crosser-appear', p.kind);
  }

  removeCrosser(p) {
    if (p.body) this.scene.matter.world.remove(p.body);
    if (p.label) p.label.destroy();
    if (p.tween) p.tween.stop();
    if (p.img) p.img.destroy();
    p.body = null;
    p.label = null;
    p.img = null;
    p.state = 'done';
  }

  hitCrosser(p) {
    const m = this.scene.matter.body;
    for (const b of [this.cart.chassis, ...this.cart.wheels]) {
      m.setVelocity(b, { x: b.velocity.x * CROSSER.slowFactor, y: b.velocity.y * CROSSER.slowFactor });
    }
    this.elotes.scaleVelocity(CROSSER.slowFactor + 0.2);
    this.elotes.shake(CROSSER.shake);
    this.hits++;
    this.removeCrosser(p);
    this.scene.events.emit(p.kind === 'perro' ? 'perro-hit' : 'dona-hit');
  }

  // ---------- colisiones ----------

  otherOf(pair) {
    const la = labelOf(pair.bodyA);
    const lb = labelOf(pair.bodyB);
    const mineA = la === 'cart' || la === 'wheel';
    const mineB = lb === 'cart' || lb === 'wheel';
    if (mineA === mineB) return null;
    return mineA ? pair.bodyB : pair.bodyA;
  }

  onCollisionStart(event) {
    for (const pair of event.pairs) {
      const other = this.otherOf(pair);
      if (!other) continue;
      const label = labelOf(other);
      if (label === 'crosser') {
        const p = this.crossers.find((q) => q.body === other);
        if (p && p.state === 'active') this.hitCrosser(p);
      } else if (label === 'chile' || label === 'bolsa') {
        const pk = this.pickups.get(other);
        if (pk) this.takePickup(other, pk);
      } else if (label === 'cable') {
        const c = this.cables.get(other);
        if (c && !c.done) {
          c.done = true;
          this.elotes.shake(CABLE.shake);
          this.scene.events.emit('cable-hit', { x: c.x, y: c.y });
        }
      }
    }
  }

  onCollisionActive(event) {
    for (const pair of event.pairs) {
      const other = this.otherOf(pair);
      if (!other || labelOf(other) !== 'zona') continue;
      const z = this.zones.get(other);
      if (!z || z.done) continue;
      if (Math.abs(this.cart.speedX) < ZONE.slowSpeed) this.triggerZone(z);
    }
  }

  triggerZone(z) {
    z.done = true;
    if (z.kind === 'cholo') {
      const n = Math.min(this.elotes.count, this.road.rnd.frac() < 0.5 ? 1 : 2);
      for (let i = 0; i < n; i++) {
        const pos = this.elotes.removeOne();
        if (pos) this.flyElote(pos, z.img.x, z.img.y - 60);
      }
      this.robos += n;
      z.bubble.setText('¡Órale!');
      this.scene.events.emit('robo', n);
    } else if (z.kind === 'cliente') {
      if (this.elotes.count < MIN_SALE_COUNT) {
        z.bubble.setText('¿Y los elotes?');
        return;
      }
      const pos = this.elotes.removeOne();
      if (pos) this.flyElote(pos, z.img.x, z.img.y - 60);
      this.ventas += 1;
      z.bubble.setText('¡Gracias!');
      this.scene.events.emit('venta', SCORE.saleValue);
    }
  }

  flyElote(from, tx, ty) {
    const img = svgImage(this.scene, from.x, from.y, 'elote').setScale(0.27).setDepth(5);
    this.scene.tweens.add({
      targets: img,
      x: tx,
      y: ty,
      rotation: 3,
      scale: 0.15,
      duration: 450,
      ease: 'Quad.easeIn',
      onComplete: () => img.destroy(),
    });
  }

  takePickup(body, pk) {
    this.pickups.delete(body);
    this.scene.matter.world.remove(body);
    pk.tween.stop();
    pk.img.destroy();
    if (pk.kind === 'chile') this.scene.events.emit('chile');
    else {
      let added = 0;
      for (let i = 0; i < 2; i++) if (this.elotes.addToCart()) added++;
      this.scene.events.emit('bolsa', added);
    }
  }

  // ---------- ciclo ----------

  onChunkDestroyed(chunk) {
    this.crossers = this.crossers.filter((p) => {
      if (p.chunk !== chunk) return true;
      this.removeCrosser(p);
      return false;
    });
    this.pendingTrucks = this.pendingTrucks.filter((t) => t.chunk !== chunk);
    for (const b of chunk.bodies) {
      this.zones.delete(b);
      this.cables.delete(b);
      const pk = this.pickups.get(b);
      if (pk) {
        pk.tween.stop();
        this.pickups.delete(b);
      }
    }
  }

  update(deltaMs) {
    const cx = this.cart.x;
    for (const p of this.crossers) {
      if (p.state === 'waiting' && cx > p.x - CROSSER.triggerDistance) {
        this.activateCrosser(p);
      } else if (p.state === 'active') {
        p.timer -= deltaMs;
        if (p.label) p.label.setVisible(Math.floor(p.timer / 150) % 2 === 0);
        if (p.timer <= 0) this.removeCrosser(p);
      }
    }
    this.crossers = this.crossers.filter((p) => p.state !== 'done');

    this.pendingTrucks = this.pendingTrucks.filter((t) => {
      if (cx > t.x - CAMIONETA.triggerDistance) {
        this.spawnTruck(t);
        return false;
      }
      return true;
    });
    this.trucks = this.trucks.filter((t) => {
      this.moveTruck(t);
      if (cx - t.x > CAMIONETA.cleanupBehind) {
        this.removeTruck(t);
        return false;
      }
      return true;
    });
  }

  destroy() {
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.events.off('chunk-destroyed', this.onChunkDestroyed, this);
    this.scene.matter.world.off('collisionstart', this.onCollisionStart, this);
    this.scene.matter.world.off('collisionactive', this.onCollisionActive, this);
    this.crossers.forEach((p) => this.removeCrosser(p));
    this.trucks.forEach((t) => this.removeTruck(t));
    this.pickups.forEach((pk) => pk.tween.stop());
  }
}
