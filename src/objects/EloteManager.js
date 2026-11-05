import { ELOTES, CART } from '../config.js';
import { DEBUG } from '../debug.js';

const COLOR_ELOTE = 0xf5d547;
const COLOR_ELOTE_LINE = 0xb08a00;
const COLOR_PICKUP = 0xfff3b0;

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
  constructor(scene, cart, road) {
    this.scene = scene;
    this.cart = cart;
    this.road = road;
    this.elotes = [];
    this.pickups = new Set();
    this.lost = 0;
    this.picked = 0;

    const start = DEBUG.startElotes ?? ELOTES.start;
    for (let i = 0; i < start; i++) this.spawnInCart(i);

    scene.events.on('chunk', this.onChunk, this);
    scene.matter.world.on('collisionstart', this.onCollision, this);
  }

  get count() {
    return this.elotes.length;
  }

  /** Posición local (en el marco del carrito) para el elote número i. */
  slotLocal(i) {
    const r = ELOTES.radius;
    const perRow = 4;
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const spacing = r * 2 + 2;
    const x = (col - (perRow - 1) / 2) * spacing + (row % 2 ? r : 0);
    const y = -(CART.bodyHeight / 2 + r + 1) - row * (r * 2 - 1);
    return { x, y };
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
    const body = this.scene.matter.add.circle(p.x, p.y, ELOTES.radius, {
      density: ELOTES.density,
      friction: ELOTES.friction,
      frictionAir: 0.005,
      restitution: ELOTES.restitution,
      label: 'elote',
      render: { fillColor: COLOR_ELOTE, lineColor: COLOR_ELOTE_LINE },
    });
    const v = this.cart.chassis.velocity;
    this.scene.matter.body.setVelocity(body, { x: v.x, y: v.y });
    this.elotes.push(body);
    return body;
  }

  /** Coloca elotes recogibles en los segmentos libres del tramo nuevo. */
  onChunk(chunk) {
    const rnd = this.road.rnd;
    for (const s of chunk.spots) {
      if (s.used) continue;
      const meters = this.road.metersAt(s.x);
      if (meters < 20) continue;
      const diff = this.scene.difficultyAt(meters);
      if (rnd.frac() > diff.eloteChance) continue;
      s.used = true;
      const lift = 26;
      const body = this.scene.matter.add.circle(s.x - s.n.x * lift, s.y - s.n.y * lift, ELOTES.radius + 2, {
        isStatic: true,
        isSensor: true,
        label: 'pickup',
        render: { fillColor: COLOR_PICKUP, lineColor: COLOR_ELOTE_LINE },
      });
      chunk.bodies.push(body);
      this.pickups.add(body);
    }
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

  collect(pickup) {
    this.pickups.delete(pickup);
    this.scene.matter.world.remove(pickup);
    if (this.count >= ELOTES.max) {
      this.scene.events.emit('elote-full');
      return;
    }
    // aparece arriba del carrito y cae dentro de la caja
    const local = { x: 0, y: -(CART.bodyHeight / 2 + CART.wallHeight + ELOTES.radius + 6) };
    const p = this.toWorld(local);
    const body = this.scene.matter.add.circle(p.x, p.y, ELOTES.radius, {
      density: ELOTES.density,
      friction: ELOTES.friction,
      frictionAir: 0.005,
      restitution: ELOTES.restitution,
      label: 'elote',
      render: { fillColor: COLOR_ELOTE, lineColor: COLOR_ELOTE_LINE },
    });
    const v = this.cart.chassis.velocity;
    this.scene.matter.body.setVelocity(body, { x: v.x, y: v.y });
    this.elotes.push(body);
    this.picked++;
    this.scene.events.emit('elote-picked', this.count);
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

  /** Impulso aleatorio a los elotes (golpes fuertes). */
  shake(strength = 4) {
    const m = this.scene.matter.body;
    for (const e of this.elotes) {
      m.setVelocity(e, {
        x: e.velocity.x + (Math.random() - 0.5) * strength,
        y: e.velocity.y - Math.random() * strength,
      });
    }
  }

  destroy() {
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.matter.world.off('collisionstart', this.onCollision, this);
  }
}
