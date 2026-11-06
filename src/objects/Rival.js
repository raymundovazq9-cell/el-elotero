import Phaser from 'phaser';
import Cart from './Cart.js';
import Driver from './Driver.js';
import CartView from '../views/CartView.js';
import { cartById } from '../data/carts.js';
import { applyUpgrades } from '../data/upgrades.js';
import { CAT } from './collision.js';
import { bodyTexture } from '../paint.js';
import { textStyle, COLORS } from '../theme.js';

const TIP_RESET_MS = 1200;
const STUCK_MS = 2500;

/**
 * Elotero rival de una copa: un Cart con su Driver, que solo choca con el
 * suelo (atraviesa al jugador), con elotes pintados y letrero con su nombre.
 * Si se voltea se endereza solo; si se atora recibe un empujón.
 */
export default class Rival {
  constructor(scene, road, spec, index, x, y) {
    this.scene = scene;
    this.road = road;
    this.spec = spec;
    this.index = index;
    this.cartData = cartById(spec.cartId);
    const up = applyUpgrades(this.cartData.fisica, spec.upgrades);
    const fisica = { ...up.fisica, wheelSpeedMax: up.fisica.wheelSpeedMax * spec.personality.empuje, antiWheelie: 0.9 };
    this.resets = 0;
    this.nudges = 0;
    this.cart = new Cart(scene, x, y, {
      ...fisica,
      filter: { group: -(2 + index), category: CAT.RIVAL, mask: CAT.GROUND },
      silent: true,
    });
    this.driver = new Driver(scene, this.cart, road, spec.personality);
    this.view = new CartView(scene, this.cart, this.cartData.vista, {
      bodyKey: bodyTexture(scene, this.cartData, spec.paint.color),
      calca: spec.paint.calca,
      depth: -2.5,
      rival: true,
      equipped: spec.equipped,
      fakeElotes: up.startElotes,
    });
    this.tag = scene.add
      .text(x, y - 90, spec.name, textStyle(18, COLORS.cremaHex, { strokeThickness: 4 }))
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0.9);
    this.tipMs = 0;
    this.maxX = x;
    this.stuckMs = 0;
    this.clumsyUntil = 0;
    this.nextClumsy = scene.time.now + 4000 + Math.random() * 6000;
    this.finished = false;
    this.finishTime = 0;
    this.boost = 1;
  }

  get x() {
    return this.cart.x;
  }

  get name() {
    return this.spec.name;
  }

  /** Endereza el carrito sobre la calle en su X actual. */
  reset() {
    const m = this.scene.matter.body;
    const x = this.cart.x;
    const gy = this.road.surfaceYAt(x) ?? this.cart.y;
    const y = gy - 60;
    m.setAngle(this.cart.chassis, 0);
    m.setPosition(this.cart.chassis, { x, y });
    m.setVelocity(this.cart.chassis, { x: 0, y: 0 });
    m.setAngularVelocity(this.cart.chassis, 0);
    this.cart.wheels.forEach((w, i) => {
      const ws = this.cart.wheelSpecs[i];
      m.setPosition(w, { x: x + ws.x, y: y + ws.y });
      m.setVelocity(w, { x: 0, y: 0 });
      m.setAngularVelocity(w, 0);
    });
    this.cart.tipped = false;
    this.cart.tipTimer = 0;
    this.tipMs = 0;
    this.stuckMs = 0;
    this.resets += 1;
  }

  nudge() {
    const m = this.scene.matter.body;
    for (const b of [this.cart.chassis, ...this.cart.wheels]) m.setVelocity(b, { x: 6, y: -2 });
    this.stuckMs = 0;
    this.nudges += 1;
  }

  /**
   * @param {number} delta ms
   * @param {boolean} running si la carrera ya arrancó (si no, no pisa pedales)
   * @param {number} playerX para la goma suave
   */
  update(delta, running, playerX) {
    const now = this.scene.time.now;
    const c = this.cart;
    c.groundAngle = Math.atan(this.road.slopeAt(c.x));

    // goma suave: un poco más rápido si va muy atrás, más lento si va muy adelante
    const gap = c.x - playerX;
    this.boost = gap < -500 ? 1.08 : gap > 500 ? 0.94 : 1;
    c.boostUntil = 0;
    c.boostFactor = this.finished ? 0.6 : this.boost;

    let brake = false;
    let gas = false;
    if (running && !this.finished) {
      if (now > this.nextClumsy) {
        this.clumsyUntil = now + 200 + this.spec.personality.torpeza * 300;
        this.nextClumsy = now + 5000 + Math.random() * 6000;
      }
      const d = this.driver.decide();
      brake = d.brake;
      gas = d.gas && now > this.clumsyUntil;
    }
    c.setThrottle(brake ? -1 : gas ? 1 : 0);
    c.update(delta);

    if (c.tipped) {
      this.tipMs += delta;
      if (this.tipMs >= TIP_RESET_MS) this.reset();
    } else this.tipMs = 0;

    if (running && !this.finished) {
      if (c.x > this.maxX + 3) {
        this.maxX = c.x;
        this.stuckMs = 0;
      } else {
        this.stuckMs += delta;
        if (this.stuckMs > STUCK_MS) this.nudge();
      }
    }

    // transparente al encimarse con el jugador
    const near = Math.abs(gap) < 160;
    this.view.setAlpha(near ? 0.55 : 1);
    this.view.sync(delta);
    this.tag.setPosition(c.x, c.y - 92).setAlpha(near ? 0.5 : 0.9);
    c.endStep();
  }

  destroy() {
    this.view.destroy();
    this.cart.destroy();
    this.tag.destroy();
    const w = this.scene.matter.world;
    w.remove(this.cart.chassis);
    this.cart.wheels.forEach((b) => w.remove(b));
  }
}
void Phaser;
