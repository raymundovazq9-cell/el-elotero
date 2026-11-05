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
  friction: 1.6, // mayor que la de las llantas: Matter usa el mínimo de los dos
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
  wheelFriction: 1.3,
  // velocidad angular de las ruedas (rad/paso de Matter)
  wheelSpeedMax: 0.62, // con ACELERAR
  wheelAccel: 0.06, // cuánto sube por paso al acelerar
  wheelSpeedReverse: -0.22, // reversa lenta al mantener FRENO
  wheelBrakeRate: 0.05, // cuánto baja por paso al frenar
  airTilt: 0.04, // velocidad angular en el aire con los pedales
  airTiltMin: 100, // ms en el aire antes de permitir inclinar
  maxSpeedX: 16,
  tipAngleDeg: 100,
  tipTimeMs: 500,
  stallMs: 6000, // sin avanzar este tiempo = se cansó el elotero
};

export const ELOTES = {
  start: 6,
  max: 12,
  width: 24, // cuerpo del elote suelto (rectángulo con chaflán)
  height: 12,
  radius: 9, // radio del sensor de los recogibles
  density: 0.0008,
  friction: 0.5,
  restitution: 0.1,
  lostDistance: 170, // px desde el chasis para darse por perdido
};

export const SCORE = {
  airMinMs: 250, // mínimo en el aire para contar como salto
  airBonusMinMs: 700, // mínimo para dar elotes por aire
  airBonusPerSecond: 2, // elotes por segundo en el aire
  flipBonus: 10, // elotes por marometa
  flipFraction: 0.85, // fracción de vuelta completa que cuenta como marometa
  checkpointMeters: 100,
  checkpointBase: 5, // elotes en el primer checkpoint; sube 5 en cada uno
  saleValue: 3, // elotes por vender uno a un cliente
};
