// spec: client-web/src/functional-e2e/templates/template-types/callout/CALLOUT-TEMPLATES-PLAN.md
// Callout Template with Framing: None, Collection: Links & Files, Comments: Disabled

import { expect, Page } from '@playwright/test';
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
  createCalloutTemplateData,
} from './forms/callout/callout-template-form.models';
import {
  fillCalloutTemplateForm,
} from './forms/callout/callout-template-form';
import { verifyCalloutTemplate } from './verify/callout/callout-template-verify';
import { verifyCalloutTemplateUsage } from './usage/callout-template.use';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'callout-none-template-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callout-none-template',
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

const createAndVerifyCalloutTemplate = async (
  page: Page,
  templateData: ReturnType<typeof createCalloutTemplateData>
) => {
  // Click Create new in Collaboration Tool Templates section
  const createNewButton = page
    .getByRole('heading', { name: 'Collaboration Tool Templates' })
    .locator('..')
    .locator('..')
    .locator('..')
    .getByRole('button', { name: 'Create new' });

  await createNewButton.click();
  await expect(
    page.getByRole('heading', {
      name: 'Create new Collaboration Tool Template',
    })
  ).toBeVisible();

  // Fill the form
  await fillCalloutTemplateForm(page, templateData);

  // Click on CREATE the template
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Create new Collaboration Tool Template' }),
  }).last();

  await expect(dialog).toBeVisible();

  const createButton = dialog.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeEnabled();
  await createButton.click();
  // Verify dialog closes
  await expect(dialog).not.toBeVisible();

  // Verify template was created
  await verifyCalloutTemplate(page, templateData);

  // Verify the template works using it:
  await verifyCalloutTemplateUsage(page, `${baseUrl}/${baseScenario.space.nameId}?tab=4`, templateData);
};


// ============================================================================
//   TESTS MATRIX:
// | Status | No | Additional Content | Response Options | Comments Enabled |
// |--------|----|--------------------|------------------|------------------|
// | ✅     |   1| None               | None             | Disabled         |
// | ✅     |   2| None               | None             | Enabled          |
// | ✅     |   3| Whiteboard         | None             | Disabled         |
// | ✅     |   4| Whiteboard         | None             | Enabled          |
// | ✅     |   5| Memo               | None             | Disabled         |
// | ✅     |   6| Memo               | None             | Enabled          |
// | ✅     |   7| Call to Action     | None             | Disabled         |
// | ✅     |   8| Call to Action     | None             | Enabled          |
// |        |   9| None               | Links & Files    | Disabled         |
// |        |  10| None               | Links & Files    | Enabled          |
// |        |  11| Whiteboard         | Links & Files    | Disabled         |
// |        |  12| Whiteboard         | Links & Files    | Enabled          |
// |        |  13| Memo               | Links & Files    | Disabled         |
// |        |  14| Memo               | Links & Files    | Enabled          |
// |        |  15| Call to Action     | Links & Files    | Disabled         |
// |        |  16| Call to Action     | Links & Files    | Enabled          |
// |        |  17| None               | Posts            | Disabled         |
// |        |  18| None               | Posts            | Enabled          |
// |        |  19| Whiteboard         | Posts            | Disabled         |
// |        |  20| Whiteboard         | Posts            | Enabled          |
// |        |  21| Memo               | Posts            | Disabled         |
// |        |  22| Memo               | Posts            | Enabled          |
// |        |  23| Call to Action     | Posts            | Disabled         |
// |        |  24| Call to Action     | Posts            | Enabled          |
// |        |  25| None               | Memos            | Disabled         |
// |        |  26| None               | Memos            | Enabled          |
// |        |  27| Whiteboard         | Memos            | Disabled         |
// |        |  28| Whiteboard         | Memos            | Enabled          |
// |        |  29| Memo               | Memos            | Disabled         |
// |        |  30| Memo               | Memos            | Enabled          |
// |        |  31| Call to Action     | Memos            | Disabled         |
// |        |  32| Call to Action     | Memos            | Enabled          |
// |        |  33| None               | Whiteboards      | Disabled         |
// |        |  34| None               | Whiteboards      | Enabled          |
// |        |  35| Whiteboard         | Whiteboards      | Disabled         |
// |        |  36| Whiteboard         | Whiteboards      | Enabled          |
// |        |  37| Memo               | Whiteboards      | Disabled         |
// |        |  38| Memo               | Whiteboards      | Enabled          |
// |        |  39| Call to Action     | Whiteboards      | Disabled         |
// |        |  40| Call to Action     | Whiteboards      | Enabled          |
// ============================================================================




test.describe.serial('Callout Templates', () => {
  test.beforeAll(async ({ browser }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    await teardownAuthentication();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${baseUrl}/${baseScenario.space.nameId}/settings/templates`
    );
  });

  test('1 Framing: None, Response: None, Comments: Disabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'none',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('2 Framing: None, Response: None, Comments: Enabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'none',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('3 Framing: Whiteboard, Response: None, Comments: Disabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'none',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('4 Framing: Whiteboard, Response: None, Comments: Enabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'none',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('5 Framing: Memo, Response: None, Comments: Disabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'none',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('6 Framing: Memo, Response: None, Comments: Enabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'none',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('7 Framing: Call to Action, Response: None, Comments: Disabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'none',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('8 Framing: Call to Action, Response: None, Comments: Enabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'none',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

});
