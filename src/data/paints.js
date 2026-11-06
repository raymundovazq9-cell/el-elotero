// Pintura y calcomanías del carrito (solo adorno). La pintura reemplaza los
// colores base del SVG del carrito (ver `vista.pintura` en carts.js); la
// calcomanía es una imagen pequeña pegada en `vista.calcomania`.

export const PAINTS = [
  { id: 'original', nombre: 'De fábrica', precio: 0, color: null },
  { id: 'rojo', nombre: 'Rojo', precio: 150, color: '#c0392b' },
  { id: 'azul', nombre: 'Azul', precio: 150, color: '#2b6cb0' },
  { id: 'verde', nombre: 'Verde', precio: 150, color: '#2e8b57' },
  { id: 'rosa', nombre: 'Rosa', precio: 250, color: '#e4007c' },
  { id: 'morado', nombre: 'Morado', precio: 250, color: '#8e44ad' },
  { id: 'negro', nombre: 'Negro', precio: 300, color: '#3a3a3a' },
  { id: 'blanco', nombre: 'Blanco', precio: 300, color: '#f4f1ea' },
  { id: 'dorado', nombre: 'Dorado', precio: 600, color: '#d4a017' },
];

export const STICKERS = [
  { id: 'se-vende', nombre: 'Se vende', precio: 150 },
  { id: 'balon', nombre: 'Balón', precio: 150 },
  { id: 'virgencita', nombre: 'Virgencita', precio: 200 },
  { id: 'ojo', nombre: 'Ojo turco', precio: 250 },
  { id: 'llamas', nombre: 'Llamas', precio: 300 },
  { id: 'calavera', nombre: 'Calavera', precio: 400 },
];

export function paintById(id) {
  return PAINTS.find((p) => p.id === id) || PAINTS[0];
}

export function stickerById(id) {
  return STICKERS.find((s) => s.id === id) || null;
}

/** Oscurece un color hex (#rrggbb) una fracción k. */
export function darkenHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * (1 - k)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
