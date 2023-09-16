import { PLAYER_VELOCITY } from './constants';
import { player, keys } from './player';

const doMovement = (delta) => {
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
  
    player.sprite.setPosition(player.x, player.y);
}

export function gameTick(time, delta) {
  doMovement(delta);
}