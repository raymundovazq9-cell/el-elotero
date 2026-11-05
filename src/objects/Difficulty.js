import Phaser from 'phaser';

/**
 * Dado el avance en metros devuelve probabilidades y tamaños de obstáculos.
 * Todo escala linealmente con t en [0, 1], que llega a 1 a los MAX_METERS.
 */
export const MAX_METERS = 700;
export const SAFE_METERS = 10; // sin obstáculos al inicio

export function difficultyAt(meters) {
  const t = Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);
  return {
    t,
    // probabilidad por segmento de calle
    topeChance: 0.22 + 0.33 * t,
    bacheChance: 0.1 + 0.22 * t,
    escalonChance: meters > 80 ? 0.05 + 0.14 * t : 0,
    rampaChance: meters > 150 ? 0.06 + 0.12 * t : 0,
    perroChance: meters > 120 ? 0.05 + 0.12 * t : 0,
    cocheChance: meters > 250 ? 0.05 + 0.1 * t : 0,
    eloteChance: 0.18 + 0.1 * t,
    // tamaños
    topeRadius: 10 + 8 * t,
    bacheDepth: 16 + 12 * t,
    bacheWidth: 70 + 50 * t,
    escalonDrop: 30 + 25 * t,
    rampaHeight: 34 + 26 * t,
    rampaLength: 130,
  };
}
