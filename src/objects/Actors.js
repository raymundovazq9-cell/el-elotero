import Phaser from 'phaser';
import { labelOf } from './EloteManager.js';
import { svgImage, SVG_SCALE } from '../assets.js';
import { SCORE } from '../config.js';
import { MAX_METERS, SAFE_METERS } from './Difficulty.js';
import { groundFilter } from './collision.js';

export const CROSSER = {
  warnMs: 600, // en la banqueta con el "!" antes de bajar a la calle (sin colisión)
  roadMs: { perro: 650, dona: 1100 }, // tiempo que está atravesado en la calle
  leaveMs: 260,
  // sale cuando faltan ~(aviso + un tercio del cruce) segundos a la velocidad actual:
  // si mantienes la velocidad te lo topas; frenando pasa antes; acelerando lo rebasas
  triggerMin: 280,
  triggerMax: 720,
  slowFactor: 0.4,
  shake: 4,
};
// gente (perro, doña, cholo, cliente): espacio mínimo para que no sea un desfile
export const PEOPLE = {
  minMeters: 50, // nadie antes de estos metros
  gapMeters: 35, // entre dos personas cualesquiera
  cooldownMeters: { perro: 70, dona: 70, cholo: 120, cliente: 50 },
  afterFeaturePx: 180, // nadie justo después de una rampa o barranca
  maxSlope: 0.3,
  maxMul: 1.4, // la dificultad por metros no los multiplica más que esto
  choloWarnPx: 320,
  choloSlowMs: 350, // hay que ir lento este tiempo en su zona para que robe
};

export const COCHE = { width: 150, height: 34, ramp: 55 };
export const CAMIONETA = { width: 190, height: 46, ramp: 60, speed: 1.7, triggerDistance: 760, cleanupBehind: 900 };
// vehículos lentos que avanzan en tu carril (se saltan o se rebotan)
export const VEHICLES = {
  camioneta: { ...CAMIONETA, img: 'camioneta-gas', originY: 0.86, bonus: 6 },
  tamalero: { width: 110, height: 44, ramp: 35, speed: 1.1, triggerDistance: 760, cleanupBehind: 900, img: 'tamalero', originY: 0.86, bonus: 5 },
  trailer: { width: 300, height: 54, ramp: 70, speed: 2.4, triggerDistance: 900, cleanupBehind: 1100, img: 'trailer', originY: 0.86, bonus: 10 },
};
export const BALON = { triggerDistance: 420, radius: 14 };
export const CHARCO = { width: 110 };
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
    this.trucks = []; // vehículos en movimiento
    this.pendingTrucks = [];
    this.balls = []; // balones esperando o en juego
    this.puddles = new Set(); // cuerpos de calle con charco
    this.puddleFriction = 0.1 + 0.07 * (opts.llantas || 0);
    this.lastPuddleAt = 0;
    this.lastBallAt = 0;
    this.hits = 0;
    this.dodged = 0;
    this.lastPeopleAt = {}; // metros del último de cada tipo
    this.lastPersonM = -Infinity;
    this.noPeopleUntilX = -Infinity;
    this.noBlockUntilX = -Infinity;
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
      const endX = f.points[f.points.length - 1].x;
      if (f.type === 'rampa' || f.type === 'barranca') this.noPeopleUntilX = Math.max(this.noPeopleUntilX, endX + PEOPLE.afterFeaturePx);
      // nada que atore (coche, poste, vehículos) justo después de un bache, hueco, escalera o rampa: llegas sin velocidad
      this.noBlockUntilX = Math.max(this.noBlockUntilX, endX + 240);
    }
    for (const t of chunk.topes || []) this.noBlockUntilX = Math.max(this.noBlockUntilX, t.x + 200);
    for (const s of chunk.spots) {
      if (s.used) continue;
      const meters = this.road.metersAt(s.x);
      if (meters < SAFE_METERS + 10) continue;
      const mul = 1 + Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);
      const kind = this.pick(rnd.frac(), mul, s, meters);
      if (!kind) continue;
      s.used = true;
      if (kind === 'coche' || kind === 'poste' || VEHICLES[kind]) this.noBlockUntilX = Math.max(this.noBlockUntilX, s.x + 350);
      if (PEOPLE.cooldownMeters[kind] !== undefined) {
        this.lastPeopleAt[kind] = meters;
        this.lastPersonM = meters;
      }
      this.place(kind, chunk, s);
    }
  }

  /** ¿Puede salir una persona de este tipo en este spot? */
  personAllowed(kind, s, meters) {
    if (meters < PEOPLE.minMeters) return false;
    if (meters - this.lastPersonM < PEOPLE.gapMeters) return false;
    if (meters - (this.lastPeopleAt[kind] ?? -Infinity) < PEOPLE.cooldownMeters[kind]) return false;
    if (s.x < this.noPeopleUntilX) return false;
    if (Math.abs(Math.tan(s.angle)) > PEOPLE.maxSlope) return false;
    // el cholo solo en subidas, donde de por sí vas lento: se ve venir
    if (kind === 'cholo' && s.angle > -0.12) return false;
    return true;
  }

  /** Elige un actor por pesos; devuelve null si no toca nada. */
  pick(roll, mul, s, meters = 0) {
    let acc = 0;
    const peopleMul = Math.min(mul, PEOPLE.maxMul);
    for (const [kind, w] of Object.entries(this.weights)) {
      if (!w) continue;
      if (kind === 'cable') continue; // va aparte, junto a las rampas
      const person = PEOPLE.cooldownMeters[kind] !== undefined;
      if (person) {
        if (!this.personAllowed(kind, s, meters)) continue;
        acc += w * peopleMul;
        if (roll < acc) return kind;
        continue;
      }
      const vehicle = kind === 'camioneta' || kind === 'tamalero' || kind === 'trailer';
      if ((kind === 'coche' || vehicle) && s.len < 150) continue;
      // coche, poste y vehículos solo en tramos casi planos y lejos uno de otro
      if ((kind === 'coche' || vehicle || kind === 'poste') && (s.x < this.noBlockUntilX || Math.abs(s.angle) > 0.15)) continue;
      // lomos, vehículos y postes caídos solo en plano o bajada: en subida atoran al carrito
      if ((kind === 'coche' || vehicle || kind === 'poste') && s.angle < -0.1) continue;
      if (kind === 'charco' && (Math.abs(s.angle) > 0.25 || s.len < 100)) continue;
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
    } else if (kind === 'camioneta' || kind === 'tamalero' || kind === 'trailer') {
      this.pendingTrucks.push({ x: s.x, chunk, kind });
    } else if (kind === 'balon') {
      this.balls.push({ x: s.x, y: s.y, n: s.n, chunk, state: 'waiting' });
    } else if (kind === 'charco') {
      this.addPuddle(chunk, s);
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
      .text(s.x, img.y - 100, kind === 'cliente' ? '¡Elotes!' : '', {
        fontFamily: 'Fredoka, Arial',
        fontSize: '20px',
        color: kind === 'cliente' ? '#2e8b57' : '#c0392b',
        stroke: '#fff4d6',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(-43);
    this.extras(chunk).push(img, bubble);
    this.zones.set(body, { kind, img, bubble, done: false, x: s.x, warned: false, slowSince: 0 });
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

  // ---------- charcos ----------

  /** Charco: los segmentos de calle bajo el spot pierden fricción (las llantas mejoradas ayudan). */
  addPuddle(chunk, s) {
    const half = CHARCO.width / 2;
    for (const b of chunk.bodies) {
      if (b.label !== 'road' || Math.abs(b.position.x - s.x) > half) continue;
      b.friction = this.puddleFriction;
      this.puddles.add(b);
    }
    const g = this.scene.add.graphics().setDepth(-4);
    g.fillStyle(0x4cc9f0, 0.8);
    g.lineStyle(2, 0x1d6fa5, 0.8);
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    g.setPosition(s.x - s.n.x * 2, s.y - s.n.y * 2).setRotation(s.angle);
    g.fillEllipse(0, 0, CHARCO.width, 10);
    g.strokeEllipse(0, 0, CHARCO.width, 10);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(-20, -2, 30, 3);
    void cos;
    void sin;
    this.extras(chunk).push(g);
  }

  // ---------- balón ----------

  /** Un niño patea el balón hacia la calle cuando te acercas. */
  kickBall(b) {
    const m = this.scene.matter;
    const x = b.x + 70;
    const y = b.y - 70;
    const body = m.add.circle(x, y, BALON.radius, {
      restitution: 0.72,
      friction: 0.4,
      frictionAir: 0.006,
      density: 0.001,
      label: 'balon',
      render: { visible: false },
    });
    m.body.setVelocity(body, { x: -4.5, y: -7 });
    m.body.setAngularVelocity(body, -0.2);
    b.body = body;
    b.img = svgImage(this.scene, x, y, 'balon').setDepth(1);
    b.state = 'active';
    b.timer = 7000;
    this.scene.events.emit('balon');
  }

  removeBall(b) {
    if (b.body) this.scene.matter.world.remove(b.body);
    if (b.img) b.img.destroy();
    b.state = 'done';
  }

  // ---------- vehículos lentos (camioneta del gas, tamalero, tráiler) ----------

  spawnTruck(p) {
    const v = VEHICLES[p.kind] || VEHICLES.camioneta;
    const y = this.road.surfaceYAt(p.x);
    if (y === null) return;
    const angle = Math.atan(this.road.slopeAt(p.x));
    const body = this.trapezoid(p.x, y, angle, v, p.kind);
    const img = svgImage(this.scene, p.x, y, v.img).setOrigin(0.5, v.originY).setRotation(angle).setDepth(-0.2);
    this.trucks.push({ body, img, x: p.x, kind: p.kind, v });
    this.scene.events.emit(`${p.kind}-appear`);
  }

  moveTruck(t) {
    const m = this.scene.matter;
    const v = t.v;
    t.x += v.speed;
    const y = this.road.surfaceYAt(t.x);
    if (y === null) return;
    const angle = Math.atan(this.road.slopeAt(t.x));
    const c = m.vertices.centre([
      { x: -v.width / 2, y: 0 },
      { x: -v.width / 2 + v.ramp, y: -v.height },
      { x: v.width / 2 - v.ramp, y: -v.height },
      { x: v.width / 2, y: 0 },
    ]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    m.body.setPosition(t.body, { x: t.x + c.x * cos - c.y * sin, y: y + c.x * sin + c.y * cos });
    m.body.setAngle(t.body, angle);
    t.img.setPosition(t.x, y).setRotation(angle);
    // salto sobre el vehículo: el carrito pasa por arriba sin tocarlo
    if (!t.jumped && this.cart.x > t.x + v.width / 2 && !this.cart.grounded) {
      t.jumped = true;
      this.saltos += 1;
      this.scene.events.emit('vehiculo-saltado', t.kind, v.bonus);
    }
    if (this.cart.x > t.x + v.width / 2) t.jumped = true;
  }

  removeTruck(t) {
    this.scene.matter.world.remove(t.body);
    t.img.destroy();
  }

  // ---------- perros y doñas ----------

  /** Distancia a la que "sale" según la velocidad actual: llega justo cuando estás por pasar. */
  crosserTrigger(kind) {
    const pxPerSec = Math.max(0, this.cart.speedX) * 60;
    const secs = (CROSSER.warnMs + 0.35 * CROSSER.roadMs[kind]) / 1000;
    return Phaser.Math.Clamp(pxPerSec * secs, CROSSER.triggerMin, CROSSER.triggerMax);
  }

  /** Aparece en la banqueta con el "!": todavía no estorba. */
  activateCrosser(p) {
    const h = p.kind === 'perro' ? 24 : 60;
    const lift = h / 2 + 2;
    p.roadX = p.x - p.n.x * lift;
    p.roadY = p.y - p.n.y * lift;
    p.h = h;
    const sx = p.x - p.n.x * (lift + 14);
    const sy = p.y - p.n.y * (lift + 14);
    p.img = svgImage(this.scene, sx, sy, p.kind)
      .setOrigin(0.5, p.kind === 'perro' ? 0.75 : 0.95)
      .setRotation(p.angle)
      .setDepth(-45)
      .setScale(0.92 / SVG_SCALE);
    p.tween = this.scene.tweens.add({ targets: p.img, y: sy - 4, duration: p.kind === 'perro' ? 110 : 180, yoyo: true, repeat: -1 });
    p.label = this.scene.add
      .text(sx, sy - (p.kind === 'perro' ? 52 : 92), '!', {
        fontFamily: 'Fredoka, Arial',
        fontSize: '40px',
        color: '#ff3b3b',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(-2);
    p.state = 'warn';
    p.timer = CROSSER.warnMs;
    this.scene.events.emit('crosser-appear', p.kind);
  }

  /** Baja a la calle: ahora sí estorba. */
  crosserToRoad(p) {
    const m = this.scene.matter;
    const w = p.kind === 'perro' ? 40 : 34;
    p.body = m.add.rectangle(p.roadX, p.roadY, w, p.h, { isStatic: true, isSensor: true, angle: p.angle, label: 'crosser', render: { visible: false } });
    if (p.tween) p.tween.stop();
    p.img.setDepth(-3).setScale(1 / SVG_SCALE);
    p.tween = this.scene.tweens.add({ targets: p.img, x: p.roadX, y: p.roadY, duration: 160, ease: 'Sine.easeOut' });
    p.state = 'road';
    p.timer = CROSSER.roadMs[p.kind];
  }

  /** Terminó de cruzar sin que lo tocaras: se va por delante de la calle. */
  crosserLeave(p) {
    if (p.body) this.scene.matter.world.remove(p.body);
    p.body = null;
    if (p.label) p.label.destroy();
    p.label = null;
    if (p.tween) p.tween.stop();
    p.img.setDepth(1);
    p.tween = this.scene.tweens.add({ targets: p.img, y: p.roadY + 26, alpha: 0, scale: 1.08 / SVG_SCALE, duration: CROSSER.leaveMs, ease: 'Sine.easeIn' });
    p.state = 'leave';
    p.timer = CROSSER.leaveMs;
    this.dodged++;
    this.scene.events.emit('crosser-dodged', p.kind);
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
        if (p && p.state === 'road') this.hitCrosser(p);
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
      } else if (label === 'balon') {
        const now = this.scene.time.now;
        if (now - this.lastBallAt > 600) {
          this.lastBallAt = now;
          this.elotes.shake(3);
          this.scene.events.emit('balon-hit');
        }
      } else if (label === 'road' && this.puddles.has(other)) {
        const now = this.scene.time.now;
        if (now - this.lastPuddleAt > 900 && Math.abs(this.cart.speedX) > 2) {
          this.lastPuddleAt = now;
          this.scene.events.emit('charco', { x: other.position.x, y: other.position.y - 12 });
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
      const slow = Math.abs(this.cart.speedX) < ZONE.slowSpeed;
      if (z.kind !== 'cholo') {
        if (slow) this.triggerZone(z);
        continue;
      }
      // el cholo necesita que vayas lento un rato: un frenón y arrancón te salva
      const now = this.scene.time.now;
      if (!slow) {
        z.slowSince = 0;
        continue;
      }
      if (!z.slowSince) z.slowSince = now;
      if (now - z.slowSince >= PEOPLE.choloSlowMs) this.triggerZone(z);
    }
  }

  triggerZone(z) {
    z.done = true;
    if (z.kind === 'cholo') {
      // nunca se lleva el último elote
      const n = Math.min(this.elotes.count - 1, this.road.rnd.frac() < 0.5 ? 1 : 2);
      if (n <= 0) {
        z.bubble.setText('¡Ni uno!');
        return;
      }
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
    this.balls = this.balls.filter((b) => !(b.chunk === chunk && b.state === 'waiting'));
    for (const b of chunk.bodies) {
      this.puddles.delete(b);
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
      if (p.state === 'waiting') {
        if (cx > p.x - this.crosserTrigger(p.kind)) this.activateCrosser(p);
        continue;
      }
      if (p.state === 'done') continue;
      p.timer -= deltaMs;
      if (p.label) p.label.setVisible(Math.floor(p.timer / 150) % 2 === 0);
      if (p.timer > 0) continue;
      if (p.state === 'warn') this.crosserToRoad(p);
      else if (p.state === 'road') this.crosserLeave(p);
      else this.removeCrosser(p);
    }
    this.crossers = this.crossers.filter((p) => p.state !== 'done');

    // el cholo te ve venir y avisa
    for (const z of this.zones.values()) {
      if (z.kind !== 'cholo' || z.warned || z.done || cx < z.x - PEOPLE.choloWarnPx) continue;
      z.warned = true;
      z.bubble.setText('¡Órale, elotes!').setScale(0);
      this.scene.tweens.add({ targets: z.bubble, scale: 1, duration: 220, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: z.img, y: z.img.y - 10, duration: 140, yoyo: true, repeat: 1 });
      this.scene.events.emit('cholo-warn');
    }

    for (const b of this.balls) {
      if (b.state === 'waiting' && cx > b.x - BALON.triggerDistance) this.kickBall(b);
      else if (b.state === 'active') {
        b.timer -= deltaMs;
        b.img.setPosition(b.body.position.x, b.body.position.y).setRotation(b.body.angle);
        if (b.timer <= 0 || cx - b.body.position.x > 700 || b.body.position.y > cx + 3000) this.removeBall(b);
      }
    }
    this.balls = this.balls.filter((b) => b.state !== 'done');

    this.pendingTrucks = this.pendingTrucks.filter((t) => {
      if (cx > t.x - (VEHICLES[t.kind] || CAMIONETA).triggerDistance) {
        this.spawnTruck(t);
        return false;
      }
      return true;
    });
    this.trucks = this.trucks.filter((t) => {
      this.moveTruck(t);
      if (cx - t.x > t.v.cleanupBehind) {
        this.removeTruck(t);
        return false;
      }
      return true;
    });
  }

  destroy() {
    for (const b of this.balls) if (b.state === 'active') this.removeBall(b);
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.events.off('chunk-destroyed', this.onChunkDestroyed, this);
    this.scene.matter.world.off('collisionstart', this.onCollisionStart, this);
    this.scene.matter.world.off('collisionactive', this.onCollisionActive, this);
    this.crossers.forEach((p) => this.removeCrosser(p));
    this.trucks.forEach((t) => this.removeTruck(t));
    this.pickups.forEach((pk) => pk.tween.stop());
  }
}
