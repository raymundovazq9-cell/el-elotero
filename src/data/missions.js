import Phaser from 'phaser';

// Misiones diarias: tres por día, elegidas del catálogo con la fecha como
// semilla. Cada una se cumple dentro de una sola partida y paga elotes.
//   tipo: estadística de la partida que se compara con `meta`
//   level: (opcional) solo cuenta en ese escenario

export const MISSION_POOL = [
  { id: 'recoger-40', tipo: 'recogidos', meta: 40, texto: 'Recoge 40 elotes en una partida', premio: 60 },
  { id: 'recoger-80', tipo: 'recogidos', meta: 80, texto: 'Recoge 80 elotes en una partida', premio: 140 },
  { id: 'metros-250', tipo: 'meters', meta: 250, texto: 'Llega a 250 m', premio: 80 },
  { id: 'metros-450', tipo: 'meters', meta: 450, texto: 'Llega a 450 m', premio: 180 },
  { id: 'marometa-1', tipo: 'flips', meta: 1, texto: 'Haz una marometa y cae bien', premio: 70 },
  { id: 'marometa-3', tipo: 'flips', meta: 3, texto: 'Haz 3 marometas en una partida', premio: 160 },
  { id: 'vender-3', tipo: 'sales', meta: 3, texto: 'Véndele elotes a 3 clientes', premio: 70 },
  { id: 'vender-6', tipo: 'sales', meta: 6, texto: 'Véndele elotes a 6 clientes', premio: 150 },
  { id: 'saltar-camioneta', tipo: 'saltos', meta: 1, texto: 'Salta la camioneta del gas', premio: 120 },
  { id: 'mercado-200', tipo: 'meters', meta: 200, level: 'mercado', texto: 'Llega a 200 m en el Mercado', premio: 130 },
  { id: 'feria-200', tipo: 'meters', meta: 200, level: 'feria', texto: 'Llega a 200 m en la Feria', premio: 200 },
  { id: 'cuidadoso-150', tipo: 'cuidadoso', meta: 150, texto: 'Llega a 150 m sin tirar ni un elote', premio: 110 },
  { id: 'aire-10', tipo: 'aire', meta: 10, texto: 'Gana 10 elotes por tiempo en el aire', premio: 80 },
];

export const MISSIONS_PER_DAY = 3;

/** Fecha local como clave AAAA-MM-DD. */
export function todayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Las misiones del día (deterministas por fecha). */
export function dailyMissions(seed = todayKey()) {
  const rnd = new Phaser.Math.RandomDataGenerator([`misiones-${seed}`]);
  const pool = [...MISSION_POOL];
  const out = [];
  while (out.length < MISSIONS_PER_DAY && pool.length) {
    const i = rnd.between(0, pool.length - 1);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Valor alcanzado en una partida para la estadística de la misión. */
export function missionValue(m, stats) {
  if (m.level && stats.level !== m.level) return 0;
  switch (m.tipo) {
    case 'recogidos':
      return (stats.earned && stats.earned.recogidos) || 0;
    case 'aire':
      return (stats.earned && stats.earned.aire) || 0;
    case 'cuidadoso':
      return stats.lost > 0 ? 0 : stats.meters;
    default:
      return stats[m.tipo] || 0;
  }
}

export function missionDone(m, stats) {
  return missionValue(m, stats) >= m.meta;
}
