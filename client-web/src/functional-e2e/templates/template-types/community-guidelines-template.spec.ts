// spec: templates/templates-test-plan.md#11
// fixture: client-web/src/functional-e2e/templates/fixture-templates-space-admin.spec.ts

import { expect } from '@playwright/test';
import { test } from '../fixture-templates-space-admin.spec';
import { baseUrl } from '@common/constants/url-list';

test.describe('Create Community Guidelines Template', () => {
  test('1.1 Create Community Guidelines Template', async ({
    templatesSpaceCreated,
  }) => {
    const { page, spaceUrl } = templatesSpaceCreated;
    // Navigate to the templates test space
    await page.goto(spaceUrl);

    // Click Settings tab to access space settings
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Verify we are on the Templates settings page
    await expect(page.getByText('Here you can create and edit Templates for this space.')).toBeVisible();

    // Verify all template sections are visible
    await expect(page.getByRole('heading', { name: 'Community Guidelines Templates' })).toBeVisible();

    // Click on the last "Create new" button for Community Guidelines Templates
    const createButtons = page.getByRole('button', { name: 'Create new' });
    await createButtons.nth(4).click();

    // Wait for the Community Guidelines Template creation dialog to appear
    await expect(page.getByRole('heading', { name: 'Create new Community Guidelines Template' })).toBeVisible();

    // Enter the template title in the Template description section
    await page.getByRole('textbox', { name: 'Template title' }).fill('Test Community Guidelines Template');

    // Fill in the template description
    await page.getByRole('textbox', { name: 'Markdown editor' }).first().fill('This is a test template for community guidelines. It defines the expected behavior and conduct within the community.');

    // Enter the title for the community guidelines
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Community Code of Conduct');

    // Fill in the guidelines content
    await page.getByRole('textbox', { name: 'Markdown editor' }).nth(1).fill('Be respectful and inclusive. Treat all community members with dignity. Provide constructive feedback. No harassment or discrimination. Follow these guidelines to maintain a positive community environment.');

    // Verify the Create button is enabled
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();

    // Click the Create button to save the Community Guidelines Template
    await createButton.click();

    // Verify the dialog closes
    await expect(page.getByRole('heading', { name: 'Create new Community Guidelines Template' })).not.toBeVisible();

    // Verify the template was created successfully by checking the count
    await expect(page.getByRole('heading', { name: 'Community Guidelines Templates (1)' })).toBeVisible();

    // Verify the template is displayed in the list
    await expect(page.getByRole('heading', { name: 'Test Community Guidelines Template' })).toBeVisible();

    // Verify the template description is visible
    await expect(page.getByText('This is a test template for community guidelines. It defines the expected behavior and conduct within the community.')).toBeVisible();
  });

   test('1.2 Delete Community Guidelines Template', async ({
    templatesSpaceCreated,
  }) => {
  });
});
