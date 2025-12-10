// spec: templates/templates-test-plan.md#11
// fixture: client-web/src/functional-e2e/templates/fixture-templates-space-admin.spec.ts

import { expect } from '@playwright/test';
import { test } from '../fixture-templates-space-admin.spec';
import { baseUrl } from '@common/constants/url-list';

test.describe('Create Posts Template', () => {
  test('1.1 Create Posts Template', async ({
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
    await expect(page.getByRole('heading', { name: 'Posts Templates' })).toBeVisible();

    // Click on the "Create new" button for Posts Templates
    const createButtons = page.getByRole('button', { name: 'Create new' });
    await createButtons.nth(2).click();

    // Wait for the Posts Template creation dialog to appear
    await expect(page.getByRole('heading', { name: 'Create new Posts Template' })).toBeVisible();

    // Enter the template title in the Template description section
    await page.getByRole('textbox', { name: 'Template title' }).fill('Test Posts Template');

    // Fill in the template description
    await page.getByRole('textbox', { name: 'Markdown editor' }).first().fill('This is a test template for posts. It provides a structured format for community members to share their updates and announcements.');

    // Enter the title for the post
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Post Template');

    // Fill in the post content
    await page.getByRole('textbox', { name: 'Markdown editor' }).nth(1).fill('Share your update here. Include relevant details, links, or resources. Feel free to format your post using markdown for better readability.');

    // Verify the Create button is enabled
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();

    // Click the Create button to save the Posts Template
    await createButton.click();

    // Verify the dialog closes
    await expect(page.getByRole('heading', { name: 'Create new Posts Template' })).not.toBeVisible();

    // Verify the template was created successfully by checking the count
    await expect(page.getByRole('heading', { name: 'Posts Templates (1)' })).toBeVisible();

    // Verify the template is displayed in the list
    await expect(page.getByRole('heading', { name: 'Test Posts Template' })).toBeVisible();

    // Verify the template description is visible
    await expect(page.getByText('This is a test template for posts. It provides a structured format for community members to share their updates and announcements.')).toBeVisible();
  });

  test('1.2 Delete Posts Template', async ({
    templatesSpaceCreated,
  }) => {
  });
});
