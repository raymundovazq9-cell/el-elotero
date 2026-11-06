import Phaser from 'phaser';
import { CART } from '../config.js';

const GROUP_CART = -1;
const COLOR_BODY = 0xf2c230;
const COLOR_WALL = 0xd9a520;
const COLOR_WHEEL = 0x333333;

/**
 * Carrito del elotero: chasis compuesto (base + paredes) y ruedas unidas con
 * constraints tipo resorte (suspensión). Manejo tipo Hill Climb: ACELERAR
 * hace girar las ruedas, FRENO las detiene y luego da reversa lenta, y sin
 * pedal el carrito rueda libre (puede pararse o regresarse en una subida).
 * En el aire, ACELERAR levanta la nariz y FRENO la baja.
 */
export default class Cart {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [spec] parámetros físicos (por defecto CART de config.js)
   */
  constructor(scene, x, y, spec = CART) {
    this.scene = scene;
    this.spec = { ...CART, ...spec };
    this.baseWallHeight = spec.baseWallHeight ?? this.spec.wallHeight;
    const m = scene.matter;
    const c = this.spec;

    const base = m.bodies.rectangle(0, 0, c.bodyWidth, c.bodyHeight, {
      density: c.density,
      label: 'cart',
      render: { fillColor: COLOR_BODY, lineColor: 0x6b4a00 },
    });
    const wallY = -(c.bodyHeight / 2 + c.wallHeight / 2) + 2;
    const boxX = c.boxX || 0;
    const boxW = c.boxWidth || c.bodyWidth;
    const wallX = boxW / 2 - c.wallThickness / 2;
    const wallL = m.bodies.rectangle(boxX - wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.25,
      label: 'cart',
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });
    const wallR = m.bodies.rectangle(boxX + wallX, wallY, c.wallThickness, c.wallHeight, {
      density: c.density * 0.25,
      label: 'cart',
      render: { fillColor: COLOR_WALL, lineColor: 0x6b4a00 },
    });

    const filter = c.filter || { group: GROUP_CART };
    this.silent = !!c.silent; // rivales: no emiten eventos de la escena
    this.chassis = m.body.create({
      parts: [base, wallL, wallR],
      friction: 1.2, // alta para que mande la fricción de los elotes (Matter usa el mínimo del par)
      frictionStatic: 1.2,
      frictionAir: 0.006,
      collisionFilter: filter,
      label: 'cart',
      render: { fillColor: COLOR_BODY, lineColor: 0x6b4a00 },
    });
    m.body.setPosition(this.chassis, { x, y });
    m.world.add(this.chassis);

    const wheelSpecs = c.wheels || [
      { x: -c.wheelOffsetX, y: c.wheelOffsetY, r: c.wheelRadius },
      { x: c.wheelOffsetX, y: c.wheelOffsetY, r: c.wheelRadius },
    ];
    this.wheelSpecs = wheelSpecs;
    this.wheels = wheelSpecs.map((ws) => {
      const wheel = m.add.circle(x + ws.x, y + ws.y, ws.r, {
        friction: c.wheelFriction,
        frictionStatic: 1.2,
        density: c.density * 1.6,
        restitution: 0.05,
        collisionFilter: { ...filter },
        label: 'wheel',
        render: { fillColor: COLOR_WHEEL, lineColor: 0x000000 },
      });
      // una sola unión (pivote con algo de resorte) en el centro de la rueda
      m.add.constraint(this.chassis, wheel, 0, c.suspensionStiffness, {
        pointA: { x: ws.x, y: ws.y },
        damping: c.suspensionDamping,
        render: { visible: false },
      });
      return wheel;
    });

    this.braking = false;
    this.throttle = 0; // -1 freno, 0 libre, 1 acelerar
    this.boost = 1; // multiplicador temporal de velocidad (chile)
    this.airMs = 0;
    this.tipTimer = 0;
    this.tipped = false;
    this.grounded = true;
    this.wasGrounded = true;
    this.chassisContact = false;
    this.wheelContacts = new Set(); // índices de las ruedas que tocan el piso
    this.lastVy = 0;
    this.airTotalMs = 0; // tiempo en el aire del salto en curso (para el impacto)
    this.groundLabels = new Set(['road', 'tope', 'coche', 'camioneta', 'poste-caido']);
    scene.matter.world.on('collisionactive', this.onCollisionActive, this);
    scene.matter.world.on('collisionstart', this.onCollisionActive, this);
    scene.matter.world.on('collisionstart', this.onCollisionStart, this);
    this.lastBump = 0;
  }

  isMine(body) {
    return this.wheels.includes(body) || body === this.chassis || body.parent === this.chassis;
  }

  /** Avisa de golpes contra topes/coches (para sonido y vibración), con límite de frecuencia. */
  onCollisionStart(event) {
    const now = this.scene.time.now;
    if (now - this.lastBump < 150) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const mineA = this.isMine(a);
      const mineB = this.isMine(b);
      if (!mineA && !mineB) continue;
      const other = mineA ? b : a;
      if (other.label === 'tope' || other.label === 'coche' || other.label === 'camioneta' || other.label === 'poste-caido') {
        this.lastBump = now;
        if (!this.silent) this.scene.events.emit('bump', other.label);
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
      const chassisA = a === this.chassis || a.parent === this.chassis;
      const chassisB = b === this.chassis || b.parent === this.chassis;
      if (!wheelA && !wheelB && !chassisA && !chassisB) continue;
      const other = wheelA || chassisA ? b : a;
      const label = other.label !== 'Body' ? other.label : other.parent && other.parent.label;
      if (label === 'elote' && (chassisA || chassisB)) {
        this.chassisContact = true; // tirado sobre sus propios elotes
        continue;
      }
      if (!this.groundLabels.has(label)) continue;
      if (wheelA || wheelB) {
        this.grounded = true;
        this.wheelContacts.add(this.wheels.indexOf(wheelA ? a : b));
      } else this.chassisContact = true;
    }
  }

  /** Llamar al final del update de la escena, después de leer `grounded`. */
  endStep() {
    this.wasGrounded = this.grounded;
    this.lastVy = this.chassis.velocity.y;
    this.grounded = false;
    this.chassisContact = false;
    this.wheelContacts.clear();
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
  get speedX() {
    return this.chassis.velocity.x;
  }
  get speed() {
    const v = this.chassis.velocity;
    return Math.hypot(v.x, v.y);
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
    const c = this.spec;
    this.boost = (this.boostUntil && this.scene.time.now < this.boostUntil ? 1.4 : 1) * (this.boostFactor || 1);

    // anti-caballito: con la nariz muy levantada respecto al piso, el empuje baja
    const pitch = this.chassis.angle - (this.groundAngle || 0);
    // (con antiWheelie < 1 el caballito es posible, pero cuesta empuje; pasando 0.8 rad se corta)
    const lift = Phaser.Math.Clamp((-pitch - 0.35) / 0.45, 0, 1);
    const gasFactor = !this.grounded ? 1 : lift >= 1 ? 0 : 1 - c.antiWheelie * lift;

    for (const w of this.wheels) {
      const cur = w.angularVelocity;
      let next = cur;
      if (this.throttle > 0 && gasFactor > 0) {
        const target = c.wheelSpeedMax * this.boost;
        if (cur < target) next = Math.min(target, cur + c.wheelAccel * this.boost * gasFactor);
      } else if (this.throttle < 0) {
        // frena hasta detenerse y luego reversa lenta
        const target = c.wheelSpeedReverse;
        if (cur > target) next = Math.max(target, cur - c.wheelBrakeRate);
      }
      if (next !== cur) m.body.setAngularVelocity(w, next);
    }

    // aterrizaje: avisa con la velocidad vertical que traía (impacto en px/paso)
    if (this.grounded && !this.wasGrounded && this.airTotalMs >= 120) {
      if (!this.silent) this.scene.events.emit('landing', Math.max(0, this.lastVy), this.airTotalMs);
    }
    if (this.grounded) this.airTotalMs = 0;
    else this.airTotalMs += deltaMs;

    // en el aire los pedales inclinan el carrito: acelerar = nariz arriba, freno = nariz abajo
    if (!this.grounded) {
      this.airMs += deltaMs;
      if (this.airMs > c.airTiltMin && this.throttle !== 0) {
        const target = -this.throttle * c.airTilt;
        m.body.setAngularVelocity(this.chassis, Phaser.Math.Linear(this.chassis.angularVelocity, target, 0.18));
      }
    } else {
      this.airMs = 0;
    }

    // velocidad máxima
    const v = this.chassis.velocity;
    if (v.x > c.maxSpeedX) m.body.setVelocity(this.chassis, { x: c.maxSpeedX, y: v.y });

    // volcadura: de cabeza y tocando el piso con el chasis (en el aire se puede dar la vuelta)
    const a = Math.abs(Phaser.Math.Angle.WrapDegrees(this.angleDeg));
    // parado de nariz (o de cabeza) y casi sin moverse también cuenta, aunque solo toque una rueda
    const standing = a > 70 && this.speed < 0.8 && (this.grounded || this.chassisContact);
    // de cabeza tocando el piso con el chasis o con una rueda (tirado de lado sobre sus elotes también cuenta)
    if ((a > c.tipAngleDeg && (this.chassisContact || this.grounded)) || standing) {
      this.tipTimer += deltaMs;
      if (this.tipTimer >= (standing ? c.tipTimeMs * 2.4 : c.tipTimeMs)) this.tipped = true;
    } else {
      this.tipTimer = 0;
    }
  }

  destroy() {
    const w = this.scene.matter.world;
    w.off('collisionactive', this.onCollisionActive, this);
    w.off('collisionstart', this.onCollisionActive, this);
    w.off('collisionstart', this.onCollisionStart, this);
  }
}
