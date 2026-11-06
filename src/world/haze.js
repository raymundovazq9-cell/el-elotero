import { SVG_SCALE, SVG_ASSETS, FONDO_VARIANTS } from '../assets.js';

/**
 * Bruma de profundidad: lo que está detrás de la calle se mezcla hacia un
 * gris azulado y, si está muy lejos, se desenfoca. El desenfoque va horneado
 * en el propio SVG (filtro feGaussianBlur) para que no cueste nada en juego.
 */
export const HAZE = '#b4c4d4';
export const HAZE_INT = 0xb4c4d4;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (n) => n.toString(16).padStart(2, '0');

/** Mezcla un color '#rrggbb' hacia `haze` en proporción k (0 = igual, 1 = bruma). */
export function mixHex(hex, haze, k) {
  const a = hexToRgb(hex);
  const b = hexToRgb(haze);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * k));
  return `#${toHex(m[0])}${toHex(m[1])}${toHex(m[2])}`;
}

/** Igual que mixHex pero con enteros 0xrrggbb. */
export function mixColor(color, haze, k) {
  const a = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
  const b = [(haze >> 16) & 255, (haze >> 8) & 255, haze & 255];
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * k));
  return (m[0] << 16) | (m[1] << 8) | m[2];
}

/**
 * Devuelve el texto del SVG con todos los colores mezclados hacia la bruma y,
 * si blur > 0, envuelto en un filtro de desenfoque.
 */
export function muteSvg(text, { haze = HAZE, k = 0.35, blur = 0 } = {}) {
  let out = text.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m) => mixHex(m, haze, k));
  if (blur > 0) {
    const open = out.indexOf('<svg');
    const end = out.indexOf('>', open);
    const close = out.lastIndexOf('</svg>');
    if (open >= 0 && end > open && close > end) {
      const defs = `<defs><filter id="bruma" x="-6%" y="-6%" width="112%" height="112%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><g filter="url(#bruma)">`;
      out = out.slice(0, end + 1) + defs + out.slice(end + 1, close) + '</g>' + out.slice(close);
    }
  }
  return out;
}

/** Clave de la variante con bruma de una textura, o la original si no existe. */
export function fondoKey(scene, key) {
  const k = `${key}@fondo`;
  return scene.textures.exists(k) ? k : key;
}

/**
 * Encola en el loader (llamar antes de load.start) las variantes `<key>@fondo`
 * de la escenografía a partir del texto de cada SVG (`svg-<key>` en el cache).
 */
export function loadFondoVariants(scene) {
  let n = 0;
  for (const v of FONDO_VARIANTS) {
    const key = `${v.key}@fondo`;
    if (scene.textures.exists(key)) continue;
    const text = scene.cache.text.get(`svg-${v.key}`);
    if (!text) continue;
    const asset = SVG_ASSETS.find((a) => a.key === v.key);
    const svg = muteSvg(text, v);
    const uri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    scene.load.svg(key, uri, { scale: (asset && asset.scale) || SVG_SCALE });
    n++;
  }
  return n;
}
