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
    storageStateName: 'view-org-profile-as-admin.json',
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
      members: [TestUser.SPACE_ADMIN, TestUser.ORGANIZATION_ADMIN],
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  // Login as ORGANIZATION_ADMIN
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

test.describe('Organization Profile Access', () => {
  // same as member test
  test(
    'View Organization Profile - As Admin',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
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
      await expect(orgNameHeading).toBeVisible();

      // Verify bio section (CRD org sidebar "Bio" block)
      await expect(
        page.getByRole('heading', { name: /Bio/i }).first()
      ).toBeVisible();

      // CRD: spaces are organised under resource tabs; the spaces the org
      // leads live under the "Lead Spaces" tab.
      const leadSpacesTab = page.getByRole('tab', { name: /Lead Spaces/i });
      await expect(leadSpacesTab).toBeVisible();
      await leadSpacesTab.click();

      // Verify the space created by this organization is displayed
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible();

      // Verify access to settings (CRD icon link with accessible name)
      const settingsLink = page.getByRole('link', {
        name: /Open organisation settings/i,
      });
      await expect(settingsLink).toBeVisible();

      // Navigate to settings and verify admin capabilities
      await settingsLink.click();
      await expect(page).toHaveURL(
        new RegExp(`/organization/${baseScenario.organization.nameId}/settings`)
      );

      // Verify settings page content is visible (CRD settings tabs)
      await expect(
        page.getByRole('tab', { name: /Profile/i }).first()
      ).toBeVisible();
    }
  );
});
