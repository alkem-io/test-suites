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
    storageStateName: 'access-subspace-settings-space-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;
const SUBSPACE_NAME = uniqueName('Subspace for Membership Tests');

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
    subspace: {
      about: {
        profile: {
          displayName: SUBSPACE_NAME,
          tagline: 'Testing subspace memberships',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  // Login as SPACE_ADMIN (parent space admin)
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
  // same as subspace admin test
  test(
    'Access Subspace Settings - As Space Admin (Parent)',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to "Subspace for Membership Tests"
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}`
      );

      // 2. Verify subspace page loads
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subspace.nameId}`)
      );

      // 3. Check if settings entry point is visible (CRD: settings entry is a
      // link in the subspace banner with accessible name "Settings").
      const settingsLink = page.getByRole('link', { name: 'Settings' }).first();
      await expect(settingsLink).toBeVisible();
      await settingsLink.click();

      // 4. Verify navigated to subspace settings page
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subspace.nameId}/settings`)
      );

      // 5. Verify settings page content is visible
      await expect(page.getByRole('tab', { name: 'About' })).toBeVisible();
      // CRD: the About settings tab edits in place — this subspace's own
      // name, in an editable "Subspace Name" field, proves admin access.
      const nameField = page.getByRole('textbox', { name: 'Subspace Name' });
      await expect(nameField).toHaveValue(SUBSPACE_NAME);
      await expect(nameField).toBeEditable();
    }
  );
});
