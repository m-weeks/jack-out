import Phaser from 'phaser';
import { BULLET_VELOCITY } from './constants';

export const bullets = [];

export let player = {
  x: 400,
  y: 300,
  lastShotTime: 0,
  shooting: true,
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
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    pointer: scene.input.activePointer,
  };
};

/**
 * 
 * @param {Phaser.Scene} scene 
 */
export const addBullet = (scene, player) => {
  const bullet = {
    x: player.x,
    y: player.y,
    angle: player.angle,
    velocityX: BULLET_VELOCITY * Math.cos(player.angle),
    velocityY: BULLET_VELOCITY * Math.sin(player.angle),
    destroyed: false,
  }

  bullet.sprite = scene.physics.add.sprite(bullet.x, bullet.y, 'bullet');
  bullet.sprite.setRotation(bullet.angle);
  bullet.sprite.setScale(0.1);

  bullets.push(bullet);
}
