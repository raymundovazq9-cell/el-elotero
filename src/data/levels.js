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
    rasgos: { tope: 0.05, bache: 0.03, escalera: 0.04, rampa: 0.05, rampaGrande: 0.02, barranca: 0.015, arco: 0.7 },
    actores: { perro: 0.025, dona: 0.02, cholo: 0.015, cliente: 0.05, coche: 0.03, camioneta: 0.015, cable: 0.02, poste: 0.01, chile: 0.02, bolsa: 0.015 },
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
    rasgos: { tope: 0.06, bache: 0.04, escalera: 0.08, rampa: 0.05, rampaGrande: 0.02, barranca: 0.02, arco: 0.7 },
    actores: { perro: 0.02, dona: 0.04, cholo: 0.02, cliente: 0.08, coche: 0.02, camioneta: 0.02, cable: 0, poste: 0.02, chile: 0.02 },
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
    rasgos: { tope: 0.05, bache: 0.04, escalera: 0.04, rampa: 0.08, rampaGrande: 0.05, barranca: 0.03, arco: 0.8 },
    actores: { perro: 0.015, dona: 0.02, cholo: 0.025, cliente: 0.05, coche: 0.02, camioneta: 0.04, cable: 0.05, poste: 0.03, chile: 0.03 },
    cielo: { inicio: 330, ciclo: 900 },
    musica: { bpm: 112 },
  },
  {
    id: 'pueblo',
    nombre: 'Pueblo',
    descripcion: 'Cuestas largas de empedrado, la plaza con su kiosco y la iglesia. Cuidado con el balón.',
    precio: 2500,
    tema: 'pueblo',
    terreno: { base: 420, amp: [70, 22, 4], lambda: [1300, 450, 200], crecimiento: 0.0014, maxMul: 2.4 },
    rasgos: { tope: 0.04, bache: 0.05, escalera: 0.05, rampa: 0.05, rampaGrande: 0.02, barranca: 0.02, arco: 0.7 },
    actores: { perro: 0.025, dona: 0.025, cholo: 0.01, cliente: 0.07, coche: 0.02, camioneta: 0.015, cable: 0.01, poste: 0.01, chile: 0.02, balon: 0.05 },
    cielo: { inicio: 0, ciclo: 800 },
    musica: { bpm: 100 },
  },
  {
    id: 'carretera',
    nombre: 'Carretera',
    descripcion: 'Rectas largas, saltos enormes, charcos, tráileres y el tamalero en bici.',
    precio: 9000,
    tema: 'carretera',
    terreno: { base: 420, amp: [55, 18, 3], lambda: [1600, 500, 220], crecimiento: 0.001, maxMul: 2.2 },
    rasgos: { tope: 0.02, bache: 0.06, escalera: 0, rampa: 0.06, rampaGrande: 0.08, barranca: 0.05, arco: 0.8 },
    actores: {
      perro: 0.02,
      dona: 0.01,
      cholo: 0.02,
      cliente: 0.03,
      coche: 0.03,
      camioneta: 0.03,
      trailer: 0.025,
      tamalero: 0.03,
      charco: 0.05,
      cable: 0.02,
      poste: 0.02,
      chile: 0.03,
    },
    cielo: { inicio: 100, ciclo: 1000 },
    musica: { bpm: 118 },
  },
];

export function levelById(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
