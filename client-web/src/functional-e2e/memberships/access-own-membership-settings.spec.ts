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
    storageStateName: 'my-feature-test.json',
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
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.describe('User Membership Settings', () => {
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
    'Access Own Membership Settings',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to own membership settings
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}/settings/membership`
      );

      // 2. Verify URL changed to membership settings
      await expect(page).toHaveURL(/.*\/settings\/membership/);

      // 3. Verify "My memberships" section is visible
      // Membership cards display:
      // - Space from baseScenario with member role
      // - Space name: baseScenario.space.profile.displayName
      // - "Leave" button available
      const leaveBtn = page.getByRole('button', { name: 'Leave' }).first();
      await expect(leaveBtn).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName)
      ).toBeVisible();

      // 4. leave community
      await leaveBtn.click();
      // confirm leave in modal
      await page.getByRole('button', { name: 'Leave' }).first().click();

      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}/settings/membership`
      );

      await expect(
        page.getByText(baseScenario.space.about.profile.displayName)
      ).not.toBeVisible();
    }
  );
});
