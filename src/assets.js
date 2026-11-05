// Lista única de recursos gráficos. Cada SVG se rasteriza a SVG_SCALE para pantallas retina
// y se muestra reducido con svgImage() para que 1 unidad del SVG = 1 px del juego.

export const SVG_SCALE = 2;

export const SVG_ASSETS = [
  { key: 'elote', url: 'assets/svg/elote.svg', scale: SVG_SCALE },
  { key: 'carrito', url: 'assets/svg/carrito.svg', scale: SVG_SCALE },
  { key: 'rueda', url: 'assets/svg/rueda.svg', scale: SVG_SCALE },
  { key: 'elotero-torso', url: 'assets/svg/elotero-torso.svg', scale: SVG_SCALE },
  { key: 'elotero-pierna', url: 'assets/svg/elotero-pierna.svg', scale: SVG_SCALE },
];

export const IMAGE_ASSETS = [];

/** Crea una imagen SVG al tamaño lógico (1 unidad SVG = 1 px). */
export function svgImage(scene, x, y, key) {
  return scene.add.image(x, y, key).setScale(1 / SVG_SCALE);
}

export function loadAssets(loader) {
  for (const a of SVG_ASSETS) loader.svg(a.key, a.url, { scale: a.scale });
  for (const a of IMAGE_ASSETS) loader.image(a.key, a.url);
}
