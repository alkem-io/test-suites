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
    storageStateName: 'view-home-dashboard-authenticated.json',
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
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
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
      ).toBeVisible();

      // 4. Verify displays card for the member's space
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible();

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
