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
import {
  verifyCalloutTemplate,
  verifyPollSettings,
} from './verify/callout-template-verify';
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
    .getByRole('button', { name: /^Collaboration tools/ })
    .waitFor({ state: 'visible' });

  // Open the "Add new" menu in the Collaboration tools section and pick
  // "Create new". The sections are: Space templates (0), Collaboration
  // tools (1), Whiteboard (2), Post (3), Community guidelines (4).
  //
  // On the slower test env the Radix dropdown can flicker shut before the menu
  // item is clicked (a notification re-render steals focus), leaving "Create
  // new" resolved-but-never-clickable until the 30s test timeout. Retry the
  // open -> click -> dialog-appears sequence as a unit: only (re-)open the menu
  // when it is closed, so a flicker is simply re-opened rather than hung on.
  const addNewButton = page.getByRole('button', { name: 'Add new' }).nth(1);
  const createNewItem = page.getByRole('menuitem', { name: 'Create new' });
  const dialog = page.getByRole('dialog', {
    name: 'Create collaboration-tool template',
  });
  await expect(async () => {
    if (!(await createNewItem.isVisible().catch(() => false))) {
      await addNewButton.click({ timeout: 2000 });
    }
    await createNewItem.click({ timeout: 2000 });
    await expect(dialog).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });

  // Fill the form
  await fillCalloutTemplateForm(page, templateData);

  // Save the template
  const saveButton = dialog.getByRole('button', { name: 'Save' });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  // Verify dialog closes
  await expect(dialog).not.toBeVisible();

  // Verify template was created
  await verifyCalloutTemplate(page, templateData);

  // Poll framing: confirm the 4 Poll Settings flags persisted (round-tripped
  // through the Edit dialog - the only template-level place they're readable).
  // No-op for non-poll framing.
  await verifyPollSettings(page, templateData);

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

// =========================================================================================================================================
//   POLL FRAMING TESTS (Additional Content = Poll)
// =========================================================================================================================================
// Focus: every combination of the four poll-specific settings exposed in the
// in-form "Poll Settings" sub-dialog (button "Settings" inside the Poll editor).
//
// The four settings (booleans) under test:
//   • Multi-vote  → switch "Allow multiple responses"            (default OFF)
//   • AddOptions  → switch "Allow contributors to add options"   (default OFF)
//   • HideResults → switch "Hide results until user votes"       (default OFF)
//   • ShowVoters  → switch "Show voter avatars"                  (default ON)
//                   (ShowVoters=OFF == anonymous vote / no who-voted-what)
//
// Held constant (orthogonal coverage already lives in tests 1–40):
//   • Response Options = None
//   • Comments Enabled = Disabled
//
// The number of poll options varies per test (2 / 3 / 4 / 5 / 10) — covered for
// breadth, NOT a primary axis. Each test just creates the configured number
// of options with placeholder labels.
//
// 2^4 = 16 combinations → tests 42–57.
//
// | No  | # Opts | Multi-vote | AddOptions | HideResults | ShowVoters | Notes                                            |
// |-----|--------|------------|------------|-------------|------------|--------------------------------------------------|
// | 42  |   2    | OFF        | OFF        | OFF         | OFF        | minimal poll, anonymous                          |
// | 43  |   3    | OFF        | OFF        | OFF         | ON         | UI defaults (ShowVoters=ON)                      |
// | 44  |   3    | OFF        | OFF        | ON          | OFF        | hidden-until-vote + anonymous                    |
// | 45  |   4    | OFF        | OFF        | ON          | ON         | hidden-until-vote, voters visible                |
// | 46  |   3    | OFF        | ON         | OFF         | OFF        | crowdsourced options, anonymous                  |
// | 47  |   3    | OFF        | ON         | OFF         | ON         | crowdsourced options, voters visible             |
// | 48  |   4    | OFF        | ON         | ON          | OFF        | crowdsourced + hidden + anonymous                |
// | 49  |   3    | OFF        | ON         | ON          | ON         | crowdsourced + hidden, voters visible            |
// | 50  |   3    | ON         | OFF        | OFF         | OFF        | multi-vote, anonymous                            |
// | 51  |   2    | ON         | OFF        | OFF         | ON         | multi-vote, voters visible                       |
// | 52  |   4    | ON         | OFF        | ON          | OFF        | multi-vote + hidden + anonymous                  |
// | 53  |   3    | ON         | OFF        | ON          | ON         | multi-vote + hidden, voters visible              |
// | 54  |   5    | ON         | ON         | OFF         | OFF        | multi-vote + crowdsourced, anonymous             |
// | 55  |   3    | ON         | ON         | OFF         | ON         | multi-vote + crowdsourced, voters visible        |
// | 56  |  10    | ON         | ON         | ON          | OFF        | all-on, anonymous, max option count              |
// | 57  |   3    | ON         | ON         | ON          | ON         | all four settings ON                             |

test.describe.serial('Callout Templates', () => {
  test.beforeAll(async ({ browser }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    // Tearing down the scenario deletes the space plus all 68 templates this
    // suite created; on the slower test env that exceeds the default 30s hook
    // budget, so give it headroom.
    test.setTimeout(120_000);
    try {
      await teardownAuthentication();
    } finally {
      if (baseScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      }
    }
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

    await acceptCookiesIfVisible(page);
  });

  test('1 Framing: None, Response: None, Comments: Disabled', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '1',
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
      testNumber: '2',
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
      testNumber: '3',
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
      testNumber: '4',
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
      testNumber: '5',
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
      testNumber: '6',
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
      testNumber: '7',
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
      testNumber: '8',
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
      testNumber: '9',
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
      testNumber: '9b',
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
      testNumber: '9c',
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
      testNumber: '10',
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
      testNumber: '11',
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
      testNumber: '12',
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
      testNumber: '13',
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
      testNumber: '14',
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
      testNumber: '15',
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
      testNumber: '16',
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
      testNumber: '17',
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
      testNumber: '17b',
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
      testNumber: '17c',
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
      testNumber: '17d',
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
      testNumber: '17e',
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
      testNumber: '17f',
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
      testNumber: '18',
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
      testNumber: '19',
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
      testNumber: '20',
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
      testNumber: '21',
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
      testNumber: '22',
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
      testNumber: '23',
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
      testNumber: '24',
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
      testNumber: '25',
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
      testNumber: '25b',
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
      testNumber: '25c',
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
      testNumber: '26',
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
      testNumber: '27',
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
      testNumber: '28',
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
      testNumber: '29',
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
      testNumber: '30',
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
      testNumber: '31',
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
      testNumber: '32',
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
      testNumber: '33',
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
      testNumber: '33b',
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
      testNumber: '33c',
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
      testNumber: '34',
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
      testNumber: '35',
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
      testNumber: '36',
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
      testNumber: '37',
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
      testNumber: '38',
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
      testNumber: '39',
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
      testNumber: '40',
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
      testNumber: '41',
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

  // ============================================================
  //  POLL FRAMING TESTS (42–57)
  //  All combinations of the 4 in-form Poll Settings flags.
  //  Response = none, Comments = Disabled held constant.
  //  Option count varies (2/3/4/5/10) — secondary axis.
  // ============================================================

  test('42 Poll (2 opts), Multi:OFF, AddOpts:OFF, HideResults:OFF, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '42',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 2,
      pollMultiVote: false,
      pollAllowAddOptions: false,
      pollHideResults: false,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('43 Poll (3 opts), Multi:OFF, AddOpts:OFF, HideResults:OFF, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '43',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: false,
      pollAllowAddOptions: false,
      pollHideResults: false,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('44 Poll (3 opts), Multi:OFF, AddOpts:OFF, HideResults:ON, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '44',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: false,
      pollAllowAddOptions: false,
      pollHideResults: true,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('45 Poll (4 opts), Multi:OFF, AddOpts:OFF, HideResults:ON, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '45',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 4,
      pollMultiVote: false,
      pollAllowAddOptions: false,
      pollHideResults: true,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('46 Poll (3 opts), Multi:OFF, AddOpts:ON, HideResults:OFF, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '46',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: false,
      pollAllowAddOptions: true,
      pollHideResults: false,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('47 Poll (3 opts), Multi:OFF, AddOpts:ON, HideResults:OFF, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '47',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: false,
      pollAllowAddOptions: true,
      pollHideResults: false,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('48 Poll (4 opts), Multi:OFF, AddOpts:ON, HideResults:ON, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '48',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 4,
      pollMultiVote: false,
      pollAllowAddOptions: true,
      pollHideResults: true,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('49 Poll (3 opts), Multi:OFF, AddOpts:ON, HideResults:ON, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '49',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: false,
      pollAllowAddOptions: true,
      pollHideResults: true,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('50 Poll (3 opts), Multi:ON, AddOpts:OFF, HideResults:OFF, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '50',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: true,
      pollAllowAddOptions: false,
      pollHideResults: false,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('51 Poll (2 opts), Multi:ON, AddOpts:OFF, HideResults:OFF, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '51',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 2,
      pollMultiVote: true,
      pollAllowAddOptions: false,
      pollHideResults: false,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('52 Poll (4 opts), Multi:ON, AddOpts:OFF, HideResults:ON, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '52',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 4,
      pollMultiVote: true,
      pollAllowAddOptions: false,
      pollHideResults: true,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('53 Poll (3 opts), Multi:ON, AddOpts:OFF, HideResults:ON, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '53',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: true,
      pollAllowAddOptions: false,
      pollHideResults: true,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('54 Poll (5 opts), Multi:ON, AddOpts:ON, HideResults:OFF, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '54',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 5,
      pollMultiVote: true,
      pollAllowAddOptions: true,
      pollHideResults: false,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('55 Poll (3 opts), Multi:ON, AddOpts:ON, HideResults:OFF, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '55',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: true,
      pollAllowAddOptions: true,
      pollHideResults: false,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('56 Poll (10 opts), Multi:ON, AddOpts:ON, HideResults:ON, ShowVoters:OFF', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '56',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 10,
      pollMultiVote: true,
      pollAllowAddOptions: true,
      pollHideResults: true,
      pollShowVoters: false,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });

  test('57 Poll (3 opts), Multi:ON, AddOpts:ON, HideResults:ON, ShowVoters:ON', async ({
    page,
  }) => {
    const templateData = createCalloutTemplateData({
      testNumber: '57',
      framingType: 'poll',
      responseType: 'none',
      commentsEnabled: false,
      pollOptionCount: 3,
      pollMultiVote: true,
      pollAllowAddOptions: true,
      pollHideResults: true,
      pollShowVoters: true,
    });
    await createAndVerifyCalloutTemplate(page, templateData);
  });
});
