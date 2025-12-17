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


// =========================================================================================================================================
//   TESTS MATRIX:
// =========================================================================================================================================
// | Status | No | Additional Content | Response Options | Comments Enabled | Contrib. Admin. ON | Contrib.Member. ON | CommentsOnContribs |
// |--------|----|--------------------|------------------|------------------|--------------------|--------------------|--------------------|
// | ✅     |   1| None               | None             | Disabled         | N/A                | N/A                | N/A                |
// | ✅     |   2| None               | None             | Enabled          | N/A                | N/A                | N/A                |
// | ✅     |   3| Whiteboard         | None             | Disabled         | N/A                | N/A                | N/A                |
// | ✅     |   4| Whiteboard         | None             | Enabled          | N/A                | N/A                | N/A                |
// | ✅     |   5| Memo               | None             | Disabled         | N/A                | N/A                | N/A                |
// | ✅     |   6| Memo               | None             | Enabled          | N/A                | N/A                | N/A                |
// | ✅     |   7| Call to Action     | None             | Disabled         | N/A                | N/A                | N/A                |
// | ✅     |   8| Call to Action     | None             | Enabled          | N/A                | N/A                | N/A                |
// | ✅     |   9| None               | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  9b| None               | Links & Files    | Disabled         | false              | false              | N/A                |
// | ✅     |  9c| None               | Links & Files    | Disabled         | true               | false              | N/A                |
// | ✅     |  10| None               | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  11| Whiteboard         | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  12| Whiteboard         | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  13| Memo               | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  14| Memo               | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  15| Call to Action     | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  16| Call to Action     | Links & Files    | Enabled          | true               | true               | N/A                |
// |        |  17| None               | Posts            | Disabled         | true               | true               | true               |
// |        | 17b| None               | Posts            | Disabled         | false              | false              | true               |
// |        | 17c| None               | Posts            | Disabled         | true               | false              | true               |
// |        | 17d| None               | Posts            | Disabled         | true               | true               | false              |
// |        | 17e| None               | Posts            | Disabled         | false              | false              | false              |
// |        | 17f| None               | Posts            | Disabled         | true               | false              | false              |
// |        |  18| None               | Posts            | Enabled          | true               |
// |        |  19| Whiteboard         | Posts            | Disabled         | true               |
// |        |  20| Whiteboard         | Posts            | Enabled          | true               |
// |        |  21| Memo               | Posts            | Disabled         | true               |
// |        |  22| Memo               | Posts            | Enabled          | true               |
// |        |  23| Call to Action     | Posts            | Disabled         | true               |
// |        |  24| Call to Action     | Posts            | Enabled          | true               |
// |        |  25| None               | Memos            | Disabled         | true               |
// |        |  26| None               | Memos            | Enabled          | true               |
// |        |  27| Whiteboard         | Memos            | Disabled         | true               |
// |        |  28| Whiteboard         | Memos            | Enabled          | true               |
// |        |  29| Memo               | Memos            | Disabled         | true               |
// |        |  30| Memo               | Memos            | Enabled          | true               |
// |        |  31| Call to Action     | Memos            | Disabled         | true               |
// |        |  32| Call to Action     | Memos            | Enabled          | true               |
// |        |  33| None               | Whiteboards      | Disabled         | true               |
// |        |  34| None               | Whiteboards      | Enabled          | true               |
// |        |  35| Whiteboard         | Whiteboards      | Disabled         | true               |
// |        |  36| Whiteboard         | Whiteboards      | Enabled          | true               |
// |        |  37| Memo               | Whiteboards      | Disabled         | true               |
// |        |  38| Memo               | Whiteboards      | Enabled          | true               |
// |        |  39| Call to Action     | Whiteboards      | Disabled         | true               |
// |        |  40| Call to Action     | Whiteboards      | Enabled          | true               |
//


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

  test('9 Framing: None, Response: Links & Files, Comments: Disabled, Contributions: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('9b Framing: None, Response: Links & Files, Comments: Disabled, Contributions: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: false,
      contributionsEnabledAdmin: false,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('9c Framing: None, Response: Links & Files, Comments: Disabled, Contributions: Admin', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('10 Framing: None, Response: Links & Files, Comments: Enabled, Contributions: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('11 Framing: Whiteboard, Response: Links & Files, Comments: Disabled, Contributions: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('12 Framing: Whiteboard, Response: Links & Files, Comments: Enabled, ContribAdmin: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('13 Framing: Memo, Response: Links & Files, Comments: Disabled, ContribAdmin: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('14 Framing: Memo, Response: Links & Files, Comments: Enabled, ContribAdmin: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('15 Framing: Call to Action, Response: Links & Files, Comments: Disabled, ContribAdmin: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('16 Framing: Call to Action, Response: Links & Files, Comments: Enabled, ContribAdmin: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

});
