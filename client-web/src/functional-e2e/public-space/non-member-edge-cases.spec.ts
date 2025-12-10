// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { test, expect } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Edge Cases and Error Handling', () => {
  test('6.1 Non-Member Sees Appropriate UI When Space Has Callouts Without Contributions', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/seed-public-space-629016`);

    // Verify empty state message for callouts without contributions
    await expect(
      page.getByText('No contributions yet, be the first to contribute!')
    ).toBeVisible();

    // Verify navigation remains functional - click through tabs
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await expect(page.getByRole('heading', { name: 'Subspace' })).toBeVisible();

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
    await page.goto(`${baseUrl}/seed-public-space-629016`);

    // Navigate to Subspaces tab and enter a subspace
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Verify we are in the subspace
    await expect(page).toHaveURL(/\/challenges\/ssnameid/);

    // Use breadcrumb to navigate back to parent space
    await page.getByRole('link', { name: 'seed-public-space-629016' }).click();

    // Verify user returns to the space successfully
    await expect(page).toHaveURL(/seed-public-space-629016$/);

    // Verify space context is maintained
    await expect(
      page.getByRole('heading', { level: 1 }).filter({ hasText: 'seed-public-space-629016' })
    ).toBeVisible();
  });

  test('6.3 Anonymous User Can Navigate Between Different Areas Without Login Prompts', async ({
    page,
  }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/seed-public-space-629016`);

    // Navigate to subspace
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await page.getByRole('link', { name: /Card banner:.*seed-public-space/ }).click();

    // Verify content is accessible
    await expect(page.getByText('test description')).toBeVisible();

    // Navigate to sub-subspace
    await page.getByRole('link', { name: /Avatar seed-public-space/ }).click();

    // Verify content is accessible
    await expect(page).toHaveURL(/\/opportunities\/ssnameid/);

    // Use browser back (via breadcrumb) to return
    await page.getByRole('link', { name: 'seed-public-space-629016' }).click();

    // Verify public content remains accessible without forced login
    await expect(
      page.getByRole('tab', { name: 'Home' })
    ).toBeVisible();

    // Verify user is still not logged in (Sign in button visible)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
    ).toBeVisible();
  });
});
