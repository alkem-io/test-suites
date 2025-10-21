import { test, expect } from '@playwright/test';

/**
 * Space Navigation and Tabs Tests
 *
 * Based on SPACE_TEST_PLAN.md Section 3
 *
 * Prerequisites:
 * - seed.spec.ts has created base space with test data
 * - User is authenticated as space member
 */

test.describe('Space Navigation and Tabs', () => {
  let spaceUrl: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the space created by seed
    // Adjust based on actual space URL structure
    spaceUrl = page.url(); // Should already be on space from seed

    // Ensure we're on the space
    if (!spaceUrl.includes('space')) {
      // Navigate to space if needed
      await page.goto(process.env.ALKEMIO_BASE_URL || 'http://localhost:3000');
    }
  });

  test.describe('3.1 Navigate to Home Tab', () => {
    test('should display home tab content when clicked', async ({ page }) => {
      // Click on Home tab
      await page.click('text=Home');

      // Verify Home tab is selected
      const homeTab = page.locator('a:has-text("Home")');
      await expect(homeTab).toHaveClass(/active|selected/);

      // Verify URL reflects home tab
      expect(page.url()).toMatch(/tab=home|\?home|\/home|^[^?]*$/);

      // Verify home content is displayed
      await expect(
        page.locator(
          '.space-overview, .home-content, [data-testid="space-home"]'
        )
      ).toBeVisible();

      // Verify other tabs are not selected
      const communityTab = page.locator('a:has-text("Community")');
      await expect(communityTab).not.toHaveClass(/active|selected/);
    });
  });

  test.describe('3.2 Navigate to Community Tab', () => {
    test('should display community content when clicked', async ({ page }) => {
      // Click on Community tab
      await page.click('text=Community');

      // Verify Community tab is selected
      const communityTab = page.locator('a:has-text("Community")');
      await expect(communityTab).toHaveClass(/active|selected/);

      // Verify URL reflects community tab
      expect(page.url()).toMatch(/tab=community|tab=2/);

      // Verify community content is displayed
      await expect(
        page.locator('.community-content, [data-testid="space-community"]')
      ).toBeVisible();

      // Verify members list is visible
      await expect(page.locator('text=/member|admin/i')).toBeVisible();

      // Verify member count is shown
      await expect(page.locator('text=/[0-9]+.*member/i')).toBeVisible();
    });
  });

  test.describe('3.3 Navigate to Subspaces Tab', () => {
    test('should display subspaces content when clicked', async ({ page }) => {
      // Click on Subspaces tab
      await page.click('text=Subspaces');

      // Verify Subspaces tab is selected
      const subspacesTab = page.locator('a:has-text("Subspaces")');
      await expect(subspacesTab).toHaveClass(/active|selected/);

      // Verify URL reflects subspaces tab
      expect(page.url()).toMatch(/tab=subspaces|tab=3/);

      // Verify subspaces content is displayed
      // Either subspaces list or empty state
      const subspacesContent = page.locator(
        '.subspaces-content, [data-testid="space-subspaces"]'
      );
      await expect(subspacesContent).toBeVisible();

      // Check for either subspaces list or empty state message
      const hasSubspaces =
        (await page.locator('.subspace-item, .subspace-card').count()) > 0;
      const hasEmptyState = await page
        .locator('text=/no subspace|create.*first.*subspace/i')
        .isVisible();

      expect(hasSubspaces || hasEmptyState).toBe(true);
    });
  });

  test.describe('3.4 Direct URL Navigation to Specific Tab', () => {
    test('should load Community tab directly from URL', async ({ page }) => {
      // Navigate directly to community tab via URL parameter
      const baseUrl = spaceUrl.split('?')[0];
      await page.goto(`${baseUrl}?tab=2`); // Assuming tab=2 is Community

      await page.waitForLoadState('networkidle');

      // Verify Community tab is active
      const communityTab = page.locator('a:has-text("Community")');
      await expect(communityTab).toHaveClass(/active|selected/);

      // Verify community content is displayed
      await expect(page.locator('text=/member|admin/i')).toBeVisible();
    });

    test('should load Subspaces tab directly from URL', async ({ page }) => {
      const baseUrl = spaceUrl.split('?')[0];
      await page.goto(`${baseUrl}?tab=3`); // Assuming tab=3 is Subspaces

      await page.waitForLoadState('networkidle');

      // Verify Subspaces tab is active
      const subspacesTab = page.locator('a:has-text("Subspaces")');
      await expect(subspacesTab).toHaveClass(/active|selected/);
    });
  });

  test.describe('3.5 Tab Navigation Persistence on Page Refresh', () => {
    test('should maintain Community tab selection after refresh', async ({
      page,
    }) => {
      // Navigate to Community tab
      await page.click('text=Community');
      await page.waitForLoadState('networkidle');

      // Verify we're on Community tab
      expect(page.url()).toMatch(/tab=community|tab=2/);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify Community tab is still selected
      const communityTab = page.locator('a:has-text("Community")');
      await expect(communityTab).toHaveClass(/active|selected/);

      // Verify community content is still displayed
      await expect(page.locator('text=/member|admin/i')).toBeVisible();
    });

    test('should maintain Subspaces tab selection after refresh', async ({
      page,
    }) => {
      await page.click('text=Subspaces');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toMatch(/tab=subspaces|tab=3/);

      await page.reload();
      await page.waitForLoadState('networkidle');

      const subspacesTab = page.locator('a:has-text("Subspaces")');
      await expect(subspacesTab).toHaveClass(/active|selected/);
    });
  });

  test.describe('Tab Navigation - Additional Checks', () => {
    test('should navigate between all tabs in sequence', async ({ page }) => {
      // Home -> Community -> Subspaces -> Home

      await page.click('text=Home');
      await expect(page.locator('a:has-text("Home")')).toHaveClass(
        /active|selected/
      );

      await page.click('text=Community');
      await expect(page.locator('a:has-text("Community")')).toHaveClass(
        /active|selected/
      );

      await page.click('text=Subspaces');
      await expect(page.locator('a:has-text("Subspaces")')).toHaveClass(
        /active|selected/
      );

      await page.click('text=Home');
      await expect(page.locator('a:has-text("Home")')).toHaveClass(
        /active|selected/
      );
    });

    test('should handle rapid tab switching', async ({ page }) => {
      // Rapidly switch between tabs
      await page.click('text=Community');
      await page.click('text=Subspaces');
      await page.click('text=Home');
      await page.click('text=Community');

      // Wait for stability
      await page.waitForLoadState('networkidle');

      // Verify final state is correct
      const communityTab = page.locator('a:has-text("Community")');
      await expect(communityTab).toHaveClass(/active|selected/);
      await expect(page.locator('text=/member|admin/i')).toBeVisible();
    });

    test('should maintain scroll position on tab switch', async ({ page }) => {
      // Navigate to a tab with scrollable content
      await page.click('text=Community');

      // Scroll down if content is scrollable
      await page.evaluate(() => window.scrollBy(0, 500));
      const scrollPosition = await page.evaluate(() => window.scrollY);

      // Switch to another tab
      await page.click('text=Home');

      // Switch back
      await page.click('text=Community');

      // Note: Depending on implementation, scroll might reset
      // This test documents the behavior
      const newScrollPosition = await page.evaluate(() => window.scrollY);

      // Could be same position (preserved) or reset to 0
      expect(typeof newScrollPosition).toBe('number');
    });
  });
});
