// spec: client-web/src/functional-e2e/templates/template-types/callout/CALLOUT-TEMPLATES-PLAN.md
// Callout Template with Additional Content: Whiteboard, Collection: Posts, Comments: Enabled

import { expect } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { randomInt } from 'crypto';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import {
  CalloutTemplateForm,
  createAdditionalContentWhiteboard,
  createCollectionPosts,
} from '../forms/callout/callout-template-form.models';
import {
  fillCalloutTemplateForm,
} from '../forms/callout/callout-template-form';
import { verifyCalloutTemplate } from '../verify/callout/callout-template-verify';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'callout-whiteboard-template-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callout-wb-template',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
      ],
    },
  },
};

const templateData: CalloutTemplateForm = {
  // Template metadata
  displayName: 'Brainstorm with Posts',
  description: 'A callout template for brainstorming sessions with a whiteboard and post responses.',
  tags: ['callout', 'brainstorm'],

  // Callout base fields
  calloutTitle: 'Brainstorming Session',
  calloutTags: ['ideation', 'creative'],
  calloutDescription: 'Use the whiteboard to sketch ideas and share your thoughts as posts.',

  // Additional content: Whiteboard
  additionalContent: createAdditionalContentWhiteboard(
    'Brainstorm Canvas - Add Your Ideas Here'
  ),

  // Response options
  commentsEnabled: true,
  responseOptions: createCollectionPosts({
    defaultTitle: 'My Idea',
    defaultDescription: '## Idea Description\n\nDescribe your idea here...',
    membersCanAdd: true,
    adminsCanAdd: true,
    enableCommentsOnPosts: true,
  }),
};

test.describe.serial('Callout Templates - Whiteboard Additional Content', () => {
  test.beforeAll(async ({ browser }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    await teardownAuthentication();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
  });

  test('1.1 Create Callout Template with Whiteboard', async ({ page }) => {
    // Navigate to Settings > Templates
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    await expect(
      page.getByText('Here you can create and edit Templates for this space.')
    ).toBeVisible();

    // Click Create new in Collaboration Tool Templates section
    const createNewButton = page
      .getByRole('heading', { name: 'Collaboration Tool Templates' })
      .locator('..')
      .locator('..')
      .locator('..')
      .getByRole('button', { name: 'Create new' });

    await createNewButton.click();
    await expect(
      page.getByRole('heading', { name: 'Create new Collaboration Tool Template' })
    ).toBeVisible();

    // Fill the form
    await fillCalloutTemplateForm(page, templateData);

    // Create the template
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Verify dialog closes
    await expect(
      page.getByRole('heading', { name: 'Create new Collaboration Tool Template' })
    ).not.toBeVisible();

    // Verify template was created
    await verifyCalloutTemplate(page, templateData);
  });

  test('1.2 Edit Callout Template with Whiteboard', async ({ page }) => {
    const editSuffix = ` Edited-${randomInt(1000, 9999)}`;
    const newTag = `edited-${randomInt(1000, 9999)}`;

    // Navigate to Settings > Templates
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Open template and enter edit mode
    await page.getByRole('heading', { name: templateData.displayName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Update template data
    templateData.displayName += editSuffix;
    templateData.description += editSuffix;
    templateData.tags.push(newTag);
    templateData.calloutTitle += editSuffix;
    templateData.calloutDescription += editSuffix;

    // Update whiteboard content
    if (templateData.additionalContent.type === 'whiteboard') {
      templateData.additionalContent.textInWhiteboard += editSuffix;
    }

    await expect(
      page.getByRole('heading', { name: 'Edit Collaboration Tool Template' })
    ).toBeVisible();

    // Edit the form
    await fillCalloutTemplateForm(page, templateData);

    // Save changes
    const saveButton = page.getByRole('button', { name: 'Update' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify dialog closes
    await expect(
      page.getByRole('heading', { name: 'Edit Collaboration Tool Template' })
    ).not.toBeVisible();

    // Verify changes
    await verifyCalloutTemplate(page, templateData);
  });

  test('1.3 Delete Callout Template with Whiteboard', async ({ page }) => {
    // Navigate to Settings > Templates
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    // Open template and enter edit mode
    await page.getByRole('heading', { name: templateData.displayName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Click delete
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify confirmation dialog
    await expect(
      page.getByText(
        `Are you sure you want to delete the Template '${templateData.displayName}'?`,
        { exact: true }
      )
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify dialogs close
    await expect(page.getByRole('heading', { name: 'Warning' })).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Edit Collaboration Tool Template' })
    ).not.toBeVisible();

    // Verify template is removed from list
    await expect(
      page.getByRole('heading', { name: templateData.displayName, exact: true })
    ).not.toBeVisible();
  });
});
