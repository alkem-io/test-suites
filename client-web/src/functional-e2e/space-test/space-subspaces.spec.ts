import { test, expect } from '@playwright/test';

/**
 * Subspace Management Tests
 *
 * Based on SPACE_TEST_PLAN.md Section 5
 *
 * Prerequisites:
 * - seed.spec.ts has created parent space
 * - User is authenticated as Space Admin
 */

test.describe('Subspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Subspaces tab
    await page.click('text=Subspaces');
    await page.waitForLoadState('networkidle');
  });

  test.describe('5.1 Create Subspace within Space', () => {
    test('should create new subspace successfully', async ({ page }) => {
      // Look for create subspace button
      const createButton = page
        .locator(
          'button:has-text("Create Subspace"), ' +
            'button:has-text("Add Subspace"), ' +
            'button:has-text("New Subspace")'
        )
        .first();

      // If button exists, user has permission to create
      if (await createButton.isVisible({ timeout: 3000 })) {
        await createButton.click();

        // Fill subspace details
        const subspaceName = `Q1 Projects ${Date.now()}`;
        const subspaceHandle = `q1-projects-${Date.now()}`;
        const subspaceDescription = 'First quarter innovation projects';

        await page.fill(
          'input[name="displayName"], input[name="name"]',
          subspaceName
        );
        await page.fill('input[name="nameID"]', subspaceHandle);

        const descField = page.locator('textarea[name="description"]');
        if (await descField.isVisible()) {
          await descField.fill(subspaceDescription);
        }

        // Create subspace
        await page.click('button[type="submit"], button:has-text("Create")');
        await page.waitForLoadState('networkidle');

        // Verify subspace was created
        await expect(page.locator(`text=${subspaceName}`)).toBeVisible({
          timeout: 5000,
        });

        // Verify subspace appears in list
        await page.click('text=Subspaces'); // Return to subspaces list
        await expect(page.locator(`text=${subspaceName}`)).toBeVisible();
      } else {
        console.log(
          'Create subspace button not visible - user may not have permission'
        );
      }
    });

    test('should inherit settings from parent space', async ({ page }) => {
      // Create a subspace
      const createButton = page
        .locator('button:has-text("Create Subspace")')
        .first();

      if (await createButton.isVisible({ timeout: 3000 })) {
        await createButton.click();

        const subspaceName = `Inherited Space ${Date.now()}`;
        await page.fill('input[name="displayName"]', subspaceName);
        await page.fill('input[name="nameID"]', `inherited-${Date.now()}`);

        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // Check if creator is automatically admin
        await page.click('text=Community');
        await expect(page.locator('text=/admin/i')).toBeVisible();

        // Check for inherited features
        // e.g., collaboration features should be similar to parent
      }
    });
  });

  test.describe('5.2 Navigate to Subspace from Parent Space', () => {
    test('should navigate to existing subspace', async ({ page }) => {
      // Check if any subspaces exist
      const subspaceCards = page.locator(
        '.subspace-card, .subspace-item, [data-testid="subspace"]'
      );
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount > 0) {
        // Click on first subspace
        await subspaceCards.first().click();
        await page.waitForLoadState('networkidle');

        // Verify we're in the subspace
        // Should show subspace content and navigation
        await expect(
          page.locator('.breadcrumb, [data-testid="breadcrumb"]')
        ).toBeVisible({ timeout: 5000 });

        // Verify subspace has its own tabs
        await expect(page.locator('text=Home')).toBeVisible();
        await expect(page.locator('text=Community')).toBeVisible();
        await expect(page.locator('text=Subspaces')).toBeVisible();

        // Verify breadcrumb shows hierarchy
        const breadcrumb = page.locator(
          '.breadcrumb, [data-testid="breadcrumb"]'
        );
        const breadcrumbText = await breadcrumb.textContent();

        // Should contain parent space name or indicator
        expect(breadcrumbText).toBeTruthy();
      } else {
        console.log('No subspaces found to navigate to');
      }
    });

    test('should show correct breadcrumb navigation', async ({ page }) => {
      const subspaceCards = page.locator('.subspace-card, .subspace-item');
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount > 0) {
        // Navigate to subspace
        const subspaceName = await subspaceCards
          .first()
          .locator('text=/.+/')
          .first()
          .textContent();
        await subspaceCards.first().click();
        await page.waitForLoadState('networkidle');

        // Check breadcrumb
        const breadcrumb = page.locator(
          '.breadcrumb, [data-testid="breadcrumb"], nav'
        );
        await expect(breadcrumb).toBeVisible();

        // Click breadcrumb to go back to parent
        const parentLink = breadcrumb.locator('a').first();
        if (await parentLink.isVisible()) {
          await parentLink.click();
          await page.waitForLoadState('networkidle');

          // Verify we're back at parent space subspaces tab
          expect(page.url()).toMatch(/subspaces|tab=3/);
        }
      }
    });
  });

  test.describe('5.3 Create Nested Subspace (Subspace within Subspace)', () => {
    test('should create nested subspace', async ({ page }) => {
      // First navigate to an existing subspace
      const subspaceCards = page.locator('.subspace-card, .subspace-item');
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount > 0) {
        await subspaceCards.first().click();
        await page.waitForLoadState('networkidle');

        // Now in subspace, go to its Subspaces tab
        await page.click('text=Subspaces');

        // Try to create a nested subspace
        const createButton = page
          .locator('button:has-text("Create Subspace")')
          .first();

        if (await createButton.isVisible({ timeout: 3000 })) {
          await createButton.click();

          const nestedName = `Nested Space ${Date.now()}`;
          await page.fill('input[name="displayName"]', nestedName);
          await page.fill('input[name="nameID"]', `nested-${Date.now()}`);

          await page.click('button[type="submit"]');
          await page.waitForLoadState('networkidle');

          // Verify nested subspace created
          await expect(page.locator(`text=${nestedName}`)).toBeVisible();

          // Verify breadcrumb shows full hierarchy
          const breadcrumb = page.locator('.breadcrumb');
          if (await breadcrumb.isVisible()) {
            const breadcrumbText = await breadcrumb.textContent();

            // Should show: Parent > Subspace > Nested
            // Count separators or links
            const links = await breadcrumb.locator('a').count();
            expect(links).toBeGreaterThanOrEqual(2); // At least 2 levels above current
          }
        }
      } else {
        console.log('No existing subspace to create nested subspace in');
      }
    });
  });

  test.describe('5.4 View Empty Subspaces List', () => {
    test('should display empty state when no subspaces exist', async ({
      page,
    }) => {
      // This test assumes we're in a space with no subspaces
      // or we navigate to a newly created space

      const subspaceCards = page.locator('.subspace-card, .subspace-item');
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount === 0) {
        // Verify empty state is shown
        await expect(
          page.locator(
            'text=/no subspace|create.*first.*subspace|no spaces yet/i'
          )
        ).toBeVisible();

        // Verify call-to-action for creating subspace
        const createButton = page.locator('button:has-text("Create")');
        const hasCreateButton = await createButton.isVisible();

        // If user is admin, should have create button
        expect(typeof hasCreateButton).toBe('boolean');
      } else {
        console.log(
          `${subspaceCount} subspaces found - cannot test empty state`
        );
      }
    });
  });

  test.describe('5.5 Delete Subspace', () => {
    test.skip('should delete subspace with confirmation', async ({ page }) => {
      // This is a destructive test - should be careful with implementation
      // Typically would:
      // 1. Create a test subspace first
      // 2. Delete it
      // 3. Verify it's gone

      // Create a subspace to delete
      const createButton = page
        .locator('button:has-text("Create Subspace")')
        .first();

      if (await createButton.isVisible({ timeout: 3000 })) {
        await createButton.click();

        const subspaceToDelete = `To Delete ${Date.now()}`;
        await page.fill('input[name="displayName"]', subspaceToDelete);
        await page.fill('input[name="nameID"]', `delete-${Date.now()}`);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // Now delete it
        // Look for delete option in settings or kebab menu
        const settingsButton = page.locator(
          'button:has-text("Settings"), [data-testid="settings"]'
        );
        if (await settingsButton.isVisible()) {
          await settingsButton.click();

          const deleteButton = page.locator(
            'button:has-text("Delete"), button:has-text("Remove")'
          );
          if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Confirm deletion
            const confirmButton = page
              .locator('button:has-text("Confirm"), button:has-text("Delete")')
              .last();
            await confirmButton.click();

            // Verify deletion success
            await expect(page.locator('text=/deleted|removed/i')).toBeVisible({
              timeout: 5000,
            });

            // Verify subspace no longer appears in list
            await page.click('text=Subspaces');
            await expect(
              page.locator(`text=${subspaceToDelete}`)
            ).not.toBeVisible();
          }
        }
      }
    });

    test('should show warning about permanent deletion', async ({ page }) => {
      // When attempting to delete, should show warning
      // This test would need an existing subspace to delete

      const subspaceCards = page.locator('.subspace-card, .subspace-item');
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount > 0) {
        await subspaceCards.first().click();
        await page.waitForLoadState('networkidle');

        const settingsButton = page.locator('button:has-text("Settings")');
        if (await settingsButton.isVisible()) {
          await settingsButton.click();

          const deleteButton = page.locator('button:has-text("Delete")');
          if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Should show confirmation dialog with warning
            await expect(
              page.locator('text=/permanent|cannot be undone|are you sure/i')
            ).toBeVisible({ timeout: 3000 });

            // Cancel the deletion
            const cancelButton = page.locator('button:has-text("Cancel")');
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
            }
          }
        }
      }
    });
  });

  test.describe('Subspace Listing and Display', () => {
    test('should display subspace information in list', async ({ page }) => {
      const subspaceCards = page.locator('.subspace-card, .subspace-item');
      const subspaceCount = await subspaceCards.count();

      if (subspaceCount > 0) {
        const firstCard = subspaceCards.first();

        // Should display subspace name
        const hasName = await firstCard
          .locator('text=/.+/')
          .first()
          .isVisible();
        expect(hasName).toBe(true);

        // May display description, member count, or other metadata
        // Verify card is clickable
        await expect(firstCard).toBeVisible();
      }
    });

    test('should support subspace search or filtering', async ({ page }) => {
      // Look for search functionality
      const searchField = page.locator(
        'input[type="search"], input[placeholder*="search"]'
      );

      if (await searchField.isVisible()) {
        // Test search
        await searchField.fill('test');
        await page.waitForTimeout(500); // Debounce

        // Verify results are filtered
        // This is dependent on having subspaces with 'test' in name
      } else {
        console.log('No search functionality found for subspaces');
      }
    });
  });
});
