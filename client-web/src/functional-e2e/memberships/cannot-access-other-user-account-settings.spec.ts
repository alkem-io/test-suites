// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect } from '@playwright/test';
import {
  TestScenarioFactory,
  TestUserManager,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { baseUrl, teardownScenario } from '../helpers/space-access.helper';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'cannot-access-other-user-account.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(
    browser,
    TestUserManager.users.subspaceMember.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await teardownAuthentication();
  } finally {
    await teardownScenario(baseScenario);
  }
});

test.describe('User Account Settings', () => {
  // Un-skipped 2026-11-12 (W2 Tier 0 item 1). The "[BUG]" skip expected the
  // pre-CRD "We are redirecting you" / "Go now" interstitial. On client-web
  // develop the settings shell's guard (useUserSettingsAccessGuard →
  // useCanEditSettings: owner or PLATFORM_USERS_ADMIN) replaces the URL with the
  // user's public profile instead — the same CRD flow the organisation case
  // (cannot-access-organization-account-settings-non-admin) already asserts.
  test(
    'Cannot Access Other User Account Settings',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      const other = TestUserManager.users.spaceAdmin;

      // 1. Open another user's account settings directly.
      await page.goto(`${baseUrl}/user/${other.nameId}/settings/account`);

      // 2. Redirected to that user's public profile, which renders (positive
      //    control: the page is that user's, not a blank or error page).
      await expect(page).toHaveURL(`${baseUrl}/user/${other.nameId}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: new RegExp(other.displayName, 'i'),
        })
      ).toBeVisible();

      // 3. No settings shell: neither its tab strip nor the settings entry
      //    point the owner gets.
      await expect(page.getByRole('tab', { name: 'Account' })).toHaveCount(0);
      await expect(
        page.getByRole('link', { name: /Open user settings/i })
      ).toHaveCount(0);
    }
  );
});
