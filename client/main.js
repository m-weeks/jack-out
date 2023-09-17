import './style.css';
import Phaser from 'phaser';
import { gameTick, init } from './game/game';
import './game/serverConnection';

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
    create: function() {
      init(this);
    },
    update: function (time, delta) {
      gameTick(time, delta, this);
    }
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('player', '/assets/token.png');
  this.load.image('playerDead', '/assets/token_dead.png');
  this.load.image('bullet', '/assets/bullet.png');
  this.load.image('killed', '/assets/killed.png');
  this.load.image('tiles', '/assets/tiles.png');
}

// Resize game if window changes
window.addEventListener('resize', function() {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
