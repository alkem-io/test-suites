import { io } from 'socket.io-client';
import { setTimeout } from 'node:timers/promises';
import {
  COLLABORATOR_MODE,
  ERROR,
  INIT_ROOM,
} from './types/event.names.js';
import { ServiceSocket } from './service.socket.js';
import { SocketIoSocket } from './types/socket.io.socket.js';
import { clearInterval } from 'node:timers';
import { generateSillyName } from './silly-name-generator.js';
import { emitIdleState, emitMouseLocation, getRandomAction } from './actions.js';

type StressTestConfig = {
  url: string;
  path: string;
  concurrentClients: number;
  repeat: number;
  wait: number;
};

const config: StressTestConfig = {
  url: 'http://localhost:4002',
  path: '/socket.io',
  //url: 'http://localhost:3000',
  //path: '/api/private/ws/socket.io',
  concurrentClients: 25,
  repeat: 100,
  wait: 500, // wait time between actions in milliseconds
};

const elements: any[] = [];

const roomID = 'bb278965-4108-4d91-b07b-2673703edb0d';

const runTest = async (config: StressTestConfig) => {
  const serviceSocket = new ServiceSocket(config.url, config.path);
  await serviceSocket.joinRoom(roomID);
  serviceSocket.measurePing();

  await Promise.all(
    Array.from({ length: config.concurrentClients }).map(async (_, i) => new Promise<void>(async (resolve) => {
      const socketName = generateSillyName();
      const socket: SocketIoSocket = io(config.url, {
        path: config.path,
        transports: ['websocket'],
        retries: 0,
        reconnection: false,
      });

      socket.on(ERROR, (error: any) => {
        socket.disconnect();
        console.error(`Client ${socket.id} #${i + 1} encountered an error:`, JSON.stringify(error));
      });

      socket.once(INIT_ROOM, async () => socket.emit('join-room', roomID));

      const idleStateInterval = setInterval(() => emitIdleState(socket, roomID, socketName), 3000);
      const mouseLocationInterval = setInterval(() => emitMouseLocation(socket, roomID, socketName), 100);

      socket.once(COLLABORATOR_MODE, async ({ mode, reason }) => {
        if (mode === 'read') {
          console.warn(`Client ${socket.id} #${i + 1} is in '${mode}' mode ${reason ? `due to: '${reason}'` : ''}`);
        }
        // wait a bit before starting actions
        await setTimeout(500);

        for (let j = 0; j < config.repeat; j++) {
          // pick a random action
          const action = getRandomAction();
          // execute the random action
          action(socket, roomID, elements);
          // wait preconfigured time before next action
          await setTimeout(config.wait);
        }

        console.log(`Client ${socket.id} #${i + 1} finished all actions.`);
        // tear down
        clearInterval(idleStateInterval);
        clearInterval(mouseLocationInterval);
        socket.disconnect();

        resolve();
      });
    })
  )
);

  // delete all elements
  await setTimeout(1000); // wait a bit to ensure the room is ready
  console.log(`Deleting all elements in room ${roomID}...`);
  await serviceSocket.deleteAllElementsInRoom(roomID, elements);
  serviceSocket.disconnect();
};

runTest(config).catch(err => console.error('Error running stress test:', err)).then(() => process.exit(0))

