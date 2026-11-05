import { svgImage } from '../assets.js';
import Phaser from 'phaser';

/** Cadera del elotero relativa al centro del chasis. */
const HIP_LOCAL = { x: -98, y: 2 };
const LEAN = -0.22; // inclinación hacia adelante (rad)
const STRIDE_PX = 90; // avance por zancada
const LEG_LEN = 44; // largo de la pierna en px (origen en la cadera)

/** El elotero empujando el carrito: torso con cabeza y brazos, dos piernas animadas. */
export default class EloteroView {
  constructor(scene, cart) {
    this.scene = scene;
    this.cart = cart;
    this.phase = 0;
    this.airBlend = 0;
    this.wobble = 0;

    this.legBack = svgImage(scene, 0, 0, 'elotero-pierna').setOrigin(8 / 20, 2 / 46).setTint(0xbdbdbd);
    this.legFront = svgImage(scene, 0, 0, 'elotero-pierna').setOrigin(8 / 20, 2 / 46);
    this.torso = svgImage(scene, 0, 0, 'elotero-torso').setOrigin(40 / 80, 86 / 100);

    this.container = scene.add.container(0, 0, [this.legBack, this.torso, this.legFront]).setDepth(-1);

    scene.events.on('bump', this.onBump, this);
  }

  onBump() {
    this.scene.tweens.add({
      targets: this,
      wobble: { from: 0.25, to: 0 },
      duration: 350,
      ease: 'Sine.easeOut',
    });
  }

  sync(delta) {
    const b = this.cart.chassis;
    const cos = Math.cos(b.angle);
    const sin = Math.sin(b.angle);
    const x = b.position.x + HIP_LOCAL.x * cos - HIP_LOCAL.y * sin;
    const y = b.position.y + HIP_LOCAL.x * sin + HIP_LOCAL.y * cos;
    this.container.setPosition(x, y).setRotation(b.angle);

    const vx = Math.abs(this.cart.speedX);
    this.phase += ((vx * 60) / STRIDE_PX) * Math.PI * 2 * (delta / 1000);

    const targetAir = this.cart.grounded ? 0 : 1;
    this.airBlend = Phaser.Math.Linear(this.airBlend, targetAir, 0.15);

    // las piernas se estiran o encogen para pisar el suelo bajo la cadera
    const road = this.scene.road;
    const gy = road && road.surfaceYAt ? road.surfaceYAt(x) : null;
    let legScale = 1;
    if (gy !== null && this.cart.grounded) legScale = Phaser.Math.Clamp((gy - y) / LEG_LEN, 0.6, 1.35);
    this.legScale = Phaser.Math.Linear(this.legScale || 1, legScale, 0.25);
    const svgScale = 0.5 * this.legScale;
    this.legFront.setScale(0.5, svgScale);
    this.legBack.setScale(0.5, svgScale);

    const swing = Math.sin(this.phase) * 0.65 * (1 - this.airBlend);
    const tuck = -0.9 * this.airBlend;
    this.legFront.setRotation(swing + tuck);
    this.legBack.setRotation(-swing + tuck);

    const bob = Math.abs(Math.cos(this.phase)) * 3 * (1 - this.airBlend);
    this.torso.setPosition(0, -bob).setRotation(LEAN + this.wobble);
  }

  setVisible(v) {
    this.container.setVisible(v);
  }

  destroy() {
    this.scene.events.off('bump', this.onBump, this);
    this.container.destroy();
  }
}
