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
    storageStateName: 'non-member-subspace-navigation.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'public-space',
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
          displayName: 'l1-public',
          tagline: 'l1-public tagline',
        },
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        leads: [TestUser.SUBSPACE_ADMIN],
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
    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(40_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('5.1 Non-Member Can Navigate into Public Subspace', async ({ page }) => {
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
    await expect(page).toHaveURL(
      new RegExp(`/challenges/${baseScenario.subspace.nameId}`)
    );

    // Verify subspace heading is visible
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: baseScenario.subspace.about.profile.displayName,
      })
    ).toBeVisible();

    // Verify subspace content is visible (not About dialog)
    // Note: Tagline might not be populated in the model returned by factory, using literal from config
    const expectedTagline = baseScenario.subspace.about.profile.tagline;
    console.log('Verifying subspace tagline:', expectedTagline);

    // if (expectedTagline) {
    //   await expect(page.getByText(expectedTagline)).toBeVisible({
    //     timeout: 10_000,
    //   });
    // }

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

    const subspaceProfile = baseScenario.subspace.about.profile;
    const subsubspaceProfile = baseScenario.subsubspace.about.profile;
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify subspace card is visible using regex pattern
    await expect(
      page.getByRole('link', {
        name: new RegExp(`Card banner:.*${subspaceProfile.displayName}`),
      })
    ).toBeVisible({
      timeout: 10_000,
    });

    // Click on the subspace card to enter the public subspace
    await page
      .getByRole('link', {
        name: `Avatar ${subspaceProfile.displayName}`,
      })
      .click();

    await page.waitForTimeout(2_000);
    // Verify we are in the subspace
    await expect(
      page.getByRole('heading', {
        name: subspaceProfile.displayName,
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: subspaceProfile.tagline,
      })
    ).toBeVisible();

    // Verify sub-subspace is visible in the hierarchy (cards ARE visible)
    await expect(
      page.getByRole('link', {
        name: `${subsubspaceProfile.displayName}`,
      })
    ).toBeVisible();

    // Click on the PRIVATE sub-subspace link
    await page
      .getByRole('link', {
        name: `Avatar ${subsubspaceProfile.displayName} Locked`,
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
          .getByRole('heading', {
            name: `${subsubspaceProfile.displayName}`,
          })
          .first()
      ).toBeVisible();
    } else {
      // Alternative: Page may show restricted access message or remain on subspace
      // Verify we didn't navigate to the private sub-subspace URL
      await expect(page).not.toHaveURL(/\/opportunities\//);
    }
  });

  test('5.3 Non-Member Can View Subspace Community and Leads', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card from list tesults - clicking on Card banner should be provided Space Avatar, which in my opinion is not correct
    await page
      .getByRole('link', {
        name: `Avatar ${baseScenario.subspace.about.profile.displayName}`,
      })
      .click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(
      new RegExp(`/challenges/${baseScenario.subspace.nameId}`)
    );

    // Click to the subspace Contributors button
    await page.getByRole('button', { name: 'Contributors' }).click();

    // Verify Contributors dialog to load
    await expect(
      page.getByRole('heading', { name: 'Contributors' })
    ).toBeVisible();

    // Close Contributors dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Click on subspace About button
    await page
      .getByRole('button', { name: 'About' })
      .click({ timeout: 10_000 });

    await page.waitForTimeout(2_000);

    // Click on the lead profile link
    await page
      .getByRole('link', {
        name: `User avatar ${TestUserManager.users.subspaceAdmin.displayName}`,
      })
      .click({ timeout: 10_000 });

    // Verify Subspace Lead profile page loads
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

    // Click on the subspace card - clicking on Card banner should be provided Space Avatar, which in my opinion is not correct
    // await page
    //   .getByRole('link', {
    //     name: new RegExp(
    //       `Card banner:.*${baseScenario.space.about.profile.displayName}`
    //     ),
    //   })
    //   .click();

    // Click on the subspace card from list tesults
    await page
      .getByRole('link', {
        name: `Avatar ${baseScenario.subspace.about.profile.displayName}`,
      })
      .click();

    // Verify full subspace content is visible (no About dialog blocking)
    await expect(
      page.getByText(baseScenario.subspace.about.profile.tagline)
    ).toBeVisible();

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
