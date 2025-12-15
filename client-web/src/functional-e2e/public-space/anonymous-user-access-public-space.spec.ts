// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { test, expect } from '@playwright/test';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

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

test.describe('Public Space Discovery and Access', () => {
  test.beforeAll(async () => {
    test.setTimeout(30_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    test.setTimeout(20_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('1.2 Anonymous User Can Access Public Space via Direct URL', async ({
    page,
  }) => {
    // Navigate directly to the public space URL (not logged in)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify space landing page loads without login prompt
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'seed-public-space'
    );

    // Verify space tagline is visible
    await expect(
      page.getByRole('heading', {
        name: 'A home to go from here to there, together!',
      })
    ).toBeVisible();

    // Verify all standard navigation tabs are visible (not blocked)
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'community' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Subspaces' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Knowledge' })).toBeVisible();

    // Verify Login/Sign Up option remains available (user not logged in)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
    ).toBeVisible();
  });

  test('4.4 Anonymous User Can Access Community Tab in Public Space', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Navigate to the Community tab as anonymous user
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community content is visible without login
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // Verify People/Organizations toggle is visible
    await expect(page.getByText('People')).toBeVisible();
    await expect(page.getByText('organizations')).toBeVisible();

    // Anonymous users see login prompt for full member list
    await expect(
      page.getByRole('heading', {
        name: 'Please log in to see all contributing users',
      })
    ).toBeVisible();

    // Verify Sign in and Sign up buttons are available
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });
});
