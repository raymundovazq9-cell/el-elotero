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
      render: { fillColor: COLOR_BODY, lineColor: 0x6b4a00 },
    });
    const wallY = -(c.bodyHeight / 2 + c.wallHeight / 2) + 2;
    const wallX = c.bodyWidth / 2 - c.wallThickness / 2;
    const wallL = m.bodies.rectangle(-wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.5,
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });
    const wallR = m.bodies.rectangle(wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.5,
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });

    this.chassis = m.body.create({
      parts: [base, wallL, wallR],
      friction: 0.3,
      frictionAir: 0.012,
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
        density: c.density * 1.5,
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
    this.tipTimer = 0;
    this.tipped = false;
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
    this.braking = v;
  }

  update(deltaMs) {
    const m = this.scene.matter;
    const c = CART;

    // ruedas: acelerar o frenar
    const target = this.braking ? c.wheelSpeedBrake : c.wheelSpeedMax;
    for (const w of this.wheels) {
      const cur = w.angularVelocity;
      let next;
      if (this.braking) {
        next = cur > target ? Math.max(target, cur - c.wheelBrakeRate) : target;
      } else {
        next = cur < target ? Math.min(target, cur + c.wheelAccel) : cur;
      }
      m.body.setAngularVelocity(w, next);
      w.friction = this.braking ? c.wheelFriction : c.wheelFriction * 0.6;
    }

    // velocidad mínima garantizada / máxima
    const v = this.chassis.velocity;
    if (v.x < c.minSpeedX) {
      m.body.setVelocity(this.chassis, { x: c.minSpeedX, y: v.y });
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
