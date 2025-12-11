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
import { test, expect } from '@playwright/test';

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
      subspace: {
        community: {
          admins: [TestUser.SUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Subspace Navigation for Non-Members', () => {
  test.beforeAll(async () => {
    test.setTimeout(45_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    test.setTimeout(40_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('5.1 Non-Member Can Navigate into Public Subspace', async ({ page }) => {
    test.setTimeout(45_000);
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify subspace card is visible
    await expect(
      page.getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
    ).toBeVisible();

    // Click on the subspace card
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
      .click();

    // Verify subspace landing page loads successfully
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);

    // Verify subspace heading is visible
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: baseScenario.space.about.profile.displayName,
      })
    ).toBeVisible();

    // Verify subspace content is visible (not About dialog)
    await expect(page.getByText('test tagline')).toBeVisible();

    // Verify breadcrumb shows parent space > subspace hierarchy
    await expect(
      page.getByRole('link', { name: baseScenario.space.nameId })
    ).toBeVisible();
  });

  test('5.2 Non-Member Can See Sub-subspace Cards in Public Subspace', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    // Navigate to the public space as anonymous user
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

    // Verify sub-subspace is visible in the hierarchy
    await expect(
      page.getByRole('link', {
        name: /Avatar seed-public-space/,
      })
    ).toBeVisible();
  });

  test('5.3 Non-Member Can Navigate to Sub-subspace in Public Space', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    // Navigate to the public space as anonymous user
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

    // Click on sub-subspace link in hierarchy
    await page
      .getByRole('link', {
        name: /Avatar seed-public-space/,
      })
      .click();

    // Verify navigation to sub-subspace
    await expect(page).toHaveURL(/\/opportunities\/ssnameid/);

    // Verify breadcrumb shows full hierarchy
    // My Dashboard > seed-public-space-{id} > seed-public-space > seed-public-space
    await expect(
      page.getByRole('link', { name: 'My Dashboard' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: baseScenario.space.nameId })
    ).toBeVisible();
  });

  test('5.4 Non-Member Can View Subspace Content Without About Dialog', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    // Navigate to the public space as anonymous user
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

    // Verify Sign in to apply button (non-member can see but needs to sign in to apply)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
    ).toBeVisible();
  });
});
