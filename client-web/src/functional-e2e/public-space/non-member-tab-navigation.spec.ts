// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { test, expect } from '@playwright/test';
import { scenarioConfig } from '../seed-public-space.spec';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe('Space Tab Navigation for Non-Members', () => {
  test.beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('2.1 Non-Member Can View All Space Tabs', async ({ page }) => {
    // Navigate to the public space as anonymous user
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
    // Navigate to the public space as anonymous user
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
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify subspaces list is displayed
    await expect(page.getByRole('heading', { name: 'Subspace' })).toBeVisible();

    // Verify subspace card is visible and clickable
    await expect(
      page.getByRole('link', { name: /seed-public-space/ })
    ).toBeVisible();
  });

  test('2.4 Non-Member Can Navigate to Knowledge Base Tab', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click on the Knowledge tab
    await page.getByRole('tab', { name: 'Knowledge' }).click();

    // Verify URL changes to knowledge tab
    await expect(page).toHaveURL(/tab=4/);
  });

  test('2.5 Non-Member Can Navigate to Community Tab', async ({ page }) => {
    // Navigate to the public space as anonymous user
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

    // For anonymous users, login prompt is shown for member list
    await expect(
      page.getByRole('heading', {
        name: 'Please log in to see all contributing users',
      })
    ).toBeVisible();
  });
});
