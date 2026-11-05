// Ropa del elotero: solo adorno. Cada prenda es una capa SVG (80x100, mismo
// marco que el torso) que se dibuja sobre la cadera del elotero.

export const CLOTHES = [
  // sombreros
  { id: 'paja', tipo: 'sombrero', nombre: 'Sombrero de paja', precio: 0 },
  { id: 'gorra', tipo: 'sombrero', nombre: 'Gorra', precio: 200 },
  { id: 'tejana', tipo: 'sombrero', nombre: 'Tejana', precio: 350 },
  { id: 'charro', tipo: 'sombrero', nombre: 'Sombrero de charro', precio: 500 },
  { id: 'lucha', tipo: 'sombrero', nombre: 'Máscara de luchador', precio: 500 },
  // mandiles
  { id: 'blanco', tipo: 'mandil', nombre: 'Mandil blanco', precio: 0 },
  { id: 'rojo', tipo: 'mandil', nombre: 'Mandil rojo', precio: 100 },
  { id: 'verde', tipo: 'mandil', nombre: 'Mandil verde', precio: 100 },
  { id: 'rosa', tipo: 'mandil', nombre: 'Mandil rosa', precio: 150 },
  { id: 'elote', tipo: 'mandil', nombre: 'Mandil bordado', precio: 250 },
  // playeras
  { id: 'azul', tipo: 'playera', nombre: 'Playera azul', precio: 0 },
  { id: 'roja', tipo: 'playera', nombre: 'Playera roja', precio: 150 },
  { id: 'verde', tipo: 'playera', nombre: 'Playera verde', precio: 150 },
  { id: 'rayas', tipo: 'playera', nombre: 'Playera de rayas', precio: 300 },
  { id: 'cuadros', tipo: 'playera', nombre: 'Camisa de cuadros', precio: 300 },
];

export const CLOTHES_TYPES = [
  { id: 'sombrero', nombre: 'Sombreros' },
  { id: 'mandil', nombre: 'Mandiles' },
  { id: 'playera', nombre: 'Playeras' },
];

export const DEFAULT_EQUIPPED = { sombrero: 'paja', mandil: 'blanco', playera: 'azul' };

/** Clave de textura de una prenda. */
export function clothKey(tipo, id) {
  return `${tipo}-${id}`;
}

/** Equipamiento completo (con los valores por defecto donde falte). */
export function equippedWith(partial = {}) {
  return { ...DEFAULT_EQUIPPED, ...partial };
}

export function clothesOf(tipo) {
  return CLOTHES.filter((c) => c.tipo === tipo);
}
