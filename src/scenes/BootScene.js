import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.input.addPointer(1);
    this.scene.start('Game');
  }
}
