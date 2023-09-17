import _ from 'lodash';
import { BULLET_VELOCITY, LEVEL, TILE_SIZE } from './constants';

const lobby = {
  clients: {},
};

const initialGameState = {
  players: {},
  started: false,
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
  if (gameState.started) {
    console.log('GAME STARTED, REJECTING');
  }
  if (Object.keys(lobby.clients).length >= 4) {
    console.log('LOBBY FULL, REJECTING');
    return;
  }

  lobby.clients[clientId] = ws;

  const [x, y] = getStartingPosition();

  const player = {
    x: x,
    y: y,
    lastShotTime: 0,
    shooting: false,
    bullets: [],
    id: clientId,
  };

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
  gameState.players[clientId] = {
    ...gameState.players[clientId],
    ...newPlayerState,
    id: clientId, // ensure clientId is not overwritten
  }
};

export const fireWeapon = (clientId) => {
  const player = gameState.players[clientId];

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

export const startGame = () => {
  lobbyData.startedAt = Date.now();
  lobbyData.started = true;
}

export const updateClients = () => {
  if (!gameState.started && Object.keys(gameState.players).length >= 2) {
    gameState.started = true;
    console.log('STARTING GAME');
  }
  broadcastMsg({
    type: 'SYNC',
    data: gameState,
  });
};

setInterval(() => {
  updateClients();
}, 30);
