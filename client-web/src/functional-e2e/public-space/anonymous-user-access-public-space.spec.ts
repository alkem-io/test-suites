// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { test, expect } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Public Space Discovery and Access', () => {
  test('1.2 Anonymous User Can Access Public Space via Direct URL', async ({
    page,
  }) => {
    // Navigate directly to the public space URL (not logged in)
    await page.goto(`${baseUrl}/seed-public-space-629016`);

    // Verify space landing page loads without login prompt
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'seed-public-space'
    );

    // Verify space tagline is visible
    await expect(
      page.getByRole('heading', { name: 'A home to go from here to there, together!' })
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
});
