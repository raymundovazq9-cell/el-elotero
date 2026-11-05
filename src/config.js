// Constantes de balance del juego. Todo lo que se "tunea" vive aquí.

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;

export const PX_PER_METER = 50;

export const PHYSICS = {
  gravityY: 1.2,
};

export const ROAD = {
  thickness: 24,
  chunkLength: 600, // px de avance en X por tramo
  chunksAhead: 3,
  cleanupBehind: 700, // px detrás de la cámara para borrar cuerpos
  slopeMinDeg: 14,
  slopeMaxDeg: 34,
  segmentMin: 120, // largo mínimo de un segmento de la polilínea
  segmentMax: 260,
  friction: 0.9,
};

export const CART = {
  bodyWidth: 110,
  bodyHeight: 26,
  wallHeight: 34,
  wallThickness: 8,
  wheelRadius: 17,
  wheelOffsetX: 40,
  wheelOffsetY: 26,
  suspensionStiffness: 0.35,
  suspensionDamping: 0.12,
  density: 0.004,
  wheelFriction: 0.95,
  // velocidad angular de las ruedas (rad/frame aprox. en Matter)
  wheelSpeedMax: 0.55,
  wheelSpeedBrake: 0.08,
  wheelAccel: 0.012,
  wheelBrakeRate: 0.04,
  // velocidad lineal mínima garantizada (px/step) en X
  minSpeedX: 2.2,
  maxSpeedX: 14,
  tipAngleDeg: 75,
  tipTimeMs: 400,
};

export const ELOTES = {
  start: 6,
  max: 12,
  radius: 9,
  density: 0.0012,
  friction: 0.6,
  restitution: 0.15,
  lostDistance: 170, // px desde el chasis para darse por perdido
};

export const SCORE = {
  airBonusPerSecond: 40,
  airMinMs: 250,
};
