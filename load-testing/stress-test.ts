import { clearInterval } from 'node:timers';
import { io } from 'socket.io-client';
import { setTimeout } from 'node:timers/promises';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory.js';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema.js';
import { COLLABORATOR_MODE, ERROR, INIT_ROOM } from './types/event.names.js';
import { ServiceSocket } from './service.socket.js';
import { SocketIoSocket } from './types/socket.io.socket.js';
import { generateSillyName } from './silly-name-generator.js';
import { emitIdleState, emitMouseLocation, getRandomAction } from './actions.js';
import { createWhiteboardCallout } from '@server-api//functional-api/callout/whiteboard/whiteboard-callout.params.request.js';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel.js';
import { calculateTimeStats, getRandomInt } from './util.js';

type StressScenario = {
  name?: string;
  /** how many whiteboards to create */
  whiteboards: number;
  /** clients per whiteboard */
  clients: number;
  /** how many times each client should perform actions */
  repeat: number;
  /** wait time between actions in milliseconds */
  maxWait: number;
  /** minimum wait time between actions in milliseconds */
  minWait: number;
};

type StressTestConfig = {
  url: string;
  path: string;
  scenarios: StressScenario[];
};

const config: StressTestConfig = {
  // wss://sandbox-alkem.io/api/private/ws/socket.io/?EIO=4&transport=websocket
  // url: 'http://localhost:4002',
  // path: '/socket.io',
  url: 'https://test-alkem.io',
  path: '/api/private/ws/socket.io',
  scenarios: [{
    name: '3 Whiteboard 15 Clients',
    whiteboards: 3,
    clients: 15,
    repeat: 50,
    maxWait: 3000,
    minWait: 300,
  }]/*, {
    name: '2 Whiteboards 15 Clients',
    whiteboards: 2,
    clients: 2,
    repeat: 15,
    maxWait: 3000,
    minWait: 300,
  }, {
    name: '4 Whiteboards 15 Clients',
    whiteboards: 4,
    clients: 15,
    repeat: 30,
    maxWait: 3000,
    minWait: 300,
  }, {
    name: '8 Whiteboards 15 Clients',
    whiteboards: 8,
    clients: 15,
    repeat: 30,
    maxWait: 3000,
    minWait: 300,
  }, {
    name: '10 Whiteboards 15 Clients',
    whiteboards: 10,
    clients: 15,
    repeat: 30,
    maxWait: 3000,
    minWait: 300,
  }]*/
};

const elements: any[] = [];

const IDLE_STATE_INTERVAL = 3000;
const MOUSE_LOCATION_INTERVAL = 100;
const REPORTER_INTERVAL = 20000;

let baseScenario: OrganizationWithSpaceModel;

const createPrerequisites = async (whiteboardsCount: number) => {
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'whiteboard-stress-test',
    space: {
      collaboration: {
        addTutorialCallouts: false,
      },
      settings: {
        privacy: {
          mode: SpacePrivacyMode.Public,
        },
      },
    },
  });
  const wbIds: string[] = [];
  for (let i = 1; i <= whiteboardsCount; i++) {
    const res = await createWhiteboardCallout(
      baseScenario.space.collaboration.calloutsSetId,
      `wb-stress-test-${i}`,
      `Whiteboard Stress Test-${i}`
    );
    wbIds.push(res.data.createCalloutOnCalloutsSet.framing.whiteboard.id);
  }

  return { baseScenario, wbIds };
}

const deletePrerequisites = async (baseScenario: OrganizationWithSpaceModel) => {
  return TestScenarioFactory.cleanUpBaseScenario(baseScenario);
}

let actionsExecuted = 0;

const runTest = async (url: string, path: string, scenario: StressScenario) => {
  const maxActions = scenario.whiteboards * scenario.clients * scenario.repeat;
  const maxTime = scenario.maxWait * scenario.repeat;
  const minTime = scenario.minWait * scenario.repeat;
  const { min, max, avg } = calculateTimeStats(minTime, maxTime);
  console.log(`Based on the config for '${scenario.name}' max execution time can take between ${max} and ${min} Average execution time is around ${avg}`);

  const { baseScenario, wbIds } = await createPrerequisites(scenario.whiteboards);
  console.log(`${scenario.whiteboards} Whiteboards created under '${baseScenario.space.about.profile.displayName}'`);

  const serviceSocket = new ServiceSocket(url, path);
  serviceSocket.startPing();

  const reporter = setInterval(() => {
    console.log(`Action executed: ${actionsExecuted / maxActions * 100}%`)
    console.log(`Actions executed per second: ${Math.round(actionsExecuted / 20)}`);
    console.log(`Ping stats: ${JSON.stringify(serviceSocket.pingStats())}`);
  }, REPORTER_INTERVAL);

  // spawn & execute
  console.log(`Spawning ${scenario.clients} clients for each of the ${wbIds.length} Whiteboards...`);
  await Promise.all(
    Array.from(wbIds).flatMap((wbId) => Array.from({ length: scenario.clients }).map(() => spawnClient(wbId, scenario)))
  );

  // delete all elements
  // await setTimeout(1000); // wait a bit to ensure the room is ready
  // console.log(`Deleting all elements in room ${roomID}...`);
  // // todo: doesnt work
  // await serviceSocket.deleteAllElementsInRoom(roomID, elements);
  serviceSocket.disconnect();

  console.log(`Final ping stats: ${JSON.stringify(serviceSocket.pingStats())}`);
  serviceSocket.endAndPlotPing(scenario.name);

  console.log(`Stress test completed. Cleaning up...`);
  elements.length = 0; // clear elements
  actionsExecuted = 0;
  clearInterval(reporter);
  await deletePrerequisites(baseScenario);
};

const spawnClient = (roomID: string, scenario: StressScenario) => {
  return new Promise<void>(async (resolve) => {
    const socketName = generateSillyName();
    const socket: SocketIoSocket = io(config.url, {
      path: config.path,
      transports: ['websocket'],
      retries: 0,
      reconnection: false,
    });

    socket.on(ERROR, (error: any) => {
      socket.disconnect();
      console.error(`Client ${socket.id} encountered an error:`, JSON.stringify(error));
    });

    socket.once(INIT_ROOM, async () => socket.emit('join-room', roomID));

    const idleStateInterval = setInterval(() => emitIdleState(socket, roomID, socketName), IDLE_STATE_INTERVAL);
    const mouseLocationInterval = setInterval(() => emitMouseLocation(socket, roomID, socketName), MOUSE_LOCATION_INTERVAL);

    socket.once(COLLABORATOR_MODE, async ({ mode, reason }) => {
      if (mode === 'read') {
        console.warn(`Client ${socket.id} is in '${mode}' mode ${reason ? `due to: '${reason}'` : ''}`);
        console.warn(`Client ${socket.id} will not perform any actions.`);
        return;
      }
      // wait a bit before starting actions
      await setTimeout(500);

      for (let j = 0; j < scenario.repeat; j++) {
        // pick a random action
        const action = getRandomAction();
        // execute the random action
        action(socket, roomID, elements);
        actionsExecuted++;
        // wait preconfigured time before next action
        await setTimeout(getRandomInt(scenario.maxWait, scenario.minWait));
      }

      console.log(`Client '${socket.id}' finished all actions for '${roomID}'`);
      // tear down
      clearInterval(idleStateInterval);
      clearInterval(mouseLocationInterval);
      socket.disconnect();

      resolve();
    });
  });
}

const startStressTest = async () => {
  const maxTime = config.scenarios.reduce((acc, scenario) => acc + scenario.maxWait * scenario.repeat, 0)
  const minTime = config.scenarios.reduce((acc, scenario) => acc + scenario.minWait * scenario.repeat, 0)

  const { min, max, avg } = calculateTimeStats(minTime, maxTime);

  console.log(`Based on the config max execution time can take between ${max} and ${min}. Average execution time is around ${avg}.`);
  for (const scenario of config.scenarios) {
    try {
      await runTest(config.url, config.path, scenario);
    } catch (e) {
      console.error('Error running stress test:', e)
    }
  }
}
startStressTest().catch(e => {
  console.error('Error starting stress test:', e);
  process.exit(1);
}).then(() => process.exit(0))

