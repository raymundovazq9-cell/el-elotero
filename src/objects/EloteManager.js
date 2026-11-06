import { ELOTES } from '../config.js';
import { DEBUG } from '../debug.js';

const COLOR_ELOTE = 0xf5d547;
const COLOR_ELOTE_LINE = 0xb08a00;
const COLOR_PICKUP = 0xfff3b0;

/** Posición local (en el marco del carrito) del elote número i para una caja dada. */
export function slotLocalFor(spec, i) {
  const inner = (spec.boxWidth || spec.bodyWidth) - spec.wallThickness * 2 - 4;
  const perRow = Math.max(1, Math.floor(inner / (ELOTES.width + 3)));
  const row = Math.floor(i / perRow);
  const col = i % perRow;
  const spacing = ELOTES.width + 3;
  const x = (spec.boxX || 0) + (col - (perRow - 1) / 2) * spacing + (row % 2 ? 6 : 0);
  const y = -(spec.bodyHeight / 2 + ELOTES.height / 2 + 1) - row * (ELOTES.height + 1);
  return { x, y };
}

/** Devuelve la etiqueta útil de un cuerpo (o de su compuesto padre). */
export function labelOf(body) {
  if (!body) return '';
  if (body.label && body.label !== 'Body') return body.label;
  return body.parent && body.parent !== body ? body.parent.label : body.label;
}

/**
 * Maneja los elotes que van en el carrito (cuerpos dinámicos), los que se
 * caen y los que se pueden recoger en la calle (sensores estáticos).
 */
export default class EloteManager {
  constructor(scene, cart, road, opts = {}) {
    this.scene = scene;
    this.cart = cart;
    this.road = road;
    this.elotes = [];
    this.pickups = new Set();
    this.lost = 0;
    this.picked = 0;
    this.maxCount = opts.max ?? ELOTES.max;
    this.shakeFactor = opts.shakeFactor ?? 1;

    const start = DEBUG.startElotes ?? opts.start ?? ELOTES.start;
    for (let i = 0; i < start; i++) this.spawnInCart(i);

    scene.events.on('chunk', this.onChunk, this);
    scene.matter.world.on('collisionstart', this.onCollision, this);
  }

  get count() {
    return this.elotes.length;
  }

  slotLocal(i) {
    return slotLocalFor(this.cart.spec, i);
  }

  /** Cuerpo de un elote suelto: rectángulo con esquinas redondeadas que rueda y se tumba. */
  makeEloteBody(x, y) {
    const body = this.scene.matter.add.rectangle(x, y, ELOTES.width, ELOTES.height, {
      chamfer: { radius: 5 },
      density: ELOTES.density,
      friction: ELOTES.friction,
      frictionStatic: 1.2,
      frictionAir: ELOTES.frictionAir,
      restitution: ELOTES.restitution,
      label: 'elote',
      render: { fillColor: COLOR_ELOTE, lineColor: COLOR_ELOTE_LINE },
    });
    const v = this.cart.chassis.velocity;
    this.scene.matter.body.setVelocity(body, { x: v.x, y: v.y });
    this.scene.matter.body.setAngle(body, this.cart.chassis.angle);
    return body;
  }

  toWorld(local) {
    const b = this.cart.chassis;
    const cos = Math.cos(b.angle);
    const sin = Math.sin(b.angle);
    return {
      x: b.position.x + local.x * cos - local.y * sin,
      y: b.position.y + local.x * sin + local.y * cos,
    };
  }

  spawnInCart(i) {
    const p = this.toWorld(this.slotLocal(i));
    const body = this.makeEloteBody(p.x, p.y);
    this.elotes.push(body);
    return body;
  }

  /** Coloca elotes recogibles: arcos en las crestas y algunos sueltos en tramos libres. */
  onChunk(chunk) {
    const rnd = this.road.rnd;
    for (const a of chunk.arcs || []) this.addPickup(chunk, a.x, a.y);
    for (const s of chunk.spots) {
      if (s.used) continue;
      const meters = this.road.metersAt(s.x);
      if (meters < 20) continue;
      const diff = this.scene.difficultyAt(meters);
      if (rnd.frac() > diff.eloteChance) continue;
      s.used = true;
      const lift = 26;
      this.addPickup(chunk, s.x - s.n.x * lift, s.y - s.n.y * lift);
    }
  }

  addPickup(chunk, x, y) {
    const body = this.scene.matter.add.circle(x, y, ELOTES.radius + 3, {
      isStatic: true,
      isSensor: true,
      label: 'pickup',
      render: { fillColor: COLOR_PICKUP, lineColor: COLOR_ELOTE_LINE },
    });
    chunk.bodies.push(body);
    this.pickups.add(body);
    return body;
  }

  onCollision(event) {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const la = labelOf(a);
      const lb = labelOf(b);
      let pickup = null;
      let other = '';
      if (la === 'pickup') {
        pickup = a;
        other = lb;
      } else if (lb === 'pickup') {
        pickup = b;
        other = la;
      }
      if (!pickup || !this.pickups.has(pickup)) continue;
      if (other !== 'cart' && other !== 'wheel') continue;
      this.collect(pickup);
    }
  }

  /** Elote recogido: va al banco (moneda). */
  collect(pickup) {
    this.pickups.delete(pickup);
    this.scene.matter.world.remove(pickup);
    this.picked++;
    this.scene.events.emit('elote-picked', { x: pickup.position.x, y: pickup.position.y });
  }

  /** Mete un elote suelto nuevo al carrito (vida extra). Devuelve false si está lleno. */
  addToCart() {
    if (this.count >= this.maxCount) return false;
    const spec = this.cart.spec;
    const local = { x: spec.boxX || 0, y: -(spec.bodyHeight / 2 + spec.wallHeight + ELOTES.height + 6) };
    const p = this.toWorld(local);
    const body = this.makeEloteBody(p.x, p.y);
    this.elotes.push(body);
    this.scene.events.emit('elote-added', this.count);
    return true;
  }

  /** Quita un elote suelto (venta o robo). Devuelve su posición o null. */
  removeOne() {
    const e = this.elotes.pop();
    if (!e) return null;
    const pos = { x: e.position.x, y: e.position.y };
    this.scene.matter.world.remove(e);
    return pos;
  }

  /** Marca como perdidos los elotes que se alejaron del carrito. */
  update() {
    const c = this.cart.chassis.position;
    for (let i = this.elotes.length - 1; i >= 0; i--) {
      const e = this.elotes[i];
      const dx = e.position.x - c.x;
      const dy = e.position.y - c.y;
      const far = dx * dx + dy * dy > ELOTES.lostDistance * ELOTES.lostDistance;
      const below = e.position.y > c.y + 260;
      if (far || below) {
        const pos = { x: e.position.x, y: e.position.y };
        this.elotes.splice(i, 1);
        this.scene.matter.world.remove(e);
        this.lost++;
        this.scene.events.emit('elote-lost', this.count, pos);
      }
    }
  }

  /** Frena los elotes junto con el carrito (al chocar con la doña o el perro). */
  scaleVelocity(k) {
    const m = this.scene.matter.body;
    for (const e of this.elotes) m.setVelocity(e, { x: e.velocity.x * k, y: e.velocity.y });
  }

  /** Impulso aleatorio a los elotes (golpes fuertes). */
  shake(strength = 4) {
    const m = this.scene.matter.body;
    strength *= this.shakeFactor;
    for (const e of this.elotes) {
      m.setVelocity(e, {
        x: e.velocity.x + (Math.random() - 0.5) * strength,
        y: e.velocity.y - Math.random() * strength * 0.45,
      });
    }
  }

  destroy() {
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.matter.world.off('collisionstart', this.onCollision, this);
  }
}
