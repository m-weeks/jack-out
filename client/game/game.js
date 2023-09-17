import _ from 'lodash';
import Phaser from 'phaser';
import { BULLET_COOLDOWN, PLAYER_VELOCITY, TILE_SIZE, LEVEL, PLAYER_SIZE, SPRINT_METER_AMOUNT } from './constants';
import { localState, gameState, fireWeapon, pickUpPickup, processHit } from './serverConnection';

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

const doMovement = (time, delta, scene) => {
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
      shift: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      pointer: scene.input.activePointer,
    };
  }

  const { keys } = viewState;

  if (keys.shift.isDown && localState.sprintMeter > 0) {
    localState.sprintMeter = Math.max(0, localState.sprintMeter - (delta * 0.1));
    localState.sprinting = true;
    if (localState.sprintMeter === 0) {
      localState.sprinting = false;
    }
  } else if (!keys.shift.isDown) {
    localState.sprinting = false;
  }

  const sprintModifier = localState.sprinting ? 1.5 : 1;

  // restore a little bit of sprint meter
  localState.sprintMeter = Math.min(SPRINT_METER_AMOUNT, localState.sprintMeter + ((delta * 0.10) / 2));

  const { myPlayer: player } = localState;

  const oldX = player.x;
  const oldY = player.y;

  // Calculate the new position based on key presses
  if (keys.left.isDown) {
    player.x -= PLAYER_VELOCITY * (delta / 1000) * sprintModifier;
  } else if (keys.right.isDown) {
    player.x += PLAYER_VELOCITY * (delta / 1000) * sprintModifier;
  }
  if (keys.up.isDown) {
    player.y -= PLAYER_VELOCITY * (delta / 1000) * sprintModifier;
  } else if (keys.down.isDown) {
    player.y += PLAYER_VELOCITY * (delta / 1000) * sprintModifier;
  }

  // If player would collide with a wall ignore their movement
  if (isColliding(player.x, oldY)) {
    player.x = oldX;
  }
  if (isColliding(oldX, player.y)) {
    player.y = oldY;
  }

  player.angle = Phaser.Math.Angle.Between(scene.scale.width / 2, scene.scale.height /2, keys.pointer.x, keys.pointer.y);
};

const renderBullets = (time, delta, scene) => {
  const { keys } = viewState;

  const { myPlayer } = localState;

  if (!localState.shooting && !localState.myPlayer.killed && keys.pointer.leftButtonDown() && (time - localState.lastShotTime) > BULLET_COOLDOWN) {
    localState.lastShotTime = time;
    localState.shooting = true;
    fireWeapon();
  }
  if (keys.pointer.leftButtonReleased()) {
    localState.shooting = false;
  }

  let destroyedIndexes = [];

  localState.projectiles.forEach((projectile, index) => {
    if (!projectile.sprite) {
      // On client side spawn projectile from current position not last known server position
      if (projectile.owner === myPlayer.id) {
        projectile.x = myPlayer.x;
        projectile.y = myPlayer.y;
      }

      projectile.sprite = scene.physics.add.sprite(projectile.x, projectile.y, 'bullet');
      projectile.sprite.setRotation(projectile.angle);
      projectile.sprite.setScale(0.1);

      // play sound when spawning projectile. Volume is proportional based on distance
      const distance = Phaser.Math.Distance.Between(myPlayer.x, myPlayer.y, projectile.x, projectile.y);
      let volume = 1 - Phaser.Math.Clamp(distance / 4000, 0, 1);
      scene.sound.play('shot', { volume: volume / 3 });
    }

    projectile.x += projectile.velocityX * (delta / 1000);
    projectile.y += projectile.velocityY * (delta / 1000);

    projectile.sprite.setPosition(projectile.x, projectile.y);

    if (isColliding(projectile.x, projectile.y)) {
      projectile.sprite.destroy();
      destroyedIndexes.push(index);
    }

    if (!localState.iFrame && projectile.owner !== localState.clientId && isCollidingWithPlayer(projectile.x, projectile.y)) {
      localState.iFrame = true;
      processHit(projectile.owner);
      scene.sound.play('oof');
      setTimeout(() => {
        localState.iFrame = false;
      }, 500);
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
      sprite.setScale(0.2);
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
  if (myPlayer) {
    playerSprites[myPlayer.id].setPosition(myPlayer.x, myPlayer.y);
    playerSprites[myPlayer.id].setRotation(myPlayer.angle);
  }

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

  const timer = scene.add.text(10, 10, `TIME REMAINING: ${seconds}`, { fontSize: '32px', fill: '#fff', fontFamily: 'glitch goblin' });
  timer.setScrollFactor(0);

  var event = scene.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      seconds = Math.max(0, --seconds);
      timer.setText(`TIME REMAINING: ${seconds}`);

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

  let text = 'Lobby: \n';
  const players = Object.values(gameState.players);

  players.sort((player1, player2) => {
    return player1.score > player2.score;
  }).forEach((player) => {
    if (player.id === myPlayer.id) {
      text += `YOU: ${player.score}\n`;
    } else {
      text += `AGENT ${player.id}: ${player.score}\n`;
    }
  });

  if (viewState.scoreText) {
    viewState.scoreText.setText(text);

    return;
  }

  const scoreText = scene.add.text(10, scene.scale.height / 2, text, { fontSize: '32px', fill: '#fff', fontFamily: 'glitch goblin' });
  scoreText.setOrigin(0, 0.5);
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
      sprite.setScale(0.2);
      scene.tweens.add({
        targets: sprite,
        y: sprite.y + 25,
        duration: Phaser.Math.Between(1000, 1500),
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      viewState.pickups[pickup.id] = sprite;
    }

    const curSprite = viewState.pickups[pickup.id];

    const collected = Boolean(localState.collectedPickups.find((id) => id === pickup.id));
    if (!collected && isCollidingWithPlayer(curSprite.x, curSprite.y, 80)) {
      localState.collectedPickups.push(pickup.id);

      pickUpPickup(pickup.id);
      scene.sound.play('pickup', { volume: 0.5 });
    }
  });

  // Clean old sprites
  const pickupIds = (gameState.pickups).map((pickup) => pickup.id);
  const oldSprites = _.omit(viewState.pickups, pickupIds);
  for(var pickupId in oldSprites) {
    oldSprites[pickupId].destroy();
    localState.collectedPickups = localState.collectedPickups.filter((id) => id !== pickupId);
    delete viewState.pickups[pickupId];
  }
}

const renderHealth = (scene) => {
  if (!localState.myPlayer) {
    return;
  }
  if (!gameState.players[localState.clientId]) {
    return;
  }

  var x = scene.scale.width - 150;
  var y = scene.scale.height - 50;

  if (!viewState.healthBar) {
    const barBackground = scene.add.graphics();
    barBackground.fillStyle(0xFF0000, 1);
    barBackground.fillRect(x, y, 100, 20);
    barBackground.setScrollFactor(0);

    // Create the health bar fill (the actual health representation)
    const barFill = scene.add.graphics();
    barFill.fillStyle(0x00FF00, 1);
    barFill.fillRect(x, y, 100, 20);
    barFill.setScrollFactor(0);

    viewState.healthBar = {
      background: barBackground,
      fill: barFill,
    };
  }

  viewState.healthBar.fill.clear();
  viewState.healthBar.fill.fillStyle(0x00FF00, 1);
  viewState.healthBar.fill.fillRect(x, y, gameState.players[localState.clientId].health, 20)
}

/**
 * 
 * @param {Phaser.Scene} scene 
 */
export function init(scene) {
  scene.anims.create({
    key: 'tiles',
    frames: scene.anims.generateFrameNumbers('tiles'),
    frameRate: 10,
    repeat: -1,
  })

  LEVEL.forEach((row, y) => {
    row.forEach((col, x) => {
      if (LEVEL[y][x] === 1) {
        const tileSprite = scene.add.sprite(x * TILE_SIZE, y * TILE_SIZE, 'tile').setOrigin(0, 0);
        tileSprite.play('tiles');
      }
    });
  });

  let music = scene.sound.add('song', { loop: true });
  music.play({ volume: 0.25 });
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

  const { myPlayer } = localState;
  if (!myPlayer) {
    return;
  }

  renderPickups(scene);
  renderTimer(scene);
  renderScore(scene);

  const currentPlayerState = gameState.players[localState.clientId];

  if ((currentPlayerState.expired || currentPlayerState.killed) && !viewState.finalScore) {
    const scoreText = scene.add.text(scene.scale.width / 2.0, (scene.scale.height / 2.0) + 200, `Final Score: ${currentPlayerState.score}`, { fontSize: '48px', fill: '#0fff00', fontFamily: 'glitch goblin' });
    scoreText.setScrollFactor(0);
    scoreText.setOrigin(0.5, 0.5);
    viewState.finalScore = scoreText;
  }

  if (currentPlayerState.expired) {
    if (!viewState.expiredBanner) {
      var expiredBanner = scene.add.image(scene.scale.width / 2.0, scene.scale.height / 2.0, 'extracted');
      expiredBanner.setScrollFactor(0);
      viewState.expiredBanner = expiredBanner;
    }
  } else if (currentPlayerState.killed) {
    if (!viewState.killedBanner) {
      var killedBanner = scene.add.image(scene.scale.width / 2.0, scene.scale.height / 2.0, 'killed');
      killedBanner.setScrollFactor(0);
      viewState.killedBanner = killedBanner;
    }
  }

  doMovement(time, delta, scene);
  renderBullets(time, delta, scene);
  renderHealth(scene);
}