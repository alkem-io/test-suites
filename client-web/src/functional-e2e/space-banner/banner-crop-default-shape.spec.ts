// spec: client-web/src/functional-e2e/space-banner/space-banner-test-plan.md
// story: client-web#10178 (client-web#10222, server#6439)
//
// TC-05 — a space's first-ever page banner: the crop dialog opens on the
// 10:1 default shape (not the old fixed 6:1), and the banner the space page
// then renders is unchanged by any forced CSS ratio (R4 — a future CSS
// `aspect-ratio` on the <img> would silently re-crop every real banner).

import { expect, type Locator, type Page } from '@playwright/test';
import { TestScenarioFactory, TestUserManager, createPngFixture } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { SpacePage, SpaceSettingsPage } from '../space/pages';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'space-banner-crop-default.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'space-banner-crop',
  space: {},
};

/**
 * Drags across the crop preview so ReactCrop reports a completed crop — the
 * dialog's Save button stays disabled until it does. Local copy of the
 * pattern in `chat-avatars/chat-avatars.helpers.ts::completeCrop` (not
 * exported from that file).
 */
async function completeCrop(page: Page, from = 0.15, to = 0.85): Promise<void> {
  const preview = page.getByAltText('Crop preview');
  await expect(preview).toBeVisible({ timeout: 15_000 });
  const box = await preview.boundingBox();
  expect(box, 'crop preview has no bounding box').toBeTruthy();
  const { x, y, width, height } = box as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  await page.mouse.move(x + width * from, y + height * from);
  await page.mouse.down();
  await page.mouse.move(x + width * to, y + height * to, { steps: 10 });
  await page.mouse.up();
}

/** The "Page Banner" field's Upload control, scoped via its own <h3> label. */
function pageBannerUploadButton(page: Page): Locator {
  const heading = page.getByRole('heading', { name: 'Page Banner', exact: true });
  return heading.locator('xpath=..').getByRole('button', { name: 'Upload' });
}

test.describe('First page-banner crop opens at the 10:1 default (10178)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('TC-05 — first crop opens at 10:1 and saves that shape', async ({
    page,
  }) => {
    // Upload + crop + save + re-navigate is several real network round
    // trips; the local-env default (30s) is tuned for simple navigations.
    test.setTimeout(180_000);
    const settingsPage = new SpaceSettingsPage(page);
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings`);
    await expect(settingsPage.aboutTab).toBeVisible({ timeout: 20_000 });
    await settingsPage.aboutTab.click();

    const uploadButton = pageBannerUploadButton(page);
    await expect(uploadButton).toBeVisible({ timeout: 20_000 });

    // Comfortably above the 1200px floor and already 10:1, so a full-frame
    // crop is valid at the default shape.
    const fixture = createPngFixture({ width: 2000, height: 200 });
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      uploadButton.click(),
    ]);
    await chooser.setFiles(fixture);

    // Anchor on the slider becoming visible — unambiguous, and the thing
    // under test — rather than the crop dialog's heading.
    const slider = page.getByRole('slider', { name: 'Banner shape' });
    await expect(slider).toBeVisible({ timeout: 15_000 });

    // The label carries the true ratio.
    await expect(
      page.getByText('Aspect Ratio: 10.0:1', { exact: true })
    ).toBeVisible();
    // `aria-valuetext` carries the true ratio for assistive tech.
    await expect(slider).toHaveAttribute('aria-valuetext', 'Aspect ratio: 10.0');
    // NOT a bug: the control is deliberately mirrored (min+max−ratio) so the
    // browser keeps its native left-anchored fill while 10:1 sits on the
    // left. `value`/`min`/`max` are the DOM's ascending, un-mirrored numbers;
    // the true ratio lives only in `aria-valuetext` (asserted above).
    await expect(slider).toHaveAttribute('value', '6');
    await expect(slider).toHaveAttribute('min', '6');
    await expect(slider).toHaveAttribute('max', '10');

    // The swapped hint copy (this PR) — the only executable cover, since
    // locale files are out of this repo's remit.
    await expect(page.getByText('Left: shorter image crop')).toBeVisible();
    await expect(page.getByText('Right: taller image crop')).toBeVisible();

    await completeCrop(page);
    const save = page.getByRole('button', { name: 'Save', exact: true });
    await expect(save).toBeEnabled({ timeout: 10_000 });
    await save.click();
    await expect(slider).toHaveCount(0, { timeout: 30_000 });

    // The space page now renders an <img> (not the gradient div) at ~10:1,
    // with no CSS aspect-ratio forcing a re-crop of the real pixels (R4).
    const spacePage = new SpacePage(page, baseUrl);
    await spacePage.goto(baseScenario.space.nameId);

    const spaceName = baseScenario.space.about.profile.displayName;
    const banner = page.getByRole('img', {
      name: `Space banner for ${spaceName}`,
    });
    await expect(banner).toBeVisible({ timeout: 30_000 });
    expect(await banner.evaluate(el => el.tagName)).toBe('IMG');

    const width = Number(await banner.getAttribute('width'));
    const height = Number(await banner.getAttribute('height'));
    expect(width / height).toBeGreaterThan(9.7);
    expect(width / height).toBeLessThan(10.3);

    // No forced CSS aspect-ratio (R4's guard). Chrome resolves the UA
    // stylesheet rule `aspect-ratio: auto attr(width) / attr(height)` to
    // `"auto 1920 / 192"` once the image has loaded — not a bare `"auto"` —
    // so the presence of the leading `"auto"` keyword (rather than a forced
    // author ratio, which would report as e.g. `"10 / 1"` with no `"auto"`
    // prefix) is what distinguishes "derived from the loaded image" from "a
    // forced CSS ratio that would re-crop it".
    const computedAspectRatio = await banner.evaluate(
      el => getComputedStyle(el).aspectRatio
    );
    expect(computedAspectRatio.startsWith('auto')).toBe(true);
  });
});
