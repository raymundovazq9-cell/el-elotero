import { SVG_SCALE } from './assets.js';
import { paintById, darkenHex } from './data/paints.js';
import { CARTS } from './data/carts.js';

// Pintura de los carritos: el texto de cada SVG se carga en Boot (`svg-<id>`)
// y aquí se generan variantes recoloreadas como texturas `<cart>@<pintura>`.

export function cartTextureKey(cartId, paintId) {
  return !paintId || paintId === 'original' ? cartId : `${cartId}@${paintId}`;
}

/** SVG del carrito con los colores base reemplazados por la pintura. */
export function paintedSvg(text, cartData, paint) {
  const spec = cartData.vista.pintura;
  if (!spec || !paint || !paint.color) return text;
  let out = text;
  const sombra = darkenHex(paint.color, 0.28);
  for (const c of spec.base || []) out = out.split(c).join(paint.color);
  for (const c of spec.sombra || []) out = out.split(c).join(sombra);
  return out;
}

/**
 * Encola en el loader de la escena (llamar desde preload) las texturas de
 * carrito pintadas que falten. items: [{ cartId, paintId }].
 */
export function loadCartPaints(scene, items) {
  for (const it of items) {
    const key = cartTextureKey(it.cartId, it.paintId);
    if (scene.textures.exists(key)) continue;
    const cart = CARTS.find((c) => c.id === it.cartId);
    const text = cart && scene.cache.text.get(`svg-${cart.id}`);
    if (!text) continue;
    const svg = paintedSvg(text, cart, paintById(it.paintId));
    // el loader de Phaser decodifica las data URI con atob: hay que ir en base64
    const uri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    scene.load.svg(key, uri, { scale: SVG_SCALE });
  }
}

/** Clave de textura del cuerpo de un carrito con su pintura (o la original si falta). */
export function bodyTexture(scene, cartData, paintId) {
  const key = cartTextureKey(cartData.id, paintId);
  return scene.textures.exists(key) ? key : cartData.vista.cuerpo;
}
