// spec: templates/templates-test-plan.md#11

import { expect } from '@playwright/test';
import { TestScenarioConfig, TestScenarioFactory, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { randomInt } from 'crypto';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { PostTemplateForm } from './forms/template-form.models';
import { clearAndEditPostTemplateForm, fillPostTemplateForm } from './forms/post-template-form';
import { verifyPostTemplate } from './verify/post-template-verify';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'post-template-test.json',
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

const templateData: PostTemplateForm = {
  displayName: 'Test Post Template',
  description:
    'This template streamlines announcement posts with a ready-to-use structure for updates and calls to action.',
  tags: ['template', 'post'],
  defaultContent:
    '# Collaboration Update\n\nKeep stakeholders aligned with the latest milestones, blockers, and next steps.',
};

test.describe.serial('Post Templates', () => {
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

  test('1.1 Create Post Template', async ({ page }) => {
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    await expect(
      page.getByText('Here you can create and edit Templates for this space.')
    ).toBeVisible();

    const createNewButton = await page
      .getByRole('heading', { name: 'Post Templates' })
      .locator('..')
      .locator('..')
      .locator('..')
      .getByRole('button', { name: 'Create New' });

    await createNewButton.click();
    await expect(
      page.getByRole('heading', { name: 'Create new Post Template' })
    ).toBeVisible();

    await fillPostTemplateForm(page, templateData);

    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await expect(
      page.getByRole('heading', { name: 'Create new Post Template' })
    ).not.toBeVisible();

    await verifyPostTemplate(page, templateData);
  });

  test('1.2 Edit Post Template', async ({ page }) => {
    const editSuffix = ` Edited-${randomInt(1000, 9999)}`;
    const newTag = `Edited-${randomInt(1000, 9999)}`;

    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    await page.getByRole('heading', { name: templateData.displayName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    templateData.displayName += editSuffix;
    templateData.description += editSuffix;
    templateData.tags.push(newTag);
    templateData.defaultContent += `${editSuffix} — updated copy.`;

    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).toBeVisible();

    await clearAndEditPostTemplateForm(page, templateData);

    const saveButton = page.getByRole('button', { name: 'Update' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).not.toBeVisible();

    await verifyPostTemplate(page, templateData);
  });

  test('1.3 Delete Post Template', async ({ page }) => {
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Templates' }).click();

    await page.getByRole('heading', { name: templateData.displayName }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(
      page.getByText(
        `Are you sure you want to delete the Template '${templateData.displayName}'?`,
        { exact: true }
      )
    ).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Warning' })).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Edit Post Template' })
    ).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: templateData.displayName, exact: true })
    ).not.toBeVisible();
  });
});
