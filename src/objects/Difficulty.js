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
    eloteChance: 0.07 + 0.05 * t,
    // tamaños
    topeRadius: 12 + 9 * t,
    bacheDepth: 16 + 12 * t,
    bacheWidth: 70 + 50 * t,
    escalonDrop: 30 + 25 * t,
    rampaHeight: 34 + 26 * t,
    rampaLength: 130,
  };
}
