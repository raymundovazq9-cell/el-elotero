import { svgImage } from '../assets.js';
import Phaser from 'phaser';

const STRIDE_PX = 90; // avance por zancada
const LEG_LEN = 44; // largo de la pierna en px (origen en la cadera)

/**
 * El elotero según el carrito: 'empujando' corre detrás con las piernas en el
 * piso, 'montado' pedalea sentado y 'manejando' va en la cabina sin piernas.
 */
export default class EloteroView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../objects/Cart.js').default} cart
   * @param {{modo:string,x:number,y:number}} [pose] posición de la cadera respecto al chasis
   */
  constructor(scene, cart, pose = { modo: 'empujando', x: -98, y: 2 }) {
    this.scene = scene;
    this.cart = cart;
    this.pose = pose;
    this.phase = 0;
    this.airBlend = 0;
    this.wobble = 0;
    this.legScale = 1;

    this.legBack = svgImage(scene, 0, 0, 'elotero-pierna').setOrigin(8 / 20, 2 / 46).setTint(0xbdbdbd);
    this.legFront = svgImage(scene, 0, 0, 'elotero-pierna').setOrigin(8 / 20, 2 / 46);
    this.torso = svgImage(scene, 0, 0, 'elotero-torso').setOrigin(40 / 80, 86 / 100);
    if (pose.modo === 'manejando') {
      this.legBack.setVisible(false);
      this.legFront.setVisible(false);
    }

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
    const x = b.position.x + this.pose.x * cos - this.pose.y * sin;
    const y = b.position.y + this.pose.x * sin + this.pose.y * cos;
    this.container.setPosition(x, y).setRotation(b.angle);

    const vx = Math.abs(this.cart.speedX);
    this.phase += ((vx * 60) / STRIDE_PX) * Math.PI * 2 * (delta / 1000);
    const targetAir = this.cart.grounded ? 0 : 1;
    this.airBlend = Phaser.Math.Linear(this.airBlend, targetAir, 0.15);

    if (this.pose.modo === 'empujando') this.syncPushing(x, y);
    else if (this.pose.modo === 'montado') this.syncRiding();
    else this.syncDriving();
  }

  syncPushing(x, y) {
    // las piernas se estiran o encogen para pisar el suelo bajo la cadera
    const road = this.scene.road;
    const gy = road && road.surfaceYAt ? road.surfaceYAt(x) : null;
    let legScale = 1;
    if (gy !== null && this.cart.grounded) legScale = Phaser.Math.Clamp((gy - y) / LEG_LEN, 0.6, 1.35);
    this.legScale = Phaser.Math.Linear(this.legScale, legScale, 0.25);
    const svgScale = 0.5 * this.legScale;
    this.legFront.setScale(0.5, svgScale);
    this.legBack.setScale(0.5, svgScale);

    const swing = Math.sin(this.phase) * 0.65 * (1 - this.airBlend);
    const tuck = -0.9 * this.airBlend;
    this.legFront.setRotation(swing + tuck);
    this.legBack.setRotation(-swing + tuck);

    const bob = Math.abs(Math.cos(this.phase)) * 3 * (1 - this.airBlend);
    this.torso.setPosition(0, -bob).setRotation(-0.22 + this.wobble);
  }

  syncRiding() {
    // pedaleo: piernas hacia adelante-abajo alternando
    const pedal = Math.sin(this.phase * 0.8) * 0.45;
    this.legFront.setScale(0.5, 0.45).setRotation(-0.75 + pedal);
    this.legBack.setScale(0.5, 0.45).setRotation(-0.75 - pedal);
    const bob = Math.abs(Math.sin(this.phase * 0.8)) * 1.5;
    this.torso.setPosition(0, -bob).setRotation(0.08 + this.wobble - this.airBlend * 0.15);
  }

  syncDriving() {
    const bob = Math.sin(this.scene.time.now / 160) * 1.2 * (1 - this.airBlend);
    this.torso.setPosition(0, -bob).setRotation(this.wobble * 0.6 - this.airBlend * 0.1);
  }

  setVisible(v) {
    this.container.setVisible(v);
  }

  destroy() {
    this.scene.events.off('bump', this.onBump, this);
    this.container.destroy();
  }
}
