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
  wallHeight: 38,
  wallThickness: 8,
  boxX: 0, // centro de la caja de elotes respecto al chasis
  boxWidth: 110,
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
  antiWheelie: 0.75, // cuánto baja el empuje al levantar la nariz (1 = se corta del todo)
  airTilt: 0.04, // velocidad angular en el aire con los pedales
  airTiltMin: 220, // ms en el aire antes de permitir inclinar (los brinquitos no cuentan)
  maxSpeedX: 16,
  tipAngleDeg: 88, // de cabeza (o parado de nariz) tocando el piso con el chasis = volcadura
  tipTimeMs: 500,
  stallMs: 6000, // sin avanzar este tiempo = se cansó el elotero
};

export const ELOTES = {
  start: 6,
  max: 12,
  width: 24, // cuerpo del elote suelto (rectángulo con chaflán)
  height: 12,
  radius: 9, // radio del sensor de los recogibles
  density: 0.0012,
  friction: 1.1, // > 1 para que aguanten subidas de hasta ~48°
  frictionAir: 0.006, // igual que el chasis: en el aire no se rezagan respecto al carrito
  restitution: 0.05,
  lostDistance: 170, // px desde el chasis para darse por perdido
  holdGravity: 1.6, // gravedad extra (en múltiplos) para los elotes que van dentro de la caja: no brincan tan fácil
};

export const CAMERA = {
  lookAheadBase: 0.3, // fracción del ancho a la izquierda del carrito
  lookAheadPerSpeed: 9, // px extra de adelanto por cada px/paso de velocidad
  zoomMin: 0.78, // zoom a toda velocidad
  zoomSpeed0: 6, // velocidad (px/paso) donde empieza a alejarse
  zoomSpeed1: 18, // velocidad donde llega a zoomMin
  zoomAir: 0.08, // alejamiento extra en el aire
  lerpX: 0.15,
  lerpY: 0.12,
  lerpYAir: 0.22,
  lerpZoom: 0.05,
  landingShakeMin: 4, // impacto (px/paso) a partir del cual sacude
  landingShakeK: 0.0022,
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
  truckJumpBonus: 6, // por saltar la camioneta del gas
  wheelieMinMs: 600, // caballito: tiempo con solo la rueda trasera antes de contar
  wheeliePitch: 0.3, // rad de nariz arriba respecto al piso para contar caballito
  wheeliePerSecond: 2, // elotes por cada segundo de caballito
  perfectPitch: 0.12, // rad de tolerancia para "aterrizaje perfecto"
  perfectBonus: 3,
  comboWindowMs: 2500, // trucos seguidos dentro de esta ventana suben el combo
  comboMax: 5,
};
