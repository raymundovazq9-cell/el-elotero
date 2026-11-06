import Phaser from 'phaser';
import { SCORE } from '../config.js';

/**
 * Trucos del carrito: saltos largos ('landed'), marometas ('marometa'),
 * caballitos ('caballito'), aterrizajes perfectos ('perfecto') y el combo que
 * multiplica los bonos cuando se encadenan ('combo'). Un golpe, un elote
 * perdido o 2.5 s sin truco rompen el combo.
 */
export default class Tricks {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    this.airMs = 0;
    this.rotation = 0;
    this.prevAngle = cart.chassis.angle;
    this.flips = 0;
    this.combo = 0;
    this.lastTrickAt = -Infinity;
    this.wheelieMs = 0;
    this.wheelieCredited = 0;
    this.wheelies = 0;
    this.perfects = 0;

    scene.events.on('camioneta-saltada', this.onTruckJump, this);
    scene.events.on('bump', this.breakCombo, this);
    scene.events.on('elote-lost', this.breakCombo, this);
    scene.events.on('perro-hit', this.breakCombo, this);
    scene.events.on('dona-hit', this.breakCombo, this);
    scene.events.on('cable-hit', this.breakCombo, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  get airborne() {
    return this.airMs >= SCORE.airMinMs;
  }

  /** Inclinación del carrito respecto al piso (negativo = nariz arriba). */
  get pitch() {
    return this.cart.chassis.angle - (this.cart.groundAngle || 0);
  }

  /** Registra un truco: sube el combo si viene seguido de otro y devuelve el bono multiplicado. */
  trick(kind, base) {
    const now = this.scene.time.now;
    this.combo = now - this.lastTrickAt < SCORE.comboWindowMs ? Math.min(SCORE.comboMax, this.combo + 1) : 1;
    this.lastTrickAt = now;
    const bonus = base * this.combo;
    if (this.combo > 1) this.scene.events.emit('combo', this.combo, kind, bonus);
    return bonus;
  }

  breakCombo() {
    if (this.combo > 1) this.scene.events.emit('combo-roto', this.combo);
    this.combo = 0;
    this.lastTrickAt = -Infinity;
  }

  onTruckJump() {
    const bonus = this.trick('camioneta', SCORE.truckJumpBonus);
    this.scene.events.emit('truco', 'camioneta', bonus);
  }

  update(deltaMs) {
    const c = this.cart;
    const angle = c.chassis.angle;
    const dAngle = Phaser.Math.Angle.Wrap(angle - this.prevAngle);
    this.prevAngle = angle;
    const now = this.scene.time.now;
    if (this.combo > 0 && now - this.lastTrickAt > SCORE.comboWindowMs) this.combo = 0;

    // caballito: solo la rueda trasera en el piso, nariz arriba y avanzando
    const wheelie = c.grounded && c.wheelContacts.size === 1 && c.wheelContacts.has(0) && this.pitch < -SCORE.wheeliePitch && Math.abs(c.speedX) > 2;
    if (wheelie) {
      this.wheelieMs += deltaMs;
      if (this.wheelieMs >= SCORE.wheelieMinMs) {
        const secs = Math.floor((this.wheelieMs - SCORE.wheelieMinMs) / 1000) + 1;
        if (secs > this.wheelieCredited) {
          this.wheelieCredited = secs;
          this.wheelies += 1;
          const bonus = this.trick('caballito', SCORE.wheeliePerSecond);
          this.scene.events.emit('caballito', bonus, this.wheelieMs);
          this.scene.events.emit('truco', 'caballito', bonus);
        }
      }
    } else {
      this.wheelieMs = 0;
      this.wheelieCredited = 0;
    }

    if (!c.grounded) {
      this.airMs += deltaMs;
      this.rotation += dAngle;
      return;
    }
    if (this.airMs >= SCORE.airMinMs && !c.tipped) {
      const flips = Math.floor(Math.abs(this.rotation) / (Math.PI * 2 * SCORE.flipFraction));
      if (flips > 0) {
        this.flips += flips;
        const bonus = this.trick('marometa', flips * SCORE.flipBonus);
        this.scene.events.emit('marometa', flips, bonus, this.rotation < 0 ? 'atras' : 'adelante');
      }
      if (this.airMs >= SCORE.airBonusMinMs) {
        const gained = this.trick('aire', Math.round((this.airMs / 1000) * SCORE.airBonusPerSecond));
        this.scene.events.emit('landed', gained, this.airMs);
        if (Math.abs(this.pitch) < SCORE.perfectPitch) {
          this.perfects += 1;
          const bonus = this.trick('perfecto', SCORE.perfectBonus);
          this.scene.events.emit('perfecto', bonus);
          this.scene.events.emit('truco', 'perfecto', bonus);
        }
      }
    }
    this.airMs = 0;
    this.rotation = 0;
  }

  destroy() {
    const ev = this.scene.events;
    ev.off('camioneta-saltada', this.onTruckJump, this);
    ev.off('bump', this.breakCombo, this);
    ev.off('elote-lost', this.breakCombo, this);
    ev.off('perro-hit', this.breakCombo, this);
    ev.off('dona-hit', this.breakCombo, this);
    ev.off('cable-hit', this.breakCombo, this);
  }
}
