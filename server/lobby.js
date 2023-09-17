import _ from 'lodash';
import { BULLET_VELOCITY, LEVEL, TILE_SIZE, LOBBY_SIZE, PLAYER_LIFETIME } from './constants';

const lobby = {
  clients: {},
  timeouts: {},
};

const initialGameState = {
  players: {},
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
  };

  lobby.timeouts[clientId] = setTimeout(() => {
    gameState.players[clientId].expired = true;
    gameState.players[clientId].killed = true;
  }, PLAYER_LIFETIME)

  gameState.players[clientId] = player;

  console.log('NUM PLAYERS', getNumPlayers());
}

export const removeFromLobby = (clientId) => {
  delete gameState.players[clientId];
  delete lobby.clients[clientId];

  if (getNumPlayers() <= 1) {
    _.assign(gameState, _.cloneDeep(_.omit(initialGameState, 'players')));
  }
}

export const updatePlayerState = (clientId, newPlayerState) => {
  const prevState = gameState.players[clientId];
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

export const updateClients = () => {
  broadcastMsg({
    type: 'SYNC',
    data: gameState,
  });
};

setInterval(() => {
  updateClients();
}, 30);
