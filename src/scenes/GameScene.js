import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PX_PER_METER, SCORE, CAMERA } from '../config.js';
import Terrain from '../objects/Terrain.js';
import { levelById } from '../data/levels.js';
import { cartById } from '../data/carts.js';
import { applyUpgrades } from '../data/upgrades.js';
import Cart from '../objects/Cart.js';
import Stall from '../objects/Stall.js';
import Tricks from '../objects/Tricks.js';
import EloteManager from '../objects/EloteManager.js';
import Actors from '../objects/Actors.js';
import { difficultyAt } from '../objects/Difficulty.js';
import { DEBUG, isBrakeScripted, isGasScripted } from '../debug.js';
import { Sfx, vibrate, unlockAudio } from '../audio.js';
import { Music } from '../music.js';
import { Save } from '../save.js';
import { dailyMissions, missionDone, todayKey } from '../data/missions.js';
import CartView from '../views/CartView.js';
import RoadView from '../views/RoadView.js';
import Scenery from '../world/Scenery.js';
import SkyCycle from '../world/SkyCycle.js';
import Particles from '../world/Particles.js';
import EloteView from '../views/EloteView.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(data) {
    this.level = levelById((data && data.level) || Save.data.level);
    this.cameras.main.setBackgroundColor('#87b7e0');
    this.cameras.main.fadeIn(300);
    this.sky = new SkyCycle(this, {
      farDay: 'fondo-tarde',
      farNight: 'fondo-noche',
      cycle: this.level.cielo.ciclo,
    });

    this.startX = 120;
    this.road = new Terrain(this, (x) => Math.max(0, (x - this.startX) / PX_PER_METER), DEBUG.test ? 'elotero' : undefined, new RoadView(this), this.level);
    this.scenery = new Scenery(this, this.road, this.level.tema);
    this.road.start(-500, 1100);

    this.cartData = cartById((data && data.cart) || Save.data.cart);
    const levels = Object.keys(DEBUG.upgrades).length ? DEBUG.upgrades : Save.upgradesFor(this.cartData.id);
    this.upgraded = applyUpgrades(this.cartData.fisica, levels);
    this.cart = new Cart(this, this.startX, this.road.surfaceYAt(this.startX) - 70, { ...this.upgraded.fisica, ...DEBUG.phys });
    this.stall = new Stall(this, this.cart);
    this.tricks = new Tricks(this, this.cart);
    this.elotes = new EloteManager(this, this.cart, this.road, {
      start: this.upgraded.startElotes,
      max: this.upgraded.maxElotes,
      shakeFactor: this.upgraded.shakeFactor,
    });
    this.obstacles = new Actors(this, this.cart, this.road, this.elotes, this.level);
    this.cartView = new CartView(this, this.cart, this.cartData.vista);
    this.eloteView = new EloteView(this, this.elotes);
    this.particles = new Particles(this, this.cart);

    // ganancias de la partida (elotes al banco), por concepto
    this.earned = {
      recogidos: 0,
      metros: 0,
      marometas: 0,
      aire: 0,
      trucos: 0,
      ventas: 0,
      misiones: 0,
    };
    this.missionsDone = [];
    this.nextCheckpoint = SCORE.checkpointMeters;
    this.checkpoints = 0;
    this.flips = 0;
    this.sales = 0;
    this.over = false;
    this.banked = false;

    this.events.on('bump', () => {
      Sfx.golpe();
      vibrate(25);
    });
    this.events.on('elote-lost', () => {
      Sfx.eloteCaido();
      vibrate(45);
    });
    this.events.on('elote-picked', () => {
      this.earned.recogidos += 1;
      Sfx.eloteRecogido();
    });
    this.events.on('landing', (impact) => {
      if (impact < CAMERA.landingShakeMin) return;
      this.cameras.main.shake(120, Math.min(0.012, CAMERA.landingShakeK * (impact - CAMERA.landingShakeMin + 2)));
    });
    this.events.on('landed', (gained) => {
      this.earned.aire += gained;
      Sfx.aterrizaje();
      vibrate(30);
    });
    this.events.on('marometa', (flips, bonus) => {
      this.flips += flips;
      this.earned.marometas += bonus;
      Sfx.silbato();
      vibrate([40, 30, 40]);
    });
    this.events.on('truco', (kind, bonus) => {
      this.earned.trucos += bonus;
      if (kind !== 'caballito') Sfx.silbato();
      if (DEBUG.test) console.log(`[test] TRUCO ${kind} +${bonus} combo=${this.tricks.combo}`);
    });
    this.maxCombo = 0;
    this.events.on('combo', (n) => {
      this.maxCombo = Math.max(this.maxCombo, n);
      vibrate(20);
      if (DEBUG.test) console.log(`[test] COMBO x${n}`);
    });
    this.events.on('venta', (value) => {
      this.sales += 1;
      this.earned.ventas += value;
      Sfx.eloteRecogido();
    });
    this.events.on('perro-hit', () => {
      Sfx.perro();
      vibrate([60, 40, 80]);
    });
    this.events.on('dona-hit', () => {
      Sfx.ay();
      vibrate([60, 40, 80]);
    });
    this.events.on('robo', () => {
      Sfx.orale();
      vibrate([30, 30, 30, 30, 60]);
    });
    this.events.on('cable-hit', () => {
      Sfx.chispas();
      vibrate(80);
    });
    this.events.on('camioneta-appear', () => Sfx.bocina());
    this.events.on('chile', () => {
      this.cart.boostUntil = this.time.now + 2000;
      Sfx.chile();
    });
    this.events.on('bolsa', () => Sfx.eloteRecogido());
    this.events.on('stall', () => this.gameOver('cansado'));
    this.events.on('gameover', () => {
      Music.stop();
      Sfx.gameOver();
      vibrate([120, 60, 200]);
    });
    Music.setVolume(0.5);
    Music.setTempo(this.level.musica.bpm);
    Music.start();
    this.time.delayedCall(400, () => Sfx.silbato());
    this.events.on('pause', () => Music.stop());
    this.events.on('resume', () => Music.start());
    this.clacDist = 0;

    this.braking = false;
    this.pedals = { brake: false, gas: false };
    this.input.once('pointerdown', () => unlockAudio());
    this.keys = this.input.keyboard
      ? this.input.keyboard.addKeys({
          left: 'LEFT',
          right: 'RIGHT',
          a: 'A',
          d: 'D',
        })
      : null;
    const onBlur = () => this.setPedals(false, false);
    this.game.events.on('blur', onBlur);
    this.events.once('shutdown', () => {
      Music.stop();
      this.bankRun();
      this.game.events.off('blur', onBlur);
      this.elotes.destroy();
      this.cart.destroy();
      this.obstacles.destroy();
      this.cartView.destroy();
      this.eloteView.destroy();
      this.scenery.destroy();
      this.sky.destroy();
      this.particles.destroy();
    });

    this.scene.launch('UI');

    const cam = this.cameras.main;
    cam.scrollX = this.cart.x - GAME_WIDTH * CAMERA.lookAheadBase;
    cam.scrollY = this.cart.y - GAME_HEIGHT * 0.55;
    cam.setZoom(1);
  }

  /** Lerp independiente de los fps: k es la fracción por frame de 60 Hz. */
  static frameLerp(k, delta) {
    return 1 - Math.pow(1 - k, delta / 16.667);
  }

  /**
   * Cámara: el carrito va a la izquierda y más adelante cuanto más rápido;
   * se aleja con la velocidad y en el aire; en Y sigue más rápido en el aire.
   */
  updateCamera(delta) {
    const cam = this.cameras.main;
    const c = CAMERA;
    const vx = this.cart.speedX;
    const inAir = !this.cart.grounded && this.cart.airTotalMs > 200;
    const speedT = Phaser.Math.Clamp((Math.abs(vx) - c.zoomSpeed0) / (c.zoomSpeed1 - c.zoomSpeed0), 0, 1);
    const targetZoom = Phaser.Math.Clamp(1 - (1 - c.zoomMin) * speedT - (inAir ? c.zoomAir : 0), c.zoomMin - c.zoomAir, 1);
    const zoom = Phaser.Math.Linear(cam.zoom, targetZoom, GameScene.frameLerp(c.lerpZoom, delta));
    cam.setZoom(zoom);

    // con zoom < 1 la cámara ve más mundo: el centro de la vista queda en (scrollX + W/2)
    const viewW = GAME_WIDTH / zoom;
    const viewH = GAME_HEIGHT / zoom;
    const ahead = Math.max(0, vx) * c.lookAheadPerSpeed;
    const targetX = this.cart.x - viewW * c.lookAheadBase - ahead + (viewW - GAME_WIDTH) / 2;
    const targetY = this.cart.y - viewH * 0.55 + (viewH - GAME_HEIGHT) / 2;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, GameScene.frameLerp(c.lerpX, delta));
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, GameScene.frameLerp(inAir ? c.lerpYAir : c.lerpY, delta));
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

  /** Piloto de pruebas: gas en el piso; en el aire nivela con los pedales. */
  autoDrive() {
    if (this.cart.grounded) {
      this.setPedals(false, true);
      return;
    }
    const pitch = this.cart.chassis.angle - (this.cart.groundAngle || 0);
    if (pitch < -0.3)
      this.setPedals(true, false); // nariz arriba: freno la baja
    else if (pitch > 0.3)
      this.setPedals(false, true); // nariz abajo: gas la sube
    else this.setPedals(false, false);
  }

  difficultyAt(meters) {
    return difficultyAt(meters);
  }

  get meters() {
    return Math.max(0, Math.floor((this.cart.x - this.startX) / PX_PER_METER));
  }

  get earnedTotal() {
    const e = this.earned;
    return e.recogidos + e.metros + e.marometas + e.aire + e.trucos + e.ventas + e.misiones;
  }

  getStats() {
    return {
      level: this.level.id,
      meters: this.meters,
      elotes: this.elotes.count,
      earned: { ...this.earned },
      total: this.earnedTotal,
      flips: this.flips,
      caballitos: this.tricks.wheelies,
      perfectos: this.tricks.perfects,
      combo: this.tricks.combo,
      maxCombo: this.maxCombo,
      sales: this.sales,
      robos: this.obstacles.robos,
      saltos: this.obstacles.saltos,
      lost: this.elotes.lost,
      braking: this.braking,
      gas: this.pedals.gas,
      airborne: this.tricks.airborne,
    };
  }

  /** Suma lo ganado al banco y guarda el récord (una sola vez por partida). */
  bankRun() {
    if (this.banked) return;
    this.banked = true;
    const meters = this.meters;
    // misiones del día cumplidas en esta partida
    const key = DEBUG.missionSeed || todayKey();
    const stats = this.getStats();
    for (const m of dailyMissions(key)) {
      if (Save.missionsDone(key).includes(m.id) || !missionDone(m, stats)) continue;
      Save.markMission(key, m.id);
      this.earned.misiones += m.premio;
      this.missionsDone.push(m);
    }
    Save.addBank(this.earnedTotal);
    this.isRecord = Save.setBest(this.level.id, meters);
    Save.addTotals({
      runs: 1,
      meters,
      elotes: this.earnedTotal,
      marometas: this.flips,
      ventas: this.sales,
    });
  }

  updateCheckpoints() {
    const m = this.meters;
    while (m >= this.nextCheckpoint) {
      this.checkpoints += 1;
      const bonus = SCORE.checkpointBase * this.checkpoints;
      this.earned.metros += bonus;
      this.events.emit('checkpoint', this.nextCheckpoint, bonus);
      Sfx.eloteRecogido();
      this.nextCheckpoint += SCORE.checkpointMeters;
    }
  }

  gameOver(reason) {
    if (this.over) return;
    this.over = true;
    this.setBraking(false);
    this.bankRun();
    this.final = {
      ...this.getStats(),
      reason,
      isRecord: this.isRecord,
      best: Save.bestFor(this.level.id),
      bank: Save.bank,
      missions: this.missionsDone,
    };
    this.events.emit('gameover', reason);
    if (DEBUG.test) console.log(`[test] GAMEOVER reason=${reason} ${JSON.stringify(this.final)}`);
    this.cameras.main.shake(300, 0.012);
    this.time.delayedCall(700, () => {
      this.scene.launch('GameOver', this.final);
    });
  }

  update(time, delta) {
    if (DEBUG.test && !this.over) {
      this.testClock = (this.testClock || 0) + delta;
      if (DEBUG.auto) this.autoDrive();
      else this.setPedals(isBrakeScripted(this.testClock), isGasScripted(this.testClock));
      if (DEBUG.forceGameOverAt !== null && this.testClock >= DEBUG.forceGameOverAt) this.gameOver('volcadura');
      if (!this.nextLog || this.testClock >= this.nextLog) {
        this.nextLog = (this.nextLog || 0) + 1000;
        const c = this.cart;
        console.log(
          `[test] t=${Math.round(this.testClock)} x=${c.x.toFixed(0)} y=${c.y.toFixed(0)} vx=${c.speedX.toFixed(2)} ang=${c.angleDeg.toFixed(1)} g=${c.grounded} brake=${this.braking} perros=${this.obstacles.hits} lost=${this.elotes.lost} picked=${this.elotes.picked} objs=${this.children.length} bodies=${this.matter.world.getAllBodies().length} stats=${JSON.stringify(this.getStats())}`
        );
      }
    }

    if (this.keys && !DEBUG.test) {
      const kBrake = this.keys.left.isDown || this.keys.a.isDown;
      const kGas = this.keys.right.isDown || this.keys.d.isDown;
      if (kBrake || kGas || this.keyboardWasDown) this.setPedals(kBrake || this.uiBrake, kGas || this.uiGas);
      this.keyboardWasDown = kBrake || kGas;
    }

    this.cart.groundAngle = Math.atan(this.road.slopeAt(this.cart.x));
    this.cart.update(delta);
    if (!this.over) this.stall.update(delta);
    this.elotes.update();
    this.obstacles.update(delta);
    if (this.cart.grounded && !this.over) {
      this.clacDist += Math.abs(this.cart.speedX);
      if (this.clacDist > 90) {
        this.clacDist = 0;
        Sfx.clac();
      }
    }
    if (!this.over) {
      this.tricks.update(delta);
      this.updateCheckpoints();
    }
    this.cartView.sync(delta);
    this.eloteView.sync();
    this.particles.update(this.cartView.local(this.cartData.vista.olla.x, this.cartData.vista.olla.y), this.cart.boost > 1);
    this.cart.endStep();

    if (!this.over) {
      if (this.cart.tipped) this.gameOver('volcadura');
      else if (this.elotes.count === 0) this.gameOver('sin-elotes');
    }

    this.updateCamera(delta);
    const cam = this.cameras.main;
    this.road.update(cam.worldView.x);
    this.sky.update(DEBUG.skyMeters ?? this.meters + this.level.cielo.inicio, cam.scrollX, time);
    this.scenery.setNight(this.sky.night);
  }
}
