// Copas: carreras cortas con meta contra tres eloteros rivales, una por
// escenario. `metros` es el largo de la pista y `premio` lo que paga el primer
// lugar (los demás reciben una fracción, ver PLACE_FACTOR).

export const CUPS = [
  { id: 'callejon', level: 'callejon', nombre: 'Copa del Callejón', metros: 400, premio: 250 },
  { id: 'mercado', level: 'mercado', nombre: 'Copa del Mercado', metros: 500, premio: 400 },
  { id: 'feria', level: 'feria', nombre: 'Copa de la Feria', metros: 600, premio: 600 },
];

export const PLACE_FACTOR = [1, 0.55, 0.3, 0.12];
export const RUNNERS = 4; // jugador + 3 rivales

export function cupById(id) {
  return CUPS.find((c) => c.id === id) || CUPS[0];
}

export function cupPrize(cup, place) {
  return Math.round(cup.premio * (PLACE_FACTOR[place - 1] ?? 0.1));
}
