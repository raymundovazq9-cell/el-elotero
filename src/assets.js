// Lista única de recursos gráficos. Cada SVG se rasteriza a SVG_SCALE para pantallas retina
// y se muestra reducido con svgImage() para que 1 unidad del SVG = 1 px del juego.

export const SVG_SCALE = 2;

export const SVG_ASSETS = [
  { key: 'elote', url: 'assets/svg/elote.svg', scale: SVG_SCALE },
  { key: 'carrito', url: 'assets/svg/carrito.svg', scale: SVG_SCALE },
  { key: 'triciclo', url: 'assets/svg/triciclo.svg', scale: SVG_SCALE },
  { key: 'bici-carro', url: 'assets/svg/bici-carro.svg', scale: SVG_SCALE },
  { key: 'motocarro', url: 'assets/svg/motocarro.svg', scale: SVG_SCALE },
  { key: 'camioneta', url: 'assets/svg/camioneta.svg', scale: SVG_SCALE },
  { key: 'cuatrimoto', url: 'assets/svg/cuatrimoto.svg', scale: SVG_SCALE },
  { key: 'combi', url: 'assets/svg/combi.svg', scale: SVG_SCALE },
  { key: 'tamalero', url: 'assets/svg/tamalero.svg', scale: SVG_SCALE },
  { key: 'trailer', url: 'assets/svg/trailer.svg', scale: SVG_SCALE },
  { key: 'balon', url: 'assets/svg/balon.svg', scale: SVG_SCALE },
  { key: 'iglesia', url: 'assets/svg/iglesia.svg', scale: SVG_SCALE },
  { key: 'kiosco', url: 'assets/svg/kiosco.svg', scale: SVG_SCALE },
  { key: 'nopal', url: 'assets/svg/nopal.svg', scale: SVG_SCALE },
  { key: 'senal', url: 'assets/svg/senal.svg', scale: SVG_SCALE },
  { key: 'rueda', url: 'assets/svg/rueda.svg', scale: SVG_SCALE },
  { key: 'elotero-cabeza', url: 'assets/svg/elotero-cabeza.svg', scale: SVG_SCALE },
  { key: 'elotero-cabeza-susto', url: 'assets/svg/elotero-cabeza-susto.svg', scale: SVG_SCALE },
  { key: 'elotero-cabeza-feliz', url: 'assets/svg/elotero-cabeza-feliz.svg', scale: SVG_SCALE },
  { key: 'elotero-brazo', url: 'assets/svg/elotero-brazo.svg', scale: SVG_SCALE },
  { key: 'elotero-pierna', url: 'assets/svg/elotero-pierna.svg', scale: SVG_SCALE },
  { key: 'tope', url: 'assets/svg/tope.svg', scale: SVG_SCALE },
  { key: 'perro', url: 'assets/svg/perro.svg', scale: SVG_SCALE },
  { key: 'dona', url: 'assets/svg/dona.svg', scale: SVG_SCALE },
  { key: 'cholo', url: 'assets/svg/cholo.svg', scale: SVG_SCALE },
  { key: 'cliente', url: 'assets/svg/cliente.svg', scale: SVG_SCALE },
  { key: 'camioneta-gas', url: 'assets/svg/camioneta-gas.svg', scale: SVG_SCALE },
  { key: 'poste-caido', url: 'assets/svg/poste-caido.svg', scale: SVG_SCALE },
  { key: 'chile', url: 'assets/svg/chile.svg', scale: SVG_SCALE },
  { key: 'bolsa', url: 'assets/svg/bolsa.svg', scale: SVG_SCALE },
  { key: 'coche', url: 'assets/svg/coche.svg', scale: SVG_SCALE },
  { key: 'casa-detalles-a', url: 'assets/svg/casa-detalles-a.svg', scale: SVG_SCALE },
  { key: 'casa-detalles-b', url: 'assets/svg/casa-detalles-b.svg', scale: SVG_SCALE },
  { key: 'casa-ventanas-a', url: 'assets/svg/casa-ventanas-a.svg', scale: SVG_SCALE },
  { key: 'casa-ventanas-b', url: 'assets/svg/casa-ventanas-b.svg', scale: SVG_SCALE },
  { key: 'poste', url: 'assets/svg/poste.svg', scale: SVG_SCALE },
  { key: 'puesto', url: 'assets/svg/puesto.svg', scale: SVG_SCALE },
  { key: 'puesto-mercado', url: 'assets/svg/puesto-mercado.svg', scale: SVG_SCALE },
  { key: 'puesto-feria', url: 'assets/svg/puesto-feria.svg', scale: SVG_SCALE },
  { key: 'lona', url: 'assets/svg/lona.svg', scale: SVG_SCALE },
  { key: 'rueda-fortuna', url: 'assets/svg/rueda-fortuna.svg', scale: SVG_SCALE },
  { key: 'carpa', url: 'assets/svg/carpa.svg', scale: SVG_SCALE },
  { key: 'senora', url: 'assets/svg/senora.svg', scale: SVG_SCALE },
  { key: 'cerros', url: 'assets/svg/cerros.svg', scale: SVG_SCALE },
  { key: 'nube', url: 'assets/svg/nube.svg', scale: SVG_SCALE },
];

/**
 * Fondos lejanos generados con IA (opcionales). Descarga las imágenes de Canva a
 * public/assets/bg/fondo-tarde.png y fondo-noche.png (2:1, ~1776x896) y pon true.
 */
export const AI_BACKGROUNDS = false;

// prendas del elotero (data/clothes.js): una textura por prenda
import { CLOTHES, clothKey } from './data/clothes.js';
for (const c of CLOTHES) SVG_ASSETS.push({ key: clothKey(c.tipo, c.id), url: `assets/svg/${c.tipo}-${c.id}.svg`, scale: SVG_SCALE });

// calcomanías (data/paints.js)
import { STICKERS } from './data/paints.js';
for (const st of STICKERS) SVG_ASSETS.push({ key: `calca-${st.id}`, url: `assets/svg/calca-${st.id}.svg`, scale: SVG_SCALE });

// texto de los SVG de carritos, para pintarlos en src/paint.js
import { CARTS } from './data/carts.js';
export const TEXT_ASSETS = CARTS.map((c) => ({ key: `svg-${c.id}`, url: `assets/svg/${c.vista.cuerpo}.svg` }));

export const IMAGE_ASSETS = AI_BACKGROUNDS
  ? [
      { key: 'fondo-tarde', url: 'assets/bg/fondo-tarde.png' },
      { key: 'fondo-noche', url: 'assets/bg/fondo-noche.png' },
    ]
  : [];

/** Crea una imagen SVG al tamaño lógico (1 unidad SVG = 1 px). */
export function svgImage(scene, x, y, key) {
  return scene.add.image(x, y, key).setScale(1 / SVG_SCALE);
}

export function loadAssets(loader) {
  for (const a of SVG_ASSETS) loader.svg(a.key, a.url, { scale: a.scale });
  for (const a of IMAGE_ASSETS) loader.image(a.key, a.url);
  for (const a of TEXT_ASSETS) loader.text(a.key, a.url);
}
