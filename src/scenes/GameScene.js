import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PX_PER_METER, SCORE } from '../config.js';
import Road from '../objects/Road.js';
import Cart from '../objects/Cart.js';
import EloteManager from '../objects/EloteManager.js';
import Obstacles from '../objects/Obstacles.js';
import { difficultyAt } from '../objects/Difficulty.js';
import { DEBUG, isBrakeScripted, isGasScripted } from '../debug.js';
import { Sfx, vibrate, unlockAudio } from '../audio.js';
import { Music } from '../music.js';
import CartView from '../views/CartView.js';
import RoadView from '../views/RoadView.js';
import Scenery from '../world/Scenery.js';
import SkyCycle from '../world/SkyCycle.js';
import EloteView from '../views/EloteView.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.cameras.main.setBackgroundColor('#87b7e0');
    this.cameras.main.fadeIn(300);
    this.sky = new SkyCycle(this, { farDay: 'fondo-tarde', farNight: 'fondo-noche' });

    this.startX = 120;
    this.road = new Road(
      this,
      (x) => Math.max(0, (x - this.startX) / PX_PER_METER),
      DEBUG.test ? 'elotero' : undefined,
      new RoadView(this)
    );
    this.scenery = new Scenery(this, this.road);
    this.road.buildStraight(-400, 300, 900, 20);

    this.cart = new Cart(this, this.startX, 440);
    this.elotes = new EloteManager(this, this.cart, this.road);
    this.obstacles = new Obstacles(this, this.cart, this.road, this.elotes);
    this.cartView = new CartView(this, this.cart);
    this.eloteView = new EloteView(this, this.elotes);
    this.bonus = 0;
    this.airTime = 0;
    this.over = false;

    this.events.on('bump', () => {
      Sfx.golpe();
      vibrate(25);
    });
    this.events.on('elote-lost', () => {
      Sfx.eloteCaido();
      vibrate(45);
    });
    this.events.on('elote-picked', () => Sfx.eloteRecogido());
    this.events.on('landed', () => {
      Sfx.aterrizaje();
      vibrate(30);
    });
    this.events.on('perro-hit', () => {
      Sfx.perro();
      vibrate([60, 40, 80]);
    });
    this.events.on('gameover', () => {
      Music.stop();
      Sfx.gameOver();
      vibrate([120, 60, 200]);
    });
    Music.setVolume(0.5);
    Music.start();
    this.time.delayedCall(400, () => Sfx.silbato());
    this.events.on('pause', () => Music.stop());
    this.events.on('resume', () => Music.start());
    this.events.once('shutdown', () => Music.stop());
    this.clacDist = 0;

    this.braking = false;
    this.pedals = { brake: false, gas: false };
    this.input.once('pointerdown', () => unlockAudio());
    this.keys = this.input.keyboard
      ? this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D' })
      : null;
    const onBlur = () => this.setPedals(false, false);
    this.game.events.on('blur', onBlur);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', onBlur);
      this.elotes.destroy();
      this.obstacles.destroy();
      this.cartView.destroy();
      this.eloteView.destroy();
      this.scenery.destroy();
      this.sky.destroy();
    });

    this.scene.launch('UI');

    const cam = this.cameras.main;
    cam.scrollX = this.cart.x - GAME_WIDTH * 0.3;
    cam.scrollY = this.cart.y - GAME_HEIGHT * 0.35;
  }

  /** Estado de los pedales (desde la UI, el teclado o el modo de prueba). */
  setPedals(brake, gas) {
    if (this.over) {
      brake = false;
      gas = false;
    }
    this.pedals.brake = brake;
    this.pedals.gas = gas;
    // si se pisan ambos, manda el freno
    const throttle = brake ? -1 : gas ? 1 : 0;
    this.braking = throttle < 0;
    this.cart.setThrottle(throttle);
  }

  setBraking(v) {
    this.setPedals(v, this.pedals.gas);
  }

  difficultyAt(meters) {
    return difficultyAt(meters);
  }

  get meters() {
    return Math.max(0, Math.floor((this.cart.x - this.startX) / PX_PER_METER));
  }

  get score() {
    return this.meters * this.elotes.count + this.bonus;
  }

  getStats() {
    return {
      meters: this.meters,
      elotes: this.elotes.count,
      score: this.score,
      bonus: this.bonus,
      braking: this.braking,
      gas: this.pedals.gas,
      airborne: this.airTime >= SCORE.airMinMs,
    };
  }

  updateAir(delta) {
    if (this.cart.grounded) {
      if (this.airTime >= SCORE.airMinMs && !this.cart.tipped) {
        const gained = Math.round((this.airTime / 1000) * SCORE.airBonusPerSecond);
        this.bonus += gained;
        this.events.emit('landed', gained, this.airTime);
      }
      this.airTime = 0;
    } else {
      this.airTime += delta;
    }
  }

  gameOver(reason) {
    if (this.over) return;
    this.over = true;
    this.final = { ...this.getStats(), reason };
    this.setBraking(false);
    this.events.emit('gameover', reason);
    if (DEBUG.test) console.log(`[test] GAMEOVER reason=${reason} ${JSON.stringify(this.getStats())}`);
    this.time.delayedCall(700, () => {
      this.scene.launch('GameOver', this.final);
    });
  }

  update(time, delta) {
    if (DEBUG.test && !this.over) {
      this.testClock = (this.testClock || 0) + delta;
      this.setPedals(isBrakeScripted(this.testClock), isGasScripted(this.testClock));
      if (DEBUG.forceGameOverAt !== null && this.testClock >= DEBUG.forceGameOverAt) this.gameOver('volcadura');
      if (!this.nextLog || this.testClock >= this.nextLog) {
        this.nextLog = (this.nextLog || 0) + 1000;
        const c = this.cart;
        console.log(
          `[test] t=${Math.round(this.testClock)} x=${c.x.toFixed(0)} y=${c.y.toFixed(0)} vx=${c.speedX.toFixed(2)} ang=${c.angleDeg.toFixed(1)} brake=${this.braking} perros=${this.obstacles.hits} lost=${this.elotes.lost} picked=${this.elotes.picked} stats=${JSON.stringify(this.getStats())}`
        );
      }
    }

    if (this.keys && !DEBUG.test) {
      const kBrake = this.keys.left.isDown || this.keys.a.isDown;
      const kGas = this.keys.right.isDown || this.keys.d.isDown;
      if (kBrake || kGas || this.keyboardWasDown) this.setPedals(kBrake || this.uiBrake, kGas || this.uiGas);
      this.keyboardWasDown = kBrake || kGas;
    }

    this.cart.update(delta);
    this.elotes.update();
    this.obstacles.update(delta);
    if (this.cart.grounded && !this.over) {
      this.clacDist += this.cart.speedX;
      if (this.clacDist > 90) {
        this.clacDist = 0;
        Sfx.clac();
      }
    }
    this.updateAir(delta);
    this.cartView.sync(delta);
    this.eloteView.sync();
    this.cart.endStep();

    if (!this.over) {
      if (this.cart.tipped) this.gameOver('volcadura');
      else if (this.elotes.count === 0) this.gameOver('sin-elotes');
    }

    const cam = this.cameras.main;
    this.road.update(cam.scrollX);
    this.sky.update(DEBUG.skyMeters ?? this.meters, cam.scrollX, time);
    this.scenery.setNight(this.sky.night);
    const targetX = this.cart.x - GAME_WIDTH * 0.3;
    const targetY = this.cart.y - GAME_HEIGHT * 0.35;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.15);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.12);
  }
}
