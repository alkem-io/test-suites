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
import { CommunityGuidelinesTemplateForm } from './forms/template-form.models';
import { fillCommunityGuidelinesForm } from './forms/community-guidelines-template-form';
import { verifyCommunityGuidelinesTemplate } from './verify/community-guidelines-template-verify';

// Create the authenticated fixture with a unique storage state name for this test suite
const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'community-guidelines-templates-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'community-guidelines-template',
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

const templateData: CommunityGuidelinesTemplateForm = {
  displayName: 'Test Community Guidelines Template',
  description:
    'This is a test template for community guidelines. It defines the expected behavior and conduct within the community.',
  tags: ['template', 'CG'],
  guidelines: {
    displayName: 'Community Code of Conduct',
    description:
      'Be respectful and inclusive. Treat all community members with dignity. Provide constructive feedback. No harassment or discrimination. Follow these guidelines to maintain a positive community environment.',
    references: [
      {
        title: 'Contributor Rules',
        url: 'https://alkem.io/test',
      },
      {
        title: 'Contributor Participation Policy',
        url: 'https://alkem.io/test2',
      },
    ],
  },
};

test.describe.serial('Community Guidelines Template', () => {
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

  test('1.1 Create Community Guidelines Template', async ({ page }) => {
    // Verify all template sections are visible
    await expect(
      page.getByRole('heading', { name: 'Community Guidelines Templates' })
    ).toBeVisible();

    // Find the container (parent of the parent of the heading) and then the "Create new" button within it
    const createNewButton = await page
      .getByRole('button', { name: 'Create new' })
      .nth(4);
    await createNewButton.click();

    // Wait for the Community Guidelines Template creation dialog to appear
    await expect(
      page.getByRole('heading', {
        name: 'Create new Community Guidelines Template',
      })
    ).toBeVisible();

    // Fill the form:
    await fillCommunityGuidelinesForm(page, templateData);

    // Verify the Create button is enabled
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();

    // Click the Create button to save the Community Guidelines Template
    await createButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', {
        name: 'Create new Community Guidelines Template',
      })
    ).not.toBeVisible();

    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.2 Edit Community Guidelines Template', async ({ page }) => {
    const EditedTag = ' Edited-' + randomBytes(3).toString('hex');

    // Find the template title and click on it to open the template
    await page.getByRole('heading', { name: templateData.displayName }).click();

    await page.getByRole('button', { name: 'Edit' }).click();

    templateData.displayName = templateData.displayName + EditedTag;
    templateData.description = templateData.description + EditedTag;
    templateData.tags.push(EditedTag);
    templateData.guidelines.displayName =
      templateData.guidelines.displayName + EditedTag;
    templateData.guidelines.description =
      templateData.guidelines.description + EditedTag;
    // Modify the first reference and add a new one
    if (
      templateData.guidelines.references &&
      templateData.guidelines.references.length > 1
    ) {
      templateData.guidelines.references[0].title =
        templateData.guidelines.references[0].title + EditedTag;
      templateData.guidelines.references[0].url =
        templateData.guidelines.references[0].url + '-edited';
    }
    templateData.guidelines.references?.push({
      title: `New Edited Reference ${EditedTag}`,
      url: 'https://alkem.io/edited-reference',
    });

    // Wait for the edit dialog to appear
    await expect(
      page.getByRole('heading', { name: 'Edit Community Guidelines Template' })
    ).toBeVisible();

    await fillCommunityGuidelinesForm(page, templateData);

    // Click the Save button to save the changes
    const saveButton = page.getByRole('button', { name: 'Update' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Edit Community Guidelines Template' })
    ).not.toBeVisible();

    // Verify the data was updated
    await verifyCommunityGuidelinesTemplate(page, templateData);

    // Reload the page to ensure changes persist
    await page.reload();

    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.3 Verify edit and cancel and confirm dialog', async ({ page }) => {
    await page.getByRole('heading', { name: templateData.displayName }).click();

    const originalDescription = templateData.guidelines.description;
    templateData.guidelines.description =
      originalDescription + ' This edit will be discarded.';

    await page.getByRole('button', { name: 'Edit' }).click();

    await fillCommunityGuidelinesForm(page, templateData);

    // Close and discard changes to test the discard confirmation dialog
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Yes, Discard' }).click();

    // Verify we are back on the template view page with original data
    templateData.guidelines.description = originalDescription;
    await page.getByRole('heading', { name: templateData.displayName }).click();
    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.4 Use Community Guidelines Template', async ({ page }) => {
    await page.goto(
      `${baseUrl}/${baseScenario.space.nameId}/settings/community`
    );
    const communityGuidelinesBlock = page
      .locator('div')
      .filter({ hasText: /^Community guidelines$/ })
      .locator('..');
    await communityGuidelinesBlock
      .getByRole('button', { name: 'Expand' })
      .click();
    await page.getByRole('button', { name: 'Library' }).click();

    await page
      .getByRole('heading', { name: templateData.displayName, exact: true })
      .click();
    const templateGalleryDialog = page
      .getByRole('heading', {
        name: `Template Library: Community Guidelines Template`,
        exact: true,
      })
      .locator('..')
      .locator('..')
      .locator('..');
    const templateDialog = page
      .getByRole('heading', {
        name: `Preview — ${templateData.displayName}`,
        exact: true,
      })
      .locator('..')
      .locator('..')
      .locator('..');
    await expect(templateDialog).toBeVisible();

    await verifyCommunityGuidelinesTemplate(page, templateData);

    await templateDialog.getByRole('button', { name: 'Use' }).click();
    await expect(templateDialog).not.toBeVisible();

    await expect(templateGalleryDialog).not.toBeVisible();

    await expect(
      page.getByRole('textbox', { name: 'Title', exact: true }).first()
    ).toHaveValue(templateData.guidelines.displayName);

    await expect(
      page.getByText(templateData.guidelines.description, { exact: true })
    ).toBeVisible();
  });

  test('1.5 Delete Community Guidelines Template', async ({ page }) => {
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
      page.getByRole('heading', { name: 'Edit Community Guidelines Template' })
    ).not.toBeVisible();

    await expect(
      page.getByRole('heading', { name: templateData.displayName, exact: true })
    ).not.toBeVisible();
  });
});
