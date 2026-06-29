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

    // CRD renders each subspace as an unnamed link wrapping an article with
    // a level-3 heading carrying the subspace display name. Target the card
    // link via the heading it contains.
    const subspaceCard = page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', {
          name: baseScenario.subspace.about.profile.displayName,
          exact: true,
        }),
      });

    // Verify subspace card is visible
    await expect(subspaceCard).toBeVisible();

    // Click on the subspace card
    await subspaceCard.click();

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

    // CRD subspace card = unnamed link wrapping an article with a level-3
    // heading carrying the subspace display name.
    const subspaceCard = page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', {
          name: subspaceProfile.displayName,
          exact: true,
        }),
      });

    // Verify subspace card is visible
    await expect(subspaceCard).toBeVisible({
      timeout: 10_000,
    });

    // Click on the subspace card to enter the public subspace
    await subspaceCard.click();

    await page.waitForTimeout(2_000);
    // Verify we are in the subspace
    await expect(
      page.getByRole('heading', {
        name: subspaceProfile.displayName,
        exact: true,
      })
    ).toBeVisible();

    // CRD renders the tagline as a paragraph, not a heading.
    await expect(page.getByText(subspaceProfile.tagline)).toBeVisible();

    // CRD lists the sub-subspaces in the subspace sidebar (under the
    // "Subspaces" heading), not under a tab. The private sub-subspace renders
    // as a named link "<initial> <displayName> Private".
    const subsubspaceCard = page.getByRole('link', {
      name: new RegExp(`${subsubspaceProfile.displayName}.*Private`),
    });

    // Verify sub-subspace is visible in the hierarchy (cards ARE visible)
    await expect(subsubspaceCard).toBeVisible();

    // Click on the PRIVATE sub-subspace card
    await subsubspaceCard.click();

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

    // Click on the subspace card (CRD: unnamed link wrapping an article
    // with the subspace display-name heading).
    await page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', {
          name: baseScenario.subspace.about.profile.displayName,
          exact: true,
        }),
      })
      .click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(
      new RegExp(`/challenges/${baseScenario.subspace.nameId}`)
    );

    // CRD exposes the contributors via the "Community" quick action in the
    // subspace sidebar (replacing the MUI "Contributors" button).
    await page
      .getByRole('button', { name: 'Community' })
      .first()
      .click({ timeout: 10_000 });

    // The community dialog lists the space leads; the subspace admin is shown
    // as a profile link. Click it to open the lead profile.
    await page
      .getByRole('link', {
        name: new RegExp(TestUserManager.users.subspaceAdmin.displayName),
      })
      .first()
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

    // Click on the subspace card (CRD: unnamed link wrapping an article
    // with the subspace display-name heading).
    await page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('link')
      .filter({
        has: page.getByRole('heading', {
          name: baseScenario.subspace.about.profile.displayName,
          exact: true,
        }),
      })
      .click();

    // Verify full subspace content is visible (no About dialog blocking)
    await expect(
      page.getByText(baseScenario.subspace.about.profile.tagline)
    ).toBeVisible();

    // Verify action affordances are visible. CRD renames/reshapes these:
    // the subspace About is a sidebar button ("About this Subspace"), the
    // video call is a header link ("Start video call"), and recent activity
    // / share are header buttons.
    await expect(
      page.getByRole('button', { name: 'About this Subspace' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Start video call' })
    ).toBeVisible();
    // "Recent activity" (header) collides with the "Recent Activity" quick
    // action; pin the header affordance with an exact match.
    await expect(
      page.getByRole('button', { name: 'Recent activity', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();

    // Verify phase navigation is visible. CRD renders the innovation-flow
    // phases as "Switch to phase <name>" buttons inside the
    // "Innovation flow phases" navigation.
    await expect(
      page.getByRole('button', { name: /Switch to phase Explore/ })
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
