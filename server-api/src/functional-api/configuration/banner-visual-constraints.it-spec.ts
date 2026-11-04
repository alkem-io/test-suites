// spec: client-web/src/functional-e2e/space-banner/space-banner-test-plan.md
// story: client-web#10178 (client-web#10222, server#6439)
//
// TC-03 — the cross-repo contract: `defaultVisualTypeConstraints(BANNER)` is
// what the client's crop dialog clamps against (`minAspectRatio`/
// `maxAspectRatio` bound the shape slider; `bannerCropAspectRatio` clamps the
// 10:1 default into them).
//
// Deliberately a NEW file, not a test added to `configuration.it-spec.ts` —
// that file carries a `test.only`, so a sibling test inside it would never
// run while looking green.

import { bannerVisualConstraints } from './configuration.request.params';
import { TestScenarioFactory, TestUser } from '@alkemio/tests-lib';

beforeAll(async () => {
  // GLOBAL_ADMIN needs a resolved auth token, which requires the user model
  // map to be populated — `createBaseScenarioEmpty` does exactly that and
  // nothing else (no space/org), matching this query's "precondition: none"
  // beyond a signed-in caller.
  await TestScenarioFactory.createBaseScenarioEmpty({
    name: 'banner-visual-constraints',
  });
});

describe('Platform configuration — BANNER visual constraints (10178)', () => {
  test('TC-03 — defaultVisualTypeConstraints(BANNER) = 1200/120/6/6/10', async () => {
    const res = await bannerVisualConstraints(TestUser.GLOBAL_ADMIN);

    const constraints = res.data?.platform.configuration.defaultVisualTypeConstraints;

    // toMatchObject over the seven numeric fields, not toStrictEqual on the
    // whole object, so an added field does not break this test — but every
    // one of the seven is read by the client, so all seven are asserted.
    expect(constraints).toMatchObject({
      minWidth: 1200,
      minHeight: 120,
      maxWidth: 3840,
      maxHeight: 640,
      aspectRatio: 6,
      minAspectRatio: 6,
      maxAspectRatio: 10,
    });
    expect(constraints?.allowedTypes).toEqual(
      expect.arrayContaining(['image/png', 'image/jpeg'])
    );

    // The invariant the server's own comment states: minHeight ==
    // ceil(minWidth / maxAspectRatio). Would break if minWidth were lowered
    // again without following minHeight.
    expect(constraints?.minHeight).toBe(
      Math.ceil((constraints?.minWidth ?? 0) / (constraints?.maxAspectRatio ?? 1))
    );
  });
});
