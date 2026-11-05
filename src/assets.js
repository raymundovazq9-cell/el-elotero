// Lista única de recursos gráficos. Cada SVG se rasteriza a `scale` para pantallas retina.

export const SVG_ASSETS = [
  { key: 'elote', url: 'assets/svg/elote.svg', scale: 2 },
];

export const IMAGE_ASSETS = [];

export function loadAssets(loader) {
  for (const a of SVG_ASSETS) loader.svg(a.key, a.url, { scale: a.scale });
  for (const a of IMAGE_ASSETS) loader.image(a.key, a.url);
}
