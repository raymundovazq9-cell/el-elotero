import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './config.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { DEBUG } from './debug.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: PHYSICS.gravityY },
      debug: {
        showBody: true,
        showStaticBody: true,
        showInternalEdges: false,
        renderFill: true,
        renderLine: true,
        fillColor: 0xffffff,
        fillOpacity: 1,
        lineColor: 0x222222,
        lineOpacity: 1,
        lineThickness: 2,
        staticFillColor: 0x5a5a5a,
        staticLineColor: 0x2e2e2e,
        showSensors: true,
        sensorFillColor: 0xffe680,
        sensorLineColor: 0xcc9900,
        showJoint: false,
        showAxes: false,
        showAngleIndicator: false,
        showVelocity: false,
        showCollisions: false,
        showPositions: false,
      },
    },
  },
  input: {
    activePointers: 2,
  },
  fps: {
    target: 60,
    forceSetTimeOut: DEBUG.test,
  },
  scene: [BootScene, GameScene, UIScene, GameOverScene],
};

new Phaser.Game(config);
