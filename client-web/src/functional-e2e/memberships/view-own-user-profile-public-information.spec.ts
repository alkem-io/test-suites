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
    storageStateName: 'view-own-user-profile-public.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-memberships',
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

test.describe('User Profile Membership Display', () => {
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

  test('View Own User Profile - Public Information', async ({ page }) => {
    await page.goto(
      `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}`
    );

    await expect(page).toHaveURL(
      new RegExp(`/user/${TestUserManager.users.spaceMember.nameId}`)
    );

    const userNameHeading = page.getByRole('heading', {
      level: 1,
      name: new RegExp(TestUserManager.users.spaceMember.displayName, 'i'),
    });
    await expect(userNameHeading).toBeVisible({ timeout: 3000 });

    await expect(
      page.getByRole('heading', { name: /Bio/i }).first()
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /Spaces.*/i }).first()
    ).toBeVisible();

    await expect(
      page.getByText(baseScenario.space.about.profile.displayName).first()
    ).toBeVisible({ timeout: 2000 });

    const settingsIcon = page.locator('[data-testid="SettingsOutlinedIcon"]');
    await expect(settingsIcon).toBeVisible();
    await settingsIcon.click();

    await expect(page).toHaveURL(
      new RegExp(`/user/${TestUserManager.users.spaceMember.nameId}/settings`)
    );

    await expect(
      page.getByText(/Here you can edit your profile details*/i)
    ).toBeVisible();
  });
});
