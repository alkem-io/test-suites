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
    storageStateName: 'non-member-tab-navigation.json',
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

test.describe('Space Tab Navigation for Non-Members', () => {
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

  test('1.1 Non-Member Can Navigate to Public Space from Home', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to home page (already authenticated)
    await page.goto(`${baseUrl}/home`);

    // Verify home page loaded
    await expect(page).toHaveURL(/\/home/);

    // Navigate directly to the public space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify space landing page loads successfully
    await expect(page).toHaveURL(new RegExp(`${baseScenario.space.nameId}$`));

    // Verify space name is visible
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: baseScenario.space.nameId })
    ).toBeVisible();

    // Verify description is visible
    await expect(
      page.getByText(
        'A journey of discovery! Gather insights through research and observation.'
      )
    ).toBeVisible();

    // Verify NO "About Space" dialog is displayed (full space access)
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('2.1 Non-Member Can View All Space Tabs', async ({ page }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify presence of standard tabs
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'community' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Subspaces' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Knowledge' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'activity' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'videoCall' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'share' })).toBeVisible();

    // Verify Home tab is selected by default
    await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('2.2 Non-Member Can Navigate to Dashboard Tab', async ({ page }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Home tab (Dashboard)
    await page.getByRole('tab', { name: 'Home' }).click();

    // Verify dashboard content loads - space description is visible
    await expect(
      page.getByText(
        'A journey of discovery! Gather insights through research and observation.'
      )
    ).toBeVisible();

    // Verify About this Space button is visible
    await expect(
      page.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();
  });

  test('2.3 Non-Member Can Navigate to Subspaces Tab', async ({ page }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify URL changes to subspaces tab
    await expect(page).toHaveURL(/tab=3/);

    // Note: This space has no subspaces in the test scenario
    // so we just verify the tab loads without error
  });

  test('2.4 Non-Member Can Navigate to Knowledge Base Tab', async ({
    page,
  }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Knowledge tab
    await page.getByRole('tab', { name: 'Knowledge' }).click();

    // Verify URL changes to knowledge tab
    await expect(page).toHaveURL(/tab=4/);
  });

  test('2.5 Non-Member Can Navigate to Community Tab', async ({ page }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community tab content loads
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // Verify Who's involved section is visible
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    // For non-members, they can see the community content
    // (Unlike anonymous users who see a login prompt)
  });
});
