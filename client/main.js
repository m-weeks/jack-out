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
    update: function (time, delta) {
      gameTick(time, delta, this);
    }
  }
};

let player = {
  x: 400,
  y: 300,
  angle: 0,
  sprite: null,
};
let keys;

const game = new Phaser.Game(config);

function preload() {
  this.load.image('player', '/assets/token.png');
  this.load.image('bullet', '/assets/bullet.png');
}

function create() {
  initializePlayer(this);
}

// Resize game if window changes
window.addEventListener('resize', function() {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
