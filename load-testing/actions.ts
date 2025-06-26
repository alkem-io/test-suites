import { SocketIoSocket } from './types/socket.io.socket.js';
import {
  bufferize,
  createRandomShape,
  createRandomText,
  getBackgroundColor,
  getRandomShape,
  getRandomInt,
  getRandomText,
  generateRandomText, getRandomElement,
} from './util.js';
import { IDLE_STATE, SERVER_BROADCAST, SERVER_VOLATILE_BROADCAST } from './types/event.names.js';

interface RandomActionFn {
  (socket: SocketIoSocket, roomID: string, elements: any[]): void;
}

export const getRandomAction = (): RandomActionFn => {
  // give more weight to deletes
  const actions = [
    insert, update, remove,  /*writeTextInShapeRandom,*/
    moveMultipleRandom, resizeMultipleRandom,
    createTextRandom, updateTextRandom, removeTextRandom,

  ];
  return actions[Math.floor(Math.random() * actions.length)];
}

export const insert = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = createRandomShape();
  elements.push(element);

  emitUpdate(socket, roomID, [element]);
}

export const update = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = getRandomShape(elements);
  if (!element) {
    return;
  }

  element.x += getRandomInt(500, 100); // Randomly move the element
  element.y += getRandomInt(500, 100); // Randomly move the element
  element.backgroundColor = getBackgroundColor(); // Change background color
  element.version += 1; // Increment version for update
  element.versionNonce += 1; // Increment version nonce for update

  emitUpdate(socket, roomID, [element]);
}

export const remove = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = getRandomElement(elements);
  if (!element) {
    return;
  }

  element.isDeleted = true; // Mark the element as deleted
  element.version += 1; // Increment version for update
  element.versionNonce += 1; // Increment version nonce for update

  emitUpdate(socket, roomID, [element]);
}

export const moveMultipleRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const nonDeletedElements = elements.filter(el => !el.isDeleted);
  // nothing we can do - early exit
  if (nonDeletedElements.length === 0) {
    return;
  }
  const numberOfElements = getRandomInt(20, 3);
  // might be less than numberOfElements
  const chosenElements = nonDeletedElements.slice(0, numberOfElements);
  // move them in unison
  const x = getRandomInt(500, 100) * (Math.random() < 0.5 ? -1 : 1);
  const y = getRandomInt(500, 100) * (Math.random() < 0.5 ? -1 : 1);
  // move each
  for (const element of chosenElements) {
    element.x += x;
    element.y += y;
    element.version += 1;
    element.versionNonce += 1;
  }

  emitUpdate(socket, roomID, elements);
}

export const resizeMultipleRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const nonDeletedShapes = elements.filter(el => !el.isDeleted && el.type !== 'text');
  // nothing we can do - early exit
  if (nonDeletedShapes.length === 0) {
    return;
  }
  const numberOfElements = getRandomInt(20, 3);
  // might be less than numberOfElements
  const chosenElements = nonDeletedShapes.slice(0, numberOfElements);
  // resize them in unison
  const width = getRandomInt(500, 100) * (Math.random() < 0.5 ? -1 : 1);
  const height = getRandomInt(500, 100) * (Math.random() < 0.5 ? -1 : 1);
  // move each
  for (const element of chosenElements) {
    element.width += width;
    element.height += height;
    element.version += 1;
    element.versionNonce += 1;
  }

  emitUpdate(socket, roomID, elements);
}

export const createTextRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = createRandomText();
  elements.push(element);

  emitUpdate(socket, roomID, [element]);
}

export const updateTextRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = getRandomText(elements);

  element.text += generateRandomText(getRandomInt(5, 1));
  element.version += 1; // Increment version for update
  element.versionNonce += 1; // Increment version nonce for update

  emitUpdate(socket, roomID, [element]);
}

export const removeTextRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const element = getRandomText(elements);

  element.isDeleted = true; // Mark the element as deleted
  element.version += 1; // Increment version for update
  element.versionNonce += 1; // Increment version nonce for update

  emitUpdate(socket, roomID, [element]);
}

// todo: does not work
export const writeTextInShapeRandom = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const shape = getRandomShape(elements);

  const text = createRandomText();

  shape.boundElements = [{ type: 'text', id: text.id }]
  shape.version += 1;
  shape.versionNonce += 1;

  text.autoResize = true;
  text.textAlign = "center";
  text.verticalAlign = "middle";
  text.containerId = shape.id;
  text.version += 1;
  text.versionNonce += 1;

  emitUpdate(socket, roomID, [shape]);
  emitUpdate(socket, roomID, [shape, text]);
}

// =---------------------

const emitUpdate = (socket: SocketIoSocket, roomID: string, elements: any[]) => {
  const payload = {
    'type': 'SCENE_UPDATE',
    'payload': {
      elements,
    }
  }

  const buffer = bufferize(payload);
  socket.emit(SERVER_BROADCAST, roomID, buffer);
}

// ---------------------

export const emitIdleState = (socket: SocketIoSocket, roomID: string, username: string) => {
  const data = {
    type:'IDLE_STATUS',
    payload:{
      socketId: 'oflgTK8f4xv530KJAABz',
      userState: 'active',
      username,
    }
  };

  const buffer = bufferize(data);
  socket.emit(IDLE_STATE, roomID, buffer);
}

export const emitMouseLocation = (socket: SocketIoSocket, roomID: string, username: string) => {
  const data = {
    type: 'MOUSE_LOCATION',
    payload: {
      socketId: socket.id,
      username,
      pointer: {
        x: Math.random() * 5000,
        y: Math.random() * 5000,
        tool:'pointer'
      },
      button: 'up',
      pointersMap: {},
      selectedElementIds: {}
    },
  };
  const buffer = bufferize(data);
  socket.emit(SERVER_VOLATILE_BROADCAST, roomID, buffer);
}
