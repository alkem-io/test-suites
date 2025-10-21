import { test, expect } from '@playwright/test';
import { TestUser } from '@alkemio/tests-lib';

/**
 * Space Creation and Basic Setup Tests
 *
 * Based on SPACE_TEST_PLAN.md Section 1
 *
 * Prerequisites:
 * - seed.spec.ts has run and created base space with test data
 * - User is authenticated
 */

test.describe('Space Creation and Basic Setup', () => {
  test.describe('1.1 Create New Space with Valid Data', () => {
    test('should create space with all required fields', async ({ page }) => {
      // Navigate to space creation page
      // Note: Adjust selector based on actual UI
      await page.click('text=Create Space');

      // Fill in space details
      const spaceName = `Test Space ${Date.now()}`;
      const spaceHandle = `test-space-${Date.now()}`;
      const spaceTagline = 'A space for collaborative innovation';
      const spaceDescription =
        'This is a test space created for validation purposes.';

      await page.fill('input[name="displayName"]', spaceName);
      await page.fill('input[name="nameID"]', spaceHandle);
      await page.fill('input[name="tagline"]', spaceTagline);
      await page.fill('textarea[name="description"]', spaceDescription);

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Verify space was created
      await expect(page.locator('text=' + spaceName)).toBeVisible();

      // Verify user is on new space page
      expect(page.url()).toContain(spaceHandle);

      // Verify default tabs are visible
      await expect(page.locator('text=Home')).toBeVisible();
      await expect(page.locator('text=Community')).toBeVisible();
      await expect(page.locator('text=Subspaces')).toBeVisible();

      // Verify user is admin of new space
      await page.click('text=Community');
      await expect(page.locator('text=Admin')).toBeVisible();
    });
  });

  test.describe('1.2 Create Space with Minimum Required Fields', () => {
    test('should create space with only required fields', async ({ page }) => {
      await page.click('text=Create Space');

      // Fill only required fields
      const spaceName = `Minimal Space ${Date.now()}`;
      const spaceHandle = `minimal-${Date.now()}`;

      await page.fill('input[name="displayName"]', spaceName);
      await page.fill('input[name="nameID"]', spaceHandle);

      // Leave optional fields empty
      // Submit
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Verify space was created
      await expect(page.locator('text=' + spaceName)).toBeVisible();
      expect(page.url()).toContain(spaceHandle);

      // Verify defaults applied
      // Default values should be present where applicable
    });
  });

  test.describe('1.3 Attempt to Create Space with Duplicate NameID', () => {
    test('should show error for duplicate nameID', async ({ page }) => {
      // First, note an existing space's nameID from seed
      const existingNameID = 'space-test-scenario'; // From seed

      await page.click('text=Create Space');

      // Try to use duplicate nameID
      await page.fill('input[name="displayName"]', 'Duplicate Test');
      await page.fill('input[name="nameID"]', existingNameID);

      await page.click('button[type="submit"]');

      // Verify error message appears
      await expect(
        page.locator('text=/nameID.*already.*use|already.*exists/i')
      ).toBeVisible();

      // Verify space was not created (still on creation form)
      expect(page.url()).toContain('create');

      // Verify data is preserved in form
      await expect(page.locator('input[name="displayName"]')).toHaveValue(
        'Duplicate Test'
      );
    });
  });

  test.describe('1.4 Create Space with Invalid Characters in NameID', () => {
    test('should reject nameID with spaces', async ({ page }) => {
      await page.click('text=Create Space');

      await page.fill('input[name="displayName"]', 'Invalid Space');
      await page.fill('input[name="nameID"]', 'test space'); // Space is invalid

      // Attempt to submit or check for validation error
      const nameIDField = page.locator('input[name="nameID"]');
      await nameIDField.blur(); // Trigger validation

      // Check for validation error
      await expect(
        page.locator('text=/invalid.*character|lowercase.*hyphen/i')
      ).toBeVisible();
    });

    test('should reject nameID with special characters', async ({ page }) => {
      await page.click('text=Create Space');

      await page.fill('input[name="displayName"]', 'Invalid Space');
      await page.fill('input[name="nameID"]', 'test@space!'); // Special chars invalid

      const nameIDField = page.locator('input[name="nameID"]');
      await nameIDField.blur();

      await expect(
        page.locator('text=/invalid.*character|lowercase.*hyphen/i')
      ).toBeVisible();
    });

    test('should reject nameID with uppercase', async ({ page }) => {
      await page.click('text=Create Space');

      await page.fill('input[name="displayName"]', 'Invalid Space');
      await page.fill('input[name="nameID"]', 'TEST-SPACE'); // Uppercase invalid

      const nameIDField = page.locator('input[name="nameID"]');
      await nameIDField.blur();

      await expect(page.locator('text=/lowercase/i')).toBeVisible();
    });
  });

  test.describe('1.5 Create Space with Excessively Long Name', () => {
    test('should reject name exceeding maximum length', async ({ page }) => {
      await page.click('text=Create Space');

      // Create a very long name (e.g., 500 characters)
      const longName = 'A'.repeat(500);

      const nameField = page.locator('input[name="displayName"]');
      await nameField.fill(longName);

      // Check if field validation prevents long input or shows error
      const actualValue = await nameField.inputValue();

      // Either the field limits input length or error is shown
      if (actualValue.length === 500) {
        await page.fill('input[name="nameID"]', 'test-long');
        await page.click('button[type="submit"]');

        // Should show error
        await expect(
          page.locator('text=/maximum.*length|too.*long/i')
        ).toBeVisible();
      } else {
        // Field limited the input
        expect(actualValue.length).toBeLessThan(500);
      }
    });
  });

  test.describe('1.6 Cancel Space Creation', () => {
    test('should cancel creation and not save data', async ({ page }) => {
      const currentUrl = page.url();

      await page.click('text=Create Space');

      // Fill in some data
      await page.fill('input[name="displayName"]', 'Cancelled Space');
      await page.fill('input[name="nameID"]', 'cancelled-space');

      // Click cancel (adjust selector based on actual UI)
      await page.click('button:has-text("Cancel")');

      // Verify returned to previous page
      expect(page.url()).toBe(currentUrl);

      // Return to creation form to verify it's clean
      await page.click('text=Create Space');

      // Verify form is empty
      await expect(page.locator('input[name="displayName"]')).toHaveValue('');
      await expect(page.locator('input[name="nameID"]')).toHaveValue('');
    });
  });
});
