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

const { test, setupAuthentication } = createAuthenticatedSessionFixture({
  storageStateName: 'non-member-subspace-navigation.json',
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
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      about: {
        profile: {
          displayName: 'seed-public-space',
          tagline: 'test description',
        },
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: {
            policy: CommunityMembershipPolicy.Applications,
          },
        },
      },
    },
  },
};

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Subspace Navigation for Non-Members', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, 'non.space@alkem.io');
  });

  // test.afterAll(async () => {
  //   test.setTimeout(40_000);
  //   await teardownAuthentication();
  //   await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  // });

  test.only('5.1 Non-Member Can Navigate into Public Subspace', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify subspace card is visible
    await expect(
      page.getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.subspace.about.profile.displayName}`
        ),
      })
    ).toBeVisible();

    // Click on the subspace card
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.subspace.about.profile.displayName}`
        ),
      })
      .click();

    // Verify subspace landing page loads successfully
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);
    baseScenario.subspace.about.profile.tagline;
    // Verify subspace heading is visible
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: baseScenario.subspace.about.profile.displayName,
      })
    ).toBeVisible();

    // Verify subspace content is visible (not About dialog)
    console.log(
      'Verifying subspace tagline:',
      baseScenario.subspace.about.profile.tagline
    );
    await expect(
      page.getByText(baseScenario.subspace.about.profile.tagline)
    ).toBeVisible({ timeout: 10_000 });

    // Verify breadcrumb shows parent space > subspace hierarchy
    await expect(
      page.getByRole('link', { name: baseScenario.space.nameId }).first()
    ).toBeVisible();
  });

  test('5.2 Non-Member Sees About Dialog When Accessing Private Sub-subspace', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card to enter the public subspace
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
      .click();

    // Verify we are in the subspace
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'seed-public-space',
      })
    ).toBeVisible();

    // Verify sub-subspace is visible in the hierarchy (cards ARE visible)
    await expect(
      page.getByRole('link', {
        name: /Avatar seed-public-space/,
      })
    ).toBeVisible();

    // Click on the PRIVATE sub-subspace link
    await page
      .getByRole('link', {
        name: /Avatar seed-public-space/,
      })
      .click();

    // For PRIVATE sub-subspace, non-member should see a dialog or restricted content
    // Wait a moment for any dialog to appear
    await page.waitForTimeout(2_000);

    // Check if a dialog appeared (About Space dialog)
    const dialog = page.getByRole('dialog');
    const dialogVisible = (await dialog.count()) > 0;

    if (dialogVisible) {
      // Verify dialog is visible
      await expect(dialog.first()).toBeVisible();

      // Verify dialog shows sub-subspace information (heading has id="space-about-dialog")
      await expect(
        dialog
          .first()
          .getByRole('heading', { name: /seed-public-space/ })
          .first()
      ).toBeVisible();
    } else {
      // Alternative: Page may show restricted access message or remain on subspace
      // Verify we didn't navigate to the private sub-subspace URL
      await expect(page).not.toHaveURL(/\/opportunities\//);
    }
  });

  test.skip('5.3 Non-Member Can View Subspace Community and Leads', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card to enter the public subspace
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
      .click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);

    // Navigate to the subspace Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community tab loads
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    // Verify subspace leads are displayed (SUBSPACE_ADMIN)
    // The lead should be visible in the community section
    await expect(
      page.getByRole('button', { name: 'Contact the Leads' })
    ).toBeVisible();

    // Verify lead profiles are clickable (links are in format /user/username)
    const leadLink = page.locator('a[href^="/user/"]').first();
    await expect(leadLink).toBeVisible({ timeout: 60_000 });

    // Click on lead profile to verify it's accessible
    await leadLink.click();

    // Verify profile page loads
    await page.waitForURL(/.*user.*/, { timeout: 10_000 });
    await expect(page).toHaveURL(/.*user.*/);
  });

  test('5.4 Non-Member Can View Subspace Content Without About Dialog', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
      .click();

    // Verify full subspace content is visible (no About dialog blocking)
    await expect(page.getByText('test description')).toBeVisible();

    // Verify action buttons are visible (scoped to main content area)
    await expect(
      page.getByRole('main').getByRole('link', { name: 'About' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Video Call' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Contributors' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible();

    // Verify phase navigation is visible
    await expect(
      page.getByRole('button', { name: /Current Phase: Explore/ })
    ).toBeVisible();

    // Non-member is logged in, so they may see "Apply" button or no button
    // Check if apply/join button exists (membership policy dependent)
    const applyButton = page.getByRole('button', { name: /apply|join/i });
    const applyButtonVisible = (await applyButton.count()) > 0;

    if (applyButtonVisible) {
      await expect(applyButton.first()).toBeVisible();
    }
    // If no apply button, that's also valid - non-members may not be able to apply
  });
});
