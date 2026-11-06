import Phaser from 'phaser';

const PAPEL_COLORS = [0xe4007c, 0x2e8b57, 0x3a86ff, 0xf7c948];

/** Texturas de partículas generadas por código (una vez por juego). */
export function ensureParticleTextures(scene) {
  const circle = (key, color, r) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  };
  circle('polvo', 0xcfc5ad, 7);
  circle('tierra', 0x8a6a45, 5);
  circle('chispa', 0xf7c948, 4);
  circle('brillo', 0xfff1a8, 3);
  circle('eloteBit', 0xf5d547, 4);
  circle('flama', 0xff7a1a, 6);
  PAPEL_COLORS.forEach((c, i) => {
    const key = `papel-${i}`;
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(c, 1);
    g.fillRect(0, 0, 7, 10);
    g.generateTexture(key, 7, 10);
    g.destroy();
  });
}

/**
 * Lluvia de papel picado en (x, y). Sirve en el mundo o en una escena de UI.
 * Se destruye sola al terminar.
 */
export function confettiBurst(scene, x, y, n = 40, opts = {}) {
  ensureParticleTextures(scene);
  const per = Math.ceil(n / PAPEL_COLORS.length);
  const emitters = PAPEL_COLORS.map((_, i) =>
    scene.add
      .particles(x, y, `papel-${i}`, {
        speed: { min: 120, max: opts.speed || 320 },
        angle: { min: 200, max: 340 },
        gravityY: 500,
        rotate: { start: 0, end: 360 },
        scale: { start: 1, end: 0.6 },
        alpha: { start: 1, end: 0.4 },
        lifespan: { min: 900, max: 1500 },
        emitting: false,
      })
      .setDepth(opts.depth ?? 50)
  );
  emitters.forEach((e) => e.explode(per));
  scene.time.delayedCall(1700, () => emitters.forEach((e) => e.destroy()));
  return emitters;
}

/**
 * Partículas del juego: polvo por derrape y velocidad, tierra al aterrizar,
 * chispas en golpes, brillo al recoger elotes, llamas del chile y puf de elote caído.
 */
export default class Particles {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    ensureParticleTextures(scene);

    this.flames = scene.add.particles(0, 0, 'flama', {
      speedY: { min: -120, max: -200 },
      speedX: { min: -25, max: 25 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 380,
      frequency: 18,
      quantity: 1,
      emitting: false,
    });
    this.flames.setDepth(0.7);

    // polvo de la rueda motriz: sale cuando patina (acelerar, frenar) o a mucha velocidad
    this.dust = scene.add.particles(0, 0, 'polvo', {
      speedX: { min: -70, max: -20 },
      speedY: { min: -60, max: -10 },
      scale: { start: 0.6, end: 1.9 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 550,
      frequency: 40,
      quantity: 1,
      emitting: false,
    });
    this.dust.setDepth(0.6);

    // tierra que salta al aterrizar
    this.dirt = scene.add.particles(0, 0, 'tierra', {
      speed: { min: 60, max: 220 },
      angle: { min: 210, max: 330 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      gravityY: 700,
      emitting: false,
    });
    this.dirt.setDepth(0.65);

    this.sparks = scene.add.particles(0, 0, 'chispa', {
      speed: { min: 80, max: 220 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      lifespan: 350,
      gravityY: 600,
      emitting: false,
    });
    this.sparks.setDepth(2);

    // destello al recoger un elote
    this.glow = scene.add.particles(0, 0, 'brillo', {
      speed: { min: 60, max: 160 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 380,
      emitting: false,
    });
    this.glow.setDepth(3);

    this.puff = scene.add.particles(0, 0, 'eloteBit', {
      speed: { min: 40, max: 140 },
      scale: { start: 1, end: 0 },
      lifespan: 450,
      gravityY: 400,
      emitting: false,
    });
    this.puff.setDepth(2);

    scene.events.on('bump', this.onBump, this);
    scene.events.on('elote-lost', this.onEloteLost, this);
    scene.events.on('elote-picked', this.onPicked, this);
    scene.events.on('landing', this.onLanding, this);
    scene.events.on('checkpoint', this.onCheckpoint, this);
    scene.events.on('perro-hit', this.onPerro, this);
    scene.events.on('dona-hit', this.onPerro, this);
    scene.events.on('cable-hit', this.onCable, this);
  }

  onCable(pos) {
    if (pos) this.sparks.emitParticleAt(pos.x, pos.y, 16);
    this.scene.cameras.main.shake(180, 0.008);
  }

  onBump() {
    const w = this.cart.wheels[1];
    this.sparks.emitParticleAt(w.position.x, w.position.y + 10, 8);
    this.scene.cameras.main.shake(90, 0.004);
  }

  onEloteLost(count, pos) {
    if (pos) this.puff.emitParticleAt(pos.x, pos.y, 10);
  }

  onPicked(pos) {
    if (pos) this.glow.emitParticleAt(pos.x, pos.y, 6);
  }

  onLanding(impact) {
    const n = Phaser.Math.Clamp(Math.round(impact * 1.6), 3, 24);
    for (const w of this.cart.wheels) this.dirt.emitParticleAt(w.position.x, w.position.y + w.circleRadius * 0.8, n);
  }

  onCheckpoint() {
    confettiBurst(this.scene, this.cart.x, this.cart.y - 60, 28, {
      depth: 5,
      speed: 260,
    });
  }

  onPerro() {
    this.scene.cameras.main.shake(220, 0.012);
  }

  /** Cuánto patina la rueda motriz (px/paso): diferencia entre el giro y el avance. */
  slip() {
    const w = this.cart.wheels[0];
    return Math.abs(w.angularVelocity * w.circleRadius - this.cart.speedX);
  }

  update(pot = null, boosting = false) {
    if (pot) this.flames.setPosition(pot.x, pot.y - 6);
    if (boosting && !this.flames.emitting) this.flames.start();
    if (!boosting && this.flames.emitting) this.flames.stop();

    const rear = this.cart.wheels[0];
    this.dust.setPosition(rear.position.x - 6, rear.position.y + rear.circleRadius * 0.7);
    const speed = Math.abs(this.cart.speedX);
    const slip = this.cart.grounded ? this.slip() : 0;
    const fast = this.cart.grounded && speed > 11;
    const should = slip > 2.2 || fast;
    if (should) {
      // más polvo cuanto más patina o más rápido va
      const intensity = Phaser.Math.Clamp(Math.max(slip / 6, (speed - 11) / 8), 0.25, 1);
      this.dust.frequency = 70 - 50 * intensity;
    }
    if (should && !this.dust.emitting) this.dust.start();
    if (!should && this.dust.emitting) this.dust.stop();
  }

  destroy() {
    const ev = this.scene.events;
    ev.off('bump', this.onBump, this);
    ev.off('elote-lost', this.onEloteLost, this);
    ev.off('elote-picked', this.onPicked, this);
    ev.off('landing', this.onLanding, this);
    ev.off('checkpoint', this.onCheckpoint, this);
    ev.off('perro-hit', this.onPerro, this);
    ev.off('dona-hit', this.onPerro, this);
    ev.off('cable-hit', this.onCable, this);
    for (const e of [this.flames, this.dust, this.dirt, this.sparks, this.glow, this.puff]) e.destroy();
  }
}
