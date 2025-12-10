// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { test, expect } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Subspace Navigation for Non-Members', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/seed-public-space-629016`);
  });

  test('5.1 Non-Member Can Navigate into Public Subspace', async ({ page }) => {
    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify subspace card is visible
    await expect(
      page.getByRole('link', { name: /Card banner:.*seed-public-space/ })
    ).toBeVisible();

    // Click on the subspace card
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Verify subspace landing page loads successfully
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);

    // Verify subspace heading is visible
    await expect(
      page.getByRole('heading', { level: 1, name: 'seed-public-space' })
    ).toBeVisible();

    // Verify subspace content is visible (not About dialog)
    await expect(page.getByText('test tagline')).toBeVisible();

    // Verify breadcrumb shows parent space > subspace hierarchy
    await expect(
      page.getByRole('link', { name: 'seed-public-space-629016' })
    ).toBeVisible();
  });

  test('5.2 Non-Member Can See Sub-subspace Cards in Public Subspace', async ({
    page,
  }) => {
    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card to enter the public subspace
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Verify we are in the subspace
    await expect(
      page.getByRole('heading', { level: 1, name: 'seed-public-space' })
    ).toBeVisible();

    // Verify sub-subspace is visible in the hierarchy
    await expect(
      page.getByRole('link', { name: /Avatar seed-public-space/ })
    ).toBeVisible();
  });

  test('5.3 Non-Member Can Navigate to Sub-subspace in Public Space', async ({
    page,
  }) => {
    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Click on sub-subspace link in hierarchy
    await page.getByRole('link', { name: /Avatar seed-public-space/ }).click();

    // Verify navigation to sub-subspace
    await expect(page).toHaveURL(/\/opportunities\/ssnameid/);

    // Verify breadcrumb shows full hierarchy
    // My Dashboard > seed-public-space-629016 > seed-public-space > seed-public-space
    await expect(page.getByRole('link', { name: 'My Dashboard' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'seed-public-space-629016' })
    ).toBeVisible();
  });

  test('5.4 Non-Member Can View Subspace Content Without About Dialog', async ({
    page,
  }) => {
    // Navigate to Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Click on the subspace card
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Verify full subspace content is visible (no About dialog blocking)
    await expect(page.getByText('test description')).toBeVisible();

    // Verify action buttons are visible
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Video Call' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contributors' })).toBeVisible();
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
