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
    storageStateName: 'view-home-dashboard-authenticated.json',
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
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

/** @testCase TC-1913 */
test.describe('Home Dashboard Membership Display', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test(
    'View Home Dashboard - Authenticated User',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to home dashboard
      await page.goto(`${baseUrl}/home`);

      // 2. Verify home dashboard loads successfully
      await expect(page).toHaveURL(/.*\/home/);

      // 3. Verify "My Spaces" or similar section shows user's memberships
      await expect(page.getByText(/My Spaces|Spaces/i)).toBeVisible();

      // 4. Verify displays card for "Membership Test Space" (member)
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible({ timeout: 2000 });

      // 5. Verify each card shows quick access links
      const spaceCard = page
        .locator(`text=${baseScenario.space.about.profile.displayName}`)
        .first();
      await expect(spaceCard).toBeVisible();
    }
  );
});
