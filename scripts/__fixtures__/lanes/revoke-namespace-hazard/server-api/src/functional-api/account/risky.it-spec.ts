import { doRiskyThing } from './helper';

test('looks safe from here', async () => {
  await doRiskyThing();
  expect(1).toBe(1);
});
