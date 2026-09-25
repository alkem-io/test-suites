// workspace#027 — platform role redesign. Manual checklist C3 + C4, automated:
// Platform Support has admin controls inside a space ONLY where the host
// enabled "allow platform support as admin"; Platform Resource Admin has none
// anywhere (it may READ a private space — E6, a pending product decision this
// file does not take a side on — but never administer it).
//
// The space is disposable and PRIVATE, so no fixture user is a member of it:
// whatever these roles get, they get from the role alone.
import { expect, test as base, type Page } from '@playwright/test';
import {
  platformRoleEmail,
  seedPlatformRoleUsers,
  TestScenarioFactory,
  TestUserManager,
  updateSpaceSettings,
} from '@alkemio/tests-lib';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let scenario: OrganizationWithSpaceModel;
const setFlag = (on: boolean) =>
  updateSpaceSettings(scenario.space.id, {
    privacy: { mode: SpacePrivacyMode.Private, allowPlatformSupportAsAdmin: on },
  });

base.beforeAll(async () => {
  base.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  await seedPlatformRoleUsers();
  scenario = await TestScenarioFactory.createBaseScenario({ name: 'pr-support-flag', space: {} });
  await setFlag(false);
});
base.afterAll(async () => {
  if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario).catch(() => undefined);
});

const settingsTabs = (page: Page) => page.getByRole('tab', { name: /^(Layout|Community|Templates|Account)$/ });
const restricted = (page: Page) => page.getByRole('heading', { name: 'Access Restricted', level: 1 });

const asSupport = createPersonaTest(platformRoleEmail('PLATFORM_SUPPORT'));
asSupport.describe('PLATFORM_SUPPORT inside a private space', () => {
  asSupport.describe.configure({ mode: 'serial' });

  asSupport('flag OFF: no Settings link, and the settings URL bounces to About', async ({ page }) => {
    await page.goto(`${baseUrl}/${scenario.space.nameId}`);
    // A non-member lands on the space's About page (no dashboard for it).
    await expect(page.getByRole('heading', { name: /pr-support-flag/ }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await page.goto(`${baseUrl}/${scenario.space.nameId}/settings`);
    await expect(page).toHaveURL(/\/about(\?|$)/, { timeout: 20_000 });
    await expect(settingsTabs(page)).toHaveCount(0);
  });

  asSupport('flag ON: the Settings link is there and the settings page opens, editable', async ({ page }) => {
    await setFlag(true);
    await page.goto(`${baseUrl}/${scenario.space.nameId}`);
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible({ timeout: 20_000 });
    await page.goto(`${baseUrl}/${scenario.space.nameId}/settings`);
    await expect(page.getByRole('tab', { name: 'Community' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Edit space name' })).toBeVisible();
  });

  asSupport('flag switched OFF again: the admin controls are gone on the next load', async ({ page }) => {
    await setFlag(false);
    await page.goto(`${baseUrl}/${scenario.space.nameId}/settings`);
    await expect(page).toHaveURL(/\/about(\?|$)/, { timeout: 20_000 });
  });
});

const asResourceAdmin = createPersonaTest(platformRoleEmail('PLATFORM_RESOURCE_ADMIN'));
asResourceAdmin('PLATFORM_RESOURCE_ADMIN: no space settings, whatever the support flag says', async ({ page }) => {
  await setFlag(true);
  await page.goto(`${baseUrl}/${scenario.space.nameId}/settings`);
  await expect(restricted(page).or(page.getByRole('heading', { name: 'About' }))).toBeVisible({ timeout: 20_000 });
  await expect(settingsTabs(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit space name' })).toHaveCount(0);
});
