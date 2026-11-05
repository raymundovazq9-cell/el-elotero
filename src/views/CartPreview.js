import { svgImage, SVG_SCALE } from '../assets.js';
import { CART } from '../config.js';
import { slotLocalFor } from '../objects/EloteManager.js';

const WHEEL_IMAGE_R = 17;

/**
 * Carrito estático (sin física) con elotero, ruedas y elotes, para el título
 * y la tienda. Devuelve un Container con `spin()` para animar las ruedas.
 */
export function buildCartPreview(scene, cartData, opts = {}) {
  const spec = { ...CART, ...cartData.fisica };
  const v = cartData.vista;
  const elotes = opts.elotes ?? 6;
  const parts = [];

  // elotero (detrás del carrito)
  const p = v.elotero;
  const legB = svgImage(scene, p.x, p.y, 'elotero-pierna').setOrigin(8 / 20, 2 / 46).setTint(0xbdbdbd);
  const legF = svgImage(scene, p.x, p.y, 'elotero-pierna').setOrigin(8 / 20, 2 / 46);
  const torso = svgImage(scene, p.x, p.y, 'elotero-torso').setOrigin(40 / 80, 86 / 100);
  if (p.modo === 'empujando') {
    legB.setRotation(0.5);
    legF.setRotation(-0.4);
    torso.setRotation(-0.22);
  } else if (p.modo === 'montado') {
    legB.setScale(0.5, 0.45).setRotation(-1.1);
    legF.setScale(0.5, 0.45).setRotation(-0.4);
    torso.setRotation(0.08);
  } else {
    legB.setVisible(false);
    legF.setVisible(false);
  }
  parts.push(legB, torso, legF);

  // cuerpo
  const body = svgImage(scene, 0, 0, v.cuerpo);
  body.setOrigin((v.origen.x * SVG_SCALE) / body.width, (v.origen.y * SVG_SCALE) / body.height);
  parts.push(body);

  // ruedas
  const wheels = spec.wheels.map((ws) => svgImage(scene, ws.x, ws.y, 'rueda').setScale((ws.r / WHEEL_IMAGE_R) * (1 / SVG_SCALE)));
  parts.push(...wheels);

  // elotes en la caja
  for (let i = 0; i < elotes; i++) {
    const s = slotLocalFor(spec, i);
    parts.push(svgImage(scene, s.x, s.y, 'elote').setScale(0.27).setRotation((i % 3) * 0.12 - 0.12));
  }

  const container = scene.add.container(opts.x || 0, opts.y || 0, parts);
  container.wheels = wheels;
  container.elotero = { legB, legF, torso };
  container.spin = (duration = 1400) => scene.tweens.add({ targets: wheels, rotation: Math.PI * 2, duration, repeat: -1 });
  return container;
}
