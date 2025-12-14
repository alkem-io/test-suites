// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { TestUserManager } from '@alkemio/tests-lib';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'non-member-lead-profile-access.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-public-space',
  space: {
    about: {
      profile: {
        displayName: 'Public Space for E2E Tests',
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

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Space Lead Profile Access', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(20_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('4.1 Non-Member Can See Space Leads Section on Community Tab', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to the Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community tab loads
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    // Verify Contact the Leads button is visible
    await expect(
      page.getByRole('button', { name: 'Contact the Leads' })
    ).toBeVisible();
  });

  test('4.2 Non-Member Can Open Lead Profile from Community Tab', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to the Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify Who's involved section is visible
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    // Wait for user profile links to appear in Who's involved section
    // Links are in format: /user/admin-alkemio, /user/space-admin, etc.
    const userLink = page.locator('a[href^="/user/"]').first();

    // Wait for the user link to be visible
    await expect(userLink).toBeVisible({ timeout: 60_000 });
    await userLink.click();

    // Wait for user profile page to load
    await page.waitForURL(/.*user.*/, { timeout: 10_000 });

    // Verify profile page opened successfully
    await expect(page).toHaveURL(/.*user.*/);

    // Verify no "Access Denied" message
    await expect(page.getByText(/access denied/i)).not.toBeVisible();
  });

  test("4.3 Non-Member Can View Lead's Profile Details", async ({ page }) => {
    test.setTimeout(90_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to the Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Wait for and click on the first user profile link
    const userLink = page.locator('a[href^="/user/"]').first();

    // Wait for the user link to be visible
    await expect(userLink).toBeVisible({ timeout: 60_000 });
    await userLink.click();

    // Wait for profile page to load
    await page.waitForURL(/.*user.*/, { timeout: 10_000 });

    // Verify user profile page loaded
    await expect(page).toHaveURL(/.*\/user\/.*/);

    // Verify profile avatar is displayed (MUI Avatar component)
    await expect(page.locator('.MuiAvatar-root img').first()).toBeVisible({
      timeout: 10_000,
    });

    // Verify user's display name or username is visible
    // Profile should show the user's name prominently
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({
      timeout: 5_000,
    });

    // Note: Specific profile sections (About, Skills, etc.) may vary
    // but we verify basic profile structure is accessible to non-members
  });
});
