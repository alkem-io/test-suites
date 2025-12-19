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
    storageStateName: 'view-own-account-settings.json',
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
  },
};

test.describe('User Account Settings', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  // todo: the user should be a host
  test.skip(
    'View Own Account Settings',
    {
      tag: ['@coveredin', '@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to own account settings
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceAdmin.nameId}/settings/account`
      );

      // 2. Verify URL changed to account settings
      await expect(page).toHaveURL(/.*\/settings\/account/);

      // 3. Verify information message is displayed
      await expect(
        page.getByText(/Here you find all your.*Spaces.*Virtual Contributors/i)
      ).toBeVisible();

      // 4. Verify resource sections are displayed
      await expect(page.getByText(/Hosted Spaces/i).first()).toBeVisible();
      await expect(
        page.getByText(/Virtual Contributors/i).first()
      ).toBeVisible();
      await expect(page.getByText(/Template Packs/i).first()).toBeVisible();
      await expect(page.getByText(/Custom Homepages/i).first()).toBeVisible();

      // 5. Verify hosted space is shown if admin of space
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName)
      ).toBeVisible();
    }
  );
});
