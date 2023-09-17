import _ from 'lodash';
import { addToLobby, fireWeapon, removeFromLobby, updatePlayerState } from './lobby';

const clients = new Map();

const server = Bun.serve({
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }

    // handle HTTP request normally
    return new Response("Hello world!");
  },
  websocket: {
    // this is called when a message is received
    async message(ws, message) {
      const clientId = clients.get(ws);
      const msg = JSON.parse(message);

      if (msg.type === 'JOIN') {
        addToLobby(ws, clientId);
      }
      if (msg.type === 'PLAYER_STATE') {
        //sanitize
        const scrubbed = _.pick(msg.data, ['x', 'y', 'id', 'killed', 'angle']);
        updatePlayerState(clientId, scrubbed);
      }
      if (msg.type === 'FIRE_WEAPON') {
        fireWeapon(clientId);
      }
    },
    async open(ws) {
      clients.set(ws, _.uniqueId());
    },
    async close(ws) {
      const clientId = clients.get(ws);
      removeFromLobby(clientId);
      console.log('DISCONNECTED', clientId);
    }
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);