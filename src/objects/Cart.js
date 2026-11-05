import Phaser from 'phaser';
import { CART } from '../config.js';

const GROUP_CART = -1;
const COLOR_BODY = 0xf2c230;
const COLOR_WALL = 0xd9a520;
const COLOR_WHEEL = 0x333333;

/**
 * Carrito del elotero: chasis compuesto (base + paredes) y dos ruedas unidas
 * con constraints tipo resorte (suspensión).
 */
export default class Cart {
  constructor(scene, x, y) {
    this.scene = scene;
    const m = scene.matter;
    const c = CART;

    const base = m.bodies.rectangle(0, 0, c.bodyWidth, c.bodyHeight, {
      density: c.density,
      label: 'cart',
      render: { fillColor: COLOR_BODY, lineColor: 0x6b4a00 },
    });
    const wallY = -(c.bodyHeight / 2 + c.wallHeight / 2) + 2;
    const wallX = c.bodyWidth / 2 - c.wallThickness / 2;
    const wallL = m.bodies.rectangle(-wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.25,
      label: 'cart',
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });
    const wallR = m.bodies.rectangle(wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.25,
      label: 'cart',
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });

    this.chassis = m.body.create({
      parts: [base, wallL, wallR],
      friction: 0.3,
      frictionAir: 0.008,
      collisionFilter: { group: GROUP_CART },
      label: 'cart',
      render: { fillColor: COLOR_BODY, lineColor: 0x6b4a00 },
    });
    m.body.setPosition(this.chassis, { x, y });
    m.world.add(this.chassis);

    this.wheels = [-1, 1].map((side) => {
      const wx = x + side * c.wheelOffsetX;
      const wy = y + c.wheelOffsetY;
      const wheel = m.add.circle(wx, wy, c.wheelRadius, {
        friction: c.wheelFriction,
        frictionStatic: 1,
        density: c.density * 2.5,
        restitution: 0.05,
        collisionFilter: { group: GROUP_CART },
        label: 'wheel',
        render: { fillColor: COLOR_WHEEL, lineColor: 0x000000 },
      });
      // resorte principal: ancla en el chasis justo arriba de la rueda
      m.add.constraint(this.chassis, wheel, 0, c.suspensionStiffness, {
        pointA: { x: side * c.wheelOffsetX, y: c.wheelOffsetY },
        damping: c.suspensionDamping,
        render: { visible: false },
      });
      // brazo rígido-ish para que la rueda no se vaya hacia adelante/atrás
      const armLen = Math.hypot(c.wheelOffsetX * 1.4, c.wheelOffsetY);
      m.add.constraint(this.chassis, wheel, armLen, 0.9, {
        pointA: { x: -side * c.wheelOffsetX * 0.4, y: 0 },
        damping: 0.05,
        render: { visible: false },
      });
      return wheel;
    });

    this.braking = false;
    this.throttle = 0; // -1 freno, 0 libre, 1 acelerar
    this.airMs = 0;
    this.tipTimer = 0;
    this.tipped = false;
    this.grounded = true;
    this.groundLabels = new Set(['road', 'tope', 'coche']);
    scene.matter.world.on('collisionactive', this.onCollisionActive, this);
    scene.matter.world.on('collisionstart', this.onCollisionActive, this);
    scene.matter.world.on('collisionstart', this.onCollisionStart, this);
    this.lastBump = 0;
  }

  /** Avisa de golpes contra topes/coches (para sonido y vibración), con límite de frecuencia. */
  onCollisionStart(event) {
    const now = this.scene.time.now;
    if (now - this.lastBump < 150) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const mine = this.wheels.includes(a) || this.wheels.includes(b) || a.parent === this.chassis || b.parent === this.chassis;
      if (!mine) continue;
      const other = this.wheels.includes(a) || a.parent === this.chassis ? b : a;
      if (other.label === 'tope' || other.label === 'coche') {
        this.lastBump = now;
        this.scene.events.emit('bump', other.label);
        return;
      }
    }
  }

  /** Marca contacto con el piso si alguna rueda toca calle/tope/coche. */
  onCollisionActive(event) {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const wheelA = this.wheels.includes(a);
      const wheelB = this.wheels.includes(b);
      if (!wheelA && !wheelB) continue;
      const other = wheelA ? b : a;
      const label = other.label !== 'Body' ? other.label : other.parent && other.parent.label;
      if (this.groundLabels.has(label)) {
        this.grounded = true;
        return;
      }
    }
  }

  /** Llamar al final del update de la escena, después de leer `grounded`. */
  endStep() {
    this.grounded = false;
  }

  get x() {
    return this.chassis.position.x;
  }
  get y() {
    return this.chassis.position.y;
  }
  get angleDeg() {
    return Phaser.Math.RadToDeg(this.chassis.angle);
  }

  setBraking(v) {
    this.setThrottle(v ? -1 : this.throttle === -1 ? 0 : this.throttle);
  }

  /** -1 = freno, 0 = rueda libre, 1 = acelerar. */
  setThrottle(t) {
    this.throttle = Math.sign(t);
    this.braking = this.throttle < 0;
  }

  update(deltaMs) {
    const m = this.scene.matter;
    const c = CART;

    // ruedas: frenar, acelerar o rodar libres
    for (const w of this.wheels) {
      const cur = w.angularVelocity;
      let next = cur;
      if (this.throttle < 0) {
        const target = c.wheelSpeedBrake;
        next = cur > target ? Math.max(target, cur - c.wheelBrakeRate) : target;
      } else if (this.throttle > 0) {
        const target = c.wheelSpeedMax;
        next = cur < target ? Math.min(target, cur + c.wheelAccel * 1.5) : cur;
      } else {
        // rueda libre: la bajada lo lleva poco a poco a la velocidad de crucero
        const target = c.wheelSpeedCoast;
        if (cur < target) next = Math.min(target, cur + c.wheelAccel * 0.6);
        else if (cur > target + 0.05) next = Math.max(target, cur - c.wheelAccel * 0.3);
      }
      if (next !== cur) m.body.setAngularVelocity(w, next);
      w.friction = this.braking ? c.wheelFriction : c.wheelFriction * 0.6;
    }

    // en el aire los pedales inclinan el carrito
    if (!this.grounded) {
      this.airMs += deltaMs;
      if (this.airMs > c.airTiltMin && this.throttle !== 0) {
        const target = this.throttle * c.airTilt;
        m.body.setAngularVelocity(this.chassis, Phaser.Math.Linear(this.chassis.angularVelocity, target, 0.2));
      }
    } else {
      this.airMs = 0;
    }

    // velocidad mínima garantizada / máxima
    const v = this.chassis.velocity;
    if (v.x < c.minSpeedX) {
      m.body.setVelocity(this.chassis, { x: c.minSpeedX, y: v.y });
      for (const w of this.wheels) {
        if (w.velocity.x < c.minSpeedX) m.body.setVelocity(w, { x: c.minSpeedX, y: w.velocity.y });
      }
    } else if (v.x > c.maxSpeedX) {
      m.body.setVelocity(this.chassis, { x: c.maxSpeedX, y: v.y });
    }

    // volcadura
    const a = Math.abs(Phaser.Math.Angle.WrapDegrees(this.angleDeg));
    if (a > c.tipAngleDeg) {
      this.tipTimer += deltaMs;
      if (this.tipTimer >= c.tipTimeMs) this.tipped = true;
    } else {
      this.tipTimer = 0;
    }
  }

  get speedX() {
    return this.chassis.velocity.x;
  }
}
