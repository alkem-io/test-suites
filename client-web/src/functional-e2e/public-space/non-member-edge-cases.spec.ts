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
    storageStateName: 'non-member-edge-cases.json',
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
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
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
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
    },
  },
};

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Edge Cases and Error Handling', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('6.1 Non-Member Sees Appropriate UI When Space Has Default Callout', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify welcome callout is visible
    await expect(
      page.getByRole('heading', { name: '👋 Welcome to your space!' })
    ).toBeVisible();

    // CRD collapses the comment thread by default (020 callout-collapse).
    // Expand it to surface the non-member gating message.
    await page.getByRole('button', { name: /Expand comments/i }).click();

    // Verify non-member message is shown (CRD rewords the gating copy)
    await expect(
      page.getByText(
        "You don't have permission to comment, reply or react here."
      )
    ).toBeVisible();

    // Verify navigation remains functional - click through tabs
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    // CRD renders subspaces as cards (link → article → heading) in a grid
    // region; the card link is unnamed, so assert the subspace heading.
    await expect(
      page
        .getByRole('region', { name: 'Subspaces grid' })
        .getByRole('heading', { name: /seed-public-space/ })
        .first()
    ).toBeVisible();

    await page.getByRole('tab', { name: 'community' }).click();
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(
      page.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();
  });

  test('6.2 Non-Member Can Navigate Back to Space from Subspace Using Breadcrumbs', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab and enter a subspace
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card to enter the public subspace. In CRD the
    // subspace card is an unnamed link wrapping an article with the subspace
    // heading; click the card via its heading.
    await page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('heading', { name: /seed-public-space/ })
      .first()
      .click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(
      new RegExp(`/challenges/${baseScenario.subspace.nameId}$`)
    );

    // Use breadcrumb to navigate back to parent space
    await page
      .getByRole('link', { name: baseScenario.space.nameId })
      .first()
      .click();

    // Verify user returns to the space successfully
    await expect(page).toHaveURL(new RegExp(`${baseScenario.space.nameId}$`));

    // Verify space context is maintained
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: baseScenario.space.nameId })
    ).toBeVisible();
  });

  test('6.3 Session Expiry Does Not Block Public Space Access', async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);

    // Step 1: Navigate to the public space while already authenticated
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('load');

    // Verify space content is accessible while logged in
    await expect(
      page.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();

    // Step 2: Simulate session expiry by clearing cookies/storage
    // This mimics what happens when a session expires
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload the page to apply the cleared session
    await page.reload();
    await page.waitForLoadState('load');

    // Step 3: Verify public content REMAINS accessible after session expiry
    // User should still be on the space page (not redirected to login)
    await expect(page).toHaveURL(new RegExp(`${baseScenario.space.nameId}`));

    // Verify space content is still visible
    await expect(
      page.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();

    // Step 4: Navigate between tabs after session expiry
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await expect(
      page
        .getByRole('region', { name: 'Subspaces grid' })
        .getByRole('heading', { name: /seed-public-space/ })
        .first()
    ).toBeVisible();

    await page.getByRole('tab', { name: 'community' }).click();
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // Verify user is not forcefully redirected to login
    await expect(page).not.toHaveURL(/.*login.*/);

    // Step 5: Verify private actions prompt for login
    // Try to access "Apply to Join" or similar member-only action
    await page.getByRole('tab', { name: 'Home' }).click();

    // Check if "Sign in to apply" button appears (indicating login required for private actions)
    await expect(
      page.getByRole('button', { name: /Sign in to apply|Apply/i }).first()
    ).toBeVisible();
  });
});
