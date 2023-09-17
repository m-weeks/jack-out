import _ from 'lodash';
import { BULLET_VELOCITY, LEVEL, TILE_SIZE, LOBBY_SIZE, PLAYER_LIFETIME, MAX_PICKUPS } from './constants';

const lobby = {
  clients: {},
  timeouts: {},
};

const initialGameState = {
  players: {},
  pickups: [],
};

const gameState = _.cloneDeep(initialGameState);

const broadcastMsg = (data = {}) => {
  _.forEach(lobby.clients, (ws, clientId) => {
    ws.send(JSON.stringify({
      ...data,
      clientId,
    }))
  });
}

const getNumPlayers = () => {
  return Object.keys(gameState.players).length;
};

const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const names = [
  'NeoX',
  'Trinix',
  'Cypherion',
  'Morpheon',
  'Zenix',
  'Byteblade',
  'DataDyne',
  'Synthra',
  'Virelia',
  'Codex',
  'Netshade',
  'Pixelon',
  'Wirelyn',
  'Cryptos',
  'Logiclyn',
  'Virtuon',
];

const genName = () => {
  var takenNames = Object.values(gameState.players).map((player) => player.name);

  let randomName;
  do {
    randomName = names[Math.floor(Math.random() * names.length)];
  } while (takenNames.includes(randomName));

  return randomName;
}

const getStartingPosition = () => {
  const zeroIndices = [];
  LEVEL.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      if (col === 0) {
        zeroIndices.push([colIndex, rowIndex]);
      }
    });
  });
  const randomIndex = rand(0, zeroIndices.length - 1);
  const [x, y] = zeroIndices[randomIndex];

  return [x * TILE_SIZE + (TILE_SIZE / 2), y * TILE_SIZE + (TILE_SIZE / 2)];
};

const spawnPickup = () => {
  if (gameState.pickups.length >= MAX_PICKUPS) {
    return;
  }

  let zeroIndices = [];
  LEVEL.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      if (col === 0) {
        zeroIndices.push([colIndex, rowIndex]);
      }
    });
  });
  zeroIndices = zeroIndices.filter((indexPair) => {
    const taken = gameState.pickups.find((pickup) => pickup.x === indexPair[0] && pickup.y === indexPair[1]);
    return !taken;
  });

  const randomIndex = rand(0, zeroIndices.length - 1);
  const [x, y] = zeroIndices[randomIndex];

  console.log('SPAWNING PICKUP');

  gameState.pickups.push({
    x,
    y,
    id: _.uniqueId('pickup')
  });
}

export const addToLobby = (ws, clientId) => {
  if (Object.keys(lobby.clients).length >= LOBBY_SIZE) {
    console.log('LOBBY FULL, REJECTING');
    return;
  }

  lobby.clients[clientId] = ws;

  const [x, y] = getStartingPosition();

  const player = {
    x: x,
    y: y,
    angle: 0,
    killed: false,
    id: clientId,
    expired: false,
    lifetime: PLAYER_LIFETIME,
    score: 0,
    health: 100,
    name: genName(),
  };

  lobby.timeouts[clientId] = setTimeout(() => {
    if (gameState.players[clientId] && !gameState.players[clientId].killed) {
      gameState.players[clientId].expired = true;
      gameState.players[clientId].killed = true;
    }
  }, PLAYER_LIFETIME)

  gameState.players[clientId] = player;

  console.log('NUM PLAYERS', getNumPlayers());
}

export const removeFromLobby = (clientId) => {
  delete gameState.players[clientId];
  delete lobby.clients[clientId];
  clearTimeout(lobby.timeouts[clientId]);
  delete lobby.timeouts[clientId];
}

export const updatePlayerState = (clientId, newPlayerState) => {
  const prevState = gameState.players[clientId];
  if (!prevState) {
    return;
  }

  gameState.players[clientId] = {
    ...prevState,
    ...newPlayerState,
    killed: prevState.killed || newPlayerState.killed, // Do not allow un-killing. Zombies are no bueno
    id: clientId, // ensure clientId is not overwritten
  }
};

export const fireWeapon = (clientId) => {
  const player = gameState.players[clientId];

  if (!player) {
    return;
  }

  const projectile = {
    x: player.x,
    y: player.y,
    velocityX: BULLET_VELOCITY * Math.cos(player.angle),
    velocityY: BULLET_VELOCITY * Math.sin(player.angle),
    angle: player.angle,
    owner: clientId,
  };

  broadcastMsg({
    type: 'SPAWN_PROJECTILE',
    data: projectile,
  });
}

export const pickUpPickup = (clientId, pickupId) => {
  const player = gameState.players[clientId];
  if (!player) {
    return;
  }

  const index = gameState.pickups.findIndex((pickup) => pickup.id === pickupId)
  const pickup = gameState.pickups[index];
  if (!pickup) {
    return;
  }

  gameState.pickups[index].collected = true;

  // @TODO: Investigate if this might cause race conditions
  gameState.pickups.splice(index, 1);

  player.score += 1;
};

export const processHit = (clientId, killedById) => {
  const player = gameState.players[clientId];
  if (!player) {
    return;
  }

  if (player.expired) {
    return;
  }

  player.health = Math.max(0, player.health - 34);

  if (player.health === 0) {
    player.killed = true;
    const killer = gameState.players[killedById];
    if (killer) {
      killer.score += player.score;
      // Take all of the players score
      player.score = 0;
    }
  }
}

export const updateClients = () => {
  broadcastMsg({
    type: 'SYNC',
    data: gameState,
  });
};

setInterval(() => {
  updateClients();
}, 30);

setInterval(() => {
  spawnPickup();
}, 1000);
