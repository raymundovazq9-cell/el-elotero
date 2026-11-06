import Phaser from 'phaser';
import { CARTS } from './carts.js';
import { UPGRADES } from './upgrades.js';
import { PAINTS, STICKERS } from './paints.js';
import { clothesOf } from './clothes.js';

// Rivales de las copas: nombre, carrito parecido al del jugador, mejoras
// alrededor de las suyas, pinta y ropa al azar y una personalidad para el Driver.

export const RIVAL_NAMES = ['Don Chuy', 'La Güera', 'El Tigre', 'Doña Lupe', 'Tacho', 'El Chaparro', 'Beto', 'La Chata', 'Don Ramón', 'El Pelón'];

const RIVAL_PAINTS = PAINTS.filter((p) => p.color);

/** Elige `n` rivales para una carrera. */
export function pickRivals(seed, playerCartId, playerUpgrades, n = 3) {
  const rnd = new Phaser.Math.RandomDataGenerator([`rivales-${seed}`]);
  const names = [...RIVAL_NAMES];
  const idx = Math.max(
    0,
    CARTS.findIndex((c) => c.id === playerCartId)
  );
  const keys = UPGRADES.map((u) => u.id);
  const avg = keys.reduce((a, k) => a + (playerUpgrades[k] || 0), 0) / keys.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const cart = CARTS[Phaser.Math.Clamp(idx + rnd.between(-1, 1), 0, CARTS.length - 1)];
    const upgrades = {};
    for (const k of keys) upgrades[k] = Phaser.Math.Clamp(Math.round(avg + rnd.between(-1, 1)), 0, 6);
    const equipped = {};
    for (const tipo of ['sombrero', 'mandil', 'playera']) {
      const list = clothesOf(tipo);
      equipped[tipo] = list[rnd.between(0, list.length - 1)].id;
    }
    out.push({
      name: names.splice(rnd.between(0, names.length - 1), 1)[0],
      cartId: cart.id,
      upgrades,
      paint: {
        color: RIVAL_PAINTS[rnd.between(0, RIVAL_PAINTS.length - 1)].id,
        calca: rnd.frac() < 0.5 ? STICKERS[rnd.between(0, STICKERS.length - 1)].id : null,
      },
      equipped,
      personality: {
        empuje: rnd.realInRange(0.88, 1.04), // multiplica la velocidad de las ruedas
        cautela: rnd.realInRange(0.2, 0.95),
        reaccion: rnd.between(80, 240),
        torpeza: rnd.realInRange(0, 1), // cada tanto suelta el gas un momento
      },
    });
  }
  return out;
}
