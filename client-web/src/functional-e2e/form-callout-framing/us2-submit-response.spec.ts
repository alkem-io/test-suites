import { randomUUID } from 'node:crypto';
import { expect, type Browser, type Page, test } from '@playwright/test';
import {
  assignRoleToUser,
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  createSpaceOnAccount,
  createSubspaceWithData,
  introspectSchemaFieldTypes,
  readCalloutFormResponses,
  readMyUser,
  RoleName,
  SpacePrivacyMode,
  submitCalloutFormResponse,
  updateCalloutForm,
  updateCalloutVisibility,
  type CalloutFormAnswerInput,
  type CreateCalloutFormQuestionInput,
  type CreateCalloutFormSettingsInput,
  type GraphqlActor,
  type GraphqlReturnWithError,
} from '@alkemio/tests-lib';
import { fillSecret } from '../helpers/login.helper';
import { must } from '../helpers/lib-actor.helper';
import fs from 'node:fs';
import path from 'node:path';

/**
 * workspace#080-form-callout-framing — User Story 2 (P1): Submit a response to a Form.
 *
 * AS1  a member opens the Form Post (feed item AND detail view): every question with
 *      the input for its type, required markers, the visibility notice naming the
 *      Subspace, Submit. Both copies carry unique element ids (a label click in the
 *      dialog changes the dialog's control, never the background copy).
 * AS2  empty / whitespace short answer, no radio, no checkbox: Submit is blocked with
 *      a marker per missing answer; the API answers FORM_ANSWER_REQUIRED.
 * AS3  the API rejects a 513-char short answer, an unknown option, two ids on a
 *      single-choice question and an unknown question id, naming question ids only.
 * AS4  valid answers are stored, attributed to the respondent, with confirmation.
 * AS5  SINGLE mode: own response replaces the form; Withdraw brings the form back and
 *      resubmit works.
 * AS6  MULTIPLE mode: a second, separate response is listed under "Your responses".
 * AS7  own responses always visible with Withdraw, under Admins-only and Members
 *      visibility; no edit affordance anywhere.
 * AS8  a non-member on a public Space sees the questions, no submit; API forbidden.
 * AS9  a closed Form is read-only ("Closed"), API FORM_CLOSED, withdraw still works;
 *      a DRAFT Post is rejected with CALLOUT_NOT_PUBLISHED.
 * AS10 an optional question left empty is accepted and shows "No answer given".
 * AS11 an audience widened while the member has the Form open: submit rejected
 *      (FORM_VISIBILITY_CHANGED), notice refreshed, draft kept, resubmit stored.
 * AS12 five parallel submits in SINGLE mode store exactly one response.
 * AS13 (R17/R18) the Form sits in its own box: the header (title, "N questions",
 *      notice, description) is always visible; the chevron collapses / expands the
 *      question cards and the Cancel / "Submit Form" footer; the initial state
 *      follows the default-collapsed setting.
 * AS14 (R19a) SINGLE after MULTIPLE: a member holding two responses sees both with
 *      Withdraw and no Submit until both are withdrawn; then one submit is stored.
 *
 * Self-contained: provisions its own Kratos identities (admin API), Space, Subspace
 * and Forms through the non-interactive GraphQL endpoint, then walks the real UI.
 *
 * Environment (defaults suit the local forge stack):
 *   ALKEMIO_BASE_URL        http://localhost:3000
 *   KRATOS_ADMIN_URL        Kratos ADMIN base incl. /admin, e.g. http://localhost:32841/admin
 *   ALKEMIO_ADMIN_EMAIL     admin@alkem.io
 *   ALKEMIO_ADMIN_PASSWORD  the platform admin's password
 *   EVIDENCE_DIR            optional folder to also write decisive screenshots to
 */

const BASE = (process.env.ALKEMIO_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const KRATOS_ADMIN = (process.env.KRATOS_ADMIN_URL || '').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ALKEMIO_ADMIN_EMAIL || 'admin@alkem.io';
const ADMIN_PASSWORD =
  process.env.ALKEMIO_ADMIN_PASSWORD ||
  process.env.AUTH_ADMIN_PASSWORD ||
  'password';
const EVIDENCE_DIR = process.env.EVIDENCE_DIR || '';
// Per-run secret for the throwaway identities this walk provisions (override with
// FORGE_PERSONA_PASSWORD); a fixed literal would leave them loginable after the run.
const USER_PASSWORD =
  process.env.FORGE_PERSONA_PASSWORD || `F080-${randomUUID()}-Aa1!`;

const RUN = Date.now().toString(36);
const email = (tag: string) => `us2-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'm2' | 'p';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  m2: email('m2'),
  p: email('p'),
};

const SUB_NAME = `US2 Sub ${RUN}`;
const NOTICE_ADMINS = `Only the admins of ${SUB_NAME} can see your response`;
const NOTICE_MEMBERS = `Members of ${SUB_NAME} can see your response`;

const tokens = new Map<string, string>();

async function mintToken(userEmail: string, password: string) {
  const cached = tokens.get(userEmail);
  if (cached) return cached;
  let token = '';
  // The endpoint is rate limited; retry with a bounded backoff instead of sleeping.
  await expect(async () => {
    const res = await fetch(`${BASE}/api/auth/non-interactive-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password }),
    });
    expect(res.status, `login ${userEmail}`).toBe(201);
    token = ((await res.json()) as { api_token: string }).api_token;
  }).toPass({ intervals: [1_000, 5_000, 15_000], timeout: 120_000 });
  tokens.set(userEmail, token);
  return token;
}

/** The lib actor for one of this run's identities: its bearer, minted once. */
async function actorFor(userEmail: string): Promise<GraphqlActor> {
  return {
    bearerToken: await mintToken(
      userEmail,
      userEmail === ADMIN_EMAIL ? ADMIN_PASSWORD : USER_PASSWORD
    ),
  };
}

type GqlError = {
  message?: string;
  extensions?: {
    code?: string;
    details?: { code?: string; questionIDs?: string[] };
  };
};

const firstError = (result: GraphqlReturnWithError<unknown>) =>
  (result.error?.errors as GqlError[] | undefined)?.[0];

const detailsCode = (result: GraphqlReturnWithError<unknown>) =>
  firstError(result)?.extensions?.details?.code ??
  firstError(result)?.extensions?.code;

async function createIdentity(userEmail: string, first: string, last: string) {
  const res = await fetch(`${KRATOS_ADMIN}/identities`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      schema_id: 'default',
      state: 'active',
      traits: { email: userEmail, accepted_terms: true, name: { first, last } },
      credentials: { password: { config: { password: USER_PASSWORD } } },
      verifiable_addresses: [
        { value: userEmail, verified: true, via: 'email', status: 'completed' },
      ],
    }),
  });
  expect(res.status, `kratos identity ${userEmail}`).toBe(201);
}

async function meId(userEmail: string) {
  const data = must(await readMyUser(await actorFor(userEmail)), 'me');
  return data.me.user!.id;
}

async function acceptCookies(page: Page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  await accept
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => accept.click())
    .catch(() => undefined);
}

async function signIn(
  browser: Browser,
  userEmail: string,
  password = USER_PASSWORD
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1500 },
  });
  const page = await context.newPage();
  await page.goto(BASE);
  const login = page.getByRole('link', { name: 'Log in', exact: true });
  await login.waitFor({ state: 'visible', timeout: 30_000 });
  await login.click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(userEmail);
  await fillSecret(page.getByRole('textbox', { name: 'Password' }), password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/, { timeout: 30_000 });
  const newDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (await newDesign.isVisible().catch(() => false)) {
    await newDesign.click();
  }
  return page;
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await acceptCookies(page);
}

async function shot(page: Page, name: string) {
  const body = await page.screenshot({ fullPage: false });
  await test.info().attach(name, { body, contentType: 'image/png' });
  if (EVIDENCE_DIR) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${name}.png`), body);
  }
}

type FormFixture = {
  calloutId: string;
  url: string;
  formId: string;
  title: string;
  q: Array<{
    id: string;
    prompt: string;
    options?: Array<{ id: string; label: string }> | null;
  }>;
};

const fx = {
  subUrl: '',
  subCalloutsSetId: '',
  spaceUrl: '',
  spaceCalloutsSetId: '',
  subRoleSetId: '',
  ids: {} as Record<Persona, string>,
};

const FOUR_QUESTIONS: CreateCalloutFormQuestionInput[] = [
  {
    prompt: 'What is your name?',
    explanation: 'Your full name',
    type: CalloutFormQuestionType.ShortText,
    required: true,
  },
  { prompt: 'Tell us more', type: CalloutFormQuestionType.LongText },
  {
    prompt: 'Pick one',
    type: CalloutFormQuestionType.SingleChoice,
    required: true,
    options: [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }],
  },
  {
    prompt: 'Pick several',
    type: CalloutFormQuestionType.MultipleChoice,
    required: true,
    options: [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }, { label: 'Four' }],
  },
];

async function createForm(
  owner: string,
  calloutsSetID: string,
  title: string,
  opts: {
    questions?: CreateCalloutFormQuestionInput[];
    settings?: CreateCalloutFormSettingsInput;
    publish?: boolean;
    /** The optional Form title / description (R17), separate from the Post. */
    formTitle?: string;
    formDescription?: string;
  } = {}
): Promise<FormFixture> {
  const actor = await actorFor(owner);
  const created = must(
    await createCalloutWithData(
      {
        calloutsSetID,
        framing: {
          type: CalloutFramingType.Form,
          profile: { displayName: title, description: 'Form callout framing' },
          form: {
            title: opts.formTitle,
            description: opts.formDescription,
            questions: opts.questions ?? FOUR_QUESTIONS,
            settings: opts.settings ?? {},
          },
        },
        settings: {
          visibility: CalloutVisibility.Draft,
          contribution: { enabled: false },
          framing: { commentsEnabled: false },
        },
      },
      actor
    ),
    `create form ${title}`
  ).createCalloutOnCalloutsSet;
  if (opts.publish !== false) {
    must(
      await updateCalloutVisibility(
        created.id,
        CalloutVisibility.Published,
        actor,
        false
      ),
      'publish'
    );
  }
  return {
    calloutId: created.id,
    url: created.framing.profile.url,
    formId: created.framing.form!.id,
    title,
    q: created.framing.form!.questions,
  };
}

const validAnswers = (f: FormFixture, name = 'Mia'): CalloutFormAnswerInput[] => [
  { questionID: f.q[0].id, text: name },
  { questionID: f.q[2].id, selectedOptionIDs: [f.q[2].options![0].id] },
  {
    questionID: f.q[3].id,
    selectedOptionIDs: [f.q[3].options![0].id, f.q[3].options![2].id],
  },
];

const submitApi = async (
  who: Persona,
  f: FormFixture,
  answers: CalloutFormAnswerInput[],
  ack: CalloutFormResponseVisibility = CalloutFormResponseVisibility.Admins
) =>
  submitCalloutFormResponse(
    { formID: f.formId, acknowledgedVisibility: ack, answers },
    await actorFor(personaEmail[who])
  );

const lookupAs = async (who: string, f: FormFixture) =>
  must(
    await readCalloutFormResponses(f.formId, await actorFor(who), 50),
    'lookup'
  ).lookup.calloutFormResponses;

const dialogOf = (page: Page) => page.getByRole('dialog');
const submitButton = (scope: ReturnType<typeof dialogOf> | Page) =>
  scope.getByRole('button', { name: /submit form/i });

/**
 * The Form box's expand/collapse chevron (R18): a button that carries
 * `aria-expanded` and `aria-controls` (the collapsible body) and is named
 * "expand"/"collapse". Matching both attributes keeps it apart from any other
 * expand control of the Post dialog.
 */
const formChevron = (scope: ReturnType<typeof dialogOf>) =>
  scope
    .getByRole('button', { name: /^(expand|collapse) form$/i })
    .and(scope.locator('button[aria-expanded][aria-controls]'));

async function fillValid(scope: ReturnType<typeof dialogOf>, name: string) {
  await scope.getByRole('textbox', { name: /What is your name/ }).fill(name);
  await scope.getByRole('radio', { name: 'Beta' }).click();
  await scope.getByRole('checkbox', { name: 'One', exact: true }).click();
  await scope.getByRole('checkbox', { name: 'Three', exact: true }).click();
}

let F: FormFixture; // main SINGLE form on the Subspace (AS1-AS6)

test.describe.configure({ mode: 'serial' });

test.describe(
  'US2 — submit a response to a Form',
  { tag: ['@forge-acceptance'] },
  () => {
    test.setTimeout(300_000);

    test.beforeAll(async () => {
      test.setTimeout(300_000);
      expect(
        KRATOS_ADMIN,
        'KRATOS_ADMIN_URL must point at the Kratos admin API (e.g. http://localhost:32841/admin)'
      ).not.toBe('');

      await createIdentity(personaEmail.a2, 'Ada', 'Admin');
      await createIdentity(personaEmail.m1, 'Mia', 'Memberone');
      await createIdentity(personaEmail.m2, 'Max', 'Membertwo');
      await createIdentity(personaEmail.p, 'Pia', 'Outsider');
      for (const p of ['a2', 'm1', 'm2', 'p'] as Persona[]) {
        fx.ids[p] = await meId(personaEmail[p]);
      }

      const admin = await actorFor(ADMIN_EMAIL);
      const me = must(await readMyUser(admin), 'admin account');
      const space = must(
        await createSpaceOnAccount(
          {
            accountID: me.me.user!.account!.id,
            nameID: `us2-space-${RUN}`,
            about: { profileData: { displayName: `US2 Space ${RUN}` } },
            collaborationData: { calloutsSetData: {} },
            settings: { privacy: { mode: SpacePrivacyMode.Public } },
          },
          admin
        ),
        'create space'
      ).createSpace;
      fx.spaceUrl = space.about.profile.url;
      fx.spaceCalloutsSetId = space.collaboration.calloutsSet.id;
      const sub = must(
        await createSubspaceWithData(
          {
            spaceID: space.id,
            nameID: `us2-sub-${RUN}`,
            about: { profileData: { displayName: SUB_NAME } },
            collaborationData: { calloutsSetData: {} },
            settings: {
              collaboration: {
                allowEventsFromSubspaces: true,
                allowGuestContributions: false,
                allowMembersToCreateCallouts: true,
                allowMembersToCreateSubspaces: false,
                allowMembersToVideoCall: false,
                inheritMembershipRights: true,
              },
            },
          },
          admin
        ),
        'create subspace'
      ).createSubspace;
      fx.subUrl = sub.about.profile.url;
      fx.subCalloutsSetId = sub.collaboration.calloutsSet.id;
      fx.subRoleSetId = sub.community.roleSet.id;

      const assign = async (roleSetID: string, p: Persona, role: RoleName) =>
        must(
          await assignRoleToUser(fx.ids[p], roleSetID, role, admin),
          `assign ${role} ${p}`
        );
      // a2 is an admin of the Subspace only; p is a member of nothing.
      for (const p of ['a2', 'm1', 'm2'] as Persona[]) {
        await assign(space.community.roleSet.id, p, RoleName.Member);
        await assign(sub.community.roleSet.id, p, RoleName.Member);
      }
      await assign(sub.community.roleSet.id, 'a2', RoleName.Admin);

      F = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Form ${RUN}`);
    });

    test('US2-AS1 questions, required markers, notice and Submit render in item and detail view with unique ids', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);

      // Detail view (the Post URL opens the detail dialog over the feed).
      await open(page, F.url);
      const dialog = dialogOf(page);
      await expect(
        dialog.getByRole('textbox', { name: /What is your name/ })
      ).toBeVisible();
      await expect(dialog.getByRole('textbox')).toHaveCount(2);
      await expect(
        dialog.getByRole('textbox', { name: /Tell us more/ })
      ).toBeVisible();
      await expect(dialog.getByRole('radio')).toHaveCount(3);
      await expect(dialog.getByRole('checkbox')).toHaveCount(4);
      for (const label of ['Alpha', 'Beta', 'Gamma', 'One', 'Two', 'Three', 'Four']) {
        await expect(dialog.getByText(label, { exact: true })).toBeVisible();
      }
      // Required markers: name, pick one, pick several — not "Tell us more".
      await expect(dialog.getByText('(required)')).toHaveCount(3);
      await expect(dialog.getByText(NOTICE_ADMINS)).toBeVisible();
      await expect(submitButton(dialog)).toHaveCount(1);

      // Unique ids: the dialog copy and the background feed copy share no id, and
      // radios/checkboxes have accessible names (previously fixed defect).
      const ids = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[id^="form-fill-"]')).map(e => e.id)
      );
      expect(ids.length).toBeGreaterThan(0);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dup, `duplicate ids: ${dup.join(',')}`).toEqual([]);
      // Label click in the dialog toggles the dialog's own control.
      await dialog.getByText('Beta', { exact: true }).click();
      await expect(dialog.getByRole('radio', { name: 'Beta' })).toBeChecked();
      await dialog.getByText('Two', { exact: true }).click();
      await expect(dialog.getByRole('checkbox', { name: 'Two' })).toBeChecked();
      await shot(page, 'US2-AS1-detail-view');
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();

      // Item view (feed).
      await open(page, fx.subUrl);
      await expect(
        page.getByRole('heading', { name: F.title, exact: true })
      ).toBeVisible();
      const textbox = page.getByRole('textbox', { name: /What is your name/ });
      await expect(textbox).toHaveCount(1);
      await expect(page.getByRole('radio', { name: 'Alpha' })).toHaveCount(1);
      await expect(page.getByRole('checkbox', { name: 'Four' })).toHaveCount(1);
      await expect(page.getByText(NOTICE_ADMINS)).toHaveCount(1);
      await expect(submitButton(page)).toHaveCount(1);
      await textbox.scrollIntoViewIfNeeded();
      await shot(page, 'US2-AS1-item-view');
      await page.context().close();
    });

    test('US2-AS2 required answers missing: UI blocks with a marker per answer; API FORM_ANSWER_REQUIRED', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);
      await open(page, F.url);
      const dialog = dialogOf(page);
      await submitButton(dialog).click();
      await expect(dialog.getByText('This question is required')).toHaveCount(3);
      await shot(page, 'US2-AS2-empty-blocked');
      // Whitespace-only short text is still "missing".
      await dialog.getByRole('textbox', { name: /What is your name/ }).fill('   ');
      await submitButton(dialog).click();
      await expect(dialog.getByText('This question is required')).toHaveCount(3);
      await shot(page, 'US2-AS2-whitespace-blocked');
      // Nothing was stored.
      expect((await lookupAs(personaEmail.m1, F)).mine).toHaveLength(0);
      await page.context().close();

      const good = validAnswers(F);
      const without = (i: number) => good.filter(a => a.questionID !== F.q[i].id);
      const cases: Array<[string, CalloutFormAnswerInput[], string]> = [
        ['empty short text', [{ questionID: F.q[0].id, text: '' }, ...without(0)], F.q[0].id],
        ['whitespace short text', [{ questionID: F.q[0].id, text: '   ' }, ...without(0)], F.q[0].id],
        ['no radio', without(2), F.q[2].id],
        ['no checkbox', without(3), F.q[3].id],
      ];
      for (const [label, answers, qid] of cases) {
        const res = await submitApi('m1', F, answers);
        expect(res.data?.submitCalloutFormResponse, label).toBeFalsy();
        expect(detailsCode(res), label).toBe('FORM_ANSWER_REQUIRED');
        expect(
          firstError(res)?.extensions?.details?.questionIDs,
          label
        ).toEqual([qid]);
      }
      expect((await lookupAs(personaEmail.m1, F)).mine).toHaveLength(0);
    });

    test('US2-AS3 API rejections carry reason codes and question ids, never the text', async () => {
      const MARK = 'SECRET-MARKER-';
      const good = validAnswers(F);
      const other = (i: number) => good.filter(a => a.questionID !== F.q[i].id);
      const ghost = '00000000-0000-4000-8000-000000000001';
      const cases: Array<[string, CalloutFormAnswerInput[], string, string]> = [
        [
          '513-char short text',
          [{ questionID: F.q[0].id, text: MARK + 'x'.repeat(513 - MARK.length) }, ...other(0)],
          'FORM_ANSWER_TOO_LONG',
          F.q[0].id,
        ],
        [
          'unknown option id',
          [{ questionID: F.q[2].id, selectedOptionIDs: [ghost] }, ...other(2)],
          'FORM_ANSWER_INVALID_OPTION',
          F.q[2].id,
        ],
        [
          'two ids on single choice',
          [
            {
              questionID: F.q[2].id,
              selectedOptionIDs: [F.q[2].options![0].id, F.q[2].options![1].id],
            },
            ...other(2),
          ],
          'FORM_ANSWER_SELECTION_COUNT',
          F.q[2].id,
        ],
        [
          'unknown question id',
          [{ questionID: ghost, text: MARK + 'ghost' }, ...good],
          'FORM_ANSWER_UNKNOWN_QUESTION',
          ghost,
        ],
      ];
      for (const [label, answers, code, qid] of cases) {
        const res = await submitApi('m1', F, answers);
        expect(res.data?.submitCalloutFormResponse, label).toBeFalsy();
        expect(detailsCode(res), label).toBe(code);
        expect(
          firstError(res)?.extensions?.details?.questionIDs,
          label
        ).toEqual([qid]);
        expect(JSON.stringify(res), `${label} must not echo the answer`).not.toContain(MARK);
      }
      expect((await lookupAs(personaEmail.m1, F)).mine).toHaveLength(0);
    });

    test('US2-AS4 valid answers are stored, attributed to the respondent, with confirmation', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);
      await open(page, F.url);
      const dialog = dialogOf(page);
      await fillValid(dialog, 'Mia Memberone');
      await shot(page, 'US2-AS4-before-submit');
      await submitButton(dialog).click();
      await expect(
        page.getByText('Your response was submitted.').first()
      ).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await shot(page, 'US2-AS4-after-submit');
      await page.context().close();

      const mine = (await lookupAs(personaEmail.m1, F)).mine;
      expect(mine).toHaveLength(1);
      expect(mine[0].createdBy?.id).toBe(fx.ids.m1);
      const all = await lookupAs(ADMIN_EMAIL, F);
      expect(all.all.total).toBe(1);
      expect(all.all.responses[0].createdBy?.id).toBe(fx.ids.m1);
    });

    test('US2-AS5 SINGLE mode: own response replaces the form; withdraw brings it back; resubmit works', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);
      await open(page, F.url);
      const dialog = dialogOf(page);
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await expect(dialog.getByText('Mia Memberone')).toBeVisible();
      await expect(dialog.getByRole('textbox')).toHaveCount(0);
      await expect(submitButton(dialog)).toHaveCount(0);
      await shot(page, 'US2-AS5-reopen-own-response');
      await page.keyboard.press('Escape');
      await open(page, fx.subUrl);
      await expect(page.getByRole('heading', { name: 'Your responses' })).toHaveCount(1);
      await shot(page, 'US2-AS5-item-own-response');

      await open(page, F.url);
      await dialog.getByRole('button', { name: 'Withdraw' }).click();
      await shot(page, 'US2-AS5-withdraw-confirm');
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Withdraw' })
        .click();
      await expect(
        dialog.getByRole('textbox', { name: /What is your name/ })
      ).toBeVisible();
      await expect(submitButton(dialog)).toBeVisible();
      await shot(page, 'US2-AS5-form-returns');
      expect((await lookupAs(personaEmail.m1, F)).mine).toHaveLength(0);

      await fillValid(dialog, 'Mia Again');
      await submitButton(dialog).click();
      await expect(dialog.getByText('Mia Again')).toBeVisible();
      await shot(page, 'US2-AS5-resubmit-works');
      expect((await lookupAs(personaEmail.m1, F)).mine).toHaveLength(1);
      await page.context().close();
    });

    test('US2-AS6 MULTIPLE mode: a second, separate response is stored and listed', async ({
      browser,
    }) => {
      must(
        await updateCalloutForm(
          {
            formID: F.formId,
            settings: { responseMode: CalloutFormResponseMode.Multiple },
          },
          await actorFor(personaEmail.a2)
        ),
        'switch to MULTIPLE'
      );
      const page = await signIn(browser, personaEmail.m1);
      await open(page, F.url);
      const dialog = dialogOf(page);
      // The form is offered again even though a response exists.
      await expect(
        dialog.getByRole('textbox', { name: /What is your name/ })
      ).toBeVisible();
      await expect(dialog.getByText('Response 1')).toBeVisible();
      await fillValid(dialog, 'Mia Second');
      await submitButton(dialog).click();
      await expect(dialog.getByText('Response 2')).toBeVisible();
      await expect(dialog.getByText('Mia Second')).toBeVisible();
      await expect(dialog.getByText('Mia Again')).toBeVisible();
      await shot(page, 'US2-AS6-second-response-listed');
      await page.context().close();
      const mine = (await lookupAs(personaEmail.m1, F)).mine;
      expect(mine).toHaveLength(2);
      expect(new Set(mine.map(r => r.id)).size).toBe(2);
    });

    test('US2-AS7 own responses are always visible with Withdraw and never editable (Admins-only and Members)', async ({
      browser,
    }) => {
      const members = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Members ${RUN}`, {
        settings: { visibility: CalloutFormResponseVisibility.Members },
      });
      must(
        await submitApi(
          'm1',
          members,
          validAnswers(members, 'Members Mia'),
          CalloutFormResponseVisibility.Members
        ),
        'seed members response'
      );
      const page = await signIn(browser, personaEmail.m1);
      for (const [form, seedText, name] of [
        [F, 'Mia Second', 'admins'],
        [members, 'Members Mia', 'members'],
      ] as const) {
        await open(page, form.url);
        const dialog = dialogOf(page);
        await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
        await expect(dialog.getByText(seedText)).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Withdraw' }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /^edit/i })).toHaveCount(0);
        await expect(page.getByRole('menuitem', { name: /edit/i })).toHaveCount(0);
        await shot(page, `US2-AS7-own-responses-${name}`);
        await page.keyboard.press('Escape');
      }
      // The API offers no way to change a stored response.
      const schema = await introspectSchemaFieldTypes(
        await actorFor(personaEmail.m1)
      );
      expect(schema.body.errors, 'schema').toBeUndefined();
      const mutation = schema.body.data!.__schema.types.find(
        t => t.name === 'Mutation'
      )!;
      expect(
        mutation.fields!.map(f => f.name).filter(n => /CalloutFormResponse/.test(n)).sort()
      ).toEqual(['deleteCalloutFormResponse', 'submitCalloutFormResponse']);
      await page.context().close();
    });

    test('US2-AS8 a non-member sees the questions but cannot submit; API is forbidden', async ({
      browser,
    }) => {
      const spaceForm = await createForm(ADMIN_EMAIL, fx.spaceCalloutsSetId, `US2 Space Form ${RUN}`);
      const page = await signIn(browser, personaEmail.p);
      await open(page, spaceForm.url);
      const dialog = dialogOf(page);
      await expect(dialog.getByText('What is your name?')).toBeVisible();
      await expect(dialog.getByText('Pick one')).toBeVisible();
      await expect(submitButton(dialog)).toHaveCount(0);
      for (const box of await dialog.getByRole('textbox').all()) {
        await expect(box).toHaveAttribute('readonly', '');
      }
      for (const radio of await dialog.getByRole('radio').all()) {
        await expect(radio).toBeDisabled();
      }
      for (const check of await dialog.getByRole('checkbox').all()) {
        await expect(check).toBeDisabled();
      }
      await expect(
        dialog.getByText('You do not have permission to respond to this form.')
      ).toBeVisible();
      await shot(page, 'US2-AS8-non-member-detail');
      await page.keyboard.press('Escape');
      await open(page, fx.spaceUrl);
      await expect(page.getByRole('heading', { name: spaceForm.title, exact: true })).toBeVisible();
      await expect(submitButton(page)).toHaveCount(0);
      await shot(page, 'US2-AS8-non-member-item');
      await page.context().close();

      const res = await submitApi('p', spaceForm, validAnswers(spaceForm));
      expect(res.data?.submitCalloutFormResponse).toBeFalsy();
      expect(firstError(res)?.extensions?.code).toBe('FORBIDDEN_POLICY');
    });

    test('US2-AS9 a closed Form is read-only, the API rejects, withdraw still works; a draft Post is rejected', async ({
      browser,
    }) => {
      // (a) closed, no response yet: read-only with the Closed state.
      const fresh = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Closed ${RUN}`);
      must(
        await updateCalloutForm(
          { formID: fresh.formId, settings: { state: CalloutFormState.Closed } },
          await actorFor(personaEmail.a2)
        ),
        'close fresh'
      );
      const page = await signIn(browser, personaEmail.m1);
      await open(page, fresh.url);
      const freshDialog = dialogOf(page);
      await expect(freshDialog.getByText('Closed', { exact: true })).toBeVisible();
      await expect(
        freshDialog.getByText('This form is closed and no longer accepts responses.')
      ).toBeVisible();
      await expect(submitButton(freshDialog)).toHaveCount(0);
      await shot(page, 'US2-AS9-closed-read-only');
      const freshRes = await submitApi('m1', fresh, validAnswers(fresh));
      expect(freshRes.data?.submitCalloutFormResponse).toBeFalsy();
      expect(detailsCode(freshRes)).toBe('FORM_CLOSED');

      // (b) closed with an existing response (default SINGLE mode): the member
      // still sees that the Form is closed, and withdraw still works.
      const closable = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Closable ${RUN}`);
      must(await submitApi('m1', closable, validAnswers(closable, 'Before close')), 'seed');
      must(
        await updateCalloutForm(
          { formID: closable.formId, settings: { state: CalloutFormState.Closed } },
          await actorFor(personaEmail.a2)
        ),
        'close'
      );
      await open(page, closable.url);
      const dialog = dialogOf(page);
      await expect(dialog.getByText('Before close')).toBeVisible();
      await shot(page, 'US2-AS9-closed-with-own-response');
      await expect
        .soft(
          dialog.getByText('Closed', { exact: true }),
          'a closed Form shows its Closed state even when the member has a response'
        )
        .toBeVisible();
      const closedRes = await submitApi('m1', closable, validAnswers(closable));
      expect(closedRes.data?.submitCalloutFormResponse).toBeFalsy();
      expect(detailsCode(closedRes)).toBe('FORM_CLOSED');
      // Withdraw still works while closed.
      await dialog.getByRole('button', { name: 'Withdraw' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw' }).click();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toHaveCount(0);
      await expect(dialog.getByText('Closed', { exact: true })).toBeVisible();
      await shot(page, 'US2-AS9-withdraw-while-closed');
      expect((await lookupAs(personaEmail.m1, closable)).mine).toHaveLength(0);
      await page.context().close();

      // A DRAFT Post: the admin sees the unpublished state; the API rejects.
      const draft = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Draft ${RUN}`, {
        publish: false,
      });
      const a2 = await signIn(browser, personaEmail.a2);
      await open(a2, draft.url);
      const a2dialog = dialogOf(a2);
      await expect(a2dialog.getByText('Not published', { exact: true })).toBeVisible();
      await expect(submitButton(a2dialog)).toHaveCount(0);
      await shot(a2, 'US2-AS9-draft-unpublished');
      await a2.context().close();
      const draftRes = await submitApi('m1', draft, validAnswers(draft));
      expect(draftRes.data?.submitCalloutFormResponse).toBeFalsy();
      expect(detailsCode(draftRes)).toBe('CALLOUT_NOT_PUBLISHED');
    });

    test('US2-AS10 an optional question left empty is accepted and shows "No answer given"', async ({
      browser,
    }) => {
      const f = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Optional ${RUN}`);
      const page = await signIn(browser, personaEmail.m1);
      await open(page, f.url);
      const dialog = dialogOf(page);
      await fillValid(dialog, 'Only required');
      await submitButton(dialog).click();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await expect(dialog.getByText('Only required')).toBeVisible();
      await expect(dialog.getByText('No answer given')).toHaveCount(1);
      await shot(page, 'US2-AS10-optional-no-answer-given');
      await page.context().close();
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(1);
    });

    test('US2-AS11 widened audience while the form is open: rejected, notice refreshed, draft kept, resubmit stored', async ({
      browser,
    }) => {
      const f = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Race ${RUN}`);
      const page = await signIn(browser, personaEmail.m1);
      await open(page, f.url);
      const dialog = dialogOf(page);
      await expect(dialog.getByText(NOTICE_ADMINS)).toBeVisible();
      await fillValid(dialog, 'Race Mia');
      // A2 widens the audience at zero responses.
      must(
        await updateCalloutForm(
          {
            formID: f.formId,
            settings: { visibility: CalloutFormResponseVisibility.Members },
          },
          await actorFor(personaEmail.a2)
        ),
        'widen'
      );
      await submitButton(dialog).click();
      await expect(dialog.getByText(NOTICE_MEMBERS)).toBeVisible();
      await expect(
        page
          .getByText('Who can see responses changed — please review and submit again.')
          .first()
      ).toBeVisible();
      // Draft kept.
      await expect(dialog.getByRole('textbox', { name: /What is your name/ })).toHaveValue('Race Mia');
      await expect(dialog.getByRole('radio', { name: 'Beta' })).toBeChecked();
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(0);
      await shot(page, 'US2-AS11-rejected-notice-refreshed');
      await submitButton(dialog).click();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await shot(page, 'US2-AS11-resubmit-stored');
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(1);
      await page.context().close();

      // API flavour: stale acknowledgement rejected, fresh one stored.
      const g = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Race API ${RUN}`);
      must(
        await updateCalloutForm(
          {
            formID: g.formId,
            settings: { visibility: CalloutFormResponseVisibility.Members },
          },
          await actorFor(personaEmail.a2)
        ),
        'widen g'
      );
      const stale = await submitApi(
        'm1',
        g,
        validAnswers(g),
        CalloutFormResponseVisibility.Admins
      );
      expect(detailsCode(stale)).toBe('FORM_VISIBILITY_CHANGED');
      must(
        await submitApi(
          'm1',
          g,
          validAnswers(g),
          CalloutFormResponseVisibility.Members
        ),
        'fresh ack stored'
      );
    });

    test('US2-AS12 five parallel submits in SINGLE mode store exactly one response', async () => {
      const f = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Parallel ${RUN}`);
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map(() => submitApi('m1', f, validAnswers(f)))
      );
      const stored = results.filter(r => r.data?.submitCalloutFormResponse);
      const rejected = results.filter(r => !r.data?.submitCalloutFormResponse);
      expect(stored).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      for (const r of rejected) {
        expect(detailsCode(r)).toBe('FORM_RESPONSE_ALREADY_EXISTS');
      }
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(1);
      expect((await lookupAs(ADMIN_EMAIL, f)).all.total).toBe(1);
    });

    test('US2-AS13 the Form box: header always visible, chevron collapses the questions and footer, initial state from the setting', async ({
      browser,
    }) => {
      const formTitle = `US2 Box ${RUN}`;
      const formDescription = `Tell us how you will take part ${RUN}`;
      const f = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Box Post ${RUN}`, {
        formTitle,
        formDescription,
        questions: [
          {
            prompt: 'What is your name?',
            type: CalloutFormQuestionType.ShortText,
            required: true,
          },
          { prompt: 'Tell us more', type: CalloutFormQuestionType.LongText },
          {
            prompt: 'Pick one',
            type: CalloutFormQuestionType.SingleChoice,
            options: [{ label: 'Alpha' }, { label: 'Beta' }],
          },
        ],
      });

      const page = await signIn(browser, personaEmail.m1);
      await open(page, f.url);
      const dialog = dialogOf(page);
      const chevron = formChevron(dialog);
      const header = async () => {
        // The Form box is a region named by its heading (the Form title).
        await expect(
          dialog
            .getByRole('region', { name: formTitle })
            .getByRole('heading', { name: formTitle, exact: true })
        ).toBeVisible();
        await expect(dialog.getByText('3 questions', { exact: true })).toBeVisible();
        await expect(dialog.getByText(NOTICE_ADMINS)).toBeVisible();
        await expect(dialog.getByText(formDescription)).toBeVisible();
      };
      const body = async (visible: boolean) => {
        const state = visible ? 'toBeVisible' : 'toBeHidden';
        await expect(dialog.getByRole('textbox', { name: /What is your name/ }))[state]();
        await expect(dialog.getByRole('radio', { name: 'Beta' }))[state]();
        await expect(submitButton(dialog))[state]();
        await expect(dialog.getByRole('button', { name: /^cancel$/i }))[state]();
      };

      // Default (expanded): header + questions + Cancel / Submit Form.
      await expect(chevron).toHaveAttribute('aria-expanded', 'true');
      await header();
      await body(true);
      await shot(page, 'US2-AS13-expanded');

      await chevron.click();
      await expect(chevron).toHaveAttribute('aria-expanded', 'false');
      await header();
      await body(false);
      await shot(page, 'US2-AS13-collapsed');

      await chevron.click();
      await expect(chevron).toHaveAttribute('aria-expanded', 'true');
      await body(true);

      // "Collapsed by default" on: the Form first shows its header only.
      must(
        await updateCalloutForm(
          { formID: f.formId, settings: { defaultCollapsed: true } },
          await actorFor(personaEmail.a2)
        ),
        'collapse by default'
      );
      await open(page, f.url);
      await expect(chevron).toHaveAttribute('aria-expanded', 'false');
      await header();
      await body(false);
      await shot(page, 'US2-AS13-default-collapsed');
      await chevron.click();
      await body(true);
      await page.context().close();
    });

    test('US2-AS14 SINGLE after MULTIPLE: both own responses listed with Withdraw, no Submit until both are withdrawn', async ({
      browser,
    }) => {
      const f = await createForm(personaEmail.a2, fx.subCalloutsSetId, `US2 Mode Switch ${RUN}`, {
        settings: { responseMode: CalloutFormResponseMode.Multiple },
      });
      must(await submitApi('m1', f, validAnswers(f, 'Mode First')), 'first response');
      must(await submitApi('m1', f, validAnswers(f, 'Mode Second')), 'second response');
      // R19a: the switch is allowed although M1 holds two responses.
      must(
        await updateCalloutForm(
          {
            formID: f.formId,
            settings: { responseMode: CalloutFormResponseMode.Single },
          },
          await actorFor(personaEmail.a2)
        ),
        'switch to SINGLE'
      );
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(2);

      const page = await signIn(browser, personaEmail.m1);
      await open(page, f.url);
      const dialog = dialogOf(page);
      const withdrawButtons = dialog.getByRole('button', { name: 'Withdraw' });
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await expect(dialog.getByText('Mode First')).toBeVisible();
      await expect(dialog.getByText('Mode Second')).toBeVisible();
      await expect(withdrawButtons).toHaveCount(2);
      await expect(submitButton(dialog)).toHaveCount(0);
      await shot(page, 'US2-AS14-two-own-responses-single');

      // One withdrawn: still no Submit.
      await withdrawButtons.first().click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw' }).click();
      await expect(withdrawButtons).toHaveCount(1);
      await expect(submitButton(dialog)).toHaveCount(0);
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(1);

      // Both withdrawn: the fill-in returns and one submission is stored.
      await withdrawButtons.first().click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw' }).click();
      await expect(dialog.getByRole('textbox', { name: /What is your name/ })).toBeVisible();
      await expect(submitButton(dialog)).toBeVisible();
      await fillValid(dialog, 'Mode Third');
      await submitButton(dialog).click();
      await expect(dialog.getByText('Mode Third')).toBeVisible();
      await expect(submitButton(dialog)).toHaveCount(0);
      await shot(page, 'US2-AS14-single-after-withdrawals');
      await page.context().close();
      expect((await lookupAs(personaEmail.m1, f)).mine).toHaveLength(1);
    });
  }
);
