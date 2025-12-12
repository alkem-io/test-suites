// spec: templates/templates-test-plan.md#11
// seed: client-web/src/functional-e2e/seed-space-admin.spec.ts

import { test as base, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test as spaceAdminTest } from '../fixture-space-admin.spec';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

interface TemplatesSpaceContext {
  spaceAdminLoggedIn: Page;
  templatesSpaceCreated: {
    page: Page;
    spaceName: string;
    spaceUrl: string;
  };
}

// Fixture: Depends on spaceAdminLoggedIn and creates a templates test space
export const test = spaceAdminTest.extend<Pick<TemplatesSpaceContext, 'templatesSpaceCreated'>>({
  templatesSpaceCreated: async ({ spaceAdminLoggedIn }, use) => {
    const page = spaceAdminLoggedIn;

    // Navigate to account settings
    await page.goto(`${baseUrl}/home`);

    // Navigate to create space for templates testing
    await page.getByRole('link', { name: 'Create my own Space' }).click();

    // Verify we're on the account page, not redirected to external website
    const currentUrl = page.url();
    if (currentUrl.includes('welcome.alkem.io')) {
      throw new Error('Expected to navigate to account page, but was redirected to external website: ' + currentUrl);
    }
    expect(currentUrl).toContain('/user/space-admin/settings/account');

    // Click Add button for Hosted Spaces
    await page.getByRole('button', { name: 'Add' }).first().click();

    // Verify the space creation dialog opened
    await expect(page.getByRole('dialog', { name: 'Create a new Space' })).toBeVisible();

    // Fill in space details
    const timestamp = Date.now();
    const spaceName = `templates-test-${timestamp}`;

    await page.getByRole('textbox', { name: 'Title *' }).fill(spaceName);
    await page.getByRole('textbox', { name: 'Tagline' }).fill('Space automatically created to test templates');

    // Add tags
    await page.getByRole('combobox', { name: 'Tags' }).click();
    await page.getByRole('combobox', { name: 'Tags' }).fill('test');
    await page.getByRole('combobox', { name: 'Tags' }).press('Enter');
    await page.getByRole('combobox', { name: 'Tags' }).fill('templates');
    await page.getByRole('combobox', { name: 'Tags' }).press('Enter');

    // Accept terms and create space
    await page.getByRole('checkbox', { name: 'I have read and accept the' }).click();
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for space to be created and success dialog
    await expect(page.getByRole('dialog', { name: '🎉 Your Space is Ready!' })).toBeVisible();
    await page.getByRole('button', { name: 'Get Started' }).click();

    // Verify we're on the new space page
    await expect(page).toHaveURL(/.*templates-test-.*/);
    await expect(page.getByRole('heading', { name: spaceName, level: 1 })).toBeVisible();

    // Get the space URL:
    const spaceUrl = page.url();

    // Provide the space context to tests
    // RUNNING TESTS HERE
    await use({ page, spaceName, spaceUrl });


    // CLEANUP: Delete the test space after all tests complete
    console.log(`Cleaning up test space: ${spaceName}`);

    // Navigate back to the space first
    await page.goto(spaceUrl);

    // Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: 'Settings' });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    // Click on account sub-tab
    const accountTab = page.getByRole('tab', { name: 'account' });
    await expect(accountTab).toBeVisible();
    await accountTab.click();

    // Wait for account settings to load and find the Delete Space option
    const deleteButton = page.getByText('Delete this Space', { exact: true });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Wait for the delete confirmation dialog to appear
      await expect(page.getByRole('dialog')).toBeVisible();

      // Find and check the confirmation checkbox
      const confirmCheckbox = page.getByRole('checkbox', { name: /Please check this box if you are certain about deleting this Space/i });
      if (await confirmCheckbox.isVisible()) {
        await confirmCheckbox.check();
        console.log(`✓ Checked confirmation checkbox`);
      }

      // Click the "Yes, delete" button
      const confirmButton = page.getByRole('button', { name: /Yes, delete/i });
      if (await confirmButton.isEnabled()) {
        await confirmButton.click();
        console.log(`✓ Test space deleted: ${spaceName}`);
      }
    } else {
      console.log(`⚠ Could not find delete button for space: ${spaceName}`);
    }
  },
});
