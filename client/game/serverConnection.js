import _ from 'lodash';
import { SPRINT_METER_AMOUNT } from './constants';

// A local copy of the game state. Used as the client's source of truth. Will be periodically updated by the server
export const gameState = {
  players: {},
  pickups: [],
};

export const localState = {
  loaded: false,
  clientId: undefined,
  myPlayer: null,
  iFrame: false,
  shooting: false,
  lastShotTime: 0,
  sprinting: false,
  sprintMeter: SPRINT_METER_AMOUNT,
  projectiles: [],
  pickups: [],
  collectedPickups: [],
}

// const socket = new WebSocket('ws://websocket.weeks.guru:80');
const socket = new WebSocket('ws://localhost:5174');

socket.onopen = (e) => {
  console.log('Connected');
  localState.loaded = true;
  socket.send(JSON.stringify(
    {
      type: 'JOIN',
    }
  ));
};

socket.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  
  if (msg.type === 'SYNC') {
    _.assign(gameState, msg.data);
    localState.clientId = msg.clientId;
  }
  if (msg.type === 'SPAWN_PROJECTILE') {
    localState.projectiles.push(msg.data);
  }
}

socket.onclose = (e) => {
  console.log('Connection closed');
}

socket.onerror = (e) => {
  console.error('Socket error');
}

export const sendState = (type, state) => {
  socket.send(JSON.stringify(
    {
      type,
      data: state,
    }
  ))
}

export const syncMovement = () => {
  sendState('PLAYER_STATE', localState.myPlayer);
}

export const fireWeapon = () => {
  sendState('FIRE_WEAPON');
}

export const pickUpPickup = (pickupId) => {
  sendState('PICKUP', pickupId);
}

export const processHit = (hitById) => {
  sendState('HIT', hitById);
}

setInterval(() => {
  if (localState.loaded) {
    syncMovement();
  }
});
