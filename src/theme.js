// Paleta, fuente y estilos de texto compartidos por todas las escenas.

export const FONT_FAMILY = 'Fredoka, Arial, sans-serif';

export const COLORS = {
  rosa: 0xe4007c,
  rosaHex: '#e4007c',
  verde: 0x2e8b57,
  verdeHex: '#2e8b57',
  amarillo: 0xf7c948,
  amarilloHex: '#f7c948',
  naranja: 0xf2762e,
  naranjaHex: '#f2762e',
  azul: 0x2b6cb0,
  azulHex: '#2b6cb0',
  noche: 0x1b2a49,
  nocheHex: '#1b2a49',
  crema: 0xfff4d6,
  cremaHex: '#fff4d6',
  cafe: 0x6b3e1e,
  cafeHex: '#6b3e1e',
  blanco: '#ffffff',
  negro: '#1a1a1a',
};

/** Estilo de texto base con contorno, para que se lea sobre cualquier fondo. */
export function textStyle(size, color = COLORS.blanco, extra = {}) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: '600',
    color,
    stroke: COLORS.negro,
    strokeThickness: Math.max(3, Math.round(size / 9)),
    align: 'center',
    ...extra,
  };
}

/** Colores del cielo según la fase del día: 0 = tarde, 1 = atardecer, 2 = noche. */
export const SKY_PHASES = [
  { top: 0x5aa9e6, bottom: 0xbfe3ff, ambient: 0xffffff, night: 0 },
  { top: 0x4a3f8f, bottom: 0xff9a5c, ambient: 0xffd9b0, night: 0.1 },
  { top: 0x0b1030, bottom: 0x2b3a7a, ambient: 0x8a93c9, night: 0.55 },
];
