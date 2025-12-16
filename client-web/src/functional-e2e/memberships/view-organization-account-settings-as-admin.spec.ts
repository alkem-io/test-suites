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
    storageStateName: 'view-org-account-settings-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-memberships',
  organization: {
    community: {
      addMembers: true,
      addAdmin: true,
    },
  },
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
      admins: [TestUser.SPACE_ADMIN, TestUser.GLOBAL_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.ORGANIZATION_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.describe('Organization Account Settings', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('View Organization Account Settings - As Admin', async ({ page }) => {
    // 1. Navigate to organization account settings
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}/settings/account`
    );

    // 2. Verify URL changed to organization account settings
    await expect(page).toHaveURL(/.*\/organization\/.*\/settings\/account/);

    // 3. Verify resource sections for organization are displayed
    await expect(page.getByText(/Hosted Spaces/i).first()).toBeVisible();
    await expect(page.getByText(/Virtual Contributors/i).first()).toBeVisible();
    await expect(page.getByText(/Template Packs/i).first()).toBeVisible();
    await expect(page.getByText(/Custom Homepages/i).first()).toBeVisible();

    // 4. Verify "Membership Test Space" is listed in Hosted Spaces
    await expect(
      page.getByText(baseScenario.space.about.profile.displayName).first()
    ).toBeVisible({ timeout: 2000 });

    // 5. Verify shows organization's resource quotas and usage
    // await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible();
    await expect(page.getByText(/1\/3/).first()).toBeVisible();
  });
});
