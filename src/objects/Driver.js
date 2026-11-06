import Phaser from 'phaser';

/**
 * Piloto automático: sirve para las pruebas (?auto=1) y para los rivales.
 * En el piso acelera; suelta el gas antes de una cresta si va rápido (según
 * su cautela) y frena en bajadas muy fuertes. En el aire nivela el carrito
 * hacia la pendiente del punto donde va a caer. `reaccion` retrasa las
 * decisiones en ms.
 */
export default class Driver {
  constructor(scene, cart, road, personality = {}) {
    this.scene = scene;
    this.cart = cart;
    this.road = road;
    this.p = { cautela: 0.6, reaccion: 0, ...personality };
    this.queue = []; // decisiones pendientes { at, brake, gas }
    this.current = { brake: false, gas: false };
    this.brakeUntil = 0;
  }

  /** Decisión instantánea según el estado del carrito. */
  think() {
    const c = this.cart;
    const road = this.road;
    const now = this.scene.time.now;
    const x = c.x;
    const vx = c.speedX;

    if (!c.grounded && c.airTotalMs > c.spec.airTiltMin) {
      // nivelar hacia la pendiente del aterrizaje estimado
      const steps = Phaser.Math.Clamp(8 + c.airTotalMs / 60, 8, 30);
      const landX = x + Math.max(2, vx) * steps;
      const target = Math.atan(road.slopeAt(landX));
      const err = Phaser.Math.Angle.Wrap(c.chassis.angle - target);
      if (err < -0.22) return { brake: true, gas: false }; // nariz arriba: freno la baja
      if (err > 0.22) return { brake: false, gas: true }; // nariz abajo: gas la sube
      return { brake: false, gas: false };
    }

    if (now < this.brakeUntil) return { brake: true, gas: false };

    const here = road.slopeAt(x);
    const ahead = road.slopeAt(x + 150);
    const steepAhead = road.slopeAt(x + 80);
    // bajada muy fuerte a toda velocidad: frenada corta
    if (steepAhead > 0.55 && vx > c.spec.maxSpeedX * 0.85 && this.p.cautela > 0.3) {
      this.brakeUntil = now + 250;
      return { brake: true, gas: false };
    }
    // cresta inminente a mucha velocidad: suelta el gas para no salir volando de nariz arriba
    const crest = here < -0.04 && ahead > 0.1;
    if (crest && vx > 12 && this.p.cautela > 0.5) return { brake: false, gas: false };
    return { brake: false, gas: true };
  }

  /** Decisión con retraso de reacción; devuelve { brake, gas }. */
  decide() {
    const d = this.think();
    if (!this.p.reaccion) {
      this.current = d;
      return d;
    }
    const now = this.scene.time.now;
    const last = this.queue[this.queue.length - 1] || this.current;
    if (last.brake !== d.brake || last.gas !== d.gas) this.queue.push({ at: now + this.p.reaccion, ...d });
    while (this.queue.length && this.queue[0].at <= now) this.current = this.queue.shift();
    return this.current;
  }
}
