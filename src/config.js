// Constantes de balance del juego. Todo lo que se "tunea" vive aquí.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

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
  slopeStep: 7, // cambio máximo de pendiente entre segmentos (grados)
  segmentMin: 120, // largo mínimo de un segmento de la polilínea
  segmentMax: 260,
  friction: 0.9,
};

export const CART = {
  bodyWidth: 110,
  bodyHeight: 26,
  wallHeight: 24,
  wallThickness: 8,
  wheelRadius: 17,
  wheelOffsetX: 44,
  wheelOffsetY: 26,
  suspensionStiffness: 0.35,
  suspensionDamping: 0.12,
  density: 0.004,
  wheelFriction: 0.95,
  // velocidad angular de las ruedas (rad/frame aprox. en Matter)
  wheelSpeedMax: 0.72,
  wheelSpeedCoast: 0.5, // tope de velocidad de ruedas cuando no se pisa nada (rueda libre)
  airTilt: 0.07, // velocidad angular aplicada en el aire con los pedales
  airTiltMin: 100, // ms en el aire antes de permitir inclinar
  wheelSpeedBrake: 0.14,
  wheelAccel: 0.012,
  wheelBrakeRate: 0.04,
  // velocidad lineal mínima garantizada (px/step) en X
  minSpeedX: 2.2,
  maxSpeedX: 15,
  tipAngleDeg: 75,
  tipTimeMs: 400,
};

export const ELOTES = {
  start: 6,
  max: 12,
  radius: 9,
  density: 0.0008,
  friction: 0.3,
  restitution: 0.3,
  lostDistance: 170, // px desde el chasis para darse por perdido
};

export const SCORE = {
  airBonusPerSecond: 40,
  airMinMs: 250,
};
