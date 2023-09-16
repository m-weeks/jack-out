import Phaser from 'phaser';
const players = [];

export let player = {
  x: 400,
  y: 300,
  sprite: null,
};

export let keys;

/**
 * 
 * @param {Phaser.Scene} scene 
 */
export const initializePlayer = (scene) => {
  player.sprite = scene.physics.add.sprite(player.x, player.y, 'player');
  player.sprite.setCollideWorldBounds(true);
  player.sprite.setScale(0.1);

  keys = {
    up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
  };
};
