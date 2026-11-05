// Progreso del jugador en localStorage: banco de elotes, carrito activo, mejoras,
// ropa, escenarios comprados, récords por escenario y misiones del día.

const KEY = 'elotero.save';

function defaults() {
  return {
    version: 1,
    bank: 0,
    cart: 'carrito',
    level: 'callejon',
    carts: ['carrito'],
    levels: ['callejon'],
    upgrades: {}, // { [cartId]: { piernas: 0, llantas: 0, suspension: 0, canasta: 0, frenos: 0 } }
    clothes: { owned: [], equipped: {} },
    best: {}, // { [levelId]: metros }
    missions: { date: '', progress: {}, claimed: [] },
    totals: { runs: 0, meters: 0, elotes: 0, marometas: 0, ventas: 0 },
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    return { ...defaults(), ...d, totals: { ...defaults().totals, ...(d.totals || {}) } };
  } catch {
    return defaults();
  }
}

class SaveStore {
  constructor() {
    this.data = read();
  }

  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* sin almacenamiento */
    }
  }

  reset() {
    this.data = defaults();
    this.persist();
  }

  get bank() {
    return this.data.bank;
  }

  addBank(n) {
    this.data.bank = Math.max(0, Math.round(this.data.bank + n));
    this.persist();
  }

  /** Cobra n elotes si alcanza; devuelve true si se pudo. */
  spend(n) {
    if (this.data.bank < n) return false;
    this.data.bank -= n;
    this.persist();
    return true;
  }

  bestFor(levelId) {
    return this.data.best[levelId] || 0;
  }

  /** Guarda el récord si mejora; devuelve true si fue récord. */
  setBest(levelId, meters) {
    if (meters <= this.bestFor(levelId)) return false;
    this.data.best[levelId] = meters;
    this.persist();
    return true;
  }

  upgradesFor(cartId) {
    return this.data.upgrades[cartId] || {};
  }

  upgradeLevel(cartId, key) {
    return this.upgradesFor(cartId)[key] || 0;
  }

  setUpgrade(cartId, key, level) {
    this.data.upgrades[cartId] = { ...this.upgradesFor(cartId), [key]: level };
    this.persist();
  }

  owns(kind, id) {
    if (kind === 'cart') return this.data.carts.includes(id);
    if (kind === 'level') return this.data.levels.includes(id);
    if (kind === 'clothes') return this.data.clothes.owned.includes(id);
    return false;
  }

  own(kind, id) {
    if (this.owns(kind, id)) return;
    if (kind === 'cart') this.data.carts.push(id);
    if (kind === 'level') this.data.levels.push(id);
    if (kind === 'clothes') this.data.clothes.owned.push(id);
    this.persist();
  }

  select(kind, id) {
    if (kind === 'cart') this.data.cart = id;
    if (kind === 'level') this.data.level = id;
    this.persist();
  }

  equip(type, id) {
    this.data.clothes.equipped = { ...this.data.clothes.equipped, [type]: id };
    this.persist();
  }

  addTotals(partial) {
    for (const k of Object.keys(partial)) this.data.totals[k] = (this.data.totals[k] || 0) + partial[k];
    this.persist();
  }
}

export const Save = new SaveStore();
