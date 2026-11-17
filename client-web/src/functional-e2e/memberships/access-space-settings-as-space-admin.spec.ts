// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { baseUrl, teardownScenario } from '../helpers/space-access.helper';
import { uniqueName } from './memberships.helpers';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'access-space-settings-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: uniqueName('Membership Test Space'),
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await teardownAuthentication();
  } finally {
    await teardownScenario(baseScenario);
  }
});

test.describe('Space/Subspace Settings Access Control', () => {
  test(
    'Access Space Settings - As Space Admin',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to "Membership Test Space"
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

      // 2. Access space settings (CRD: settings entry is a link in the space
      // banner with accessible name "Settings").
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible();
      await settingsLink.click();

      // 3. Verify navigated to settings page
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.space.nameId}/settings`)
      );

      // 4. Verify settings sections are available (CRD settings tabs)
      await expect(page.getByRole('tab', { name: /Layout/i })).toBeVisible();
    }
  );
});
