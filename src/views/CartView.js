import { svgImage } from '../assets.js';
import EloteroView from './EloteroView.js';

/** Origen de la imagen del carrito en coordenadas de la imagen (centro del chasis físico). */
const ORIGIN = { x: 80 / 160, y: 67 / 100 };
/** Posición del bote de vapor relativa al chasis. */
const POT_LOCAL = { x: 62, y: -55 };

/** Dibuja el carrito, las ruedas, el elotero y el vapor siguiendo los cuerpos de Matter. */
export default class CartView {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;

    this.body = svgImage(scene, 0, 0, 'carrito').setOrigin(ORIGIN.x, ORIGIN.y).setDepth(0);
    this.wheels = cart.wheels.map(() => svgImage(scene, 0, 0, 'rueda').setDepth(0.5));
    this.elotero = new EloteroView(scene, cart);

    if (!scene.textures.exists('vapor')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture('vapor', 16, 16);
      g.destroy();
    }
    this.steam = scene.add.particles(0, 0, 'vapor', {
      speedY: { min: -40, max: -70 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 1.6 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 900,
      frequency: 120,
      quantity: 1,
    });
    this.steam.setDepth(-0.5);

    this.sync();
  }

  local(dx, dy) {
    const b = this.cart.chassis;
    const cos = Math.cos(b.angle);
    const sin = Math.sin(b.angle);
    return { x: b.position.x + dx * cos - dy * sin, y: b.position.y + dx * sin + dy * cos };
  }

  sync(delta = 16) {
    const b = this.cart.chassis;
    this.body.setPosition(b.position.x, b.position.y).setRotation(b.angle);
    this.cart.wheels.forEach((w, i) => {
      this.wheels[i].setPosition(w.position.x, w.position.y).setRotation(w.angle);
    });
    const pot = this.local(POT_LOCAL.x, POT_LOCAL.y);
    this.steam.setPosition(pot.x, pot.y);
    this.elotero.sync(delta);
  }

  setVisible(v) {
    this.body.setVisible(v);
    this.wheels.forEach((w) => w.setVisible(v));
    this.elotero.setVisible(v);
    this.steam.setVisible(v);
  }

  destroy() {
    this.body.destroy();
    this.wheels.forEach((w) => w.destroy());
    this.elotero.destroy();
    this.steam.destroy();
  }
}
