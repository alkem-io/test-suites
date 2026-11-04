// spec: client-web/src/functional-e2e/space-banner/space-banner-test-plan.md
// story: client-web#10178 (client-web#10222, server#6439)
//
// TC-01/TC-02 — the lowered 1200×120 banner floor: published on the space's
// BANNER visual (TC-01) and enforced at the upload boundary, not just
// advertised (TC-02, BVA at 1199/1200 width).

import { createPngFixture, TestScenarioFactory, TestUser } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { lookupProfileVisuals } from '@functional-api/lookup/lookup-request.params';
import { uploadImageOnVisual } from '@functional-api/storage/upload.params';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'space-banner-constraints',
  // Empty (but present) space config: enough to create a real root space —
  // and so a real BANNER visual row — with no collaboration entities, which
  // this suite never touches.
  space: {},
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Space BANNER visual constraints (10178)', () => {
  // TC-01 — a space's BANNER visual reports the lowered floor
  test('TC-01 — BANNER visual reports minWidth 1200 / minHeight 120', async () => {
    const res = await lookupProfileVisuals(
      baseScenario.space.about.profile.id,
      TestUser.GLOBAL_ADMIN
    );

    const visuals = res.data?.lookup.profile?.visuals ?? [];
    const banner = visuals.find(visual => visual.name === 'BANNER');

    expect(banner, 'expected a BANNER visual on the space profile').toBeTruthy();
    // Depends on the lib's widened `lookupProfileVisuals` selection (P1) —
    // without it these fields are undefined and the assertions below would
    // pass vacuously against `toEqual`-style matchers, so `toBe` throughout.
    expect(banner?.minWidth).toBe(1200);
    expect(banner?.minHeight).toBe(120);
    // Unchanged by this change — proves the migration/constants change did
    // not overreach the max bounds.
    expect(banner?.maxWidth).toBe(3840);
    expect(banner?.maxHeight).toBe(640);
    // server#6452 (Release 74) moved the server's row-creation default for a
    // banner to 10 and re-synced image-less banner rows, so client and server
    // now agree on 10:1 (release risk R-24 closed). Pinned so any further
    // change to the stored default is caught rather than silently changing
    // every bannerless page — this assertion caught the 6 → 10 move on the
    // 2026-09-03 nightly, as intended.
    expect(banner?.aspectRatio).toBe(10);
  });

  // TC-02 — the 1200px boundary is enforced, not just published (BVA)
  test('TC-02 — 1200×120 upload accepted; 1199×120 rejected', async () => {
    const res = await lookupProfileVisuals(
      baseScenario.space.about.profile.id,
      TestUser.GLOBAL_ADMIN
    );
    const visuals = res.data?.lookup.profile?.visuals ?? [];
    const bannerVisualId = visuals.find(visual => visual.name === 'BANNER')?.id;
    expect(bannerVisualId, 'expected a BANNER visual id').toBeTruthy();

    // On the boundary — 1200 is the new floor and 1199 was already rejected
    // under the old 1536 floor, so it proves nothing about THIS change.
    const onBoundary = createPngFixture({ width: 1200, height: 120 });
    // One pixel outside the boundary.
    const belowBoundary = createPngFixture({ width: 1199, height: 120 });

    // Step 1: 1200×120 is accepted — this is the case that would have failed
    // before the change (1200 was below the old 1536 floor).
    const accepted = await uploadImageOnVisual(
      onBoundary,
      bannerVisualId as string,
      TestUser.GLOBAL_ADMIN
    );
    expect(accepted.errors, JSON.stringify(accepted.errors)).toBeUndefined();
    const uploadedUri = accepted.data?.uploadImageOnVisual?.uri;
    expect(uploadedUri).toContain('/api/private/rest/storage/document');
    // The server derives the stored ratio from the uploaded pixels;
    // 1200/120 = 10 — the contract `useAboutTabData` trusts as local state.
    expect(Number(accepted.data?.uploadImageOnVisual?.aspectRatio)).toBeCloseTo(10, 1);

    // Step 2: 1199×120 is rejected — one pixel below the new floor.
    const rejected = await uploadImageOnVisual(
      belowBoundary,
      bannerVisualId as string,
      TestUser.GLOBAL_ADMIN
    );
    expect(rejected.errors?.length).toBeGreaterThan(0);
    // Assert only that the minimum appears in the message — it is server
    // copy and will drift; do not pin the whole sentence.
    expect(JSON.stringify(rejected.errors)).toContain('1200');
  });
});
