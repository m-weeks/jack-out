import _ from 'lodash';
import Phaser from 'phaser';
import { BULLET_COOLDOWN, PLAYER_VELOCITY, TILE_SIZE, LEVEL, PLAYER_SIZE } from './constants';
import { localState, gameState, fireWeapon, pickUpPickup, die } from './serverConnection';

const viewState = {
  playerSprites: {},
  pickups: {},
  keys: null,
  layer: null,
}

const isColliding = (x, y) => {
  const trueX = Math.floor(x / TILE_SIZE);
  const trueY = Math.floor(y / TILE_SIZE);

  const tile = LEVEL[trueY][trueX];

  return Boolean(tile);
}

const rangify = (coordinate, range) => {
  return [
    coordinate - (range / 2),
    coordinate + (range / 2),
  ];
}

const isCollidingWithPlayer = (x, y, range = PLAYER_SIZE) => {
  const { myPlayer } = localState;

  const xBounds = rangify(myPlayer.x, range);
  const yBounds = rangify(myPlayer.y, range);

  // If within the x and y bounds
  if (x > xBounds[0] && x < xBounds[1] && y > yBounds[0] && y < yBounds[1]) {
    return true;
  }
  return false;
};

const doMovement = (delta, scene) => {
  if (localState.myPlayer.killed) {
    return;
  }

  if (!viewState.keys) {
    viewState.keys = {
      up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      pointer: scene.input.activePointer,
    };
  }

  const { keys } = viewState;

  const { myPlayer: player } = localState;

  const oldX = player.x;
  const oldY = player.y;

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

  // If player would collide with a wall ignore their movement
  if (isColliding(player.x, player.y)) {
    player.x = oldX;
    player.y = oldY;
  }

  player.angle = Phaser.Math.Angle.Between(scene.scale.width / 2, scene.scale.height /2, keys.pointer.x, keys.pointer.y);
};

const renderBullets = (time, delta, scene) => {
  const { keys } = viewState;

  if (!localState.shooting && keys.pointer.leftButtonDown() && (time - localState.lastShotTime) > BULLET_COOLDOWN) {
    localState.lastShotTime = time;
    localState.shooting = true;
    fireWeapon();
  }
  if (keys.pointer.leftButtonReleased()) {
    localState.shooting = false;
  }

  let destroyedIndexes = [];

  localState.projectiles.forEach((projectile, index) => {
    projectile.x += projectile.velocityX * (delta / 1000);
    projectile.y += projectile.velocityY * (delta / 1000);

    if (!projectile.sprite) {
      projectile.sprite = scene.physics.add.sprite(projectile.x, projectile.y, 'bullet');
      projectile.sprite.setRotation(projectile.angle);
      projectile.sprite.setScale(0.1);
    }

    projectile.sprite.setPosition(projectile.x, projectile.y);

    if (isColliding(projectile.x, projectile.y)) {
      projectile.sprite.destroy();
      destroyedIndexes.push(index);
    }

    if (!localState.killed && projectile.owner !== localState.clientId && isCollidingWithPlayer(projectile.x, projectile.y)) {
      localState.killed = true;
      die(projectile.owner);
    }
  });

  // Remove any destroyed bullets from the bullet array.
  // Do this in reverse order so the last bullets in the array get destroyed first so we don't mess up the indexes
  destroyedIndexes = destroyedIndexes.reverse();
  destroyedIndexes.forEach((index) => {
    localState.projectiles.splice(index, 1);
  });
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
const renderPlayers = (scene) => {
  if (!localState.myPlayer) {
    localState.myPlayer = _.cloneDeep(gameState.players[localState.clientId]);
  }

  const { playerSprites } = viewState;

  Object.values(gameState.players).forEach((player) => {
    // Render a sprite if they already haven't
    if (!playerSprites[player.id]) {
      let sprite = scene.physics.add.sprite(player.x, player.y, 'player');
      sprite.setScale(0.1);
      playerSprites[player.id] = sprite;

      playerSprites[player.id].setPosition(player.x, player.y);
      playerSprites[player.id].setRotation(player.angle);

      // Make camera follow local player
      if(player.id === localState.clientId) {
        scene.cameras.main.startFollow(sprite);
      }
    }
  });

  const otherPlayers = Object.values(_.omit(gameState.players, localState.clientId));

  otherPlayers.forEach((player) => {
    if (player.killed) {
      playerSprites[player.id].setTexture('playerDead');
    }
    playerSprites[player.id].setPosition(player.x, player.y);
    playerSprites[player.id].setRotation(player.angle);
  });

  const { myPlayer } = localState;
  playerSprites[myPlayer.id].setPosition(myPlayer.x, myPlayer.y);
  playerSprites[myPlayer.id].setRotation(myPlayer.angle);

  // Clean old sprites
  const playerIds = Object.keys(gameState.players);
  const oldSprites = _.omit(playerSprites, playerIds);
  for(var playerId in oldSprites) {
    oldSprites[playerId].destroy();
    delete playerSprites[playerId];
  }
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
const renderTimer = (scene) => {
  if (viewState.timer) {
    return;
  }

  const { myPlayer } = localState;

  let seconds = Math.floor(myPlayer.lifetime / 1000);

  const timer = scene.add.text(10, 10, seconds, { fontSize: '32px', fill: '#fff' });
  timer.setScrollFactor(0);

  var event = scene.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      seconds = Math.max(0, --seconds);
      timer.setText(seconds);

      if (seconds === 0) {
        event.destroy();
      }
    }
  });

  viewState.timer = timer;
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
const renderScore = (scene) => {
  const { myPlayer } = localState;
  let score = myPlayer.score ?? 0;

  if (viewState.scoreText) {
    viewState.scoreText.setText(score);

    return;
  }

  const scoreText = scene.add.text(scene.scale.width - 50, scene.scale.height - 50, score, { fontSize: '32px', fill: '#fff' });
  scoreText.setScrollFactor(0);

  viewState.scoreText = scoreText;
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
const renderPickups = (scene) => {
  const { pickups } = localState;

  pickups.forEach((pickup, index) => {
    if (!(viewState.pickups[pickup.id])) {
      let sprite = scene.physics.add.sprite(pickup.x * TILE_SIZE + (TILE_SIZE / 2), pickup.y * TILE_SIZE + (TILE_SIZE / 2), 'dosh');
      viewState.pickups[pickup.id] = sprite;
    }

    const curSprite = viewState.pickups[pickup.id];

    if (!pickups[index].collected && isCollidingWithPlayer(curSprite.x, curSprite.y, 80)) {
      pickups[index].collected = true;
      pickUpPickup(pickup.id);
    }
  });

  // Clean old sprites
  const pickupIds = gameState.pickups.map((pickup) => pickup.id);
  const oldSprites = _.omit(viewState.pickups, pickupIds);
  for(var pickupId in oldSprites) {
    oldSprites[pickupId].destroy();
    delete viewState.pickups[pickupId];
  }
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
export function init(scene) {
  const map = scene.make.tilemap({ data: LEVEL, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tiles = map.addTilesetImage('tiles');
  const layer = map.createLayer(0, tiles, 0, 0);
}

const syncPlayer = () => {
  const currentPlayerState = gameState.players[localState.clientId];

  if (localState.myPlayer) {
    localState.myPlayer.killed = currentPlayerState.killed;
    localState.myPlayer.expired = currentPlayerState.expired;
    localState.myPlayer.score = currentPlayerState.score;
    localState.pickups = _.cloneDeep(gameState.pickups);
  }
}

/**
 * 
 * @param {*} time 
 * @param {*} delta 
 * @param {Phaser.Scene} scene 
 * @returns 
 */
export function gameTick(time, delta, scene) {
  if (!localState.loaded) {
    return;
  }

  syncPlayer();

  renderPlayers(scene);
  renderPickups(scene);
  renderTimer(scene);
  renderScore(scene);

  const currentPlayerState = gameState.players[localState.clientId];

  if (currentPlayerState.killed) {
    var killedBanner = scene.add.image(scene.scale.width / 2.0, scene.scale.height / 2.0, 'killed');
    killedBanner.setScrollFactor(0);
  }

  doMovement(delta, scene);
  renderBullets(time, delta, scene);
}