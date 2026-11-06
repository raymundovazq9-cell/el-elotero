// Categorías de colisión de Matter. El jugador, los elotes y los sensores van en
// la categoría por defecto (1). Los rivales (2) solo chocan con el suelo (4), así
// atraviesan al jugador, no recogen elotes ni disparan sensores.
export const CAT = {
  DEFAULT: 1,
  RIVAL: 2,
  GROUND: 4,
};

export const ALL = 0xffffffff;

/** Filtro para cuerpos que hacen de piso (calle, topes, coches, postes). */
export function groundFilter() {
  return { category: CAT.GROUND, mask: ALL };
}
