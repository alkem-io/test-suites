// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { test, expect } from '@playwright/test';
import { scenarioConfig } from '../seed-public-space.spec';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe('Whiteboard Access for Non-Members', () => {
  test.beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('3.1 Non-Member Can View Whiteboard Callout in Space', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Verify whiteboard callout is visible on the home tab
    await expect(
      page.getByRole('heading', {
        name: `${baseScenario.space.profile.displayName} - whiteboard callout`,
      })
    ).toBeVisible();

    // Verify whiteboard description is shown
    await expect(page.getByText('Whiteboard - initial')).toBeVisible();

    // Verify non-member message is displayed
    await expect(
      page.getByText(
        "You can't reply to this discussion since you're not a member of this Space"
      )
    ).toBeVisible();
  });

  test('3.2 Non-Member Can Open Whiteboard Callout Dialog', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the whiteboard callout heading to open it
    await page
      .getByRole('heading', {
        name: `${baseScenario.space.profile.displayName} - whiteboard callout`,
      })
      .click();

    // Verify the dialog opens
    await expect(
      page.getByRole('dialog', {
        name: new RegExp(
          `${baseScenario.space.profile.displayName} - whiteboard callout`
        ),
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
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // As anonymous user (not logged in), verify whiteboard is visible
    await expect(
      page.getByRole('heading', {
        name: `${baseScenario.space.profile.displayName} - whiteboard callout`,
      })
    ).toBeVisible();

    // Click to open the whiteboard callout
    await page
      .getByRole('heading', {
        name: `${baseScenario.space.profile.displayName} - whiteboard callout`,
      })
      .click();

    // Verify dialog opens without login requirement
    await expect(
      page.getByRole('dialog', {
        name: new RegExp(
          `${baseScenario.space.profile.displayName} - whiteboard callout`
        ),
      })
    ).toBeVisible();

    // Verify read-only message is shown
    await expect(
      page.getByText(
        "You can't reply to this discussion since you're not a member of this Space"
      )
    ).toBeVisible();
  });
});
