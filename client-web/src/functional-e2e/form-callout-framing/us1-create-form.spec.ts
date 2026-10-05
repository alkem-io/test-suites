import { randomUUID } from 'node:crypto';
import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  test,
} from '@playwright/test';
import { fillSecret } from '../helpers/login.helper';

/**
 * workspace#080-form-callout-framing — User Story 1 (P1): Create a Post with a Form.
 *
 * AS1  a Subspace-only admin is offered the Form chip in the create-Post dialog.
 * AS2  a member who may create Posts gets no Form chip; the API refuses to create a
 *      Form (FORBIDDEN_POLICY) and to switch a Post to one (FORM_FRAMING_FIXED_KIND).
 * AS3  a VC knowledge base offers no Form chip and refuses a Form; converting a Space
 *      that holds a Form Post into a knowledge base is rejected before any callout
 *      moves (FORM_TRANSFER_NOT_ALLOWED, callout count unchanged).
 * AS4  the builder offers four answer types and a required switch that defaults off.
 * AS5  a choice question cannot be saved with an empty or duplicate option; the
 *      option count is held between 2 and 20 by the builder controls.
 * AS6  four valid questions publish; members see them in order with matching inputs
 *      (exactly one fill-in per Form Post, also with comments enabled).
 * AS7  zero questions cannot be saved (the last question cannot be removed, a blank
 *      prompt is blocked inline) and the API answers FORM_QUESTIONS_COUNT.
 * AS7a closing / reopening the Form in the settings dialogue reaches a member.
 * AS8  an admin edits a Form that has responses (rename, option label, add, remove,
 *      reorder); the answer-type select stays enabled and changing an answered
 *      question's type shows "Existing answers keep their original format" (R19c);
 *      existing responses stay readable.
 * AS9  in edit mode the Form chip is active and cannot be cleared; no other chip
 *      can be switched.
 * AS10 (R17) the box above question 1 holds the Form title and description; both
 *      save while responses exist and show in the Form box header; an empty title
 *      shows "Form".
 * AS11 (R20) each question is one row — drag handle, prompt labelled "Question N",
 *      answer type, required switch, delete — with the explanation below; the
 *      labels follow a reorder; the row wraps at 375px without horizontal scroll.
 * AS12 (R18) "collapsed by default" in the Form settings makes a member first see
 *      only the Form box header; turning it off makes the Form start expanded.
 * AS13 (R19c) changing an answered short-answer question to single choice shows the
 *      hint, saves, and View responses shows the old text answer and the new
 *      option answer in the same column.
 *
 * Self-contained: provisions its own Kratos identities (admin API), Space, Subspace,
 * Virtual Contributor and Forms through the non-interactive GraphQL endpoint, then
 * walks the real UI.
 *
 * Environment (defaults suit the local forge stack):
 *   ALKEMIO_BASE_URL        http://localhost:3000
 *   KRATOS_ADMIN_URL        Kratos ADMIN base incl. /admin, e.g. http://localhost:32841/admin
 *   ALKEMIO_ADMIN_EMAIL     admin@alkem.io
 *   ALKEMIO_ADMIN_PASSWORD  the platform admin's password
 *   ALKEMIO_ADMIN_TOKEN     (optional) a pre-minted admin bearer; skips the admin login
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
const GRAPHQL = `${BASE}/api/private/non-interactive/graphql`;
// Per-run secret for the throwaway identities this walk provisions (override with
// FORGE_PERSONA_PASSWORD); a fixed literal would leave them loginable after the run.
const USER_PASSWORD =
  process.env.FORGE_PERSONA_PASSWORD || `F080-${randomUUID()}-Aa1!`;

const RUN = Date.now().toString(36);
const email = (tag: string) => `us1-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'm2';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  m2: email('m2'),
};

const tokens = new Map<string, string>();
// Optional: reuse an already-minted admin bearer so a busy login-backoff (429) on the
// shared admin identifier cannot stall the run.
if (process.env.ALKEMIO_ADMIN_TOKEN) {
  tokens.set(ADMIN_EMAIL, process.env.ALKEMIO_ADMIN_TOKEN);
}

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

type GqlResult<T = any> = { data?: T; errors?: Array<any> };

async function gql<T = any>(
  userEmail: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GqlResult<T>> {
  const token = await mintToken(
    userEmail,
    userEmail === ADMIN_EMAIL ? ADMIN_PASSWORD : USER_PASSWORD
  );
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as GqlResult<T>;
}

async function must<T = any>(result: GqlResult<T>, what: string): Promise<T> {
  expect(
    result.errors,
    `${what}: ${JSON.stringify(result.errors)}`
  ).toBeUndefined();
  return result.data as T;
}

const detailsCode = (result: GqlResult) =>
  result.errors?.[0]?.extensions?.details?.code as string | undefined;

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
  const data = await must(await gql(userEmail, '{ me { user { id } } }'), 'me');
  return data.me.user.id as string;
}

async function acceptCookies(page: Page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  await accept
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => accept.click())
    .catch(() => undefined);
}

/** Contexts opened by `signIn`; closed after every test, pass or fail. */
const openContexts: BrowserContext[] = [];

async function signIn(
  browser: Browser,
  userEmail: string,
  password = USER_PASSWORD
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1300 },
  });
  openContexts.push(context);
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

const CREATE_FORM = `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
  createCalloutOnCalloutsSet(calloutData: $d) {
    id
    framing { type profile { url } form { id questions { id prompt } } }
  }
}`;

const fixture = {
  subUrl: '',
  subCalloutsSetId: '',
  userIds: {} as Record<Persona, string>,
};

// The Form the a2 persona builds through the UI (AS4-AS6).
const BUILT_TITLE = `US1 Intake ${RUN}`;
let builtUrl = '';
// A pre-provisioned Form used for AS7a (open/closed).
let closableUrl = '';
// A pre-provisioned Form with responses used for AS8/AS9.
let editable: {
  url: string;
  calloutId: string;
  formId: string;
  questionIds: string[];
};

// Pre-provisioned Forms for the R17-R20 cases (AS10, AS12, AS13).
let presentable: { url: string; calloutId: string };
let collapsible: { url: string; calloutId: string };
let typed: { url: string; calloutId: string; formId: string };

const TYPE_CHANGE_HINT = 'Existing answers keep their original format';

/** Opens the Post's edit dialog (detail view -> Settings -> Edit). */
async function openEdit(page: Page, url: string) {
  await open(page, url);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Settings' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByRole('button', { name: /add question/i }).waitFor();
  return dialog;
}

async function saveEdit(page: Page) {
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('button', { name: /^save$/i })).toBeHidden({
    timeout: 20_000,
  });
}

/**
 * The Form box's expand/collapse chevron (R18): a button named
 * "expand"/"collapse" that carries `aria-expanded` and `aria-controls`.
 */
const formChevron = (page: Page) =>
  page
    .getByRole('dialog')
    .getByRole('button', { name: /expand|collapse/i })
    .and(page.locator('button[aria-expanded][aria-controls]'));

/** The builder's prompt field of question `n` (R20: labelled "Question N"). */
const questionField = (scope: ReturnType<Page['getByRole']>, n: number) =>
  scope.getByRole('textbox', { name: `Question ${n}`, exact: true });

const visibleFormRadio = (page: Page) =>
  page.getByRole('dialog').getByRole('radio', { name: 'Form', exact: true });

test.describe.configure({ mode: 'serial' });

test.describe(
  'US1 — create a Post with a Form',
  { tag: ['@forge-acceptance'] },
  () => {
    test.setTimeout(300_000);

    test.afterEach(async () => {
      await Promise.all(openContexts.splice(0).map(context => context.close()));
    });

    test.beforeAll(async () => {
      expect(
        KRATOS_ADMIN,
        'KRATOS_ADMIN_URL must point at the Kratos admin API (e.g. http://localhost:32841/admin)'
      ).not.toBe('');

      await createIdentity(personaEmail.a2, 'Ada', 'Admin');
      await createIdentity(personaEmail.m1, 'Mia', 'Memberone');
      await createIdentity(personaEmail.m2, 'Max', 'Membertwo');
      for (const p of ['a2', 'm1', 'm2'] as Persona[]) {
        fixture.userIds[p] = await meId(personaEmail[p]);
      }

      const me = await must(
        await gql(ADMIN_EMAIL, '{ me { user { account { id } } } }'),
        'admin account'
      );
      const space = (
        await must(
          await gql(
            ADMIN_EMAIL,
            `mutation ($d: CreateSpaceOnAccountInput!) {
              createSpace(spaceData: $d) { id community { roleSet { id } } }
            }`,
            {
              d: {
                accountID: me.me.user.account.id,
                nameID: `us1-space-${RUN}`,
                about: { profileData: { displayName: `US1 Space ${RUN}` } },
                collaborationData: { calloutsSetData: {} },
                settings: { privacy: { mode: 'PUBLIC' } },
              },
            }
          ),
          'create space'
        )
      ).createSpace;
      const sub = (
        await must(
          await gql(
            ADMIN_EMAIL,
            `mutation ($d: CreateSubspaceInput!) {
              createSubspace(subspaceData: $d) {
                id
                about { profile { url } }
                community { roleSet { id } }
                collaboration { calloutsSet { id } }
              }
            }`,
            {
              d: {
                spaceID: space.id,
                nameID: `us1-sub-${RUN}`,
                about: { profileData: { displayName: `US1 Sub ${RUN}` } },
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
            }
          ),
          'create subspace'
        )
      ).createSubspace;
      fixture.subUrl = sub.about.profile.url;
      fixture.subCalloutsSetId = sub.collaboration.calloutsSet.id;

      const assign = async (roleSetID: string, p: Persona, role: string) =>
        must(
          await gql(
            ADMIN_EMAIL,
            'mutation ($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }',
            { d: { actorID: fixture.userIds[p], role, roleSetID } }
          ),
          `assign ${role} ${p}`
        );
      // a2 is an admin of the Subspace only: a plain member of the parent Space.
      for (const p of ['a2', 'm1', 'm2'] as Persona[]) {
        await assign(space.community.roleSet.id, p, 'MEMBER');
        await assign(sub.community.roleSet.id, p, 'MEMBER');
      }
      await assign(sub.community.roleSet.id, 'a2', 'ADMIN');

      const publish = async (calloutId: string) =>
        must(
          await gql(
            personaEmail.a2,
            `mutation ($d: UpdateCalloutVisibilityInput!) {
              updateCalloutVisibility(calloutData: $d) { id }
            }`,
            {
              d: {
                calloutID: calloutId,
                visibility: 'PUBLISHED',
                sendNotification: false,
              },
            }
          ),
          'publish'
        );
      const createForm = async (
        displayName: string,
        questions: Array<Record<string, unknown>>
      ) => {
        const created = (
          await must(
            await gql(personaEmail.a2, CREATE_FORM, {
              d: {
                calloutsSetID: fixture.subCalloutsSetId,
                framing: {
                  type: 'FORM',
                  profile: { displayName, description: 'US1 form' },
                  form: { questions },
                },
                settings: {
                  visibility: 'DRAFT',
                  contribution: { enabled: false },
                  framing: { commentsEnabled: true },
                },
              },
            }),
            `create form ${displayName}`
          )
        ).createCalloutOnCalloutsSet;
        await publish(created.id);
        return {
          calloutId: created.id as string,
        url: created.framing.profile.url as string,
          formId: created.framing.form.id as string,
          questions: created.framing.form.questions as Array<{
            id: string;
            prompt: string;
          }>,
        };
      };

      const closable = await createForm(`US1 Closable ${RUN}`, [
        { prompt: 'Closable question', type: 'SHORT_TEXT', required: true },
      ]);
      closableUrl = closable.url;

      const edit = await createForm(`US1 Editable ${RUN}`, [
        { prompt: 'Your name', type: 'SHORT_TEXT', required: true },
        { prompt: 'Tell us about yourself', type: 'LONG_TEXT' },
        {
          prompt: 'Preferred day',
          type: 'SINGLE_CHOICE',
          options: [{ label: 'Monday' }, { label: 'Tuesday' }],
        },
        {
          prompt: 'Dietary needs',
          type: 'MULTIPLE_CHOICE',
          options: [{ label: 'Vegan' }, { label: 'Halal' }],
        },
      ]);
      editable = {
        url: edit.url,
        calloutId: edit.calloutId,
        formId: edit.formId,
        questionIds: edit.questions.map(q => q.id),
      };
      // One member response so the definition edit runs against existing data.
      await must(
        await gql(
          personaEmail.m1,
          `mutation ($d: SubmitCalloutFormResponseInput!) {
            submitCalloutFormResponse(responseData: $d) { id }
          }`,
          {
            d: {
              formID: edit.formId,
              acknowledgedVisibility: 'ADMINS',
              answers: [
                { questionID: edit.questions[0].id, text: 'Mia Memberone' },
                { questionID: edit.questions[1].id, text: 'Removed later' },
              ],
            },
          }
        ),
        'seed response'
      );

      // AS10: a Form with a response, edited through the builder's header box.
      const pres = await createForm(`US1 Presentable ${RUN}`, [
        { prompt: 'Presentable question', type: 'SHORT_TEXT', required: true },
      ]);
      presentable = { url: pres.url, calloutId: pres.calloutId };
      await must(
        await gql(
          personaEmail.m1,
          `mutation ($d: SubmitCalloutFormResponseInput!) {
            submitCalloutFormResponse(responseData: $d) { id }
          }`,
          {
            d: {
              formID: pres.formId,
              acknowledgedVisibility: 'ADMINS',
              answers: [{ questionID: pres.questions[0].id, text: 'Present' }],
            },
          }
        ),
        'seed presentable response'
      );

      // AS12: a Form whose default-collapsed setting is toggled in the UI.
      const coll = await createForm(`US1 Collapsible ${RUN}`, [
        { prompt: 'Collapsible question', type: 'SHORT_TEXT', required: true },
      ]);
      collapsible = { url: coll.url, calloutId: coll.calloutId };

      // AS13: a short-answer question answered by M1, then changed to a choice.
      const typ = await createForm(`US1 Typed ${RUN}`, [
        { prompt: 'Your answer', type: 'SHORT_TEXT', required: true },
      ]);
      typed = { url: typ.url, calloutId: typ.calloutId, formId: typ.formId };
      await must(
        await gql(
          personaEmail.m1,
          `mutation ($d: SubmitCalloutFormResponseInput!) {
            submitCalloutFormResponse(responseData: $d) { id }
          }`,
          {
            d: {
              formID: typ.formId,
              acknowledgedVisibility: 'ADMINS',
              answers: [{ questionID: typ.questions[0].id, text: 'Mia text' }],
            },
          }
        ),
        'seed typed response'
      );
    });

    test('US1-AS1 a Subspace-only admin is offered the Form chip', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      await open(page, fixture.subUrl);
      await page.getByRole('button', { name: /add post/i }).first().click();
      await expect(visibleFormRadio(page)).toBeVisible();
      await expect(
        page.getByRole('dialog').getByRole('radio', { name: 'Poll', exact: true })
      ).toBeVisible();
    });

    test('US1-AS2 a member is not offered Form and the server refuses it', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);
      await open(page, fixture.subUrl);
      await page.getByRole('button', { name: /add post/i }).first().click();
      await expect(
        page.getByRole('dialog').getByRole('radio', { name: 'Poll', exact: true })
      ).toBeVisible();
      await expect(visibleFormRadio(page)).toHaveCount(0);

      const forbidden = await gql(personaEmail.m1, CREATE_FORM, {
        d: {
          calloutsSetID: fixture.subCalloutsSetId,
          framing: {
            type: 'FORM',
            profile: { displayName: 'member form' },
            form: { questions: [{ prompt: 'Q', type: 'SHORT_TEXT' }] },
          },
        },
      });
      expect(forbidden.errors?.[0]?.extensions?.code).toBe('FORBIDDEN_POLICY');

      const plain = await must(
        await gql(
          personaEmail.m1,
          `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
            createCalloutOnCalloutsSet(calloutData: $d) { id }
          }`,
          {
            d: {
              calloutsSetID: fixture.subCalloutsSetId,
              framing: { type: 'NONE', profile: { displayName: 'm1 plain' } },
              settings: { visibility: 'PUBLISHED' },
            },
          }
        ),
        'member plain post'
      );
      const switched = await gql(
        personaEmail.m1,
        `mutation ($d: UpdateCalloutEntityInput!) {
          updateCallout(calloutData: $d) { id }
        }`,
        { d: { ID: plain.createCalloutOnCalloutsSet.id, framing: { type: 'FORM' } } }
      );
      expect(detailsCode(switched)).toBe('FORM_FRAMING_FIXED_KIND');
    });

    test('US1-AS3 a knowledge base refuses Form and a Form Space cannot be converted', async ({
      browser,
    }) => {
      const account = (
        await must(
          await gql(ADMIN_EMAIL, '{ me { user { account { id } } } }'),
          'admin account'
        )
      ).me.user.account.id as string;
      const vc = (
        await must(
          await gql(
            ADMIN_EMAIL,
            `mutation ($d: CreateVirtualContributorOnAccountInput!) {
              createVirtualContributor(virtualContributorData: $d) {
                id
                profile { url }
                knowledgeBase { calloutsSet { id } }
              }
            }`,
            {
              d: {
                accountID: account,
                nameID: `us1-vc-${RUN}`,
                profileData: { displayName: `US1 VC ${RUN}` },
                aiPersona: { engine: 'GUIDANCE' },
                bodyOfKnowledgeType: 'ALKEMIO_KNOWLEDGE_BASE',
                knowledgeBaseData: {
                  profile: { displayName: `US1 KB ${RUN}` },
                  calloutsSetData: {},
                },
              },
            }
          ),
          'create VC with KB'
        )
      ).createVirtualContributor;

      const admin = await signIn(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
      await open(admin, `${vc.profile.url}/knowledge-base`);
      await admin.getByRole('button', { name: 'Add', exact: true }).first().click();
      await expect(
        admin.getByRole('dialog').getByRole('radio', { name: 'Posts', exact: true })
      ).toBeVisible();
      await expect(visibleFormRadio(admin)).toHaveCount(0);

      const refused = await gql(ADMIN_EMAIL, CREATE_FORM, {
        d: {
          calloutsSetID: vc.knowledgeBase.calloutsSet.id,
          framing: {
            type: 'FORM',
            profile: { displayName: 'kb form' },
            form: { questions: [{ prompt: 'Q', type: 'SHORT_TEXT' }] },
          },
        },
      });
      expect(refused.errors?.[0]?.message).toContain('COLLABORATION');

      // A Space that holds a Form Post cannot become a VC's knowledge base.
      const source = (
        await must(
          await gql(
            ADMIN_EMAIL,
            `mutation ($d: CreateSpaceOnAccountInput!) {
              createSpace(spaceData: $d) { id collaboration { calloutsSet { id } } }
            }`,
            {
              d: {
                accountID: account,
                nameID: `us1-src-${RUN}`,
                about: { profileData: { displayName: `US1 Source ${RUN}` } },
                collaborationData: { calloutsSetData: {} },
              },
            }
          ),
          'create source space'
        )
      ).createSpace;
      await must(
        await gql(ADMIN_EMAIL, CREATE_FORM, {
          d: {
            calloutsSetID: source.collaboration.calloutsSet.id,
            framing: {
              type: 'FORM',
              profile: { displayName: 'source form' },
              form: { questions: [{ prompt: 'Q', type: 'SHORT_TEXT' }] },
            },
            settings: { visibility: 'PUBLISHED' },
          },
        }),
        'form post in source space'
      );
      const countCallouts = async () =>
        (
          await must(
            await gql(
              ADMIN_EMAIL,
              'query ($id: UUID!) { lookup { calloutsSet(ID: $id) { callouts { id } } } }',
              { id: source.collaboration.calloutsSet.id }
            ),
            'count callouts'
          )
        ).lookup.calloutsSet.callouts.length as number;
      const before = await countCallouts();
      const spaceVc = (
        await must(
          await gql(
            ADMIN_EMAIL,
            `mutation ($d: CreateVirtualContributorOnAccountInput!) {
              createVirtualContributor(virtualContributorData: $d) { id }
            }`,
            {
              d: {
                accountID: account,
                nameID: `us1-vc2-${RUN}`,
                profileData: { displayName: `US1 VC Space ${RUN}` },
                aiPersona: { engine: 'GUIDANCE' },
                bodyOfKnowledgeType: 'ALKEMIO_SPACE',
                bodyOfKnowledgeID: source.id,
              },
            }
          ),
          'create VC over a space'
        )
      ).createVirtualContributor;
      const converted = await gql(
        ADMIN_EMAIL,
        `mutation ($d: ConversionVcSpaceToVcKnowledgeBaseInput!) {
          convertVirtualContributorToUseKnowledgeBase(conversionData: $d) { id }
        }`,
        { d: { virtualContributorID: spaceVc.id } }
      );
      expect(detailsCode(converted)).toBe('FORM_TRANSFER_NOT_ALLOWED');
      expect(await countCallouts()).toBe(before);
    });

    test('US1-AS4/5/7 the builder offers four types, a required switch, and blocks invalid input', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      await open(page, fixture.subUrl);
      await page.getByRole('button', { name: /add post/i }).first().click();
      const dialog = page.getByRole('dialog');
      await visibleFormRadio(page).click();
      await dialog.getByRole('textbox', { name: 'Title' }).fill(BUILT_TITLE);

      const field = (n: number, suffix: string) =>
        dialog
          .locator(`[id^="form-question-question-"][id$="-${suffix}"]`)
          .nth(n - 1);
      const optionInputs = (q: number) =>
        dialog.locator(`input[id^="form-q${q}-option"]`);
      const pickType = async (n: number, label: string) => {
        await field(n, 'type').click();
        await page.getByRole('option', { name: label }).click();
      };
      const post = dialog.getByRole('button', { name: /^post$/i });

      // AS4: four answer types, required defaults to optional.
      await expect(field(1, 'required')).toHaveAttribute('aria-checked', 'false');
      await field(1, 'type').click();
      await expect(page.getByRole('option')).toHaveText([
        'Short text',
        'Long text',
        'Single choice',
        'Multiple choice',
      ]);
      await page.keyboard.press('Escape');

      // AS7: the only question cannot be removed; a blank prompt is blocked inline.
      await expect(
        dialog.getByRole('button', { name: /remove question/i })
      ).toBeDisabled();
      await post.click();
      await expect(dialog.getByText('The question text is required')).toBeVisible();

      await field(1, 'prompt').fill('Your name');
      await field(1, 'required').click();
      await expect(field(1, 'required')).toHaveAttribute('aria-checked', 'true');

      await dialog.getByRole('button', { name: /add question/i }).click();
      await field(2, 'prompt').fill('Tell us about yourself');
      await field(2, 'explanation').fill('A few sentences');
      await pickType(2, 'Long text');

      await dialog.getByRole('button', { name: /add question/i }).click();
      await field(3, 'prompt').fill('Preferred day');
      await pickType(3, 'Single choice');

      // AS5: empty option, then duplicate option, are blocked inline.
      await optionInputs(3).nth(0).fill('Monday');
      await post.click();
      await expect(dialog.getByText('Option text is required')).toBeVisible();
      await optionInputs(3).nth(1).fill('Monday');
      await post.click();
      await expect(
        dialog.getByText('Options must be different from each other')
      ).toBeVisible();
      // Below two options cannot be reached; above twenty cannot be added.
      await expect(
        dialog.getByRole('button', { name: /remove option/i }).first()
      ).toBeDisabled();
      const addOption = dialog.getByRole('button', { name: /add option/i });
      while ((await addOption.count()) > 0) {
        await addOption.first().click();
      }
      await expect(optionInputs(3)).toHaveCount(20);
      for (let i = 0; i < 17; i++) {
        await dialog
          .getByRole('button', { name: /remove option/i })
          .nth(19 - i)
          .click();
        const confirm = page
          .getByRole('alertdialog')
          .getByRole('button', { name: /remove option/i });
        if (await confirm.isVisible()) {
          await confirm.click();
        }
        await expect(optionInputs(3)).toHaveCount(19 - i);
      }
      await expect(optionInputs(3)).toHaveCount(3);
      await optionInputs(3).nth(1).fill('Tuesday');
      await optionInputs(3).nth(2).fill('Wednesday');

      await dialog.getByRole('button', { name: /add question/i }).click();
      await field(4, 'prompt').fill('Dietary needs');
      await pickType(4, 'Multiple choice');
      await optionInputs(4).nth(0).fill('Vegetarian');
      await optionInputs(4).nth(1).fill('Vegan');
      await dialog.getByRole('button', { name: /add option/i }).nth(1).click();
      await optionInputs(4).nth(2).fill('Halal');
      await dialog.getByRole('button', { name: /add option/i }).nth(1).click();
      await optionInputs(4).nth(3).fill('None');

      await post.click();
      await expect(dialog).toBeHidden({ timeout: 20_000 });

      // The published Form lists once on the feed even with comments enabled.
      const feedHeading = page.getByRole('heading', { name: BUILT_TITLE });
      await expect(feedHeading).toHaveCount(1);
      const created = await must(
        await gql(
          personaEmail.a2,
          `query ($id: UUID!) {
            lookup { calloutsSet(ID: $id) { callouts { framing { type profile { displayName url } form { questions { prompt type required options { label } } } } } } }
          }`,
          { id: fixture.subCalloutsSetId }
        ),
        'read built form'
      );
      const built = created.lookup.calloutsSet.callouts.find(
        (c: any) => c.framing.profile.displayName === BUILT_TITLE
      );
      builtUrl = built.framing.profile.url as string;
      expect(
        built.framing.form.questions.map((q: any) => [q.prompt, q.type, q.required])
      ).toEqual([
        ['Your name', 'SHORT_TEXT', true],
        ['Tell us about yourself', 'LONG_TEXT', false],
        ['Preferred day', 'SINGLE_CHOICE', false],
        ['Dietary needs', 'MULTIPLE_CHOICE', false],
      ]);
      expect(
        built.framing.form.questions[2].options.map((o: any) => o.label)
      ).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    });

    test('US1-AS6 members see the questions in order with matching inputs', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.m1);
      await open(page, builtUrl);
      const dialog = page.getByRole('dialog');
      await expect(
        dialog.getByRole('textbox', { name: /Your name/ })
      ).toBeVisible();
      await expect(
        dialog.getByRole('textbox', { name: /Tell us about yourself/ })
      ).toBeVisible();
      await expect(dialog.getByRole('radio')).toHaveCount(3);
      await expect(dialog.getByRole('checkbox')).toHaveCount(4);
      await expect(dialog.locator('label')).toContainText([
        /Your name/,
        /Tell us about yourself/,
        'Monday',
        'Tuesday',
        'Wednesday',
        'Vegetarian',
        'Vegan',
        'Halal',
        'None',
      ]);
      await expect(
        dialog.getByRole('button', { name: /submit form/i })
      ).toHaveCount(1);
    });

    test('US1-AS7 the API rejects a Form without questions', async () => {
      const rejected = await gql(personaEmail.a2, CREATE_FORM, {
        d: {
          calloutsSetID: fixture.subCalloutsSetId,
          framing: {
            type: 'FORM',
            profile: { displayName: 'empty form' },
            form: { questions: [] },
          },
        },
      });
      expect(detailsCode(rejected)).toBe('FORM_QUESTIONS_COUNT');
    });

    test('US1-AS7a closing and reopening reaches a member', async ({
      browser,
    }) => {
      const admin = await signIn(browser, personaEmail.a2);
      const member = await signIn(browser, personaEmail.m1);
      const submitButton = member
        .getByRole('dialog')
        .getByRole('button', { name: /submit form/i });

      const setOpen = async (open: boolean) => {
        await admin.goto(closableUrl);
        await admin
          .getByRole('dialog')
          .getByRole('button', { name: 'Settings' })
          .click();
        await admin.getByRole('menuitem', { name: 'Edit' }).click();
        await admin.getByRole('button', { name: 'Form settings' }).click();
        const toggle = admin.locator('#form-state-open');
        await expect(toggle).toHaveAttribute('aria-checked', String(!open));
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', String(open));
        await admin.keyboard.press('Escape');
        await admin.getByRole('button', { name: /^save$/i }).click();
        await expect(
          admin.getByRole('button', { name: /^save$/i })
        ).toBeHidden({ timeout: 20_000 });
      };

      await open(member, closableUrl);
      await expect(submitButton).toHaveCount(1);

      await setOpen(false);
      await member.goto(closableUrl);
      await expect(
        member.getByRole('dialog').getByText('Closed', { exact: true })
      ).toBeVisible();
      await expect(submitButton).toHaveCount(0);

      await setOpen(true);
      await member.goto(closableUrl);
      await expect(submitButton).toHaveCount(1);
      await expect(
        member.getByRole('dialog').getByText('Closed', { exact: true })
      ).toHaveCount(0);
    });

    test('US1-AS8/AS9 an admin edits a Form with responses; chips are locked', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      await open(page, editable.url);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Settings' })
        .click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      const dialog = page.getByRole('dialog').last();
      await dialog.getByRole('button', { name: /add question/i }).waitFor();

      // AS9: Form chip active and not clearable, nothing else switchable.
      const radios = dialog.getByRole('radio');
      await expect(dialog.getByRole('radio', { name: 'Form', exact: true })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      for (const radio of await radios.all()) {
        await expect(radio).toHaveAttribute('aria-disabled', 'true');
      }
      await dialog
        .getByRole('radio', { name: 'Form', exact: true })
        .click({ force: true });
      await dialog.getByRole('radio', { name: 'Poll', exact: true }).click({ force: true });
      await expect(dialog.getByRole('radio', { checked: true })).toHaveCount(1);
      await expect(dialog.getByRole('radio', { name: 'Form', exact: true })).toHaveAttribute(
        'aria-checked',
        'true'
      );

      // AS8 (R19c): the answer type stays editable on answered questions.
      const typeSelects = dialog.getByRole('combobox', { name: 'Answer type' });
      await expect(typeSelects).toHaveCount(4);
      for (const select of await typeSelects.all()) {
        await expect(select).toBeEnabled();
        await expect(select).not.toHaveAttribute('aria-disabled', 'true');
      }
      await expect(dialog.getByText(TYPE_CHANGE_HINT)).toHaveCount(0);
      // Change the type of "Tell us about yourself" (answered; removed below, so
      // the saved definition is unaffected): the hint appears.
      await typeSelects.nth(1).click();
      await page.getByRole('option', { name: 'Short text' }).click();
      await expect(dialog.getByText(TYPE_CHANGE_HINT)).toBeVisible();

      const prompts = dialog.locator('[id^="form-question-"][id$="-prompt"]');
      await prompts.nth(0).fill('Your full name');
      await dialog
        .locator('input[id^="form-q3-option"]')
        .nth(0)
        .fill('Monday morning');
      await dialog.getByRole('button', { name: /add question/i }).click();
      await prompts.nth(4).fill('Anything else?');
      // Remove "Tell us about yourself" (it holds an answer).
      await dialog.getByRole('button', { name: 'Remove question' }).nth(1).click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: /remove question/i })
        .click();
      await expect(prompts).toHaveCount(4);
      // Reorder: drag "Dietary needs" (3rd) above "Your full name" (1st).
      const from = await dialog
        .getByRole('button', { name: 'Reorder question 3' })
        .boundingBox();
      const to = await dialog
        .getByRole('button', { name: 'Reorder question 1' })
        .boundingBox();
      expect(from && to).toBeTruthy();
      await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
      await page.mouse.down();
      await page.mouse.move(to!.x + to!.width / 2, to!.y - 20, { steps: 20 });
      await page.mouse.up();
      await expect(prompts.nth(0)).toHaveValue('Dietary needs');
      await dialog.getByRole('button', { name: /^save$/i }).click();

      await expect
        .poll(async () => {
          const result = await gql(
            personaEmail.a2,
            `query ($id: UUID!) {
              lookup { callout(ID: $id) { framing { form { questions { prompt } } } } }
            }`,
            { id: editable.calloutId }
          );
          return result.data?.lookup?.callout?.framing?.form?.questions?.map(
            (q: any) => q.prompt
          );
        })
        .toEqual([
          'Dietary needs',
          'Your full name',
          'Preferred day',
          'Anything else?',
        ]);

      // Existing responses stay readable; the removed question keeps its snapshot prompt.
      const responses = await must(
        await gql(
          personaEmail.a2,
          `query ($f: UUID!) {
            lookup { calloutFormResponses(formID: $f, first: 10) {
              all { total responses { answers { prompt text } } }
            } }
          }`,
          { f: editable.formId }
        ),
        'read responses'
      );
      const answers = responses.lookup.calloutFormResponses.all.responses[0]
        .answers as Array<{ prompt: string; text: string }>;
      expect(answers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ prompt: 'Your name', text: 'Mia Memberone' }),
          expect.objectContaining({
            prompt: 'Tell us about yourself',
            text: 'Removed later',
          }),
        ])
      );

      await page.goto(editable.url);
      const detail = page.getByRole('dialog');
      await detail.getByRole('button', { name: /view responses/i }).click();
      const table = page.getByRole('dialog').last();
      await expect(table).toContainText('Tell us about yourself');
      await expect(table).toContainText('removed question');
      await expect(table).toContainText('Mia Memberone');
    });

    test('US1-AS10 the Form title and description box sits above question 1, saves with responses, and shows in the Form box header', async ({
      browser,
    }) => {
      const formTitle = `US1 Form title ${RUN}`;
      const formDescription = `What this form is for ${RUN}`;
      const page = await signIn(browser, personaEmail.a2);
      const dialog = await openEdit(page, presentable.url);

      const titleInput = dialog.getByRole('textbox', { name: 'Form title' });
      // The box holding both fields: the innermost element containing the title
      // input and a textarea (the description).
      const headerBox = dialog
        .locator('div', { has: titleInput })
        .filter({ has: page.locator('textarea') })
        .last();
      const descriptionInput = headerBox.getByRole('textbox', {
        name: /description/i,
      });
      await expect(titleInput).toBeVisible();
      await expect(descriptionInput).toBeVisible();
      // Above the first question.
      const titleBox = await titleInput.boundingBox();
      const firstQuestion = await questionField(dialog, 1).boundingBox();
      expect(titleBox && firstQuestion).toBeTruthy();
      expect(titleBox!.y).toBeLessThan(firstQuestion!.y);

      await titleInput.fill(formTitle);
      await descriptionInput.fill(formDescription);
      // The 512 / 2048 limits are indicated next to the fields.
      await expect(headerBox.getByText(/512/).first()).toBeVisible();
      await expect(headerBox.getByText(/2048/).first()).toBeVisible();
      await saveEdit(page);

      await expect
        .poll(async () => {
          const result = await gql(
            personaEmail.a2,
            'query ($id: UUID!) { lookup { callout(ID: $id) { framing { form { title description } } } } }',
            { id: presentable.calloutId }
          );
          return result.data?.lookup?.callout?.framing?.form;
        })
        .toEqual({ title: formTitle, description: formDescription });

      const member = await signIn(browser, personaEmail.m1);
      await open(member, presentable.url);
      const detail = member.getByRole('dialog');
      await expect(detail.getByText(formTitle, { exact: true })).toBeVisible();
      await expect(detail.getByText(formDescription)).toBeVisible();

      // An emptied title falls back to the generic "Form" label.
      const again = await openEdit(page, presentable.url);
      await again.getByRole('textbox', { name: 'Form title' }).fill('');
      await saveEdit(page);
      await expect
        .poll(async () => {
          const result = await gql(
            personaEmail.a2,
            'query ($id: UUID!) { lookup { callout(ID: $id) { framing { form { title } } } } }',
            { id: presentable.calloutId }
          );
          return result.data?.lookup?.callout?.framing?.form?.title;
        })
        .toBeNull();
      await open(member, presentable.url);
      await expect(detail.getByText(formTitle, { exact: true })).toHaveCount(0);
      await expect(detail.getByText('Form', { exact: true }).first()).toBeVisible();
      await expect(detail.getByText(formDescription)).toBeVisible();
    });

    test('US1-AS11 each question is one row labelled "Question N"; labels follow a reorder; the row wraps on a phone', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      await open(page, fixture.subUrl);
      await page.getByRole('button', { name: /add post/i }).first().click();
      const dialog = page.getByRole('dialog');
      await visibleFormRadio(page).click();
      await dialog.getByRole('button', { name: /add question/i }).click();
      await questionField(dialog, 1).fill('First prompt');
      await questionField(dialog, 2).fill('Second prompt');

      for (const n of [1, 2]) {
        const prompt = questionField(dialog, n);
        // The row: the innermost ancestor of the prompt holding the switch.
        const row = prompt.locator(
          'xpath=ancestor::*[.//*[@role="switch"]][1]'
        );
        const handle = row.getByRole('button', {
          name: `Reorder question ${n}`,
        });
        const type = row.getByRole('combobox', { name: 'Answer type' });
        const required = row.getByRole('switch');
        const remove = row.getByRole('button', { name: /remove question/i });
        for (const control of [handle, type, required, remove]) {
          await expect(control).toHaveCount(1);
        }
        // Left to right in one row: handle, prompt, type, required, delete.
        const boxes = await Promise.all(
          [handle, prompt, type, required, remove].map(c => c.boundingBox())
        );
        for (const box of boxes) expect(box).toBeTruthy();
        const xs = boxes.map(b => b!.x);
        expect([...xs].sort((a, b) => a - b)).toEqual(xs);
        const promptBox = boxes[1]!;
        for (const box of boxes) {
          // Vertically overlapping the prompt field: the same row.
          expect(box!.y).toBeLessThan(promptBox.y + promptBox.height);
          expect(box!.y + box!.height).toBeGreaterThan(promptBox.y);
        }
        // The explanation sits below the row.
        const explanation = dialog
          .getByRole('textbox', { name: /explanation/i })
          .nth(n - 1);
        const explanationBox = await explanation.boundingBox();
        expect(explanationBox!.y).toBeGreaterThanOrEqual(
          promptBox.y + promptBox.height
        );
      }
      // No separate "Question N" title above the row: the label is the only one.
      await expect(dialog.getByText('Question 1', { exact: true })).toHaveCount(1);

      // The labels follow a reorder.
      const from = await dialog
        .getByRole('button', { name: 'Reorder question 2' })
        .boundingBox();
      const to = await dialog
        .getByRole('button', { name: 'Reorder question 1' })
        .boundingBox();
      await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
      await page.mouse.down();
      await page.mouse.move(to!.x + to!.width / 2, to!.y - 20, { steps: 20 });
      await page.mouse.up();
      await expect(questionField(dialog, 1)).toHaveValue('Second prompt');
      await expect(questionField(dialog, 2)).toHaveValue('First prompt');

      // At 375px the row wraps instead of scrolling sideways.
      await page.setViewportSize({ width: 375, height: 800 });
      await expect(questionField(dialog, 1)).toBeVisible();
      await expect
        .poll(() =>
          dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)
        )
        .toBe(true);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1
          )
        )
        .toBe(true);
    });

    test('US1-AS12 "collapsed by default" makes a member first see only the Form box header', async ({
      browser,
    }) => {
      const admin = await signIn(browser, personaEmail.a2);
      const member = await signIn(browser, personaEmail.m1);
      const memberSubmit = member
        .getByRole('dialog')
        .getByRole('button', { name: /submit form/i });

      const setCollapsed = async (collapsed: boolean) => {
        await openEdit(admin, collapsible.url);
        await admin.getByRole('button', { name: 'Form settings' }).click();
        const settings = admin.getByRole('dialog', { name: 'Form settings' });
        const toggle = settings.getByRole('switch', {
          name: /collapsed by default/i,
        });
        await expect(toggle).toHaveAttribute('aria-checked', String(!collapsed));
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', String(collapsed));
        await admin.keyboard.press('Escape');
        await saveEdit(admin);
        await expect
          .poll(async () => {
            const result = await gql(
              personaEmail.a2,
              'query ($id: UUID!) { lookup { callout(ID: $id) { framing { form { settings { defaultCollapsed } } } } } }',
              { id: collapsible.calloutId }
            );
            return result.data?.lookup?.callout?.framing?.form?.settings
              ?.defaultCollapsed;
          })
          .toBe(collapsed);
      };

      // Default: expanded.
      await open(member, collapsible.url);
      await expect(formChevron(member)).toHaveAttribute('aria-expanded', 'true');
      await expect(memberSubmit).toBeVisible();

      await setCollapsed(true);
      await open(member, collapsible.url);
      await expect(formChevron(member)).toHaveAttribute('aria-expanded', 'false');
      await expect(
        member.getByRole('dialog').getByText('1 question', { exact: true })
      ).toBeVisible();
      await expect(
        member.getByRole('dialog').getByRole('textbox', { name: /Collapsible question/ })
      ).toBeHidden();
      await expect(memberSubmit).toBeHidden();
      await formChevron(member).click();
      await expect(formChevron(member)).toHaveAttribute('aria-expanded', 'true');
      await expect(memberSubmit).toBeVisible();

      await setCollapsed(false);
      await open(member, collapsible.url);
      await expect(formChevron(member)).toHaveAttribute('aria-expanded', 'true');
      await expect(memberSubmit).toBeVisible();
    });

    test('US1-AS13 changing an answered question to single choice keeps the old answer as text beside new option answers', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      const dialog = await openEdit(page, typed.url);
      const typeSelect = dialog.getByRole('combobox', { name: 'Answer type' });
      await expect(typeSelect).toBeEnabled();
      await typeSelect.click();
      await page.getByRole('option', { name: 'Single choice' }).click();
      await expect(dialog.getByText(TYPE_CHANGE_HINT)).toBeVisible();
      await dialog.getByRole('textbox', { name: 'Option 1', exact: true }).fill('Yes');
      await dialog.getByRole('textbox', { name: 'Option 2', exact: true }).fill('No');
      await saveEdit(page);

      let options: Array<{ id: string; label: string }> = [];
      let questionId = '';
      await expect
        .poll(async () => {
          const result = await gql(
            personaEmail.a2,
            'query ($id: UUID!) { lookup { callout(ID: $id) { framing { form { questions { id type options { id label } } } } } } }',
            { id: typed.calloutId }
          );
          const question = result.data?.lookup?.callout?.framing?.form?.questions?.[0];
          options = question?.options ?? [];
          questionId = question?.id ?? '';
          return question?.type;
        })
        .toBe('SINGLE_CHOICE');
      expect(options.map(o => o.label)).toEqual(['Yes', 'No']);

      // A new answer follows the new type.
      await must(
        await gql(
          personaEmail.m2,
          `mutation ($d: SubmitCalloutFormResponseInput!) {
            submitCalloutFormResponse(responseData: $d) { id }
          }`,
          {
            d: {
              formID: typed.formId,
              acknowledgedVisibility: 'ADMINS',
              answers: [{ questionID: questionId, selectedOptionIDs: [options[0].id] }],
            },
          }
        ),
        'new-type answer'
      );

      await open(page, typed.url);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'View responses (2)' })
        .click();
      const table = page.getByRole('dialog', { name: 'Form responses' });
      const oldAnswer = table.getByRole('cell', { name: 'Mia text', exact: true });
      const newAnswer = table.getByRole('cell', { name: 'Yes', exact: true });
      await expect(oldAnswer).toBeVisible();
      await expect(newAnswer).toBeVisible();
      // Same column: the two cells share their horizontal position.
      const [oldBox, newBox] = await Promise.all([
        oldAnswer.boundingBox(),
        newAnswer.boundingBox(),
      ]);
      expect(Math.abs(oldBox!.x - newBox!.x)).toBeLessThan(2);
    });
  }
);
