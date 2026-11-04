// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md
// seed: client-web/src/functional-e2e/seed-memberships.spec.ts

import { expect } from '@playwright/test';
import {
  TestUser,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'access-subspace-settings-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: 'Membership Test Space',
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
      ],
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
          displayName: 'Subspace for Membership Tests',
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

test.describe('Space/Subspace Settings Access Control', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.subspaceAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  // same as space admin test
  test(
    'Access Subspace Settings - As Subspace Admin',
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
      await expect(settingsLink).toBeVisible({ timeout: 5000 });
      await settingsLink.click();

      // 4. Verify navigated to subspace settings page
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subspace.nameId}/settings`)
      );

      // 5. Verify settings page content is visible
      await expect(page.getByRole('tab', { name: 'About' })).toBeVisible({
        timeout: 5000,
      });
      // CRD: the About settings tab exposes the "Space Name" field section
      // (replaces the legacy "Details" heading).
      await expect(
        page.getByRole('heading', { name: 'Space Name' })
      ).toBeVisible();
    }
  );
});
