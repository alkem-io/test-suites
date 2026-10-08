// spec: agents-hq specs/080-form-callout-framing/spec.md — ruling R25 (server#6435),
// US5-AS1/AS2/AS5, FR-025/FR-026/FR-027.
//
// Save a Poll Post and a Form Post as callout templates from the Post's "…"
// menu, check the template library preview, then start a NEW Post from each
// template: the create dialog arrives with the poll options / Form questions
// prefilled and editable, and the published Post is live (a vote / a response
// is accepted).

import { expect, Locator, Page } from '@playwright/test';
import {
  getGraphqlClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFramingType,
  CalloutVisibility,
  CreateCalloutOnCalloutsSetInput,
  PollStatus,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  graphqlErrorWrapper,
  GraphQLReturnType,
} from '@alkemio/tests-lib/utils/graphql.wrapper';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { acceptCookiesIfVisible } from '@src/functional-e2e/helpers/cookies.helper';
import { randomBytes } from 'crypto';
import { fillTemplateForm } from './forms/template-form';
import {
  formQuestionCard,
  formQuestionField,
  formQuestionOptions,
} from './forms/callout/callout-template-framing';
import { verifyFormTemplatePreview } from './verify/callout-template-verify';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'poll-form-save-as-template.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'r25-save-as-template',
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

let baseScenario: OrganizationWithSpaceModel;

const hexId = randomBytes(3).toString('hex');

const POLL = {
  postTitle: `R25 Poll Post ${hexId}`,
  question: `Which day suits you ${hexId}?`,
  options: [`Monday ${hexId}`, `Wednesday ${hexId}`, `Friday ${hexId}`],
};

const FORM = {
  postTitle: `R25 Form Post ${hexId}`,
  title: `R25 intake ${hexId}`,
  description: `Tell us about your idea ${hexId}`,
  questions: [
    {
      prompt: `Your name ${hexId}`,
      type: 'Short text' as const,
      apiType: CalloutFormQuestionType.ShortText,
      required: true,
      options: [] as string[],
    },
    {
      prompt: `Pick a track ${hexId}`,
      type: 'Single choice' as const,
      apiType: CalloutFormQuestionType.SingleChoice,
      required: false,
      options: [`Track A ${hexId}`, `Track B ${hexId}`],
    },
  ],
  // Non-default, so a Post started from the template must carry them (R25f).
  // Expanded (the default) and OPEN, so the walk can answer the new Form.
  settings: {
    visibility: CalloutFormResponseVisibility.Members,
    responseMode: CalloutFormResponseMode.Multiple,
  },
};

// ---------------------------------------------------------------------------
// API fixtures (the Posts being saved are set up, the walk is the subject)
// ---------------------------------------------------------------------------

const asAdmin = <TData>(
  call: (headers: { authorization: string }) => GraphQLReturnType<TData>
) =>
  graphqlErrorWrapper<TData>(
    (authToken: string | undefined) =>
      call({ authorization: `Bearer ${authToken}` }),
    TestUser.GLOBAL_ADMIN
  );

const calloutBase = (
  displayName: string
): Pick<CreateCalloutOnCalloutsSetInput, 'calloutsSetID' | 'settings'> & {
  profile: { displayName: string; description: string };
} => ({
  calloutsSetID: baseScenario.space.collaboration.calloutsSetId,
  profile: { displayName, description: `R25 source Post ${hexId}` },
  settings: {
    visibility: CalloutVisibility.Draft,
    contribution: { enabled: false },
    framing: { commentsEnabled: false },
  },
});

const publish = async (calloutID: string) => {
  const result = await asAdmin(headers =>
    getGraphqlClient().UpdateCalloutVisibility(
      {
        calloutData: {
          calloutID,
          visibility: CalloutVisibility.Published,
          sendNotification: false,
        },
      },
      headers
    )
  );
  expect(result.error, `publish ${calloutID}`).toBeUndefined();
};

const createSourcePollPost = async (): Promise<string> => {
  const { calloutsSetID, settings, profile } = calloutBase(POLL.postTitle);
  const created = await asAdmin(headers =>
    getGraphqlClient().createPollCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          settings,
          framing: {
            type: CalloutFramingType.Poll,
            profile,
            poll: { title: POLL.question, options: POLL.options },
          },
        },
      },
      headers
    )
  );
  const callout = created.data?.createCalloutOnCalloutsSet;
  expect(callout, JSON.stringify(created.error)).toBeDefined();
  await publish(callout!.id);
  return callout!.framing.profile.url;
};

const createSourceFormPost = async (): Promise<string> => {
  const { calloutsSetID, settings, profile } = calloutBase(FORM.postTitle);
  const created = await asAdmin(headers =>
    getGraphqlClient().createFormCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          settings,
          framing: {
            type: CalloutFramingType.Form,
            profile,
            form: {
              title: FORM.title,
              description: FORM.description,
              questions: FORM.questions.map(question => ({
                prompt: question.prompt,
                type: question.apiType,
                required: question.required,
                options: question.options.map(label => ({ label })),
              })),
              settings: FORM.settings,
            },
          },
        },
      },
      headers
    )
  );
  const callout = created.data?.createCalloutOnCalloutsSet;
  expect(callout, JSON.stringify(created.error)).toBeDefined();
  await publish(callout!.id);
  return callout!.framing.profile.url;
};

/** The space's callouts with their Poll / Form definitions, found by Post title. */
const findPost = async (displayName: string) => {
  const result = await asAdmin(headers =>
    getGraphqlClient().calloutsSetFramingDefinitions(
      { calloutsSetId: baseScenario.space.collaboration.calloutsSetId },
      headers
    )
  );
  const callout = result.data?.lookup.calloutsSet?.callouts.find(
    item => item.framing.profile.displayName === displayName
  );
  expect(callout, `Post "${displayName}"`).toBeDefined();
  return callout!;
};

// ---------------------------------------------------------------------------
// UI steps
// ---------------------------------------------------------------------------

const enableCrd = async (page: Page, url: string) => {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem('alkemio-crd-enabled', 'true');
  });
  await page.reload();
  await acceptCookiesIfVisible(page);
};

/**
 * Post detail -> "Settings" (the Post's "…" menu) -> "Save as Template" ->
 * the collaboration-tool template dialog, which must arrive with the Post's
 * framing filled in. Returns the dialog after the template is saved.
 */
const saveAsTemplate = async (
  page: Page,
  postUrl: string,
  templateName: string,
  expectFramingPrefilled: (dialog: Locator) => Promise<void>
) => {
  await enableCrd(page, postUrl);
  const detail = page.getByRole('dialog').first();
  await detail.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Save as Template' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Create collaboration-tool template',
  });
  await expect(dialog).toBeVisible();
  await expectFramingPrefilled(dialog);

  await fillTemplateForm(dialog, {
    displayName: templateName,
    description: `Saved from a Post ${hexId}`,
    tags: [],
  });
  const save = dialog.getByRole('button', { name: 'Save' });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog).not.toBeVisible();
};

/** Opens a template's library preview on the space's Templates settings page. */
const openTemplatePreview = async (page: Page, templateName: string) => {
  await enableCrd(
    page,
    `${baseUrl}/${baseScenario.space.nameId}/settings/templates`
  );
  await page
    .getByRole('button', { name: `Preview: ${templateName}`, exact: true })
    .click();
  const preview = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });
  await expect(preview).toBeVisible();
  return preview;
};

/**
 * "Add Post" -> "Find Template" -> "Use a template" -> "Use template". Returns
 * the Create Post dialog, now filled from the template.
 */
const startPostFromTemplate = async (page: Page, templateName: string) => {
  await enableCrd(page, `${baseUrl}/${baseScenario.space.nameId}?tab=4`);
  await page.getByRole('button', { name: 'Add Post' }).first().click();
  const createPostDialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Create Post' }) })
    .last();
  await expect(createPostDialog).toBeVisible();

  await createPostDialog.getByRole('button', { name: 'Find Template' }).click();
  const picker = page.getByRole('dialog', { name: 'Use a template' });
  await expect(picker).toBeVisible();
  await picker
    .getByRole('listitem')
    .filter({ hasText: templateName })
    .getByRole('button', { name: 'Use template', exact: true })
    .click();

  // The dialog is pristine, so the template applies at once: the "Replace
  // your current content?" confirmation is asked only of a dirty form.
  await expect(picker).not.toBeVisible();
  await expect(
    page.getByRole('alertdialog', { name: 'Replace your current content?' })
  ).toHaveCount(0);
  return createPostDialog;
};

/** Renames the new Post, publishes it, and returns its card in the feed. */
const publishPost = async (
  page: Page,
  createPostDialog: Locator,
  postTitle: string
) => {
  await createPostDialog
    // The Post title, not the Form builder's own "Title" field in the same dialog.
    .getByPlaceholder('Give your Post a title...')
    .fill(postTitle);
  await createPostDialog
    .getByRole('button', { name: 'Post', exact: true })
    .click();
  await createPostDialog.waitFor({ state: 'hidden' });

  const title = page
    .getByRole('region', { name: 'Space content feed' })
    .getByRole('heading', { name: postTitle, exact: true });
  await title.scrollIntoViewIfNeeded();
  await expect(title).toBeVisible();
  return title.locator('xpath=ancestor::*[2]');
};

// ---------------------------------------------------------------------------
// Walks
// ---------------------------------------------------------------------------

test.describe('R25 — Poll and Form Posts in the template library', () => {
  // The two walks are independent: same worker and one shared fixture, but a
  // failure in one does not skip the other.
  test.describe.configure({ mode: 'default' });
  test.setTimeout(240_000);

  let pollPostUrl = '';
  let formPostUrl = '';

  test.beforeAll(async ({ browser }) => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    pollPostUrl = await createSourcePollPost();
    formPostUrl = await createSourceFormPost();
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    try {
      await teardownAuthentication();
    } finally {
      if (baseScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      }
    }
  });

  test('US5-AS5 a Poll Post is saved as a template and a new Post started from it votes', async ({
    page,
  }) => {
    const templateName = `R25 Poll template ${hexId}`;
    const newPostTitle = `R25 Poll from template ${hexId}`;

    // Save as template: the dialog carries the poll question and options.
    await saveAsTemplate(page, pollPostUrl, templateName, async dialog => {
      await expect(
        dialog.getByRole('textbox', { name: 'Question' })
      ).toHaveValue(POLL.question);
      for (const [index, option] of POLL.options.entries()) {
        await expect(
          dialog.getByRole('textbox', {
            name: `Option ${index + 1}`,
            exact: true,
          })
        ).toHaveValue(option);
      }
    });

    // The library preview shows the question and the options.
    const preview = await openTemplatePreview(page, templateName);
    await expect(
      preview.getByText(`Question: ${POLL.question}`, { exact: true })
    ).toBeVisible();
    for (const option of POLL.options) {
      await expect(
        preview.getByRole('listitem').filter({ hasText: option })
      ).toBeVisible();
    }
    await preview.getByRole('button', { name: 'Close' }).click();

    // Start a new Post from it: question and options prefilled, and editable.
    const createPostDialog = await startPostFromTemplate(page, templateName);
    await expect(
      createPostDialog.getByRole('radio', { name: 'Poll', exact: true })
    ).toHaveAttribute('aria-checked', 'true');
    const question = createPostDialog.getByRole('textbox', {
      name: 'Question',
    });
    await expect(question).toHaveValue(POLL.question);
    for (const [index, option] of POLL.options.entries()) {
      await expect(
        createPostDialog.getByRole('textbox', {
          name: `Option ${index + 1}`,
          exact: true,
        })
      ).toHaveValue(option);
    }
    const editedQuestion = `${POLL.question} (edited)`;
    await question.fill(editedQuestion);

    const card = await publishPost(page, createPostDialog, newPostTitle);
    for (const option of POLL.options) {
      await expect(
        card.getByText(option, { exact: false }).first()
      ).toBeVisible();
    }

    // The new poll is live: it is OPEN with no votes, and takes a vote.
    const before = await findPost(newPostTitle);
    expect(before.framing.type).toBe(CalloutFramingType.Poll);
    expect(before.framing.poll?.title).toBe(editedQuestion);
    expect(
      [...(before.framing.poll?.options ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(option => option.text)
    ).toEqual(POLL.options);
    expect(before.framing.poll?.status).toBe(PollStatus.Open);
    expect(before.framing.poll?.totalVotes).toBe(0);

    await card.getByRole('radio').first().click();
    await expect(
      card.getByRole('button', { name: 'Remove my vote' })
    ).toBeVisible();
    await expect
      .poll(async () => (await findPost(newPostTitle)).framing.poll?.totalVotes)
      .toBe(1);
  });

  test('US5-AS1/AS2 a Form Post is saved as a template and a new Post started from it takes a response', async ({
    page,
  }) => {
    const templateName = `R25 Form template ${hexId}`;
    const newPostTitle = `R25 Form from template ${hexId}`;

    // Save as template: the dialog carries the Form title and questions.
    await saveAsTemplate(page, formPostUrl, templateName, async dialog => {
      await expect(
        dialog.getByRole('textbox', { name: 'Form title (optional)' })
      ).toHaveValue(FORM.title);
      for (const [index, q] of FORM.questions.entries()) {
        await expect(formQuestionField(dialog, index + 1)).toHaveValue(
          q.prompt
        );
      }
    });

    // The library preview lists the questions: numbered, typed, "Required".
    const preview = await openTemplatePreview(page, templateName);
    await verifyFormTemplatePreview(preview, FORM);
    await preview.getByRole('button', { name: 'Close' }).click();

    // Start a new Post from it: the builder is filled, and editable.
    const createPostDialog = await startPostFromTemplate(page, templateName);
    await expect(
      createPostDialog.getByRole('radio', { name: 'Form', exact: true })
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      createPostDialog.getByRole('textbox', { name: 'Form title (optional)' })
    ).toHaveValue(FORM.title);
    await expect(
      createPostDialog.getByRole('textbox', { name: 'Description (optional)' })
    ).toHaveValue(FORM.description);
    for (const [index, q] of FORM.questions.entries()) {
      await expect(formQuestionField(createPostDialog, index + 1)).toHaveValue(
        q.prompt
      );
      // Answer type, required flag and options come with the prompt (US5-AS1).
      const card = formQuestionCard(createPostDialog, index + 1);
      await expect(
        card.getByRole('combobox', { name: 'Answer type' })
      ).toContainText(q.type);
      await expect(card.getByRole('switch', { name: 'Required' })).toBeChecked({
        checked: q.required,
      });
      const options = formQuestionOptions(createPostDialog, index + 1);
      await expect(options).toHaveCount(q.options.length);
      for (const [optionIndex, option] of q.options.entries()) {
        await expect(options.nth(optionIndex)).toHaveValue(option);
      }
    }
    const editedPrompt = `${FORM.questions[0].prompt} (edited)`;
    await formQuestionField(createPostDialog, 1).fill(editedPrompt);

    const card = await publishPost(page, createPostDialog, newPostTitle);
    await expect(card.getByRole('button', { name: 'Submit Form' })).toHaveCount(
      1
    );

    // The new Form has the edited definition, fresh ids and no responses.
    const created = await findPost(newPostTitle);
    const form = created.framing.form;
    expect(created.framing.type).toBe(CalloutFramingType.Form);
    expect(form?.questions.map(q => q.prompt)).toEqual([
      editedPrompt,
      FORM.questions[1].prompt,
    ]);
    // The whole definition, as the template carried it (only the edited prompt
    // differs).
    expect({
      title: form?.title,
      description: form?.description,
      questions: form?.questions.map(q => ({
        prompt: q.prompt,
        type: q.type,
        required: q.required,
        options: (q.options ?? []).map(option => option.label),
      })),
      visibility: form?.settings.visibility,
      responseMode: form?.settings.responseMode,
    }).toEqual({
      title: FORM.title,
      description: FORM.description,
      questions: FORM.questions.map((q, index) => ({
        prompt: index === 0 ? editedPrompt : q.prompt,
        type: q.apiType,
        required: q.required,
        options: q.options,
      })),
      visibility: FORM.settings.visibility,
      responseMode: FORM.settings.responseMode,
    });
    const formId = form!.id;
    const responses = async () =>
      (
        await asAdmin(headers =>
          getGraphqlClient().calloutFormResponses({ formID: formId }, headers)
        )
      ).data?.lookup.calloutFormResponses.all.total;
    expect(await responses()).toBe(0);

    // It takes a response.
    await card
      .getByRole('textbox', {
        name: new RegExp(editedPrompt.replace(/[()]/g, '\\$&')),
      })
      .fill('Ada Admin');
    await card
      .getByRole('radio', { name: FORM.questions[1].options[0] })
      .click();
    await card.getByRole('button', { name: 'Submit Form' }).click();
    await expect(
      page.getByText('Your response was submitted.', { exact: true })
    ).toBeVisible();
    await expect.poll(responses).toBe(1);
  });
});
