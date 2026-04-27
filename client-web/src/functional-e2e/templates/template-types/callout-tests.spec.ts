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
import { createCalloutTemplateData } from './forms/callout/callout-template-form.models';
import { fillCalloutTemplateForm } from './forms/callout/callout-template-form';
import { verifyCalloutTemplate } from './verify/callout-template-verify';
import { verifyCalloutTemplateUsage } from './usage/callout-template.use';
import { acceptCookiesIfVisible } from '@src/functional-e2e/helpers/cookies.helper';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'callout-templates-test.json',
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
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

const createAndVerifyCalloutTemplate = async (
  page: Page,
  templateData: ReturnType<typeof createCalloutTemplateData>
) => {
  // Wait for the templates page to be fully loaded
  await page
    .getByRole('heading', { name: /Collaboration Tool Templates/ })
    .waitFor({ state: 'visible' });

  // Click Create new in Collaboration Tool Templates section
  // The sections are: Space Templates (0), Collaboration Tool Templates (1), Whiteboard (2), Post (3), Community Guidelines (4)
  const createNewButton = page
    .getByRole('button', { name: 'Create new' })
    .nth(1);

  await createNewButton.click();

  // Wait for the dialog to appear
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', {
      name: 'Create new Collaboration Tool Template',
    }),
  });
  await expect(dialog).toBeVisible();

  // Fill the form
  await fillCalloutTemplateForm(page, templateData);

  // Click on CREATE the template
  const createButton = dialog.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  // Verify dialog closes
  await expect(dialog).not.toBeVisible();

  // Verify template was created
  await verifyCalloutTemplate(page, templateData);

  // Verify the template works using it:
  await verifyCalloutTemplateUsage(
    page,
    `${baseUrl}/${baseScenario.space.nameId}?tab=4`,
    templateData
  );
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
// | ✅     | *9b| None               | Links & Files    | Disabled         | false              | false              | N/A                |
// | ✅     | *9c| None               | Links & Files    | Disabled         | true               | false              | N/A                |
// | ✅     |  10| None               | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  11| Whiteboard         | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  12| Whiteboard         | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  13| Memo               | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  14| Memo               | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  15| Call to Action     | Links & Files    | Disabled         | true               | true               | N/A                |
// | ✅     |  16| Call to Action     | Links & Files    | Enabled          | true               | true               | N/A                |
// | ✅     |  17| None               | Posts            | Disabled         | true               | true               | true               |
// | ✅     |*17b| None               | Posts            | Disabled         | false              | false              | true               |
// | ✅     |*17c| None               | Posts            | Disabled         | true               | false              | true               |
// | ✅     |*17d| None               | Posts            | Disabled         | true               | true               | false              |
// | ✅     |*17e| None               | Posts            | Disabled         | false              | false              | false              |
// | ✅     |*17f| None               | Posts            | Disabled         | true               | false              | false              |
// | ✅     |  18| None               | Posts            | Enabled          | true               | true               | true               |
// | ✅     |  19| Whiteboard         | Posts            | Disabled         | true               | true               | true               |
// | ✅     |  20| Whiteboard         | Posts            | Enabled          | true               | true               | true               |
// | ✅     |  21| Memo               | Posts            | Disabled         | true               | true               | true               |
// | ✅     |  22| Memo               | Posts            | Enabled          | true               | true               | true               |
// | ✅     |  23| Call to Action     | Posts            | Disabled         | true               | true               | true               |
// | ✅     |  24| Call to Action     | Posts            | Enabled          | true               | true               | true               |
// | ✅     |  25| None               | Memos            | Disabled         | true               | true               | N/A                |
// | ✅     |*25b| None               | Memos            | Disabled         | false              | false              | N/A                |
// | ✅     |*25c| None               | Memos            | Disabled         | true               | false              | N/A                |
// | ✅     |  26| None               | Memos            | Enabled          | true               | true               | N/A                |
// | ✅     |  27| Whiteboard         | Memos            | Disabled         | true               | true               | N/A                |
// | ✅     |  28| Whiteboard         | Memos            | Enabled          | true               | true               | N/A                |
// | ✅     |  29| Memo               | Memos            | Disabled         | true               | true               | N/A                |
// | ✅     |  30| Memo               | Memos            | Enabled          | true               | true               | N/A                |
// | ✅     |  31| Call to Action     | Memos            | Disabled         | true               | true               | N/A                |
// | ✅     |  32| Call to Action     | Memos            | Enabled          | true               | true               | N/A                |
// | ✅     |  33| None               | Whiteboards      | Disabled         | true               | true               | N/A                |
// | ✅     |*33b| None               | Whiteboards      | Disabled         | false              | false              | N/A                |
// | ✅     |*33c| None               | Whiteboards      | Disabled         | true               | false              | N/A                |
// | ✅     |  34| None               | Whiteboards      | Enabled          | true               | true               | N/A                |
// | ✅     |  35| Whiteboard         | Whiteboards      | Disabled         | true               | true               | N/A                |
// | ✅     |  36| Whiteboard         | Whiteboards      | Enabled          | true               | true               | N/A                |
// | ✅     |  37| Memo               | Whiteboards      | Disabled         | true               | true               | N/A                |
// | ✅     |  38| Memo               | Whiteboards      | Enabled          | true               | true               | N/A                |
// | ✅     |  39| Call to Action     | Whiteboards      | Disabled         | true               | true               | N/A                |
// | ✅     |  40| Call to Action     | Whiteboards      | Enabled          | true               | true               | N/A                |

// Callout with references test:
// |        |  41| None               | None             | Disabled         | N/A                | N/A                | N/A                |

/** @testCase TC-2440 */
test.describe.serial('Callout Templates', () => {
  test.beforeAll(async ({ browser }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${baseUrl}/${baseScenario.space.nameId}/settings/templates`
    );
    await acceptCookiesIfVisible(page);
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

  test('9 Framing: None, Response: Links & Files, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('9b Framing: None, Response: Links & Files, Comments: Disabled, Contrib: OFF', async ({
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

  test('9c Framing: None, Response: Links & Files, Comments: Disabled, Contrib: Admin', async ({
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

  test('10 Framing: None, Response: Links & Files, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('11 Framing: Whiteboard, Response: Links & Files, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('12 Framing: Whiteboard, Response: Links & Files, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('13 Framing: Memo, Response: Links & Files, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('14 Framing: Memo, Response: Links & Files, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('15 Framing: Call to Action, Response: Links & Files, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'linksFiles',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('16 Framing: Call to Action, Response: Links & Files, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'linksFiles',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17 Framing: None, Response: Posts, Comments: Disabled, Contrib: ON ', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17b Framing: None, Response: Posts, Comments: Disabled, Contrib: OFF, CommentsOnPosts: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
      contributionsEnabledAdmin: false,
      contributionsEnabledMember: false,
      commentsOnContributionsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17c Framing: None, Response: Posts, Comments: Disabled, Contrib: Admin, CommentsOnPosts: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: false,
      commentsOnContributionsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17d Framing: None, Response: Posts, Comments: Disabled, Contrib: ON, CommentsOnPosts: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: true,
      commentsOnContributionsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17e Framing: None, Response: Posts, Comments: Disabled, Contrib: OFF, CommentsOnPosts: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
      contributionsEnabledAdmin: false,
      contributionsEnabledMember: false,
      commentsOnContributionsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('17f Framing: None, Response: Posts, Comments: Disabled, Contrib: Admin, CommentsOnPosts: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: false,
      commentsOnContributionsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('18 Framing: None, Response: Posts, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'posts',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('19 Framing: Whiteboard, Response: Posts, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'posts',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('20 Framing: Whiteboard, Response: Posts, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'posts',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('21 Framing: Memo, Response: Posts, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'posts',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('22 Framing: Memo, Response: Posts, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'posts',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('23 Framing: Call to Action, Response: Posts, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'posts',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('24 Framing: Call to Action, Response: Posts, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'posts',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('25 Framing: None, Response: Memos, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'memos',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('25b Framing: None, Response: Memos, Comments: Disabled, Contrib: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'memos',
      commentsEnabled: false,
      contributionsEnabledAdmin: false,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('25c Framing: None, Response: Memos, Comments: Disabled, Contrib: Admin', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'memos',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('26 Framing: None, Response: Memos, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'memos',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('27 Framing: Whiteboard, Response: Memos, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'memos',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('28 Framing: Whiteboard, Response: Memos, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'memos',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('29 Framing: Memo, Response: Memos, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'memos',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('30 Framing: Memo, Response: Memos, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'memos',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('31 Framing: Call to Action, Response: Memos, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'memos',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('32 Framing: Call to Action, Response: Memos, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'memos',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('33 Framing: None, Response: Whiteboards, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'whiteboards',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('33b Framing: None, Response: Whiteboards, Comments: Disabled, Contrib: OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'whiteboards',
      commentsEnabled: false,
      contributionsEnabledAdmin: false,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('33c Framing: None, Response: Whiteboards, Comments: Disabled, Contrib: Admin', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'whiteboards',
      commentsEnabled: false,
      contributionsEnabledAdmin: true,
      contributionsEnabledMember: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('34 Framing: None, Response: Whiteboards, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'whiteboards',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('35 Framing: Whiteboard, Response: Whiteboards, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'whiteboards',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('36 Framing: Whiteboard, Response: Whiteboards, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'whiteboard',
      responseType: 'whiteboards',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('37 Framing: Memo, Response: Whiteboards, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'whiteboards',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('38 Framing: Memo, Response: Whiteboards, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'memo',
      responseType: 'whiteboards',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('39 Framing: Call to Action, Response: Whiteboards, Comments: Disabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'whiteboards',
      commentsEnabled: false,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('40 Framing: Call to Action, Response: Whiteboards, Comments: Enabled, Contrib: ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'callToAction',
      responseType: 'whiteboards',
      commentsEnabled: true,
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('41 Framing: None, Response: None, Comments: Disabled, With References', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      framingType: 'none',
      responseType: 'none',
      commentsEnabled: false,
      calloutReferences: [
        { title: 'Reference 1', url: 'https://alkem.io/ref1' },
        { title: 'Reference 2', url: 'https://alkem.io/ref2' },
      ],
    });

    await createAndVerifyCalloutTemplate(page, templateData);
  });
});
