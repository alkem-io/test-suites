const adjectives = [
  'fluffy',
  'goofy',
  'silly',
  'wacky',
  'zany',
  'bumpy',
  'grumpy',
  'jumpy',
  'flimsy',
  'wobbly',
];

const nouns = [
  'unicorn',
  'potato',
  'pancake',
  'waffle',
  'pickle',
  'walrus',
  'narwhal',
  'gnome',
  'goblin',
  'dragon',
];

const verbs = [
    'dancing',
    'singing',
    'jumping',
    'hopping',
    'running',
    'skipping',
    'flying',
    'swimming',
    'crawling',
    'wiggling',
];

const adverbs = [
    'happily',
    'sadly',
    'angrily',
    'lazily',
    'sleepily',
    'hungrily',
    'thirstily',
    'quickly',
    'slowly',
    'loudly',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSillyName(): string {
  const adjective = getRandomElement(adjectives);
  const noun = getRandomElement(nouns);
  const verb = getRandomElement(verbs);
  const adverb = getRandomElement(adverbs);

  const formats = [
    `${adjective} ${noun}`,
    `${adverb} ${verb} ${noun}`,
    `${adjective} ${verb} ${noun}`,
    `${verb} ${adjective} ${noun}`,
  ];

  return getRandomElement(formats);
}

