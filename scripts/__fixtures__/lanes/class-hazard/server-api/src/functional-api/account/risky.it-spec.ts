// No direct import of any hazard symbol — reaches one only by calling a
// static method on an exported CLASS (`RiskyClass.doRiskyThing()`), the
// shape the guard used to miss entirely (class bodies were never
// taint-seeded, and the qualifier of a member-expression call was never
// recognized as a candidate imported binding).
import { RiskyClass } from './risky-class';

test('looks safe from here', async () => {
  await RiskyClass.doRiskyThing();
  expect(1).toBe(1);
});
