// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect } from '@playwright/test';
import {
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
    storageStateName: 'view-home-dashboard-multiple.json',
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
      members: [TestUser.SPACE_ADMIN],
    },

    subspace: {
      about: {
        profile: {
          displayName: uniqueName('Subspace for Membership Tests'),
          tagline: 'Testing subspace memberships',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        leads: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
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

test.describe('Home Dashboard Membership Display', () => {
  test(
    'View Home Dashboard - Multiple Memberships',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to home dashboard
      await page.goto(`${baseUrl}/home`);

      // 2. Verify home dashboard loads successfully
      await expect(page).toHaveURL(/.*\/home/);

      // 3. Both levels are listed, each by its run-unique display name
      //    (`.first()` only because a card may repeat its own name, e.g. in
      //    the banner alt text; no other space can carry it). L0, admin:
      const spaceName = baseScenario.space.about.profile.displayName;
      await expect(page.getByText(spaceName).first()).toBeVisible();

      // 4. L1, where the user is lead. Unique name: an earlier run's leaked
      //    subspace can no longer satisfy this.
      const subspaceName = baseScenario.subspace.about.profile.displayName;
      await expect(page.getByText(subspaceName).first()).toBeVisible();
    }
  );
});
