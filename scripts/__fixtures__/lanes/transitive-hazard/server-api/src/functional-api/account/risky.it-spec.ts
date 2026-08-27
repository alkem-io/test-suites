// No direct import of any hazard symbol — reaches one only through a
// two-hop helper chain (risky.it-spec.ts -> helper1.ts -> helper2.ts).
import { doRiskyThing } from './helper1';

test('looks safe from here', async () => {
  await doRiskyThing();
  expect(1).toBe(1);
});
