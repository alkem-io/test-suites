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
import { expect, Page } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { TestUserManager } from '@alkemio/tests-lib';

// The hard-coded community members grid was removed (feature 008 / story
// client-web#9928); space leads now render in the "Space Leads" section of the
// CRD space sidebar. Their profile links use absolute hrefs
// (http://localhost:3000/user/<id>), so match on a substring.
const firstLeadUserLink = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Space sidebar' })
    .locator('a[href*="/user/"]')
    .first();

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

    // Verify community tab loads (CRD shows the contributors heading instead
    // of the MUI "Who's involved" heading)
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // CRD renders the Space Leads section in the space sidebar
    const sidebar = page.getByRole('navigation', { name: 'Space sidebar' });
    await expect(sidebar.getByText('Space Leads')).toBeVisible();

    // Verify Contact Leads button is visible (CRD renames "Contact the Leads")
    await expect(
      sidebar.getByRole('button', { name: 'Contact Leads' })
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

    // Verify community contributors section is visible (CRD heading)
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // Space leads render in the CRD space-sidebar "Space Leads" section.
    const userLink = firstLeadUserLink(page);

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
    test.setTimeout(60_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to the Community tab
    const communityTab = page.getByRole('tab', { name: 'community' });
    await expect(communityTab).toBeVisible({ timeout: 3000 });

    await communityTab.click();

    // Wait for and click on the first lead profile link in the CRD space
    // sidebar (the community members grid was removed — feature 008).
    const userLink = firstLeadUserLink(page);

    // Wait for the user link to be visible
    await expect(userLink).toBeVisible({ timeout: 10_000 });
    await userLink.click();

    // Wait for profile page to load
    await page.waitForURL(/.*user.*/, { timeout: 3000 });

    // Verify user profile page loaded
    await expect(page).toHaveURL(/.*\/user\/.*/);

    // Verify profile avatar image is displayed
    await expect(page.getByRole('img').first()).toBeVisible({
      timeout: 5_000,
    });

    // Verify user's display name or username is visible
    // Profile should show the user's name prominently
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 5_000,
    });

    // Note: Specific profile sections (About, Skills, etc.) may vary
    // but we verify basic profile structure is accessible to non-members
  });
});
