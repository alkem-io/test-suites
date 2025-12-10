// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { test, expect } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Space Lead Profile Access', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/seed-public-space-629016`);
  });

  test('4.1 Non-Member Can See Space Leads Section on Community Tab', async ({
    page,
  }) => {
    // Navigate to the Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community tab loads
    await expect(
      page.getByRole('heading', { name: "Who's involved" })
    ).toBeVisible();

    // Verify Contact the Leads button is visible
    await expect(
      page.getByRole('button', { name: 'Contact the Leads' })
    ).toBeVisible();
  });

  test('4.4 Anonymous User Can Access Community Tab in Public Space', async ({
    page,
  }) => {
    // Navigate to the Community tab as anonymous user
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify community content is visible without login
    await expect(
      page.getByText("The contributors to this Space!")
    ).toBeVisible();

    // Verify People/Organizations toggle is visible
    await expect(page.getByText('People')).toBeVisible();
    await expect(page.getByText('organizations')).toBeVisible();

    // Anonymous users see login prompt for full member list
    await expect(
      page.getByRole('heading', { name: 'Please log in to see all contributing users' })
    ).toBeVisible();

    // Verify Sign in and Sign up buttons are available
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });
});
