import { randomUUID } from 'node:crypto';
import { expect, type Browser, type BrowserContext, type Page, test } from '@playwright/test';
import {
  assignRoleToUser,
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  createContributionOnCallout,
  createSpaceOnAccount,
  createSubspaceWithData,
  deleteCalloutFormResponse,
  introspectSchemaFieldTypes,
  readActivityLogOnCollaboration,
  readCalloutContributions,
  readCalloutFormResponses,
  readMyNotifications,
  readMyUser,
  removeRoleFromUser,
  RoleName,
  SpacePrivacyMode,
  submitCalloutFormResponse,
  updateCalloutForm,
  updateCalloutVisibility,
  updateSpaceSettings,
  type CreateCalloutFormQuestionInput,
  type GraphqlActor,
  type GraphqlReturnWithError,
} from '@alkemio/tests-lib';
import { fillSecret } from '../helpers/login.helper';
import { must } from '../helpers/lib-actor.helper';

/**
 * workspace#080-form-callout-framing — User Story 3 (P1): Control who can see
 * responses.
 *
 * AS1  the Form settings dialogue offers "Admins only" / "Space members" and
 *      "Admins only" is preselected (create flow and edit flow).
 * AS2  Admins only + a response by M1: M2 sees the questions, own responses
 *      (none), and no other response, no count, no "View responses" action.
 * AS3  Space members on the PUBLIC Space S Form: an anonymous visitor and a
 *      NON-member see no response (API: empty for anonymous, OWN scope for the
 *      non-member).
 * AS4  (R19b) with 1 response, widening to "Space members" opens a confirmation:
 *      cancel keeps "Admins only", confirm + save widens and M2 then reads the
 *      earlier response; narrowing back needs no confirmation; the API accepts
 *      widening with responses.
 * AS5  the S admin (platform admin) opens the Sub Form: "View responses" lists
 *      every response.
 * AS6  a stored response with a unique marker never appears in the contributions
 *      list/count, the activity log/feed, the in-app notification payloads, and
 *      the response types are reachable from no Callout / ActivityLogEntry /
 *      InAppNotification / Subscription type; only lookup.calloutFormResponses
 *      returns it, and only to permitted readers.
 *      The live-socket subscription check is covered by the schema reachability
 *      assertion (subscription result types reference no response type).
 * AS7  P (member of S only, inherited contribute) submits on the Sub "Space
 *      members" Form and sees own responses only (D-4).
 * AS8  A2 created the Form and is then removed from the Sub admin role: A2 sees
 *      own responses only, cannot delete others', and has no "View responses".
 *
 * Self-contained: provisions its own Kratos identities (admin API), a PUBLIC
 * Space, a Subspace and the Forms through the non-interactive GraphQL endpoint,
 * then walks the real UI. Nothing is shared with other specs.
 *
 * Environment (defaults suit the local forge stack):
 *   ALKEMIO_BASE_URL        http://localhost:3000
 *   KRATOS_ADMIN_URL        Kratos ADMIN base incl. /admin, e.g. http://localhost:32841/admin
 *   ALKEMIO_ADMIN_EMAIL     admin@alkem.io
 *   ALKEMIO_ADMIN_PASSWORD  the platform admin's password
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
// Per-run secret for the throwaway identities this walk provisions (override with
// FORGE_PERSONA_PASSWORD); a fixed literal would leave them loginable after the run.
const USER_PASSWORD =
  process.env.FORGE_PERSONA_PASSWORD || `F080-${randomUUID()}-Aa1!`;

const RUN = Date.now().toString(36);
const email = (tag: string) => `us3-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'm2' | 'p' | 'n';
type Actor = Persona | 'admin';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  m2: email('m2'),
  p: email('p'),
  n: email('n'),
};
const emailOf = (who: Actor) =>
  who === 'admin' ? ADMIN_EMAIL : personaEmail[who];

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
  }).toPass({ intervals: [1_000, 5_000, 15_000], timeout: 180_000 });
  tokens.set(userEmail, token);
  return token;
}

/**
 * The lib actor for one of this run's identities (its bearer, minted once),
 * or the anonymous visitor on the public endpoint.
 */
async function actorFor(who: Actor | 'anonymous'): Promise<GraphqlActor> {
  if (who === 'anonymous') return { anonymous: 'public' };
  return {
    bearerToken: await mintToken(
      emailOf(who),
      who === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD
    ),
  };
}

type GqlError = { message?: string; extensions?: { code?: string } };

const firstError = (result: GraphqlReturnWithError<unknown>) =>
  (result.error?.errors as GqlError[] | undefined)?.[0];

async function createIdentity(userEmail: string, first: string, last: string) {
  const res = await fetch(`${KRATOS_ADMIN}/identities`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      schema_id: 'default',
      state: 'active',
      traits: {
        email: userEmail,
        accepted_terms: true,
        name: { first, last },
      },
      credentials: { password: { config: { password: USER_PASSWORD } } },
      verifiable_addresses: [
        { value: userEmail, verified: true, via: 'email', status: 'completed' },
      ],
    }),
  });
  expect(res.status, `kratos identity ${userEmail}`).toBe(201);
}

async function meId(who: Actor) {
  const data = must(await readMyUser(await actorFor(who)), 'me');
  return data.me.user!.id;
}

type Question = {
  id: string;
  prompt: string;
  options?: Array<{ id: string; label: string }> | null;
};
type FormFixture = {
  calloutId: string;
  url: string;
  title: string;
  formId: string;
  questions: Question[];
};

const QUESTIONS = (): CreateCalloutFormQuestionInput[] => [
  {
    prompt: 'What is your name?',
    explanation: 'Your full name',
    type: CalloutFormQuestionType.ShortText,
    required: true,
  },
  {
    prompt: 'Tell us more',
    type: CalloutFormQuestionType.LongText,
    required: false,
  },
  {
    prompt: 'Pick one',
    type: CalloutFormQuestionType.SingleChoice,
    required: false,
    options: [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }],
  },
  {
    prompt: 'Pick several',
    type: CalloutFormQuestionType.MultipleChoice,
    required: false,
    options: [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }],
  },
];

const fixture = {
  spaceUrl: '',
  subUrl: '',
  spaceCalloutsSetId: '',
  subCalloutsSetId: '',
  subRoleSetId: '',
  subCollaborationId: '',
  spaceCollaborationId: '',
  userIds: {} as Record<Actor, string>,
};

async function createForm(
  creator: Actor,
  calloutsSetID: string,
  displayName: string,
  visibility: CalloutFormResponseVisibility
): Promise<FormFixture> {
  const actor = await actorFor(creator);
  const created = must(
    await createCalloutWithData(
      {
        calloutsSetID,
        framing: {
          type: CalloutFramingType.Form,
          profile: { displayName, description: 'US3 form' },
          form: {
            questions: QUESTIONS(),
            settings: { visibility, responseMode: CalloutFormResponseMode.Single },
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
    `create form ${displayName}`
  );
  const callout = created.createCalloutOnCalloutsSet;
  must(
    await updateCalloutVisibility(
      callout.id,
      CalloutVisibility.Published,
      actor,
      false
    ),
    `publish form ${displayName}`
  );
  return {
    calloutId: callout.id,
    url: callout.framing.profile.url,
    title: displayName,
    formId: callout.framing.form!.id,
    questions: callout.framing.form!.questions,
  };
}

async function submitName(
  who: Actor,
  form: FormFixture,
  visibility: CalloutFormResponseVisibility,
  text: string
) {
  const data = must(
    await submitCalloutFormResponse(
      {
        formID: form.formId,
        acknowledgedVisibility: visibility,
        answers: [{ questionID: form.questions[0].id, text }],
      },
      await actorFor(who)
    ),
    `submit as ${who}`
  );
  return data.submitCalloutFormResponse.id;
}

async function lookupAs(who: Actor | 'anonymous', formId: string) {
  const view = must(
    await readCalloutFormResponses(formId, await actorFor(who), 50),
    `lookup as ${who}`
  ).lookup.calloutFormResponses;
  return {
    canReadAll: view.canReadAll,
    canModerate: view.canModerate,
    mine: view.mine.length,
    total: view.all.total,
    texts: view.all.responses.map(r => r.answers[0]?.text),
  };
}

// ---------------------------------------------------------------- UI helpers

// Optional human-facing evidence: set FORGE_EVIDENCE_DIR to keep a screenshot at
// each decisive assertion. Assertions never depend on it.
const EVIDENCE_DIR = process.env.FORGE_EVIDENCE_DIR || '';
async function evidence(page: Page, name: string) {
  if (!EVIDENCE_DIR) return;
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}.png` });
}

const sessions = new Map<Persona | 'admin', BrowserContext>();

async function signIn(browser: Browser, who: Actor): Promise<Page> {
  const existing = sessions.get(who);
  if (existing) return existing.newPage();
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
  });
  const page = await context.newPage();
  // Kratos rate-limits logins per address: restart the whole attempt on failure.
  await expect(async () => {
    await page.goto(BASE);
    const login = page.getByRole('link', { name: 'Log in', exact: true });
    await login.waitFor({ state: 'visible', timeout: 15_000 });
    await login.click();
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill(emailOf(who));
    await fillSecret(
      page.getByRole('textbox', { name: 'Password' }),
      who === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD
    );
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/, { timeout: 20_000 });
  }).toPass({ intervals: [1_000, 15_000, 30_000], timeout: 240_000 });
  const newDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (await newDesign.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await newDesign.click();
  }
  sessions.set(who, context);
  return page;
}

async function openForm(page: Page, form: FormFixture) {
  await page.goto(form.url);
  const dialog = page.getByRole('dialog').first();
  await expect(
    dialog.getByRole('heading', { level: 1, name: form.title })
  ).toBeVisible({ timeout: 30_000 });
  return dialog;
}

async function openFormSettings(page: Page, form: FormFixture) {
  const dialog = await openForm(page, form);
  await dialog.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Form settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Form settings' });
  await expect(settings).toBeVisible();
  return settings;
}

let formAdmins: FormFixture; // Sub, Admins only
let formMembers: FormFixture; // Sub, Space members
let formSpace: FormFixture; // public Space S, Space members

const MARK = {
  m1OnAdmins: `US3-M1-ADMINS-${RUN}`,
  m2OnAdmins: `US3-M2-ADMINS-${RUN}`,
  m1OnSpace: `US3-M1-SPACE-${RUN}`,
  m1OnMembers: `US3-M1-MEMBERS-${RUN}`,
  m1OnWiden: `US3-M1-WIDEN-${RUN}`,
  pOnMembers: `US3-P-MEMBERS-${RUN}`,
  a2Own: `US3-A2-OWN-${RUN}`,
  as6Answer: `US3-AS6-ANSWER-${RUN}`,
  as6PostTitle: `US3-AS6-CONTROLPOST-${RUN}`,
};

test.describe.configure({ mode: 'serial' });

test.describe(
  'US3 — control who can see responses',
  { tag: ['@forge-acceptance'] },
  () => {
    test.setTimeout(420_000);

    test.beforeAll(async () => {
      expect(
        KRATOS_ADMIN,
        'KRATOS_ADMIN_URL must point at the Kratos admin API (e.g. http://localhost:32841/admin)'
      ).not.toBe('');

      await createIdentity(personaEmail.a2, 'Ada', 'Admin');
      await createIdentity(personaEmail.m1, 'Mia', 'Memberone');
      await createIdentity(personaEmail.m2, 'Max', 'Membertwo');
      await createIdentity(personaEmail.p, 'Pia', 'Parentonly');
      await createIdentity(personaEmail.n, 'Ned', 'Outsider');
      for (const who of ['admin', 'a2', 'm1', 'm2', 'p', 'n'] as Actor[]) {
        fixture.userIds[who] = await meId(who);
      }

      const admin = await actorFor('admin');
      const me = must(await readMyUser(admin), 'admin account');
      const space = must(
        await createSpaceOnAccount(
          {
            accountID: me.me.user!.account!.id,
            nameID: `us3-space-${RUN}`,
            about: { profileData: { displayName: `US3 Space ${RUN}` } },
            collaborationData: { calloutsSetData: {} },
          },
          admin
        ),
        'create space'
      ).createSpace;
      must(
        await updateSpaceSettings(
          space.id,
          { privacy: { mode: SpacePrivacyMode.Public } },
          admin
        ),
        'make space public'
      );
      fixture.spaceUrl = space.about.profile.url;
      fixture.spaceCalloutsSetId = space.collaboration.calloutsSet.id;
      fixture.spaceCollaborationId = space.collaboration.id;

      const subspace = must(
        await createSubspaceWithData(
          {
            spaceID: space.id,
            nameID: `us3-sub-${RUN}`,
            about: { profileData: { displayName: `US3 Sub ${RUN}` } },
            collaborationData: { calloutsSetData: {} },
          },
          admin
        ),
        'create subspace'
      ).createSubspace;
      fixture.subUrl = subspace.about.profile.url;
      fixture.subCalloutsSetId = subspace.collaboration.calloutsSet.id;
      fixture.subRoleSetId = subspace.community.roleSet.id;
      fixture.subCollaborationId = subspace.collaboration.id;

      const assign = async (roleSetID: string, who: Persona, role: RoleName) =>
        must(
          await assignRoleToUser(fixture.userIds[who], roleSetID, role, admin),
          `assign ${role} ${who}`
        );
      // M1, M2, P, A2 are members of S; P is a member of S ONLY (inherits
      // contribute on Sub through inheritMembershipRights, on by default).
      for (const who of ['m1', 'm2', 'p', 'a2'] as Persona[]) {
        await assign(space.community.roleSet.id, who, RoleName.Member);
      }
      for (const who of ['m1', 'm2', 'a2'] as Persona[]) {
        await assign(fixture.subRoleSetId, who, RoleName.Member);
      }
      await assign(fixture.subRoleSetId, 'a2', RoleName.Admin);

      formAdmins = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 Admins-only Form ${RUN}`,
        CalloutFormResponseVisibility.Admins
      );
      formMembers = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 Members Form ${RUN}`,
        CalloutFormResponseVisibility.Members
      );
      formSpace = await createForm(
        'admin',
        fixture.spaceCalloutsSetId,
        `US3 Space Members Form ${RUN}`,
        CalloutFormResponseVisibility.Members
      );
    });

    test.afterAll(async () => {
      for (const context of sessions.values()) {
        await context.close();
      }
    });

    test('US3-AS1 Form settings offers Admins only / Space members, Admins only preselected', async ({
      browser,
    }) => {
      const page = await signIn(browser, 'a2');

      // Create flow: no visibility choice made -> Admins only applies.
      await page.goto(fixture.subUrl);
      await page.getByRole('button', { name: 'Add Post' }).click();
      await page.getByRole('radio', { name: 'Form' }).click({ force: true });
      await page.getByRole('button', { name: 'Form settings' }).click();
      const createSettings = page.getByRole('dialog', {
        name: 'Form settings',
      });
      const createGroup = createSettings.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      await expect(
        createGroup.getByRole('radio', { name: 'Admins only' })
      ).toBeChecked();
      await expect(
        createGroup.getByRole('radio', { name: 'Space members' })
      ).not.toBeChecked();
      await expect(
        createGroup.getByRole('radio', { name: 'Space members' })
      ).toBeEnabled();
      await evidence(page, 'US3-AS1-create-flow-settings');

      // Edit flow on an existing (Admins-only, zero responses) Form.
      const settings = await openFormSettings(page, formAdmins);
      const group = settings.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      await expect(group.getByRole('radio', { name: 'Admins only' })).toBeChecked();
      await expect(
        group.getByRole('radio', { name: 'Space members' })
      ).toBeEnabled();
      await evidence(page, 'US3-AS1-edit-flow-settings');
      await page.close();
    });

    test('US3-AS2 Admins only: another member sees the questions, but no other response, no count, no View responses', async ({
      browser,
    }) => {
      await submitName('m1', formAdmins, CalloutFormResponseVisibility.Admins, MARK.m1OnAdmins);

      const page = await signIn(browser, 'm2');
      const dialog = await openForm(page, formAdmins);
      await expect(
        dialog.getByRole('textbox', { name: /What is your name/ })
      ).toBeVisible();
      await expect(
        dialog.getByText(/Only the admins of .* can see your response/)
      ).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await expect(page.getByText(MARK.m1OnAdmins)).toHaveCount(0);
      await evidence(page, 'US3-AS2-m2-form-dialog');

      // Feed card of the same Form: still no count / action.
      await page.goto(fixture.subUrl);
      const cardTitle = page.getByRole('heading', {
        level: 3,
        name: formAdmins.title,
      });
      await expect(cardTitle).toBeVisible();
      const card = cardTitle.locator(
        'xpath=ancestor::*[.//button[contains(., "Submit Form")]][1]'
      );
      await expect(
        card.getByRole('button', { name: /Submit Form/ })
      ).toBeVisible();
      await expect(card.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await expect(page.getByText(MARK.m1OnAdmins)).toHaveCount(0);

      // API: OWN scope, nothing else, not even a count.
      expect(await lookupAs('m2', formAdmins.formId)).toMatchObject({
        canReadAll: false,
        canModerate: false,
        mine: 0,
        total: 0,
        texts: [],
      });
      expect(await lookupAs('m1', formAdmins.formId)).toMatchObject({
        canReadAll: false,
        mine: 1,
        total: 1,
        texts: [MARK.m1OnAdmins],
      });
      await page.close();
    });

    test('US3-AS3 Space members on a public Space: anonymous visitor and non-member see no response', async ({
      browser,
    }) => {
      await submitName('m1', formSpace, CalloutFormResponseVisibility.Members, MARK.m1OnSpace);

      // Anonymous visitor.
      const anonContext = await browser.newContext({
        viewport: { width: 1500, height: 1000 },
      });
      const anon = await anonContext.newPage();
      const anonDialog = await openForm(anon, formSpace);
      await expect(
        anonDialog.getByText('You do not have permission to respond to this form.')
      ).toBeVisible();
      await expect(anonDialog.getByRole('button', { name: 'Submit Form' })).toHaveCount(0);
      await expect(anonDialog.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await expect(anon.getByText(MARK.m1OnSpace)).toHaveCount(0);
      await evidence(anon, 'US3-AS3-anonymous');
      await anonContext.close();

      // Non-member (signed in).
      const page = await signIn(browser, 'n');
      const dialog = await openForm(page, formSpace);
      await expect(
        dialog.getByText('You do not have permission to respond to this form.')
      ).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Submit Form' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await expect(page.getByText(MARK.m1OnSpace)).toHaveCount(0);
      await evidence(page, 'US3-AS3-non-member');
      await page.close();

      // API: empty for anonymous, OWN scope (empty) for the non-member.
      expect(await lookupAs('anonymous', formSpace.formId)).toMatchObject({
        canReadAll: false,
        canModerate: false,
        mine: 0,
        total: 0,
        texts: [],
      });
      expect(await lookupAs('n', formSpace.formId)).toMatchObject({
        canReadAll: false,
        canModerate: false,
        mine: 0,
        total: 0,
        texts: [],
      });
      // Control: a member of S does read it, so the negatives are not vacuous.
      expect(await lookupAs('m2', formSpace.formId)).toMatchObject({
        canReadAll: true,
        total: 1,
        texts: [MARK.m1OnSpace],
      });
    });

    test('US3-AS4 widening with a response asks for confirmation; confirming exposes the earlier response to members; narrowing never asks', async ({
      browser,
    }) => {
      // R19b: visibility changes in both directions at any time and applies to
      // every response. A dedicated Form, so the shared Admins-only Form keeps
      // its audience for the later cases.
      await submitName('m1', formMembers, CalloutFormResponseVisibility.Members, MARK.m1OnMembers);
      const formWiden = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 Widen Form ${RUN}`,
        CalloutFormResponseVisibility.Admins
      );
      await submitName('m1', formWiden, CalloutFormResponseVisibility.Admins, MARK.m1OnWiden);
      // Before: M2 (a Sub member) reads only own responses.
      expect(await lookupAs('m2', formWiden.formId)).toMatchObject({
        canReadAll: false,
        total: 0,
      });

      const page = await signIn(browser, 'a2');
      const settings = await openFormSettings(page, formWiden);
      const group = settings.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      const adminsOnly = group.getByRole('radio', { name: 'Admins only' });
      const spaceMembers = group.getByRole('radio', { name: 'Space members' });
      await expect(adminsOnly).toBeChecked();
      // Never disabled any more, and no "cannot widen" explanation.
      await expect(spaceMembers).toBeEnabled();
      await expect(
        settings.getByText('Cannot widen who can see responses once responses exist')
      ).toHaveCount(0);

      // Cancel keeps Admins only.
      await spaceMembers.click();
      const confirm = page.getByRole('alertdialog');
      await expect(confirm).toBeVisible();
      // "Show responses to members?" — with one known response the copy is
      // singular ("the 1 existing response").
      await expect(confirm).toContainText('Show responses to members?');
      await expect(confirm).toContainText(/existing response/i);
      await evidence(page, 'US3-AS4-widen-confirm');
      await confirm.getByRole('button', { name: /cancel/i }).click();
      await expect(confirm).toBeHidden();
      await expect(adminsOnly).toBeChecked();
      await expect(spaceMembers).not.toBeChecked();

      // Confirm selects Space members; saving the Post persists it.
      await spaceMembers.click();
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole('button', { name: 'Show responses to members' })
        .click();
      await expect(confirm).toBeHidden();
      await expect(spaceMembers).toBeChecked();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('button', { name: /^save$/i })).toBeHidden({
        timeout: 20_000,
      });
      await expect
        .poll(async () => (await lookupAs('m2', formWiden.formId)).canReadAll)
        .toBe(true);
      expect(await lookupAs('m2', formWiden.formId)).toMatchObject({
        canReadAll: true,
        total: 1,
        texts: [MARK.m1OnWiden],
      });
      await page.close();

      // M2 now reads M1's earlier response (submitted under Admins only).
      const m2 = await signIn(browser, 'm2');
      const m2Dialog = await openForm(m2, formWiden);
      await expect(
        m2Dialog.getByText(/Members of .* can see your response/)
      ).toBeVisible();
      await m2Dialog.getByRole('button', { name: 'View responses (1)' }).click();
      const table = m2.getByRole('dialog', { name: 'Form responses' });
      await expect(table.getByRole('cell', { name: MARK.m1OnWiden })).toBeVisible();
      await evidence(m2, 'US3-AS4-m2-reads-earlier-response');
      await m2.close();

      // Narrowing back never asks.
      const narrowPage = await signIn(browser, 'a2');
      const narrow = await openFormSettings(narrowPage, formWiden);
      const narrowGroup = narrow.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      await expect(
        narrowGroup.getByRole('radio', { name: 'Space members' })
      ).toBeChecked();
      await narrowGroup.getByRole('radio', { name: 'Admins only' }).click();
      await expect(narrowPage.getByRole('alertdialog')).toHaveCount(0);
      await expect(
        narrowGroup.getByRole('radio', { name: 'Admins only' })
      ).toBeChecked();
      await evidence(narrowPage, 'US3-AS4-narrow-no-confirm');
      await narrowPage.close();

      // API agrees: widening with a response is accepted.
      try {
        const widenAttempt = await updateCalloutForm(
          {
            formID: formAdmins.formId,
            settings: { visibility: CalloutFormResponseVisibility.Members },
          },
          await actorFor('a2')
        );
        expect(widenAttempt.error?.errors).toBeUndefined();
        expect(widenAttempt.data?.updateCalloutForm.settings.visibility).toBe(
          'MEMBERS'
        );
      } finally {
        // Put the shared Form back to Admins only for the later cases, even
        // when the widening assertions fail (the suite runs serially).
        must(
          await updateCalloutForm(
            {
              formID: formAdmins.formId,
              settings: { visibility: CalloutFormResponseVisibility.Admins },
            },
            await actorFor('a2')
          ),
          'narrow formAdmins back'
        );
      }
    });

    test('US3-AS5 the Space admin reads every response through View responses', async ({
      browser,
    }) => {
      await submitName('m2', formAdmins, CalloutFormResponseVisibility.Admins, MARK.m2OnAdmins);

      const page = await signIn(browser, 'admin');
      const dialog = await openForm(page, formAdmins);
      await expect(
        dialog.getByRole('button', { name: 'View responses (2)' })
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'View responses (2)' }).click();
      const table = page.getByRole('dialog', { name: 'Form responses' });
      await expect(table.getByRole('cell', { name: MARK.m1OnAdmins })).toBeVisible();
      await expect(table.getByRole('cell', { name: MARK.m2OnAdmins })).toBeVisible();
      await expect(table.getByText('Showing 2 of 2')).toBeVisible();
      await evidence(page, 'US3-AS5-admin-view-responses');
      await page.close();
    });

    test('US3-AS6 a response never surfaces outside lookup.calloutFormResponses, and only permitted readers get it', async ({
      browser,
    }) => {
      // Control callout that DOES surface in feeds (Post contribution) so the
      // absence assertions below are not vacuous.
      const a2 = await actorFor('a2');
      const control = must(
        await createCalloutWithData(
          {
            calloutsSetID: fixture.subCalloutsSetId,
            framing: {
              type: CalloutFramingType.None,
              profile: {
                displayName: `US3 control callout ${RUN}`,
                description: 'control',
              },
            },
            settings: {
              visibility: CalloutVisibility.Draft,
              contribution: {
                enabled: true,
                allowedTypes: [CalloutContributionType.Post],
                canAddContributions: CalloutAllowedActors.Members,
              },
            },
          },
          a2
        ),
        'create control callout'
      );
      const controlId = control.createCalloutOnCalloutsSet.id;
      must(
        await updateCalloutVisibility(
          controlId,
          CalloutVisibility.Published,
          a2,
          false
        ),
        'publish control callout'
      );
      must(
        await createContributionOnCallout(
          {
            calloutID: controlId,
            type: CalloutContributionType.Post,
            post: {
              profileData: {
                displayName: MARK.as6PostTitle,
                description: 'control post',
              },
            },
          },
          await actorFor('m1')
        ),
        'create control post'
      );

      // The Form response carrying the unique marker.
      const form = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 AS6 marker form ${RUN}`,
        CalloutFormResponseVisibility.Admins
      );
      const responseId = await submitName('m1', form, CalloutFormResponseVisibility.Admins, MARK.as6Answer);

      const leaked = (value: unknown) => {
        const text = JSON.stringify(value) ?? '';
        return text.includes(MARK.as6Answer) || text.includes(responseId);
      };

      // Contributions list + counts: the Form callout carries none, the control
      // callout does.
      for (const who of ['admin', 'a2', 'm1'] as Actor[]) {
        const formCallout = must(
          await readCalloutContributions(form.calloutId, await actorFor(who)),
          'form callout'
        ).lookup.callout!;
        expect(formCallout.contributions, `contributions as ${who}`).toEqual([]);
        expect(formCallout.contributionsCount).toEqual({
          post: 0,
          whiteboard: 0,
          link: 0,
          memo: 0,
          collaboraDocument: 0,
        });
        expect(formCallout.activity).toBe(0);
        expect(leaked(formCallout)).toBe(false);

        const controlCallout = must(
          await readCalloutContributions(controlId, await actorFor(who)),
          'control callout'
        ).lookup.callout!;
        expect(controlCallout.contributions).toHaveLength(1);
        expect(controlCallout.contributionsCount.post).toBe(1);
      }

      // Activity feed / log (Sub and S, including children).
      for (const [name, collaborationID] of [
        ['sub', fixture.subCollaborationId],
        ['S', fixture.spaceCollaborationId],
      ] as const) {
        for (const who of ['admin', 'a2'] as Actor[]) {
          // Activity entries land asynchronously: poll until the control Post
          // is present, then assert the response never reached the same log.
          let log: Array<{ type: string; description: string }> = [];
          await expect(async () => {
            log = must(
              await readActivityLogOnCollaboration(
                { collaborationID, includeChild: true, limit: 200 },
                await actorFor(who)
              ),
              `activity log ${name}/${who}`
            ).activityLogOnCollaboration;
            expect(
              log.some(e => (e.description ?? '').includes(MARK.as6PostTitle)),
              `control Post is in the activity log ${name}/${who}`
            ).toBe(true);
          }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 60_000 });
          expect(leaked(log), `activity ${name}/${who}`).toBe(false);
        }
      }

      // In-app notification list: no answer text, no response id; the payload
      // type never carries a response.
      for (const who of ['a2', 'admin'] as Actor[]) {
        const inApp = must(
          await readMyNotifications(await actorFor(who), { first: 50 }),
          `in-app ${who}`
        );
        expect(leaked(inApp), `in-app ${who}`).toBe(false);
      }

      // Reachability: response types are referenced ONLY from the lookup, the
      // response view types themselves and Mutation — never from Callout,
      // CalloutFraming, CalloutForm, ActivityLogEntry*, InAppNotification* or
      // any Subscription result type.
      const schema = await introspectSchemaFieldTypes(await actorFor('admin'));
      expect(schema.body.errors, 'introspection').toBeUndefined();
      const schemaTypes = schema.body.data!.__schema.types;
      const unwrap = (t: any): string | null =>
        t?.name ?? (t?.ofType ? unwrap(t.ofType) : null);
      const responseTypes = new Set([
        'CalloutFormResponse',
        'CalloutFormResponses',
        'PaginatedCalloutFormResponses',
      ]);
      const referencedFrom = new Set<string>();
      for (const t of schemaTypes) {
        for (const f of t.fields ?? []) {
          if (responseTypes.has(unwrap(f.type) ?? '')) referencedFrom.add(t.name);
        }
      }
      expect([...referencedFrom].sort()).toEqual(
        [
          'CalloutFormResponses',
          'LookupQueryResults',
          'Mutation',
          'PaginatedCalloutFormResponses',
        ].sort()
      );
      for (const t of schemaTypes) {
        const guarded =
          /^(Callout|CalloutFraming|CalloutForm|Subscription)$/.test(t.name) ||
          /^ActivityLogEntry/.test(t.name) ||
          /^InAppNotification/.test(t.name) ||
          /SubscriptionResult$/.test(t.name);
        if (!guarded) continue;
        for (const f of t.fields ?? []) {
          expect(
            /respon|answer/i.test(f.name) || responseTypes.has(unwrap(f.type) ?? ''),
            `${t.name}.${f.name} must not expose responses`
          ).toBe(false);
        }
      }

      // UI: the Sub "Recent activity" panel lists the control Post but never
      // the answer.
      const page = await signIn(browser, 'a2');
      await page.goto(fixture.subUrl);
      await page.getByRole('button', { name: /recent activity/i }).first().click();
      const activity = page.getByRole('dialog', { name: 'Recent Activity' });
      await expect(activity.getByText(MARK.as6PostTitle)).toBeVisible();
      await expect(page.getByText(MARK.as6Answer)).toHaveCount(0);
      await evidence(page, 'US3-AS6-recent-activity');
      await page.close();

      // Only the lookup returns it, and only to permitted readers.
      expect(await lookupAs('admin', form.formId)).toMatchObject({
        canReadAll: true,
        total: 1,
        texts: [MARK.as6Answer],
      });
      expect(await lookupAs('a2', form.formId)).toMatchObject({
        canReadAll: true,
        total: 1,
        texts: [MARK.as6Answer],
      });
      expect(await lookupAs('m1', form.formId)).toMatchObject({
        canReadAll: false,
        mine: 1,
        total: 1,
        texts: [MARK.as6Answer],
      });
      for (const who of ['m2', 'p', 'n'] as Actor[]) {
        expect(await lookupAs(who, form.formId), `lookup as ${who}`).toMatchObject({
          canReadAll: false,
          mine: 0,
          total: 0,
          texts: [],
        });
      }
      expect(await lookupAs('anonymous', form.formId)).toMatchObject({
        total: 0,
        texts: [],
      });
    });

    test('US3-AS7 a parent-Space-only member with inherited contribute submits and reads only own responses', async ({
      browser,
    }) => {
      const page = await signIn(browser, 'p');
      const dialog = await openForm(page, formMembers);
      await expect(
        dialog.getByText(/Members of .* can see your response/)
      ).toBeVisible();
      await expect(page.getByText(MARK.m1OnMembers)).toHaveCount(0);
      await dialog.getByRole('textbox', { name: /What is your name/ }).fill(MARK.pOnMembers);
      await dialog.getByRole('button', { name: 'Submit Form' }).click();
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await expect(dialog.getByText(MARK.pOnMembers)).toBeVisible();

      await page.reload();
      const reopened = page.getByRole('dialog').first();
      await expect(reopened.getByText(MARK.pOnMembers)).toBeVisible();
      await expect(page.getByText(MARK.m1OnMembers)).toHaveCount(0);
      await expect(reopened.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await evidence(page, 'US3-AS7-p-own-responses');
      await page.close();

      expect(await lookupAs('p', formMembers.formId)).toMatchObject({
        canReadAll: false,
        canModerate: false,
        mine: 1,
        total: 1,
        texts: [MARK.pOnMembers],
      });
      // Control: a Sub member reads all (M1's and P's), so P's narrower view is real.
      expect(await lookupAs('m2', formMembers.formId)).toMatchObject({
        canReadAll: true,
        total: 2,
      });
    });

    test('US3-AS8 an admin who created the Form and is demoted reads only own responses and cannot moderate', async ({
      browser,
    }) => {
      // A2 (still admin) submits one response of their own.
      await submitName('a2', formAdmins, CalloutFormResponseVisibility.Admins, MARK.a2Own);
      expect(await lookupAs('a2', formAdmins.formId)).toMatchObject({
        canReadAll: true,
        canModerate: true,
      });

      // Demote A2 to plain member.
      must(
        await removeRoleFromUser(
          fixture.userIds.a2,
          fixture.subRoleSetId,
          RoleName.Admin,
          await actorFor('admin')
        ),
        'demote a2'
      );

      const page = await signIn(browser, 'a2');
      const dialog = await openForm(page, formAdmins);
      await expect(dialog.getByRole('heading', { name: 'Your responses' })).toBeVisible();
      await expect(dialog.getByText(MARK.a2Own)).toBeVisible();
      await expect(page.getByText(MARK.m1OnAdmins)).toHaveCount(0);
      await expect(page.getByText(MARK.m2OnAdmins)).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /View responses/i })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /^Delete/i })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Withdraw' })).toHaveCount(1);
      await evidence(page, 'US3-AS8-a2-demoted');
      await page.close();

      // API: OWN scope only, no moderation, delete of another's response refused.
      expect(await lookupAs('a2', formAdmins.formId)).toMatchObject({
        canReadAll: false,
        canModerate: false,
        mine: 1,
        total: 1,
        texts: [MARK.a2Own],
      });
      const all = await readCalloutFormResponses(
        formAdmins.formId,
        await actorFor('admin'),
        50
      );
      const others = must(all, 'admin lookup').lookup.calloutFormResponses.all
        .responses;
      const m1Response = others.find(r => r.answers[0]?.text === MARK.m1OnAdmins);
      expect(m1Response, "M1's response exists").toBeDefined();
      const attempt = await deleteCalloutFormResponse(
        m1Response!.id,
        await actorFor('a2')
      );
      expect(firstError(attempt)?.extensions?.code).toBe('FORBIDDEN_POLICY');
      expect((await lookupAs('admin', formAdmins.formId)).total).toBe(3);
    });
  }
);
