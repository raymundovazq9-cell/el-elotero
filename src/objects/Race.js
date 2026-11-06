import { PX_PER_METER } from '../config.js';

const COUNTDOWN_MS = 3200;

/**
 * Estado de una carrera: cuenta regresiva, posiciones (por X), cruce de la
 * meta y resultados. Emite en scene.events: 'race-count'(n), 'race-go',
 * 'race-finish'(runner, place) y 'race-player-finish'(place).
 */
export default class Race {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} cup
   * @param {{name:string, cart:object, isPlayer:boolean}} player
   * @param {import('./Rival.js').default[]} rivals
   * @param {number} startX
   * @param {number} finishX
   */
  constructor(scene, cup, player, rivals, startX, finishX) {
    this.scene = scene;
    this.cup = cup;
    this.startX = startX;
    this.finishX = finishX;
    this.player = { name: player.name, cart: player.cart, isPlayer: true, finished: false, finishTime: 0, rival: null };
    this.runners = [this.player, ...rivals.map((r) => ({ name: r.name, cart: r.cart, isPlayer: false, finished: false, finishTime: 0, rival: r }))];
    this.order = []; // corredores en orden de llegada
    this.state = 'countdown';
    this.clock = 0;
    this.countShown = 4;
    this.elapsed = 0;
  }

  get running() {
    return this.state === 'running';
  }

  get playerPlace() {
    return this.placeOf(this.player);
  }

  /** Lugar actual (1..n) de un corredor: por llegada si terminó, si no por X. */
  placeOf(runner) {
    if (runner.out) return this.runners.length;
    if (runner.finished) return this.order.indexOf(runner) + 1;
    let ahead = this.order.length;
    for (const r of this.runners) if (!r.finished && r !== runner && r.cart.x > runner.cart.x) ahead++;
    return ahead + 1;
  }

  /** Progreso 0..1 de cada corredor hacia la meta. */
  progress() {
    const len = this.finishX - this.startX;
    return this.runners.map((r) => ({ name: r.name, isPlayer: r.isPlayer, t: Math.min(1, Math.max(0, (r.cart.x - this.startX) / len)), finished: r.finished }));
  }

  metersToFinish(runner = this.player) {
    return Math.max(0, Math.ceil((this.finishX - runner.cart.x) / PX_PER_METER));
  }

  update(delta) {
    if (this.state === 'countdown') {
      this.clock += delta;
      const n = Math.ceil((COUNTDOWN_MS - this.clock) / 1000);
      if (n < this.countShown && n > 0) {
        this.countShown = n;
        this.scene.events.emit('race-count', n);
      }
      if (this.clock >= COUNTDOWN_MS) {
        this.state = 'running';
        this.scene.events.emit('race-go');
      }
      return;
    }
    if (this.state !== 'running') return;
    this.elapsed += delta;
    for (const r of this.runners) {
      if (r.finished || r.cart.x < this.finishX) continue;
      r.finished = true;
      r.finishTime = this.elapsed;
      if (r.rival) {
        r.rival.finished = true;
        r.rival.finishTime = this.elapsed;
      }
      this.order.push(r);
      const place = this.order.length;
      this.scene.events.emit('race-finish', r, place);
      if (r.isPlayer) {
        this.state = 'finished';
        this.scene.events.emit('race-player-finish', place);
      }
    }
  }

  /** Jugador fuera (volcadura, sin elotes, cansado): queda en último lugar. */
  playerOut() {
    if (this.state === 'finished') return;
    this.state = 'finished';
    this.player.finished = true;
    this.player.out = true;
  }

  /** Resultados finales: los que llegaron por orden, el resto por X. */
  results() {
    const rest = this.runners.filter((r) => !this.order.includes(r) && !(r.isPlayer && r.out)).sort((a, b) => b.cart.x - a.cart.x);
    const list = [...this.order, ...rest];
    if (this.player.out) list.push(this.player);
    return list.map((r, i) => ({ name: r.name, isPlayer: r.isPlayer, place: i + 1, time: r.finishTime, out: !!r.out }));
  }
}
