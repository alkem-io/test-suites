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
    },
  },
};

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Edge Cases and Error Handling', () => {
  test.beforeAll(async () => {
    test.setTimeout(25_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    test.setTimeout(20_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('6.1 Non-Member Sees Appropriate UI When Space Has Default Callout', async ({
    page,
  }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify welcome callout is visible
    await expect(
      page.getByRole('heading', { name: '👋 Welcome to your space!' })
    ).toBeVisible();

    // Verify non-member message is shown
    await expect(
      page.getByText(
        "You can't reply to this discussion since you're not a member of this Space"
      )
    ).toBeVisible();

    // Verify navigation remains functional - click through tabs
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await expect(
      page.getByRole('link', { name: /Card banner:.*seed-public-space/ })
    ).toBeVisible();

    await page.getByRole('tab', { name: 'community' }).click();
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(
      page.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();
  });

  test('6.2 Non-Member Can Navigate Back to Space from Subspace Using Breadcrumbs', async ({
    page,
  }) => {
    // Navigate to the public space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to Subspaces tab and enter a subspace
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await page
      .getByRole('link', {
        name: new RegExp(
          `Card banner:.*${baseScenario.space.about.profile.displayName}`
        ),
      })
      .click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);

    // Use breadcrumb to navigate back to parent space
    await page.getByRole('link', { name: baseScenario.space.nameId }).click();

    // Verify user returns to the space successfully
    await expect(page).toHaveURL(new RegExp(`${baseScenario.space.nameId}$`));

    // Verify space context is maintained
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: baseScenario.space.nameId })
    ).toBeVisible();
  });

  test('6.3 Anonymous User Can Navigate Between Different Areas Without Login Prompts', async ({
    page,
  }) => {
    test.setTimeout(15_000);
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify user is not logged in (Sign in button visible)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
    ).toBeVisible();

    // Navigate to subspace via hierarchy link on home page
    await page.getByRole('link', { name: /Avatar seed-public-space/ }).click();

    // Verify subspace content is accessible
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);
    await expect(page.getByText('test description')).toBeVisible();

    // Use breadcrumb to navigate back to parent space
    await page.getByRole('link', { name: baseScenario.space.nameId }).click();

    // Verify public content remains accessible without forced login
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Verify user is still not logged in (Sign in button visible)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
    ).toBeVisible();
  });
});
