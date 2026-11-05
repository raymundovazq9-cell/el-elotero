import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './config.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import TitleScene from './scenes/TitleScene.js';
import PauseScene from './scenes/PauseScene.js';
import GarageScene from './scenes/GarageScene.js';
import { DEBUG } from './debug.js';
import { Save } from './save.js';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';

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
      debug: DEBUG.physics && {
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
    forceSetTimeOut: DEBUG.headless,
  },
  scene: [BootScene, TitleScene, GarageScene, GameScene, UIScene, PauseScene, GameOverScene],
};

if (DEBUG.reset) Save.reset();
if (DEBUG.bank !== null) Save.addBank(DEBUG.bank - Save.bank);
if (DEBUG.level) Save.select('level', DEBUG.level);
if (DEBUG.cart) Save.select('cart', DEBUG.cart);

new Phaser.Game(config);
