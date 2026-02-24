// spec: templates/templates-test-plan.md#11

import { expect } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { randomBytes } from 'crypto';
import { PostTemplateForm } from './forms/template-form.models';
import { fillPostTemplateForm } from './forms/post-template-form';
import { verifyPostTemplate } from './verify/post-template-verify';
import { verifyOpenedTemplate } from './verify/verify-opened-template';

// Create the authenticated fixture with a unique storage state name for this test suite
const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'post-templates-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'post-template',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

const templateData: PostTemplateForm = {
  displayName: 'Test Post Template',
  description:
    'This template streamlines announcement posts with a ready-to-use structure for updates and calls to action.',
  tags: ['template', 'post'],
  defaultContent:
    '# Collaboration Update\n\nKeep stakeholders aligned with the latest milestones, blockers, and next steps.',
};

test.describe.serial('Post Templates', () => {
  test.beforeAll(async ({ browser, context }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });
  test.afterAll(async () => {
    // Clean up authentication
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${baseUrl}/${baseScenario.space.nameId}/settings/templates`
    );

    // Verify we are on the Templates settings page
    await expect(
      page.getByText('Here you can create and edit Templates for this space.')
    ).toBeVisible();
  });

  test('1.0 Navigate to templates settings', async ({ page }) => {
    // Navigate to the root of the space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Click Settings tab to access space settings
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Verify we are on the Templates settings page
    await expect(page.url()).toMatch(/\/settings\/templates$/);
  });

  test('1.1 Create Post Template', async ({ page }) => {
    // Verify all template sections are visible
    await expect(
      page.getByRole('heading', { name: 'Post Templates' })
    ).toBeVisible();

    // Find the container (parent of the parent of the heading) and then the "Create new" button within it
    const createNewButton = await page
      .getByRole('button', { name: 'Create new' })
      .nth(3);
    await createNewButton.click();

    // Wait for the Post Template creation dialog to appear
    await expect(
      page.getByRole('heading', { name: 'Create new Post Template' })
    ).toBeVisible();

    // Fill the form:
    await fillPostTemplateForm(page, templateData);

    // Verify the Create button is enabled
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();

    // Click the Create button to save the Post Template
    await createButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Create new Post Template' })
    ).not.toBeVisible();

    await verifyPostTemplate(page, templateData);
  });

  test('1.2 Edit Post Template', async ({ page }) => {
    const EditedTag = ' Edited-' + randomBytes(3).toString('hex');

    // Find the template title and click on it to open the template
    await page.getByRole('heading', { name: templateData.displayName }).click();

    await page.getByRole('button', { name: 'Edit' }).click();

    templateData.displayName = templateData.displayName + EditedTag;
    templateData.description = templateData.description + EditedTag;
    templateData.tags.push(EditedTag);
    templateData.defaultContent = templateData.defaultContent + EditedTag;

    // Wait for the edit dialog to appear
    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).toBeVisible();

    await fillPostTemplateForm(page, templateData);

    // Click the Save button to save the changes
    const saveButton = page.getByRole('button', { name: 'Update' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).not.toBeVisible();

    // Verify the data was updated
    await verifyOpenedTemplate(page, templateData);

    // Reload the page to ensure changes persist
    await page.reload();
    await verifyOpenedTemplate(page, templateData);
  });

  test('1.3 Verify edit and cancel and confirm dialog', async ({ page }) => {
    await page.getByRole('heading', { name: templateData.displayName }).click();

    const originalContent = templateData.defaultContent;
    templateData.defaultContent =
      originalContent + ' This edit will be discarded.';

    await page.getByRole('button', { name: 'Edit' }).click();

    await fillPostTemplateForm(page, templateData);

    // Close and discard changes to test the discard confirmation dialog
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Yes, Discard' }).click();

    // Verify we are back on the template view page with original data
    templateData.defaultContent = originalContent;
    await page.getByRole('heading', { name: templateData.displayName }).click();
    await verifyOpenedTemplate(page, templateData);
  });

  test('1.4 Delete Post Template', async ({ page }) => {
    // Find the template title and click on it to open the template
    await page.getByRole('heading', { name: templateData.displayName }).click();

    await page.getByRole('button', { name: 'Edit', exact: true }).click();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(
      page.getByText(
        `Are you sure you want to delete the Template '${templateData.displayName}'?`,
        { exact: true }
      )
    ).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(
      page.getByRole('heading', { name: 'Warning' })
    ).not.toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).not.toBeVisible();

    await expect(
      page.getByRole('heading', { name: templateData.displayName, exact: true })
    ).not.toBeVisible();
  });
});
