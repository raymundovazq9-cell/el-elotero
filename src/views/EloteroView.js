import { svgImage } from '../assets.js';
import Phaser from 'phaser';
import { buildEloteroTorso, ARM_POSES } from './EloteroTorso.js';
import { Save } from '../save.js';

const STRIDE_PX = 90; // avance por zancada
const LEG_LEN = 44; // largo de la pierna en px (origen en la cadera)

/**
 * El elotero según el carrito: 'empujando' corre detrás con las piernas en el
 * piso, 'montado' pedalea sentado y 'manejando' va en la cabina sin piernas.
 * La cabeza tiene inercia, los brazos se levantan en el aire, y la cara cambia
 * (susto al ir de cabeza o con golpes, feliz al caer una marometa).
 */
export default class EloteroView {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../objects/Cart.js').default} cart
   * @param {{modo:string,x:number,y:number}} [pose] posición de la cadera respecto al chasis
   * @param {object} [equipped] ropa (por defecto la del jugador)
   */
  constructor(scene, cart, pose = { modo: 'empujando', x: -98, y: 2 }, equipped = null) {
    this.scene = scene;
    this.cart = cart;
    this.pose = pose;
    this.phase = 0;
    this.airBlend = 0;
    this.wobble = 0;
    this.legScale = 1;
    this.headAngle = 0;
    this.prevVx = 0;
    this.armFront = ARM_POSES[pose.modo].front;
    this.armBack = ARM_POSES[pose.modo].back;
    this.sustoUntil = 0;
    this.felizUntil = 0;
    this.celebrate = 0; // 0..1 salto del torso al celebrar

    this.legBack = svgImage(scene, 0, 0, 'elotero-pierna')
      .setOrigin(8 / 20, 2 / 46)
      .setTint(0xbdbdbd);
    this.legFront = svgImage(scene, 0, 0, 'elotero-pierna').setOrigin(8 / 20, 2 / 46);
    this.torso = buildEloteroTorso(scene, equipped || Save.data.clothes.equipped);
    if (pose.modo === 'manejando') {
      this.legBack.setVisible(false);
      this.legFront.setVisible(false);
    }

    this.container = scene.add.container(0, 0, [this.legBack, this.torso, this.legFront]).setDepth(-1);

    scene.events.on('bump', this.onBump, this);
    scene.events.on('marometa', this.onCelebrate, this);
    scene.events.on('perfecto', this.onCelebrate, this);
    scene.events.on('perro-hit', this.onScare, this);
    scene.events.on('dona-hit', this.onScare, this);
    scene.events.on('robo', this.onScare, this);
    scene.events.on('cable-hit', this.onScare, this);
  }

  onBump() {
    this.scene.tweens.add({ targets: this, wobble: { from: 0.25, to: 0 }, duration: 350, ease: 'Sine.easeOut' });
    this.headAngle += 0.35;
  }

  onScare() {
    this.sustoUntil = this.scene.time.now + 700;
  }

  onCelebrate() {
    this.felizUntil = this.scene.time.now + 900;
    this.scene.tweens.add({ targets: this, celebrate: { from: 1, to: 0 }, duration: 700, ease: 'Bounce.easeOut' });
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
    const now = this.scene.time.now;
    const longAir = !this.cart.grounded && this.cart.airTotalMs > 400;

    // cabeza con inercia: se va hacia atrás al acelerar y gira contra el giro del carrito
    const ax = this.cart.speedX - this.prevVx;
    this.prevVx = this.cart.speedX;
    const target = Phaser.Math.Clamp(-ax * 0.12 - b.angularVelocity * 2.5 + (longAir ? -0.15 : 0), -0.5, 0.5);
    this.headAngle = Phaser.Math.Linear(this.headAngle, target, 0.18);
    this.torso.head.setRotation(this.headAngle);

    // cara
    const upsideDown = Math.abs(Phaser.Math.Angle.WrapDegrees(this.cart.angleDeg)) > 80;
    if (this.cart.tipped || (longAir && upsideDown) || now < this.sustoUntil) this.torso.setCara('susto');
    else if (now < this.felizUntil) this.torso.setCara('feliz');
    else this.torso.setCara('normal');

    // brazos: pose del modo, o arriba ondeando en el aire y al celebrar
    const poses = ARM_POSES[this.pose.modo];
    let front = poses.front;
    let back = poses.back;
    if (now < this.felizUntil) {
      front = -1.9 + Math.sin(now / 60) * 0.25;
      back = -1.7 - Math.sin(now / 60) * 0.25;
    } else if (longAir) {
      front = -1.5 + Math.sin(now / 70) * 0.3;
      back = -1.3 + Math.cos(now / 70) * 0.3;
    }
    this.armFront = Phaser.Math.Linear(this.armFront, front, 0.2);
    this.armBack = Phaser.Math.Linear(this.armBack, back, 0.2);
    this.torso.armFront.setRotation(this.armFront);
    this.torso.armBack.setRotation(this.armBack);

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

    const bob = Math.abs(Math.cos(this.phase)) * 3 * (1 - this.airBlend) + this.celebrate * 10;
    this.torso.setPosition(0, -bob).setRotation(-0.22 + this.wobble);
  }

  syncRiding() {
    // pedaleo: piernas hacia adelante-abajo alternando
    const pedal = Math.sin(this.phase * 0.8) * 0.45;
    this.legFront.setScale(0.5, 0.45).setRotation(-0.75 + pedal);
    this.legBack.setScale(0.5, 0.45).setRotation(-0.75 - pedal);
    const bob = Math.abs(Math.sin(this.phase * 0.8)) * 1.5 + this.celebrate * 8;
    this.torso.setPosition(0, -bob).setRotation(0.08 + this.wobble - this.airBlend * 0.15);
  }

  syncDriving() {
    const bob = Math.sin(this.scene.time.now / 160) * 1.2 * (1 - this.airBlend) + this.celebrate * 8;
    this.torso.setPosition(0, -bob).setRotation(this.wobble * 0.6 - this.airBlend * 0.1);
  }

  setVisible(v) {
    this.container.setVisible(v);
  }

  destroy() {
    const ev = this.scene.events;
    ev.off('bump', this.onBump, this);
    ev.off('marometa', this.onCelebrate, this);
    ev.off('perfecto', this.onCelebrate, this);
    ev.off('perro-hit', this.onScare, this);
    ev.off('dona-hit', this.onScare, this);
    ev.off('robo', this.onScare, this);
    ev.off('cable-hit', this.onScare, this);
    this.container.destroy();
  }
}
