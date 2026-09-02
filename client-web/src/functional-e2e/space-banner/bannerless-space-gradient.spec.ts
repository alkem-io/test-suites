// spec: client-web/src/functional-e2e/space-banner/space-banner-test-plan.md
// story: client-web#10178 (client-web#10222, server#6439)
//
// TC-04 — a space with no uploaded banner renders its gradient placeholder at
// 10:1 (not the old 6:1) — the headline defect this story exists to fix.
// TC-06 — a subspace of that bannerless L0 shows the same 10:1 shape.

import { expect } from '@playwright/test';
import { TestScenarioFactory, TestUserManager } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { SpacePage } from '../space/pages';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'space-banner-gradient.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

// Both spaces this scenario creates get no banner image uploaded — the
// server stamps a bare BANNER visual row (aspectRatio 6, no uri) on
// creation, which is exactly the pre-fix trap TC-04 guards against.
const scenarioConfig: TestScenarioConfig = {
  name: 'space-banner-gradient',
  space: {
    subspace: {},
  },
};

// Both tests share one beforeAll-created scenario: force one worker so
// `fullyParallel` cannot run them in separate workers, which would trigger
// `beforeAll` twice (two independent scenarios) and race `afterAll`'s
// cleanup of the first.
test.describe.configure({ mode: 'serial' });

test.describe('Bannerless space/subspace gradient shape (10178)', () => {
  test.beforeAll(async ({ browser }) => {
    // Space + subspace creation over the API can approach the default 30s
    // hook budget; give it headroom.
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('TC-04 — bannerless space renders the gradient at 10:1', async ({
    page,
  }) => {
    const spacePage = new SpacePage(page, baseUrl);
    await spacePage.goto(baseScenario.space.nameId);

    const spaceName = baseScenario.space.about.profile.displayName;
    const banner = page.getByRole('img', {
      name: `Space banner for ${spaceName}`,
    });
    await expect(banner).toBeVisible({ timeout: 20_000 });

    // The gradient div, not an <img> — no image has ever been uploaded.
    expect(await banner.evaluate(el => el.tagName)).toBe('DIV');

    const box = await banner.boundingBox();
    expect(box, 'banner has no bounding box').toBeTruthy();
    const ratio = (box as { width: number; height: number }).width /
      (box as { width: number; height: number }).height;
    expect(ratio).toBeGreaterThan(9.7);
    expect(ratio).toBeLessThan(10.3);
    // Negative — pins the defect this story fixes: pre-fix, a bannerless
    // space rendered at 6:1 (the server's row-creation default reaching the
    // gradient because `resolveBannerAspectRatio` used to receive a bare
    // number instead of the whole visual).
    expect(ratio).not.toBeCloseTo(6, 0);

    // Belt and braces on the source of truth: the gradient's height comes
    // from an inline `style={{ aspectRatio }}` — the <img> branch has no CSS
    // ratio at all, so this doubles as the "no image uploaded" proof.
    const computedAspectRatio = await banner.evaluate(
      el => getComputedStyle(el).aspectRatio
    );
    expect(computedAspectRatio.startsWith('10')).toBe(true);
  });

  test('TC-06 — subspace of a bannerless L0 shows the same 10:1 gradient', async ({
    page,
  }) => {
    const spacePage = new SpacePage(page, baseUrl);
    await spacePage.goto(
      `${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}`
    );

    const subspaceName = baseScenario.subspace.about.profile.displayName;
    // Note the product's exact (unusual) capitalisation: i18n key
    // `a11y.subspaceBanner` renders "SubSpace banner for {{name}}", not
    // "Subspace banner for {{name}}".
    const banner = page.getByRole('img', {
      name: `SubSpace banner for ${subspaceName}`,
    });
    await expect(banner).toBeVisible({ timeout: 20_000 });
    expect(await banner.evaluate(el => el.tagName)).toBe('DIV');

    const box = await banner.boundingBox();
    expect(box, 'subspace banner has no bounding box').toBeTruthy();
    const ratio = (box as { width: number; height: number }).width /
      (box as { width: number; height: number }).height;
    expect(ratio).toBeGreaterThan(9.7);
    expect(ratio).toBeLessThan(10.3);

    // NOTE (product finding, not asserted): the build sheet for this case
    // expected the subspace's gradient COLOUR to differ from the L0's,
    // "keyed off the subspace id". The shipped mapper
    // (`subspacePageDataMapper.ts::mapSubspaceBanner`) instead computes
    // `color: pickColorFromId(levelZeroSpaceId ?? levelZeroName)` —
    // deliberately keyed off the L0 root id (per its own inline comment,
    // "so the identical image would otherwise render at two different
    // [colours] depending on whether you are on the space or a subspace").
    // The colour therefore MATCHES the parent, not differs from it. Asserting
    // "differs" here would fail against correct, intentional behaviour, so
    // it is not asserted — the shape check above (navigating to the
    // subspace's own header, a different component from the L0's) already
    // distinguishes "correctly inherited the shape" from "accidentally
    // rendered the parent's banner".
  });
});
