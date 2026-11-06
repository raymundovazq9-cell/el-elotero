import Phaser from 'phaser';
import { svgImage, SVG_SCALE } from '../assets.js';
import { slotLocalFor } from '../objects/EloteManager.js';
import EloteroView from './EloteroView.js';

const WHEEL_IMAGE_R = 17; // radio físico para el que se dibujó rueda.svg

/** Dibuja el carrito, las ruedas, el elotero y el vapor siguiendo los cuerpos de Matter. */
export default class CartView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../objects/Cart.js').default} cart
   * @param {object} vista datos de dibujo del modelo (data/carts.js → vista)
   */
  constructor(scene, cart, vista, opts = {}) {
    this.scene = scene;
    this.cart = cart;
    this.vista = vista;
    this.depth = opts.depth ?? 0;

    this.body = svgImage(scene, 0, 0, opts.bodyKey || vista.cuerpo).setDepth(this.depth);
    // calcomanía pegada al cuerpo
    this.sticker = null;
    if (opts.calca && vista.calcomania && scene.textures.exists(`calca-${opts.calca}`)) {
      this.sticker = svgImage(scene, 0, 0, `calca-${opts.calca}`).setDepth(this.depth + 0.05);
    }
    this.body.setOrigin((vista.origen.x * SVG_SCALE) / this.body.width, (vista.origen.y * SVG_SCALE) / this.body.height);
    this.wheels = cart.wheelSpecs.map((ws) =>
      svgImage(scene, 0, 0, 'rueda')
        .setScale((ws.r / WHEEL_IMAGE_R) * (1 / SVG_SCALE))
        .setDepth(this.depth + 0.5)
    );
    this.elotero = new EloteroView(scene, cart, vista.elotero, opts.equipped || null, { rival: !!opts.rival });
    this.elotero.container.setDepth(this.depth - 1);
    // elotes pintados (rivales: no llevan elotes físicos)
    this.fakeElotes = [];
    for (let i = 0; i < (opts.fakeElotes || 0); i++) {
      this.fakeElotes.push(
        svgImage(scene, 0, 0, 'elote')
          .setScale(0.27)
          .setDepth(this.depth - 0.2)
          .setRotation((i % 3) * 0.12 - 0.12)
      );
    }

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

    this.squash = 0; // 0..1, aplasta el cuerpo al aterrizar
    this.rival = !!opts.rival;
    if (!this.rival) scene.events.on('landing', this.onLanding, this);
    this.sync();
  }

  /** Aplasta un poco el cuerpo al caer (más con más impacto). */
  onLanding(impact) {
    const amount = Phaser.Math.Clamp(impact / 14, 0.25, 1);
    if (this.squashTween) this.squashTween.stop();
    this.squash = amount;
    this.squashTween = this.scene.tweens.add({
      targets: this,
      squash: 0,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  local(dx, dy) {
    const b = this.cart.chassis;
    const cos = Math.cos(b.angle);
    const sin = Math.sin(b.angle);
    return {
      x: b.position.x + dx * cos - dy * sin,
      y: b.position.y + dx * sin + dy * cos,
    };
  }

  sync(delta = 16) {
    const b = this.cart.chassis;
    this.body.setPosition(b.position.x, b.position.y).setRotation(b.angle);
    this.body.setScale((1 + 0.08 * this.squash) / SVG_SCALE, (1 - 0.12 * this.squash) / SVG_SCALE);
    if (this.sticker) {
      const sp = this.local(this.vista.calcomania.x, this.vista.calcomania.y);
      this.sticker.setPosition(sp.x, sp.y).setRotation(b.angle);
    }
    if (this.walls) this.walls.setPosition(b.position.x, b.position.y).setRotation(b.angle);
    this.cart.wheels.forEach((w, i) => {
      this.wheels[i].setPosition(w.position.x, w.position.y).setRotation(w.angle);
    });
    const pot = this.local(this.vista.olla.x, this.vista.olla.y);
    this.steam.setPosition(pot.x, pot.y);
    this.fakeElotes.forEach((img, i) => {
      const s = slotLocalFor(this.cart.spec, i);
      const p = this.local(s.x, s.y);
      img.setPosition(p.x, p.y).setRotation(b.angle + (i % 3) * 0.12 - 0.12);
    });
    this.elotero.sync(delta);
  }

  setAlpha(a) {
    if (this.alpha_ === a) return;
    this.alpha_ = a;
    this.body.setAlpha(a);
    if (this.sticker) this.sticker.setAlpha(a);
    this.wheels.forEach((w) => w.setAlpha(a));
    this.fakeElotes.forEach((e) => e.setAlpha(a));
    this.elotero.container.setAlpha(a);
    this.steam.setAlpha(a);
  }

  setVisible(v) {
    this.body.setVisible(v);
    if (this.sticker) this.sticker.setVisible(v);
    this.wheels.forEach((w) => w.setVisible(v));
    this.elotero.setVisible(v);
    this.steam.setVisible(v);
  }

  destroy() {
    if (!this.rival) this.scene.events.off('landing', this.onLanding, this);
    this.fakeElotes.forEach((e) => e.destroy());
    if (this.walls) this.walls.destroy();
    this.body.destroy();
    if (this.sticker) this.sticker.destroy();
    this.wheels.forEach((w) => w.destroy());
    this.elotero.destroy();
    this.steam.destroy();
  }
}
