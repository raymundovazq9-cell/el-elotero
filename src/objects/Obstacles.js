import Phaser from 'phaser';
import { labelOf } from './EloteManager.js';
import { svgImage } from '../assets.js';

const COLOR_PERRO = 0x8b5a2b;
const COLOR_COCHE = 0x3a6fd8;

export const PERRO = {
  width: 40,
  height: 24,
  triggerDistance: 460, // px por delante del carrito para que "salga" el perro
  lifetimeMs: 1800, // tiempo que tarda en cruzar
  slowFactor: 0.22,
  shake: 7,
};

export const COCHE = {
  width: 150,
  height: 34,
  ramp: 55,
};

/**
 * Obstáculos "vivos": perros que cruzan la calle durante un instante y
 * coches estacionados (lomos grandes) sobre la calle.
 */
export default class Obstacles {
  constructor(scene, cart, road, elotes) {
    this.scene = scene;
    this.cart = cart;
    this.road = road;
    this.elotes = elotes;
    this.perros = []; // { x, y, n, body, label, state, timer }
    this.hits = 0;

    scene.events.on('chunk', this.onChunk, this);
    scene.events.on('chunk-destroyed', this.onChunkDestroyed, this);
    scene.matter.world.on('collisionstart', this.onCollision, this);
  }

  onChunk(chunk) {
    const rnd = this.road.rnd;
    for (const s of chunk.spots) {
      if (s.used) continue;
      const meters = this.road.metersAt(s.x);
      const diff = this.scene.difficultyAt(meters);
      const roll = rnd.frac();
      if (roll < diff.cocheChance && s.len >= COCHE.width + 20) {
        s.used = true;
        this.addCoche(chunk, s);
      } else if (roll < diff.cocheChance + diff.perroChance) {
        s.used = true;
        this.perros.push({ x: s.x, y: s.y, n: s.n, angle: s.angle, chunk, state: 'waiting', timer: 0 });
      }
    }
  }

  onChunkDestroyed(chunk) {
    this.perros = this.perros.filter((p) => {
      if (p.chunk !== chunk) return true;
      this.removePerro(p);
      return false;
    });
  }

  addCoche(chunk, s) {
    const m = this.scene.matter;
    const w = COCHE.width;
    const h = COCHE.height;
    const r = COCHE.ramp;
    const local = [
      { x: -w / 2, y: 0 },
      { x: -w / 2 + r, y: -h },
      { x: w / 2 - r, y: -h },
      { x: w / 2, y: 0 },
    ];
    const c = m.vertices.centre(local);
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const x = s.x + c.x * cos - c.y * sin;
    const y = s.y + c.x * sin + c.y * cos;
    const body = m.add.fromVertices(x, y, local, {
      isStatic: true,
      angle: s.angle,
      friction: 0.8,
      label: 'coche',
      render: { fillColor: COLOR_COCHE, lineColor: 0x1d3f8a },
    });
    chunk.bodies.push(body);
    const img = svgImage(this.scene, s.x, s.y, 'coche').setOrigin(0.5, 0.93).setRotation(s.angle).setDepth(-4);
    chunk.extras = chunk.extras || [];
    chunk.extras.push(img);
  }

  activatePerro(p) {
    const m = this.scene.matter;
    const lift = PERRO.height / 2 + 2;
    const x = p.x - p.n.x * lift;
    const y = p.y - p.n.y * lift;
    p.body = m.add.rectangle(x, y, PERRO.width, PERRO.height, {
      isStatic: true,
      isSensor: true,
      angle: p.angle,
      label: 'perro',
      render: { fillColor: COLOR_PERRO, lineColor: 0x4a2e12 },
    });
    p.img = svgImage(this.scene, x, y, 'perro').setOrigin(0.5, 0.75).setRotation(p.angle).setDepth(-3);
    p.tween = this.scene.tweens.add({ targets: p.img, y: y - 5, duration: 110, yoyo: true, repeat: -1 });
    p.label = this.scene.add
      .text(x, y - 52, '!', { fontFamily: 'Fredoka, Arial', fontSize: '40px', color: '#ff3b3b', stroke: '#000', strokeThickness: 5 })
      .setOrigin(0.5);
    p.state = 'active';
    p.timer = PERRO.lifetimeMs;
    this.scene.events.emit('perro-appear', p);
  }

  removePerro(p) {
    if (p.body) this.scene.matter.world.remove(p.body);
    if (p.label) p.label.destroy();
    if (p.tween) p.tween.stop();
    if (p.img) p.img.destroy();
    p.body = null;
    p.label = null;
    p.img = null;
    p.state = 'done';
  }

  onCollision(event) {
    for (const pair of event.pairs) {
      const la = labelOf(pair.bodyA);
      const lb = labelOf(pair.bodyB);
      const perroBody = la === 'perro' ? pair.bodyA : lb === 'perro' ? pair.bodyB : null;
      if (!perroBody) continue;
      const other = perroBody === pair.bodyA ? lb : la;
      if (other !== 'cart' && other !== 'wheel') continue;
      const p = this.perros.find((q) => q.body === perroBody);
      if (!p || p.state !== 'active') continue;
      this.hitPerro(p);
    }
  }

  hitPerro(p) {
    const m = this.scene.matter.body;
    const bodies = [this.cart.chassis, ...this.cart.wheels];
    for (const b of bodies) {
      m.setVelocity(b, { x: b.velocity.x * PERRO.slowFactor, y: b.velocity.y * PERRO.slowFactor });
    }
    this.elotes.shake(PERRO.shake);
    this.hits++;
    this.removePerro(p);
    this.scene.events.emit('perro-hit');
  }

  update(deltaMs) {
    const cx = this.cart.x;
    for (const p of this.perros) {
      if (p.state === 'waiting' && cx > p.x - PERRO.triggerDistance) {
        this.activatePerro(p);
      } else if (p.state === 'active') {
        p.timer -= deltaMs;
        if (p.label) p.label.setVisible(Math.floor(p.timer / 150) % 2 === 0);
        if (p.timer <= 0) this.removePerro(p);
      }
    }
    this.perros = this.perros.filter((p) => p.state !== 'done');
  }

  destroy() {
    this.scene.events.off('chunk', this.onChunk, this);
    this.scene.events.off('chunk-destroyed', this.onChunkDestroyed, this);
    this.scene.matter.world.off('collisionstart', this.onCollision, this);
    this.perros.forEach((p) => this.removePerro(p));
  }
}
