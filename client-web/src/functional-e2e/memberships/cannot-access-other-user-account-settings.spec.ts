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
    storageStateName: 'cannot-access-other-user-account.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
};

/** @testCase TC-1910 */
test.describe('User Account Settings', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.subspaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  // [BUG] in the client/server to be fixed
  test.skip(
    'Cannot Access Other User Account Settings',
    {
      tag: ['@bug', '@regression'],
    },
    async ({ page }) => {
      // 1. Attempt to access another user's account settings
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceAdmin.nameId}/settings/account`
      );

      // 2. Verify modal or message about redirecting to closest parent
      await expect(page.getByText(/We are redirecting you/i)).toBeVisible();

      // 3. Verify option to navigate to parent space (about page)
      const redirectButton = page.getByRole('button', {
        name: /Go now/i,
      });
      await expect(redirectButton).toBeVisible();

      // 4. Click redirect button and verify navigation to parent space about
      await redirectButton.click();

      // 5. Verify redirected to parent space URL
      await expect(page).toHaveURL(
        `/user/${TestUserManager.users.spaceAdmin.nameId}`
      );
    }
  );
});
