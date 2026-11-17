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
    storageStateName: 'view-org-account-settings-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  organization: {
    community: {
      addMembers: true,
      addAdmin: true,
    },
  },
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
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(
    browser,
    TestUserManager.users.organizationAdmin.email
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

test.describe('Organization Account Settings', () => {
  test(
    'View Organization Account Settings - As Admin',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to organization account settings
      await page.goto(
        `${baseUrl}/organization/${baseScenario.organization.nameId}/settings/account`
      );

      // 2. Verify URL changed to organization account settings
      await expect(page).toHaveURL(/.*\/organization\/.*\/settings\/account/);

      // 3. Verify resource sections for organization are displayed
      await expect(page.getByText(/Hosted Spaces/i).first()).toBeVisible();
      await expect(
        page.getByText(/Virtual Contributors/i).first()
      ).toBeVisible();
      await expect(page.getByText(/Template Packs/i).first()).toBeVisible();
      await expect(page.getByText(/Custom Homepages/i).first()).toBeVisible();

      // 4. Verify "Membership Test Space" is listed in Hosted Spaces
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible();

      // 5. Usage badges ("{usage}/{limit}"): the fresh organisation hosts
      //    exactly the seeded space and nothing else, so exactly one badge
      //    reads 1/<limit> (the limit is the environment's plan, not asserted).
      //    A space not counted would leave every badge at 0/<limit>.
      await expect(page.getByText(/^1\/\d+$/)).toHaveCount(1);
    }
  );
});
