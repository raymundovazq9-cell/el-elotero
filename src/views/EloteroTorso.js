import { svgImage } from '../assets.js';
import { clothKey, equippedWith } from '../data/clothes.js';

const ORIGIN = { x: 40 / 80, y: 86 / 100 }; // cadera dentro del marco 80x100
const NECK = { x: 42, y: 46 }; // punto del cuello dentro del marco
const SHOULDER = { x: 12, y: -37 }; // hombro respecto a la cadera
const ARM_ORIGIN = { x: 6 / 44, y: 8 / 16 };

/**
 * Torso del elotero por capas: brazo de atrás, playera, mandil, cabeza con
 * sombrero (grupo que gira sobre el cuello) y brazo del frente. Devuelve un
 * Container cuyo (0,0) es la cadera, con `head`, `armBack`, `armFront` y
 * `setCara('normal'|'susto'|'feliz')`.
 */
export function buildEloteroTorso(scene, equipped = {}) {
  const eq = equippedWith(equipped);
  const layer = (key) => {
    const k = scene.textures.exists(key) ? key : null;
    return k ? svgImage(scene, 0, 0, k).setOrigin(ORIGIN.x, ORIGIN.y) : null;
  };
  const headLayer = (key) => {
    const k = scene.textures.exists(key) ? key : null;
    return k ? svgImage(scene, 0, 0, k).setOrigin(NECK.x / 80, NECK.y / 100) : null;
  };
  const arm = () => svgImage(scene, SHOULDER.x, SHOULDER.y, 'elotero-brazo').setOrigin(ARM_ORIGIN.x, ARM_ORIGIN.y);

  const armBack = arm().setTint(0xc9c9c9);
  const armFront = arm();
  const cabeza = headLayer('elotero-cabeza');
  const sombrero = headLayer(clothKey('sombrero', eq.sombrero));
  const head = scene.add.container(NECK.x - 40, NECK.y - 86, [cabeza, sombrero].filter(Boolean));

  const parts = [armBack, layer(clothKey('playera', eq.playera)), layer(clothKey('mandil', eq.mandil)), head, armFront].filter(Boolean);
  const container = scene.add.container(0, 0, parts);
  container.head = head;
  container.cabeza = cabeza;
  container.armBack = armBack;
  container.armFront = armFront;
  container.cara = 'normal';
  container.setCara = (kind) => {
    if (kind === container.cara || !cabeza) return;
    const key = kind === 'normal' ? 'elotero-cabeza' : `elotero-cabeza-${kind}`;
    if (!scene.textures.exists(key)) return;
    cabeza.setTexture(key);
    container.cara = kind;
  };
  return container;
}

/** Poses de los brazos (rotación en rad; 0 = hacia adelante) por modo del elotero. */
export const ARM_POSES = {
  empujando: { front: 0.12, back: 0.3 },
  montado: { front: 0.45, back: 0.6 },
  manejando: { front: 0.55, back: 0.7 },
};
