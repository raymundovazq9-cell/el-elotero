import { ELOTES } from '../config.js';

// Mejoras del carrito: cinco líneas con seis niveles cada una. El efecto se
// aplica como multiplicador sobre la física del modelo (applyUpgrades).

export const UPGRADES = [
  { id: 'piernas', nombre: 'Piernas', descripcion: 'Más empuje: aceleras más y subes mejor.', icono: 'pierna' },
  { id: 'llantas', nombre: 'Llantas', descripcion: 'Más agarre en subidas y empedrado.', icono: 'rueda' },
  { id: 'suspension', nombre: 'Suspensión', descripcion: 'Menos brincos: se caen menos elotes.', icono: 'resorte' },
  { id: 'canasta', nombre: 'Canasta', descripcion: 'Paredes más altas y más elotes de inicio.', icono: 'canasta' },
  { id: 'frenos', nombre: 'Frenos', descripcion: 'Frenas y das reversa más rápido.', icono: 'freno' },
];

export const MAX_LEVEL = 6;

/** Precio base por nivel (1..6); se multiplica por el factor del carrito. */
const BASE_PRICES = [50, 100, 200, 400, 800, 1600];

export const CART_PRICE_FACTOR = { carrito: 1, triciclo: 1.5, bici: 2, motocarro: 3, camioneta: 5 };

/** Precio para subir del nivel actual al siguiente (null si ya está al máximo). */
export function upgradePrice(cartId, currentLevel) {
  if (currentLevel >= MAX_LEVEL) return null;
  return Math.round(BASE_PRICES[currentLevel] * (CART_PRICE_FACTOR[cartId] || 1));
}

/**
 * Aplica los niveles de mejora a la física de un carrito.
 * @param {object} fisica datos del modelo (data/carts.js → fisica)
 * @param {{piernas?:number,llantas?:number,suspension?:number,canasta?:number,frenos?:number}} lv
 * @returns {{ fisica: object, maxElotes: number, startElotes: number, shakeFactor: number }}
 */
export function applyUpgrades(fisica, lv = {}) {
  const p = lv.piernas || 0;
  const l = lv.llantas || 0;
  const s = lv.suspension || 0;
  const c = lv.canasta || 0;
  const f = lv.frenos || 0;
  const out = { ...fisica };
  if (out.wheelSpeedMax !== undefined) out.wheelSpeedMax = fisica.wheelSpeedMax * (1 + 0.07 * p);
  if (out.wheelAccel !== undefined) out.wheelAccel = fisica.wheelAccel * (1 + 0.1 * p);
  if (out.wheelFriction !== undefined) out.wheelFriction = fisica.wheelFriction * (1 + 0.05 * l);
  if (out.suspensionDamping !== undefined) out.suspensionDamping = fisica.suspensionDamping * (1 + 0.3 * s);
  if (out.suspensionStiffness !== undefined) out.suspensionStiffness = fisica.suspensionStiffness * (1 + 0.1 * s);
  out.baseWallHeight = fisica.wallHeight || 32;
  out.wallHeight = out.baseWallHeight + 4 * c;
  if (out.wheelBrakeRate !== undefined) out.wheelBrakeRate = fisica.wheelBrakeRate * (1 + 0.2 * f);
  if (out.wheelSpeedReverse !== undefined) out.wheelSpeedReverse = fisica.wheelSpeedReverse * (1 + 0.1 * f);
  return {
    fisica: out,
    maxElotes: ELOTES.max + 2 * c,
    startElotes: ELOTES.start + c,
    shakeFactor: 1 - 0.1 * s,
  };
}
