import Phaser from 'phaser';
import { DEBUG } from '../debug.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.input.addPointer(1);
    this.scene.start(DEBUG.test ? 'Game' : 'Title');
  }
}
