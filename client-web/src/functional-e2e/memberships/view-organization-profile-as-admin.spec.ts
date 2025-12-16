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
    storageStateName: 'view-org-profile-as-admin.json',
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

test.describe('Organization Profile Access', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    // Login as ORGANIZATION_ADMIN
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

  // same as member test
  test('View Organization Profile - As Admin', async ({ page }) => {
    // Navigate to organization profile
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );

    // Verify organization profile page loads
    await expect(page).toHaveURL(
      new RegExp(`/organization/${baseScenario.organization.nameId}`)
    );

    // organization name heading
    const orgNameHeading = page.getByRole('heading', {
      level: 1,
      name: new RegExp(baseScenario.organization.profile.displayName, 'i'),
    });
    await expect(orgNameHeading).toBeVisible({ timeout: 2000 });

    // Verify can bio and section
    await expect(
      page.getByRole('heading', { name: /Bio/i }).first()
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /Spaces we lead/i }).first()
    ).toBeVisible();

    // Verify the space created by this organization is displayed
    await expect(
      page.getByText(baseScenario.space.about.profile.displayName).first()
    ).toBeVisible({ timeout: 2000 });

    // Verify access to settings tabs
    const settingsIcon = page.locator('[data-testid="SettingsOutlinedIcon"]');
    await expect(settingsIcon).toBeVisible({ timeout: 2000 });

    // Navigate to settings and verify admin capabilities
    await settingsIcon.click();
    await expect(page).toHaveURL(
      new RegExp(`/organization/${baseScenario.organization.nameId}/settings`)
    );

    // Verify settings page content is visible
    await expect(page.getByText(/Here you can edit.*/i)).toBeVisible();
  });
});
