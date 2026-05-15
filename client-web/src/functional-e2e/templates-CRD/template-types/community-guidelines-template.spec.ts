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
  tags: ['template', 'cg'],
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
    //!! Not deleting base scenario for now to preserve test data for inspection
    // await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
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

  test('1.1 Create Community Guidelines Template', async ({ page }) => {
    // Verify the Community guidelines templates section is visible
    await expect(
      page.getByRole('button', { name: /^Community guidelines templates/ })
    ).toBeVisible();

    // Open the "Add new" menu for the Community guidelines section (5th section)
    await page.getByRole('button', { name: 'Add new' }).nth(4).click();
    await page.getByRole('menuitem', { name: 'Create new' }).click();

    // Wait for the Community Guidelines Template creation dialog to appear
    const dialog = page.getByRole('dialog', {
      name: 'Create community-guidelines template',
    });
    await expect(
      dialog.getByRole('heading', { name: 'Create community-guidelines template' })
    ).toBeVisible();

    // Fill the form:
    await fillCommunityGuidelinesForm(page, templateData);

    // Verify the Save button is enabled
    const saveButton = dialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled();

    // Click the Save button to save the Community Guidelines Template
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Create community-guidelines template' })
    ).not.toBeVisible();

    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.2 Edit Community Guidelines Template', async ({ page }) => {
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
    const dialog = page.getByRole('dialog', {
      name: 'Edit community-guidelines template',
    });
    await expect(
      dialog.getByRole('heading', { name: 'Edit community-guidelines template' })
    ).toBeVisible();

    await fillCommunityGuidelinesForm(page, templateData);

    // Click the Save button to save the changes
    const saveButton = dialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify the dialog closes
    await expect(
      page.getByRole('heading', { name: 'Edit community-guidelines template' })
    ).not.toBeVisible();

    // Verify the data was updated
    await verifyCommunityGuidelinesTemplate(page, templateData);

    // Reload the page to ensure changes persist
    await page.reload();
    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  test('1.3 Verify edit and cancel and confirm dialog', async ({ page }) => {
    const originalDescription = templateData.guidelines.description;
    templateData.guidelines.description =
      originalDescription + ' This edit will be discarded.';

    await page
      .getByRole('button', {
        name: `Preview: ${templateData.displayName}`,
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'Edit template' }).click();

    await fillCommunityGuidelinesForm(page, templateData);

    // Cancel and discard the changes (Cancel triggers the "Discard changes?" dialog)
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Discard' }).click();

    // Restore expectations and verify the template was not modified
    templateData.guidelines.description = originalDescription;
    await verifyCommunityGuidelinesTemplate(page, templateData);
  });

  // TODO: test '1.4 Use Community Guidelines Template' needs to be rewritten
  // for the redesigned community settings UI (the "Community guidelines" block
  // and its template-library picker). Skipped for now.

  // test('1.5 Delete Community Guidelines Template', async ({ page }) => {
  //   // Delete flow not yet implemented for the redesigned Templates UI.
  // });
});
