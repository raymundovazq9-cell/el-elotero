// Escenarios del juego. Cada uno es un terreno infinito con su propio récord.
// terreno: perfil de colinas = base + Σ amp[i]·sin(2π·x/lambda[i] + fase[i]);
//   la amplitud se multiplica por min(maxMul, 1 + crecimiento·metros).
// rasgos: probabilidad base por segmento de 24 px (se multiplica por 1 + t de dificultad).

export const LEVELS = [
  {
    id: 'callejon',
    nombre: 'Callejón',
    descripcion: 'El barrio de siempre: casas de colores y colinas suaves.',
    precio: 0,
    tema: 'callejon',
    terreno: { base: 420, amp: [50, 20, 4], lambda: [1000, 420, 200], crecimiento: 0.0012, maxMul: 2.2 },
    rasgos: { tope: 0.05, bache: 0.03, escalera: 0.04, rampa: 0.05, arco: 0.7 },
    actores: { perro: 0.05, dona: 0.04, cholo: 0.04, cliente: 0.05, coche: 0.03, camioneta: 0.015, cable: 0.02, poste: 0.01, chile: 0.02, bolsa: 0.015 },
    cielo: { inicio: 0, ciclo: 600 },
    musica: { bpm: 96 },
  },
  {
    id: 'mercado',
    nombre: 'Mercado',
    descripcion: 'Lonas, puestos y doñas con el mandado. Escaleras por todos lados.',
    precio: 1500,
    tema: 'mercado',
    terreno: { base: 420, amp: [60, 26, 5], lambda: [900, 380, 190], crecimiento: 0.0015, maxMul: 2.4 },
    rasgos: { tope: 0.06, bache: 0.04, escalera: 0.08, rampa: 0.05, arco: 0.7 },
    actores: { perro: 0.03, dona: 0.08, cholo: 0.04, cliente: 0.08, coche: 0.02, camioneta: 0.02, cable: 0, poste: 0.02, chile: 0.02 },
    cielo: { inicio: 60, ciclo: 700 },
    musica: { bpm: 104 },
  },
  {
    id: 'feria',
    nombre: 'Feria',
    descripcion: 'Rampas grandes, luces de noche, la camioneta del gas y los de la CFE.',
    precio: 5000,
    tema: 'feria',
    terreno: { base: 420, amp: [75, 30, 6], lambda: [850, 360, 190], crecimiento: 0.0018, maxMul: 2.6 },
    rasgos: { tope: 0.05, bache: 0.04, escalera: 0.04, rampa: 0.1, arco: 0.8 },
    actores: { perro: 0.02, dona: 0.03, cholo: 0.05, cliente: 0.05, coche: 0.02, camioneta: 0.04, cable: 0.05, poste: 0.03, chile: 0.03 },
    cielo: { inicio: 330, ciclo: 900 },
    musica: { bpm: 112 },
  },
];

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
