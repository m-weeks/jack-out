import { BULLET_COOLDOWN, PLAYER_VELOCITY } from './constants';
import { player, keys, bullets, addBullet } from './player';

const doMovement = (delta, scene) => {
  // Calculate the new position based on key presses
  if (keys.left.isDown) {
    player.x -= PLAYER_VELOCITY * (delta / 1000);
  } else if (keys.right.isDown) {
    player.x += PLAYER_VELOCITY * (delta / 1000);
  }
  if (keys.up.isDown) {
    player.y -= PLAYER_VELOCITY * (delta / 1000);
  } else if (keys.down.isDown) {
    player.y += PLAYER_VELOCITY * (delta / 1000);
  }

  player.x = Math.max(0, player.x);
  player.x = Math.min(scene.scale.width, player.x);
  player.y = Math.max(0, player.y);
  player.y = Math.min(scene.scale.height, player.y);

  player.sprite.setPosition(player.x, player.y);

  player.angle = Phaser.Math.Angle.Between(player.x, player.y, keys.pointer.x, keys.pointer.y);
  player.sprite.setRotation(player.angle);
};

const renderBullets = (time, delta, scene) => {
  if (!player.shooting && keys.pointer.leftButtonDown() && (time - player.lastShotTime) > BULLET_COOLDOWN) {
    player.lastShotTime = time;
    player.shooting = true;
    addBullet(scene, player)
  }
  if (keys.pointer.leftButtonReleased()) {
    player.shooting = false;
  }

  let destroyedIndexes = [];

  bullets.forEach((bullet, index) => {
    bullet.x += bullet.velocityX * (delta / 1000);
    bullet.y += bullet.velocityY * (delta / 1000);

    if (bullet.x < 0 || bullet.x > scene.scale.width) {
      bullet.destroyed = true;
    }
    if (bullet.y < 0 || bullet.y > scene.scale.height) {
      bullet.destroyed = true;
    }

    if (!bullet.destroyed) {
      bullet.sprite.setPosition(bullet.x, bullet.y);
      return;
    }

    bullet.sprite.destroy();
    destroyedIndexes.push(index);
  });

  // Remove any destroyed bullets from the bullet array.
  // Do this in reverse order so the last bullets in the array get destroyed first so we don't mess up the indexes
  destroyedIndexes = destroyedIndexes.reverse();
  destroyedIndexes.forEach((index) => {
    bullets.splice(index, 1);
  });
}

export function gameTick(time, delta, scene) {
  doMovement(delta, scene);
  renderBullets(time, delta, scene);
}