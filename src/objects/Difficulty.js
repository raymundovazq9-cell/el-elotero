import Phaser from 'phaser';

/**
 * Escala de dificultad por metros: t va de 0 a 1 y llega a 1 a los MAX_METERS.
 * El terreno y los actores multiplican sus probabilidades por (1 + t).
 */
export const MAX_METERS = 700;
export const SAFE_METERS = 10; // sin rasgos ni actores al inicio

export function difficultyAt(meters) {
  const t = Phaser.Math.Clamp(meters / MAX_METERS, 0, 1);
  return {
    t,
    // probabilidad de un elote suelto en un tramo libre (los arcos van aparte)
    eloteChance: 0.07 + 0.05 * t,
  };
}
