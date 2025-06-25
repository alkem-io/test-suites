export const getRandomInt = (max: number, min?: number) => {
  if (min === undefined) {
    min = 0;
  }
  return Math.floor(Math.random() * (max - min)) + min;
}

export const createRandomShape = () => {
  const shapes = ['rectangle', 'diamond', 'ellipse'];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const backgroundColor = getBackgroundColor();
  return {
    'id': generateRandomText(21),
    'type': shape,
    'x': Math.random() * getRandomInt(5000),
    'y': Math.random() * getRandomInt(5000),
    'width': 100 + Math.random() * getRandomInt(300),
    'height': 100 + Math.random() * getRandomInt(300),
    'angle': 0,
    'strokeColor': '#000000',
    backgroundColor,
    'fillStyle': 'solid',
    'strokeWidth': 1,
    'strokeStyle': 'solid',
    'roughness': 0,
    'opacity': 100,
    'groupIds': [],
    'frameId': null,
    'index': 'a1',
    'roundness': null,
    'seed': Date.now(),
    'version': 1,
    'versionNonce': 1,
    'isDeleted': false,
    'boundElements': null,
    'updated': Date.now(),
    'link': null,
    'locked': false
  };
};

export const createRandomText = () => {
  return {
    'id': generateRandomText(21),
    type: 'text',
    'x': Math.random() * getRandomInt(5000),
    'y': Math.random() * getRandomInt(5000),
    'width': Math.random() * getRandomInt(400, 100),
    'height': Math.random() * getRandomInt(400, 100),
    "angle": 0,
    "strokeColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "groupIds": [],
    "frameId": null,
    "index": "a0",
    "roundness": null,
    "seed": Date.now(),
    "version": 1,
    "versionNonce": 1,
    "isDeleted": false,
    "boundElements": null,
    "updated": Date.now(),
    "link": null,
    "locked": false,
    "text": generateRandomText(128),
    "fontSize": 20,
    "fontFamily": 2,
    "textAlign": "left",
    "verticalAlign": "top",
    "containerId": null,
    "originalText": "asdd",
    "autoResize": false,
    "lineHeight": 1.15
  };
}

export const getBackgroundColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
}

export const generateElement = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const generateRandomText = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const getRandomElement = (elements: any[]) => {
  const nonDeletedElements = elements.filter(el => !el.isDeleted && el.type !== 'text');
  return nonDeletedElements[Math.floor(getRandomInt(nonDeletedElements.length))];
}

export const getRandomShape = (elements: any[]) => {
  const nonDeletedElements = elements.filter(el => !el.isDeleted && el.type !== 'text');
  const randomElement = nonDeletedElements[Math.floor(getRandomInt(nonDeletedElements.length))];

  if (!randomElement) {
    const newElement = createRandomShape();
    elements.push(newElement);
    return newElement;
  }

  return randomElement;
}

export const getRandomText = (elements: any[]) => {
  const nonDeletedTextElements = elements.filter(el => !el.isDeleted && el.type === 'text');
  const randomElement = nonDeletedTextElements[Math.floor(getRandomInt(nonDeletedTextElements.length))];

  if (!randomElement) {
    const newElement = createRandomText();
    elements.push(newElement);
    return newElement;
  }

  return randomElement;
}

export const bufferize = (data: any): ArrayBuffer => {
  const jsonStr = JSON.stringify(data);
  return new TextEncoder().encode(jsonStr).buffer;
}
