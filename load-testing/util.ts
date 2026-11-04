export const getRandomInt = (max: number, min = 0) => {
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
    "originalText": generateRandomText(10),
    "autoResize": false,
    "lineHeight": 1.15
  };
}

export const getBackgroundColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
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
  if (nonDeletedElements.length === 0) {
    return undefined;
  }
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


export const calculateTimeStats = (min: number, max: number) => {
  const maxTime = max / 1000;
  const minTime = min / 1000;
  const avgTime = (maxTime + minTime) / 2;

  return {
    max: maxTime > 60 ?`${Math.floor(maxTime / 60)}m${maxTime % 60}s` : `${maxTime}s`,
    min: minTime > 60 ?`${Math.floor(minTime / 60)}m${minTime % 60}s` : `${minTime}s`,
    avg: avgTime > 60 ? `${Math.floor(avgTime / 60)}m${avgTime % 60}s` : `${avgTime}s`
  }
}
