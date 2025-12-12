// spec: templates/templates-test-plan.md#11

import { expect } from '@playwright/test';
import { TestScenarioConfig, TestScenarioFactory, TestScenarioSpaceConfig, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { randomInt, verify } from 'crypto';
import { CommunityGuidelinesTemplateForm } from './forms/template-form.models';
import { clearAndEditCommunityGuidelinesForm, fillCommunityGuidelinesForm } from './forms/community-guidelines-template-form';
import { verifyCommunityGuidelinesTemplate } from './verify/comunity-guidelines-template-verify';


// Create the authenticated fixture with a unique storage state name for this test suite
const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'my-feature-test.json',
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
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
  },
};

const templateData: CommunityGuidelinesTemplateForm = {
  displayName: 'Test Community Guidelines Template',
  description: 'This is a test template for community guidelines. It defines the expected behavior and conduct within the community.',
  tags: ['template', 'CG'],
  guidelines: {
    displayName: 'Community Code of Conduct',
    description: 'Be respectful and inclusive. Treat all community members with dignity. Provide constructive feedback. No harassment or discrimination. Follow these guidelines to maintain a positive community environment.',
  }
};

test.describe.serial('Community Guidelines Template', () => {
  test.beforeAll(async ({ browser, context }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);


  });
  test.afterAll(async () => {
    // Clean up authentication
    await teardownAuthentication();
  });
  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
  });


  test('1.1 Create Community Guidelines Template', async ({
    page,
  }) => {
    // Click Settings tab to access space settings
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Verify we are on the Templates settings page
    await expect(page.getByText('Here you can create and edit Templates for this space.')).toBeVisible();

    // Verify all template sections are visible
    await expect(page.getByRole('heading', { name: 'Community Guidelines Templates' })).toBeVisible();

    // Find the container (parent of the parent of the heading) and then the "Create new" button within it
    const createNewButton = await page.getByRole('heading', { name: 'Community Guidelines' }).
      locator('..').locator('..').locator('..').
      getByRole('button', {name: 'Create New'});
    await createNewButton.click();

    // Wait for the Community Guidelines Template creation dialog to appear
    await expect(page.getByRole('heading', { name: 'Create new Community Guidelines Template' })).toBeVisible();

    // Fill the form:
    fillCommunityGuidelinesForm(page, templateData);

    // Verify the Create button is enabled
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();

    // Click the Create button to save the Community Guidelines Template
    await createButton.click();

    // Verify the dialog closes
    await expect(page.getByRole('heading', { name: 'Create new Community Guidelines Template' })).not.toBeVisible();

    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.2 Edit Community Guidelines Template', async ({
    page,
  }) => {
    const EditedTag = ' Edited-' + randomInt(1000, 9999);

    // Click Settings tab to access space settings
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Find the template title and click on it to open the template
    await page.getByRole('heading', { name: templateData.displayName }).click();

    await page.getByRole('button', { name: 'Edit' }).click();


    templateData.displayName = templateData.displayName + EditedTag;
    templateData.description = templateData.description + EditedTag;
    templateData.tags.push(EditedTag);
    templateData.guidelines.displayName = templateData.guidelines.displayName + EditedTag;
    templateData.guidelines.description = templateData.guidelines.description + EditedTag;


    // Wait for the edit dialog to appear
    await expect(page.getByRole('heading', { name: 'Edit Community Guidelines Template' })).toBeVisible();

    await clearAndEditCommunityGuidelinesForm(page, templateData);

    // Click the Save button to save the changes
    const saveButton = page.getByRole('button', { name: 'Update' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify the dialog closes
    await expect(page.getByRole('heading', { name: 'Edit Community Guidelines Template' })).not.toBeVisible();

    await verifyCommunityGuidelinesTemplate(page, templateData);
  });
  test('1.3 Delete Community Guidelines Template', async ({
    page,
  }) => {
    // Click Settings tab to access space settings
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Click Templates tab to access template management
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Find the template title and click on it to open the template
    await page.getByRole('heading', { name: templateData.displayName }).click();

    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(`Are you sure you want to delete the Template '${templateData.displayName}'?`, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Warning' })).not.toBeVisible();

    await expect(page.getByRole('heading', { name: 'Edit Community Guidelines Template' })).not.toBeVisible();

    await expect(page.getByRole('heading', { name: templateData.displayName, exact: true })).not.toBeVisible();
  });
});
