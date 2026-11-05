/** Partículas del juego: polvo al frenar, chispas en golpes y puf de elote caído. */
export default class Particles {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    this.makeTexture('polvo', 0xcfc5ad, 7);
    this.makeTexture('chispa', 0xf7c948, 4);
    this.makeTexture('eloteBit', 0xf5d547, 4);
    this.makeTexture('flama', 0xff7a1a, 6);

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

    this.dust = scene.add.particles(0, 0, 'polvo', {
      speedX: { min: -60, max: -20 },
      speedY: { min: -50, max: -10 },
      scale: { start: 0.7, end: 1.8 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 500,
      frequency: 40,
      quantity: 1,
      emitting: false,
    });
    this.dust.setDepth(0.6);

    this.sparks = scene.add.particles(0, 0, 'chispa', {
      speed: { min: 80, max: 220 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      lifespan: 350,
      gravityY: 600,
      emitting: false,
    });
    this.sparks.setDepth(2);

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
    scene.events.on('perro-hit', this.onPerro, this);
    scene.events.on('dona-hit', this.onPerro, this);
    scene.events.on('cable-hit', this.onCable, this);
  }

  onCable(pos) {
    if (pos) this.sparks.emitParticleAt(pos.x, pos.y, 16);
    this.scene.cameras.main.shake(180, 0.008);
  }

  makeTexture(key, color, r) {
    if (this.scene.textures.exists(key)) return;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  onBump() {
    const w = this.cart.wheels[1];
    this.sparks.emitParticleAt(w.position.x, w.position.y + 10, 8);
    this.scene.cameras.main.shake(90, 0.004);
  }

  onEloteLost(count, pos) {
    if (pos) this.puff.emitParticleAt(pos.x, pos.y, 10);
  }

  onPerro() {
    this.scene.cameras.main.shake(220, 0.012);
  }

  update(pot = null, boosting = false) {
    if (pot) this.flames.setPosition(pot.x, pot.y - 6);
    if (boosting && !this.flames.emitting) this.flames.start();
    if (!boosting && this.flames.emitting) this.flames.stop();
    const rear = this.cart.wheels[0];
    this.dust.setPosition(rear.position.x - 6, rear.position.y + 12);
    const should = this.cart.braking && this.cart.grounded && Math.abs(this.cart.speedX) > 3.5;
    if (should && !this.dust.emitting) this.dust.start();
    if (!should && this.dust.emitting) this.dust.stop();
  }

  destroy() {
    this.scene.events.off('bump', this.onBump, this);
    this.scene.events.off('elote-lost', this.onEloteLost, this);
    this.scene.events.off('perro-hit', this.onPerro, this);
    this.scene.events.off('dona-hit', this.onPerro, this);
    this.scene.events.off('cable-hit', this.onCable, this);
    this.flames.destroy();
    this.dust.destroy();
    this.sparks.destroy();
    this.puff.destroy();
  }
}
