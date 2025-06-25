import { io } from "socket.io-client";
import { setTimeout } from 'node:timers/promises';

type StressTestConfig = {
  url: string;
  path: string;
  concurrentClients: number;
  repeat: number;
};

const config: StressTestConfig = {
  url: "http://localhost:4002",
  path: "/socket.io",
  concurrentClients: 100,
  repeat: 100,
};

const elements: any[] = [];

const roomID = '34414cd8-6691-42ee-ac9b-b5a0d027fbca';

const getBackgroundColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
}

function generateRandomText(length = 21) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const createElement = () => {
  // A basic rectangle element.
  // Based on Excalidraw\'s element structure.
  const shapes = ['rectangle', 'diamond', 'ellipse'];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const backgroundColor = getBackgroundColor();
  return {
    "id": generateRandomText(),
    "type": shape,
    "x": Math.random() * getRandomInt(5000),
    "y": Math.random() * getRandomInt(5000),
    "width": 100 + Math.random() * getRandomInt(300),
    "height": 100 + Math.random() * getRandomInt(300),
    "angle": 0,
    "strokeColor": "#000000",
    backgroundColor,
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "groupIds": [],
    "frameId": null,
    "index": "a1",
    "roundness": null,
    "seed": 1433596678,
    "version": 1,
    "versionNonce": 1,
    "isDeleted": false,
    "boundElements": null,
    "updated": 1750682090043,
    "link": null,
    "locked": false
  };
};

const runTest = async (config: StressTestConfig) => {
  console.log(`Starting test with ${config.concurrentClients} clients.`);
  await Promise.all(
    Array.from({ length: config.concurrentClients }).map(async (_, i) => {
      const socket = io(config.url, {
        path: config.path,
        transports: ["websocket"],
        retries: 0,
        reconnection: false,
      });

      socket.emit('join-room', roomID);
      await setTimeout(1000);
      console.log(`Client ${i + 1} connected to room ${roomID}`);

      for (let j = 0; j < config.repeat; j++) {
        const action = chooseAction();
        console.log(`Client ${i + 1} performing action: ${action} (iteration ${j + 1})`);


        let element: any;
        if (action === 'insert') {
          element = createElement();
          elements.push(element);
        } else if (action === 'update') {
          element = getRandomElement();
          element.x += getRandomInt(500, 100); // Randomly move the element
          element.y += getRandomInt(500, 100); // Randomly move the element
          element.backgroundColor = getBackgroundColor(); // Change background color
          element.version += 1; // Increment version for update
          element.versionNonce += 1; // Increment version nonce for update
        } else if (action === 'delete') {
          element = getRandomElement();
          element.isDeleted = true; // Mark the element as deleted
          element.version += 1; // Increment version for update
          element.versionNonce += 1; // Increment version nonce for update
        }

        const payload = {
          "type": "SCENE_UPDATE",
          "payload": {
            elements: [element]
          }
        }
        const jsonStr = JSON.stringify(payload);
        const buffer = new TextEncoder().encode(jsonStr).buffer;
        socket.emit("server-broadcast", roomID, buffer);

        await setTimeout(getRandomInt(3000, 1000));
      }

      socket.disconnect();
    })
  );

  //delete all elements
  const socket = io(config.url, {
    path: config.path,
    transports: ["websocket"],
    retries: 0,
    reconnection: false,
  });

  socket.emit('join-room', roomID);
  await setTimeout(1000);
  console.log(`Deleting all elements in room ${roomID}`);
  for (const element of elements) {
    if (element.isDeleted) {
      continue; // Skip already deleted elements
    }
    element.isDeleted = true; // Mark the element as deleted
    element.version += 1; // Increment version for update
    element.versionNonce += 1; // Increment version nonce for update
    const payload = {
      "type": "SCENE_UPDATE",
      "payload": {
        elements: [element]
      }
    }
    const jsonStr = JSON.stringify(payload);
    const buffer = new TextEncoder().encode(jsonStr).buffer;
    socket.emit("server-broadcast", roomID, buffer);
  }


};

// Allow overriding concurrentClients from command line
const numClientsFromArgs = process.argv[2] ? parseInt(process.argv[2], 10) : null;
if (numClientsFromArgs) {
    config.concurrentClients = numClientsFromArgs;
}


runTest(config);

function getRandomInt(max: number, min?: number): number {
  if (min === undefined) {
    min = 0;
  }
  return Math.floor(Math.random() * (max - min)) + min;
}

const chooseAction = () => {
  const actions = ['insert', 'update', 'delete'];
  return actions[Math.floor(Math.random() * actions.length)];
}

const getRandomElement = () => {
  const nonDeletedElements = elements.filter(el => !el.isDeleted);
  const randomElement = nonDeletedElements[Math.floor(getRandomInt(nonDeletedElements.length))];

  if (!randomElement) {
    const newElement = createElement();
    elements.push(newElement);
    return newElement;
  }

  return randomElement;
}
