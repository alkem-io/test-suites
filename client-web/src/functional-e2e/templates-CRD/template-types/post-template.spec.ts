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

    // Enable CRD feature flag and reload so the redesigned Templates page renders
    await page.evaluate(() => {
      localStorage.setItem('alkemio-crd-enabled', 'true');
    });
    await page.reload();

    // Verify we are on the Templates settings page
    await expect(
      page.getByRole('textbox', { name: 'Search templates…' })
    ).toBeVisible();
  });

  test('1.0 Navigate to templates settings', async ({ page }) => {
    // Navigate to the root of the space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Enable CRD feature flag
    await page.evaluate(() => {
      localStorage.setItem('alkemio-crd-enabled', 'true');
    });
    await page.reload();

    // Open space settings (now a link in the space banner, not a space tab)
    await page.getByRole('link', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Verify we are on the Templates settings page
    await expect(page.url()).toMatch(/\/settings\/templates$/);
  });

  test('1.1 Create Post Template', async ({ page }) => {
    // Verify the Post templates section is visible
    await expect(
      page.getByRole('button', { name: /^Post templates/ })
    ).toBeVisible();

    // Open the "Add new" menu for the Post templates section (4th section)
    await page.getByRole('button', { name: 'Add new' }).nth(3).click();
    await page.getByRole('menuitem', { name: 'Create new' }).click();

    // Wait for the Post Template creation dialog to appear
    const dialog = page.getByRole('dialog', { name: 'Create post template' });
    await expect(
      dialog.getByRole('heading', { name: 'Create post template' })
    ).toBeVisible();

    // Fill the form:
    await fillPostTemplateForm(page, templateData);

    // Verify the Save button is enabled
    const saveButton = dialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled();

    // Click the Save button to save the Post Template
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Create post template' })
    ).not.toBeVisible();

    await verifyPostTemplate(page, templateData);
  });

  test('1.2 Edit Post Template', async ({ page }) => {
    const EditedTag = ' Edited-' + randomBytes(3).toString('hex');

    // Open the template's preview dialog, then start editing
    await page
      .getByRole('button', {
        name: `Preview: ${templateData.displayName}`,
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'Edit template' }).click();

    templateData.displayName = templateData.displayName + EditedTag;
    templateData.description = templateData.description + EditedTag;
    templateData.tags.push(EditedTag);
    templateData.defaultContent = templateData.defaultContent + EditedTag;

    // Wait for the edit dialog to appear
    const dialog = page.getByRole('dialog', { name: 'Edit post template' });
    await expect(
      dialog.getByRole('heading', { name: 'Edit post template' })
    ).toBeVisible();

    await fillPostTemplateForm(page, templateData);

    // Click the Save button to save the changes
    const saveButton = dialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Edit post template' })
    ).not.toBeVisible();

    // Verify the data was updated
    await verifyPostTemplate(page, templateData);

    // Reload the page to ensure changes persist
    await page.reload();
    await verifyPostTemplate(page, templateData);
  });

  test('1.3 Verify edit and cancel and confirm dialog', async ({ page }) => {
    const originalContent = templateData.defaultContent;
    templateData.defaultContent =
      originalContent + ' This edit will be discarded.';

    await page
      .getByRole('button', {
        name: `Preview: ${templateData.displayName}`,
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'Edit template' }).click();

    await fillPostTemplateForm(page, templateData);

    // Cancel and discard the changes (Cancel triggers the "Discard changes?" dialog)
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Yes, Close' }).click();

    // Restore expectations and verify the template was not modified
    templateData.defaultContent = originalContent;
    await verifyPostTemplate(page, templateData);
  });

  // test('1.4 Delete Post Template', async ({ page }) => {
  //   // Delete flow not yet implemented for the redesigned Templates UI.
  // });
});
