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
import { LoginPage } from '../space/pages/LoginPage';

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
      addWhiteboardCallout: true,
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

test.describe('Whiteboard Access for Non-Members', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('3.1 Non-Member Can View Whiteboard Callout in Space', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Login as non-member user
    const loginPage = new LoginPage(page, baseUrl);
    await loginPage.login('non.space@alkem.io');

    // Navigate to the public space as non-member
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // Verify whiteboard callout is visible on the home tab
    await expect(
      page.getByRole('heading', {
        name: /whiteboard callout/,
      })
    ).toBeVisible({ timeout: 30_000 });

    // Verify whiteboard description is shown
    await expect(page.getByText('Whiteboard - initial')).toBeVisible();

    // Verify non-member message is displayed
    await expect(
      page
        .getByText(
          "You can't reply to this discussion since you're not a member of this Space"
        )
        .first()
    ).toBeVisible();
  });
  test('3.2 Non-Member Can Open Whiteboard Callout Dialog', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Login as non-member user
    const loginPage = new LoginPage(page, baseUrl);
    await loginPage.login('non.space@alkem.io');

    // Navigate to the public space as non-member
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // Click on the whiteboard callout heading to open it
    await page
      .getByRole('heading', {
        name: /whiteboard callout/,
      })
      .click({ timeout: 30_000 });

    // Verify the dialog opens
    await expect(
      page.getByRole('dialog', {
        name: /whiteboard callout/,
      })
    ).toBeVisible();

    // Verify Expand Window button is available
    await expect(
      page.getByRole('button', { name: 'Expand Window' })
    ).toBeVisible();

    // Verify whiteboard description in dialog
    await expect(
      page.getByRole('dialog').getByText('Whiteboard - initial')
    ).toBeVisible();
  });
  test('3.4 Anonymous User Can View Whiteboard Callout in Public Space', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // As anonymous user (not logged in), verify whiteboard is visible
    await expect(
      page.getByRole('heading', {
        name: /whiteboard callout/,
      })
    ).toBeVisible({ timeout: 30_000 });

    // Click to open the whiteboard callout
    await page
      .getByRole('heading', {
        name: /whiteboard callout/,
      })
      .click();

    // Verify dialog opens without login requirement
    await expect(
      page.getByRole('dialog', {
        name: /whiteboard callout/,
      })
    ).toBeVisible();

    // Verify read-only message is shown in the dialog
    await expect(
      page
        .getByRole('dialog')
        .getByText(
          "You can't reply to this discussion since you're not a member of this Space"
        )
    ).toBeVisible();
  });
});
