/**
 * Cambia de escena con la cortina de lona (WipeScene). Detiene la escena que
 * llama y las que se pasen en `stop`.
 */
export function wipeTo(scene, next, data = undefined, stop = []) {
  const keys = [scene.scene.key, ...stop].filter((k) => k !== 'Wipe');
  scene.scene.launch('Wipe', { next, data, stop: keys });
}
