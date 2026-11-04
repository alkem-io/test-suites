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

      // 3. Verify the user's spaces section is shown
      // CRD: the home dashboard surfaces the membership spaces under the
      // "Recent Spaces" section heading.
      await expect(
        page.getByRole('heading', { name: /Recent Spaces/i })
      ).toBeVisible({ timeout: 5000 });

      // 4. Verify displays card for the member's space
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible({ timeout: 5000 });

      // 5. Verify the space is reachable as a card link (quick access)
      const spaceCard = page
        .getByRole('link', {
          name: new RegExp(baseScenario.space.about.profile.displayName),
        })
        .first();
      await expect(spaceCard).toBeVisible();
    }
  );
});
