import { svgImage, SVG_SCALE } from '../assets.js';
import EloteroView from './EloteroView.js';

const WHEEL_IMAGE_R = 17; // radio físico para el que se dibujó rueda.svg

/** Dibuja el carrito, las ruedas, el elotero y el vapor siguiendo los cuerpos de Matter. */
export default class CartView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../objects/Cart.js').default} cart
   * @param {object} vista datos de dibujo del modelo (data/carts.js → vista)
   */
  constructor(scene, cart, vista) {
    this.scene = scene;
    this.cart = cart;
    this.vista = vista;

    this.body = svgImage(scene, 0, 0, vista.cuerpo).setDepth(0);
    this.body.setOrigin((vista.origen.x * SVG_SCALE) / this.body.width, (vista.origen.y * SVG_SCALE) / this.body.height);
    this.wheels = cart.wheelSpecs.map((ws) =>
      svgImage(scene, 0, 0, 'rueda')
        .setScale((ws.r / WHEEL_IMAGE_R) * (1 / SVG_SCALE))
        .setDepth(0.5)
    );
    this.elotero = new EloteroView(scene, cart, vista.elotero);

    // paredes extra (mejora de canasta): tablitas encima de las paredes dibujadas
    const extra = (cart.spec.wallHeight || 0) - (cart.baseWallHeight || cart.spec.wallHeight);
    this.walls = null;
    if (extra > 0) {
      const g = scene.add.graphics().setDepth(0.1);
      const spec = cart.spec;
      const wx = (spec.boxWidth || spec.bodyWidth) / 2 - spec.wallThickness / 2;
      const top = -(spec.bodyHeight / 2 + (cart.baseWallHeight || 0)) + 2;
      for (const side of [-1, 1]) {
        const x = (spec.boxX || 0) + side * wx;
        g.fillStyle(0x8b4513, 1);
        g.lineStyle(3, 0x1a1a1a, 1);
        g.fillRoundedRect(x - spec.wallThickness / 2, top - extra, spec.wallThickness, extra + 4, 2);
        g.strokeRoundedRect(x - spec.wallThickness / 2, top - extra, spec.wallThickness, extra + 4, 2);
      }
      this.walls = g;
    }

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
    if (this.walls) this.walls.setPosition(b.position.x, b.position.y).setRotation(b.angle);
    this.cart.wheels.forEach((w, i) => {
      this.wheels[i].setPosition(w.position.x, w.position.y).setRotation(w.angle);
    });
    const pot = this.local(this.vista.olla.x, this.vista.olla.y);
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
    if (this.walls) this.walls.destroy();
    this.body.destroy();
    this.wheels.forEach((w) => w.destroy());
    this.elotero.destroy();
    this.steam.destroy();
  }
}
