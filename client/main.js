import './style.css';
import Phaser from 'phaser';
import { gameTick } from './game/game';
import { initializePlayer } from './game/player';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: gameTick
  }
};

let player = {
  x: 400,
  y: 300,
  sprite: null,
};
let keys;

const game = new Phaser.Game(config);

function preload() {
  this.load.image('player', '/assets/token.png');
}

function create() {
  initializePlayer(this);
}

// Resize game if window changes
window.addEventListener('resize', function() {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
