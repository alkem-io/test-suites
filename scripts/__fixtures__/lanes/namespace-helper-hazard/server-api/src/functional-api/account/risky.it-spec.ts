// No hazard symbol import of any kind here — reaches one two hops away,
// through a helper that imports the hazard module with `import * as hz`.
import { doRiskyThing } from './helper';

test('looks safe from here', async () => {
  await doRiskyThing();
  expect(1).toBe(1);
});
