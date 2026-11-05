import { svgImage } from '../assets.js';
/** Una imagen por elote físico; se crean y destruyen siguiendo a EloteManager. */
export default class EloteView {
  constructor(scene, elotes) {
    this.scene = scene;
    this.elotes = elotes;
    this.images = new Map(); // body.id -> Image
    this.pickupImages = new Map();
  }

  syncPickups() {
    const alive = new Set();
    for (const body of this.elotes.pickups) {
      alive.add(body.id);
      if (!this.pickupImages.has(body.id)) {
        const img = svgImage(this.scene, body.position.x, body.position.y, 'elote').setDepth(-3).setScale(0.55);
        this.scene.tweens.add({ targets: img, scale: 0.65, y: img.y - 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.pickupImages.set(body.id, img);
      }
    }
    for (const [id, img] of this.pickupImages) {
      if (!alive.has(id)) {
        img.destroy();
        this.pickupImages.delete(id);
      }
    }
  }

  sync() {
    this.syncPickups();
    const alive = new Set();
    for (const body of this.elotes.elotes) {
      alive.add(body.id);
      let img = this.images.get(body.id);
      if (!img) {
        img = svgImage(this.scene, 0, 0, 'elote').setDepth(1).setScale(0.42);
        this.images.set(body.id, img);
      }
      img.setPosition(body.position.x, body.position.y).setRotation(body.angle);
    }
    for (const [id, img] of this.images) {
      if (!alive.has(id)) {
        img.destroy();
        this.images.delete(id);
      }
    }
  }

  destroy() {
    this.images.forEach((img) => img.destroy());
    this.images.clear();
    this.pickupImages.forEach((img) => img.destroy());
    this.pickupImages.clear();
  }
}
