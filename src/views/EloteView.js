import { svgImage } from '../assets.js';
/** Una imagen por elote físico; se crean y destruyen siguiendo a EloteManager. */
export default class EloteView {
  constructor(scene, elotes) {
    this.scene = scene;
    this.elotes = elotes;
    this.images = new Map(); // body.id -> Image
  }

  sync() {
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
  }
}
