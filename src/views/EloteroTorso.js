import { svgImage } from '../assets.js';
import { clothKey, equippedWith } from '../data/clothes.js';

const ORIGIN = { x: 40 / 80, y: 86 / 100 }; // cadera dentro del marco 80x100

/**
 * Torso del elotero por capas: playera (con brazos), cabeza, mandil y
 * sombrero. Devuelve un Container cuyo (0,0) es la cadera.
 */
export function buildEloteroTorso(scene, equipped = {}) {
  const eq = equippedWith(equipped);
  const layer = (key) => {
    const k = scene.textures.exists(key) ? key : null;
    return k ? svgImage(scene, 0, 0, k).setOrigin(ORIGIN.x, ORIGIN.y) : null;
  };
  const parts = [
    layer(clothKey('playera', eq.playera)),
    layer('elotero-cabeza'),
    layer(clothKey('mandil', eq.mandil)),
    layer(clothKey('sombrero', eq.sombrero)),
  ].filter(Boolean);
  return scene.add.container(0, 0, parts);
}
