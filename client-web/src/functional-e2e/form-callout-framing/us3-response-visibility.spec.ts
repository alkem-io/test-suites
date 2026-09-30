import { expect, type Browser, type BrowserContext, type Page, test } from '@playwright/test';
import { fillSecret } from '../helpers/login.helper';

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
 * AS4  with 1 response, widening to "Space members" is disabled with the
 *      explanation, narrowing stays enabled (UI) and widening is rejected (API).
 * AS5  the S admin (platform admin) opens the Sub Form: "View responses" lists
 *      every response.
 * AS6  a stored response with a unique marker never appears in the contributions
 *      list/count, the activity log/feed, the in-app notification payloads, and
 *      the response types are reachable from no Callout / ActivityLogEntry /
 *      InAppNotification / Subscription type; only lookup.calloutFormResponses
 *      returns it, and only to permitted readers.
 *      NOTE: search is NOT exercised live here (the forge stack has no
 *      Elasticsearch); the search negative lives in
 *      server-api/src/functional-api/callout/form (never-appears it-spec). The
 *      live-socket subscription check is covered by the schema reachability
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
const GRAPHQL = `${BASE}/api/private/non-interactive/graphql`;
const PUBLIC_GRAPHQL = `${BASE}/api/public/graphql`;
const USER_PASSWORD = 'Forge080-Passw0rd!x';

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

type GqlResult<T = any> = { data?: T; errors?: Array<any> };

async function gql<T = any>(
  who: Actor,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GqlResult<T>> {
  const token = await mintToken(
    emailOf(who),
    who === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD
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

async function gqlAnonymous<T = any>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GqlResult<T>> {
  const res = await fetch(PUBLIC_GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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
  const data = await must(await gql(who, '{ me { user { id } } }'), 'me');
  return data.me.user.id as string;
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

const QUESTIONS = () => [
  {
    prompt: 'What is your name?',
    explanation: 'Your full name',
    type: 'SHORT_TEXT',
    required: true,
  },
  { prompt: 'Tell us more', type: 'LONG_TEXT', required: false },
  {
    prompt: 'Pick one',
    type: 'SINGLE_CHOICE',
    required: false,
    options: [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }],
  },
  {
    prompt: 'Pick several',
    type: 'MULTIPLE_CHOICE',
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
  visibility: 'ADMINS' | 'MEMBERS'
): Promise<FormFixture> {
  const created = await must(
    await gql(
      creator,
      `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $d) {
          id
          framing { profile { url displayName } form { id questions { id prompt options { id label } } } }
        }
      }`,
      {
        d: {
          calloutsSetID,
          framing: {
            type: 'FORM',
            profile: { displayName, description: 'US3 form' },
            form: {
              questions: QUESTIONS(),
              settings: { visibility, responseMode: 'SINGLE' },
            },
          },
          settings: {
            visibility: 'DRAFT',
            contribution: { enabled: false },
            framing: { commentsEnabled: false },
          },
        },
      }
    ),
    `create form ${displayName}`
  );
  const callout = created.createCalloutOnCalloutsSet;
  await must(
    await gql(
      creator,
      `mutation ($d: UpdateCalloutVisibilityInput!) {
        updateCalloutVisibility(calloutData: $d) { id }
      }`,
      {
        d: {
          calloutID: callout.id,
          visibility: 'PUBLISHED',
          sendNotification: false,
        },
      }
    ),
    `publish form ${displayName}`
  );
  return {
    calloutId: callout.id as string,
    url: callout.framing.profile.url as string,
    title: displayName,
    formId: callout.framing.form.id as string,
    questions: callout.framing.form.questions as Question[],
  };
}

const SUBMIT = `mutation ($d: SubmitCalloutFormResponseInput!) {
  submitCalloutFormResponse(responseData: $d) { id }
}`;

async function submitName(
  who: Actor,
  form: FormFixture,
  visibility: 'ADMINS' | 'MEMBERS',
  text: string
) {
  const data = await must(
    await gql(who, SUBMIT, {
      d: {
        formID: form.formId,
        acknowledgedVisibility: visibility,
        answers: [{ questionID: form.questions[0].id, text }],
      },
    }),
    `submit as ${who}`
  );
  return data.submitCalloutFormResponse.id as string;
}

const LOOKUP = `query ($f: UUID!) {
  lookup {
    calloutFormResponses(formID: $f, first: 50) {
      canReadAll
      canModerate
      mine { id }
      all { total responses { id answers { text } } }
    }
  }
}`;

async function lookupAs(who: Actor | 'anonymous', formId: string) {
  const result =
    who === 'anonymous'
      ? await gqlAnonymous(LOOKUP, { f: formId })
      : await gql(who, LOOKUP, { f: formId });
  const view = (await must(result, `lookup as ${who}`)).lookup
    .calloutFormResponses;
  return {
    canReadAll: view.canReadAll as boolean,
    canModerate: view.canModerate as boolean,
    mine: (view.mine as unknown[]).length,
    total: view.all.total as number,
    texts: (view.all.responses as Array<{ answers: Array<{ text: string }> }>).map(
      r => r.answers[0]?.text
    ),
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

      const me = await must(
        await gql('admin', '{ me { user { account { id } } } }'),
        'admin account'
      );
      const space = (
        await must(
          await gql(
            'admin',
            `mutation ($d: CreateSpaceOnAccountInput!) {
              createSpace(spaceData: $d) {
                id
                about { profile { url } }
                community { roleSet { id } }
                collaboration { id calloutsSet { id } }
              }
            }`,
            {
              d: {
                accountID: me.me.user.account.id,
                nameID: `us3-space-${RUN}`,
                about: { profileData: { displayName: `US3 Space ${RUN}` } },
                collaborationData: { calloutsSetData: {} },
              },
            }
          ),
          'create space'
        )
      ).createSpace;
      await must(
        await gql(
          'admin',
          `mutation ($d: UpdateSpaceSettingsInput!) {
            updateSpaceSettings(settingsData: $d) { id settings { privacy { mode } } }
          }`,
          { d: { spaceID: space.id, settings: { privacy: { mode: 'PUBLIC' } } } }
        ),
        'make space public'
      );
      fixture.spaceUrl = space.about.profile.url;
      fixture.spaceCalloutsSetId = space.collaboration.calloutsSet.id;
      fixture.spaceCollaborationId = space.collaboration.id;

      const subspace = (
        await must(
          await gql(
            'admin',
            `mutation ($d: CreateSubspaceInput!) {
              createSubspace(subspaceData: $d) {
                id
                about { profile { url displayName } }
                community { roleSet { id } }
                collaboration { id calloutsSet { id } }
              }
            }`,
            {
              d: {
                spaceID: space.id,
                nameID: `us3-sub-${RUN}`,
                about: { profileData: { displayName: `US3 Sub ${RUN}` } },
                collaborationData: { calloutsSetData: {} },
              },
            }
          ),
          'create subspace'
        )
      ).createSubspace;
      fixture.subUrl = subspace.about.profile.url;
      fixture.subCalloutsSetId = subspace.collaboration.calloutsSet.id;
      fixture.subRoleSetId = subspace.community.roleSet.id;
      fixture.subCollaborationId = subspace.collaboration.id;

      const assign = async (roleSetID: string, who: Persona, role: string) =>
        must(
          await gql(
            'admin',
            'mutation ($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }',
            { d: { actorID: fixture.userIds[who], role, roleSetID } }
          ),
          `assign ${role} ${who}`
        );
      // M1, M2, P, A2 are members of S; P is a member of S ONLY (inherits
      // contribute on Sub through inheritMembershipRights, on by default).
      for (const who of ['m1', 'm2', 'p', 'a2'] as Persona[]) {
        await assign(space.community.roleSet.id, who, 'MEMBER');
      }
      for (const who of ['m1', 'm2', 'a2'] as Persona[]) {
        await assign(fixture.subRoleSetId, who, 'MEMBER');
      }
      await assign(fixture.subRoleSetId, 'a2', 'ADMIN');

      formAdmins = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 Admins-only Form ${RUN}`,
        'ADMINS'
      );
      formMembers = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 Members Form ${RUN}`,
        'MEMBERS'
      );
      formSpace = await createForm(
        'admin',
        fixture.spaceCalloutsSetId,
        `US3 Space Members Form ${RUN}`,
        'MEMBERS'
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
      await submitName('m1', formAdmins, 'ADMINS', MARK.m1OnAdmins);

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
        'xpath=ancestor::*[.//button[contains(., "Submit response")]][1]'
      );
      await expect(
        card.getByRole('button', { name: /Submit response/ })
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
      await submitName('m1', formSpace, 'MEMBERS', MARK.m1OnSpace);

      // Anonymous visitor.
      const anonContext = await browser.newContext({
        viewport: { width: 1500, height: 1000 },
      });
      const anon = await anonContext.newPage();
      const anonDialog = await openForm(anon, formSpace);
      await expect(
        anonDialog.getByText('You do not have permission to respond to this form.')
      ).toBeVisible();
      await expect(anonDialog.getByRole('button', { name: 'Submit response' })).toHaveCount(0);
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
      await expect(dialog.getByRole('button', { name: 'Submit response' })).toHaveCount(0);
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

    test('US3-AS4 with a response, widening is disabled with the explanation, narrowing stays enabled', async ({
      browser,
    }) => {
      await submitName('m1', formMembers, 'MEMBERS', MARK.m1OnMembers);
      const page = await signIn(browser, 'a2');

      // Admins only + 1 response: widening to Space members is disabled + explained.
      const widen = await openFormSettings(page, formAdmins);
      const widenGroup = widen.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      await expect(widenGroup.getByRole('radio', { name: 'Space members' })).toBeDisabled();
      await expect(
        widen.getByText('Cannot widen who can see responses once responses exist')
      ).toBeVisible();
      await evidence(page, 'US3-AS4-widen-disabled');
      await page.close();

      // Space members + 1 response: narrowing to Admins only stays enabled.
      const narrowPage = await signIn(browser, 'a2');
      const narrow = await openFormSettings(narrowPage, formMembers);
      const narrowGroup = narrow.getByRole('radiogroup', {
        name: 'Who can see the responses',
      });
      await expect(narrowGroup.getByRole('radio', { name: 'Space members' })).toBeChecked();
      await expect(narrowGroup.getByRole('radio', { name: 'Admins only' })).toBeEnabled();
      await evidence(narrowPage, 'US3-AS4-narrow-enabled');
      await narrowPage.close();

      // API agrees: widening is refused.
      const widenAttempt = await gql(
        'a2',
        'mutation ($d: UpdateCalloutFormInput!) { updateCalloutForm(formData: $d) { id } }',
        { d: { formID: formAdmins.formId, settings: { visibility: 'MEMBERS' } } }
      );
      expect(JSON.stringify(widenAttempt.errors)).toContain('cannot be widened');
    });

    test('US3-AS5 the Space admin reads every response through View responses', async ({
      browser,
    }) => {
      await submitName('m2', formAdmins, 'ADMINS', MARK.m2OnAdmins);

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
      const control = await must(
        await gql(
          'a2',
          `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
            createCalloutOnCalloutsSet(calloutData: $d) { id }
          }`,
          {
            d: {
              calloutsSetID: fixture.subCalloutsSetId,
              framing: {
                type: 'NONE',
                profile: {
                  displayName: `US3 control callout ${RUN}`,
                  description: 'control',
                },
              },
              settings: {
                visibility: 'DRAFT',
                contribution: {
                  enabled: true,
                  allowedTypes: ['POST'],
                  canAddContributions: 'MEMBERS',
                },
              },
            },
          }
        ),
        'create control callout'
      );
      const controlId = control.createCalloutOnCalloutsSet.id as string;
      await must(
        await gql(
          'a2',
          'mutation ($d: UpdateCalloutVisibilityInput!) { updateCalloutVisibility(calloutData: $d) { id } }',
          {
            d: {
              calloutID: controlId,
              visibility: 'PUBLISHED',
              sendNotification: false,
            },
          }
        ),
        'publish control callout'
      );
      await must(
        await gql(
          'm1',
          `mutation ($d: CreateContributionOnCalloutInput!) {
            createContributionOnCallout(contributionData: $d) { id }
          }`,
          {
            d: {
              calloutID: controlId,
              type: 'POST',
              post: {
                profileData: {
                  displayName: MARK.as6PostTitle,
                  description: 'control post',
                },
              },
            },
          }
        ),
        'create control post'
      );

      // The Form response carrying the unique marker.
      const form = await createForm(
        'a2',
        fixture.subCalloutsSetId,
        `US3 AS6 marker form ${RUN}`,
        'ADMINS'
      );
      const responseId = await submitName('m1', form, 'ADMINS', MARK.as6Answer);

      const leaked = (value: unknown) => {
        const text = JSON.stringify(value) ?? '';
        return text.includes(MARK.as6Answer) || text.includes(responseId);
      };

      // Contributions list + counts: the Form callout carries none, the control
      // callout does.
      const CALLOUT = `query ($id: UUID!) {
        lookup { callout(ID: $id) {
          id activity
          contributions { id post { profile { displayName } } }
          contributionsCount { post whiteboard link memo collaboraDocument }
        } }
      }`;
      for (const who of ['admin', 'a2', 'm1'] as Actor[]) {
        const formCallout = (
          await must(await gql(who, CALLOUT, { id: form.calloutId }), 'form callout')
        ).lookup.callout;
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

        const controlCallout = (
          await must(await gql(who, CALLOUT, { id: controlId }), 'control callout')
        ).lookup.callout;
        expect(controlCallout.contributions).toHaveLength(1);
        expect(controlCallout.contributionsCount.post).toBe(1);
      }

      // Activity feed / log (Sub and S, including children).
      for (const [name, collaborationID] of [
        ['sub', fixture.subCollaborationId],
        ['S', fixture.spaceCollaborationId],
      ] as const) {
        for (const who of ['admin', 'a2'] as Actor[]) {
          const log = (
            await must(
              await gql(
                who,
                `query ($d: ActivityLogInput!) {
                  activityLogOnCollaboration(queryData: $d) { id type description }
                }`,
                { d: { collaborationID, includeChild: true, limit: 200 } }
              ),
              `activity log ${name}/${who}`
            )
          ).activityLogOnCollaboration as Array<{
            type: string;
            description: string;
          }>;
          expect(leaked(log), `activity ${name}/${who}`).toBe(false);
          expect(
            log.some(e => (e.description ?? '').includes(MARK.as6PostTitle)),
            `control Post is in the activity log ${name}/${who}`
          ).toBe(true);
        }
      }

      // In-app notification list: no answer text, no response id; the payload
      // type never carries a response.
      for (const who of ['a2', 'admin'] as Actor[]) {
        const inApp = await must(
          await gql(
            who,
            'query { me { notifications(first: 50) { inAppNotifications { id type payload { __typename } } } } }'
          ),
          `in-app ${who}`
        );
        expect(leaked(inApp), `in-app ${who}`).toBe(false);
      }

      // Reachability: response types are referenced ONLY from the lookup, the
      // response view types themselves and Mutation — never from Callout,
      // CalloutFraming, CalloutForm, ActivityLogEntry*, InAppNotification* or
      // any Subscription result type.
      const schema = await must(
        await gql(
          'admin',
          '{ __schema { types { name fields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } } }'
        ),
        'introspection'
      );
      const unwrap = (t: any): string | null =>
        t?.name ?? (t?.ofType ? unwrap(t.ofType) : null);
      const responseTypes = new Set([
        'CalloutFormResponse',
        'CalloutFormResponses',
        'PaginatedCalloutFormResponses',
      ]);
      const referencedFrom = new Set<string>();
      for (const t of schema.__schema.types as Array<any>) {
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
      for (const t of schema.__schema.types as Array<any>) {
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
      await dialog.getByRole('button', { name: 'Submit response' }).click();
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
      await submitName('a2', formAdmins, 'ADMINS', MARK.a2Own);
      expect(await lookupAs('a2', formAdmins.formId)).toMatchObject({
        canReadAll: true,
        canModerate: true,
      });

      // Demote A2 to plain member.
      await must(
        await gql(
          'admin',
          'mutation ($d: RemoveRoleOnRoleSetInput!) { removeRoleFromUser(roleData: $d) { id } }',
          {
            d: {
              actorID: fixture.userIds.a2,
              role: 'ADMIN',
              roleSetID: fixture.subRoleSetId,
            },
          }
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
      const all = await gql('admin', LOOKUP, { f: formAdmins.formId });
      const others = (
        await must(all, 'admin lookup')
      ).lookup.calloutFormResponses.all.responses as Array<{
        id: string;
        answers: Array<{ text: string }>;
      }>;
      const m1Response = others.find(r => r.answers[0]?.text === MARK.m1OnAdmins);
      expect(m1Response, "M1's response exists").toBeDefined();
      const attempt = await gql(
        'a2',
        'mutation ($d: DeleteCalloutFormResponseInput!) { deleteCalloutFormResponse(deleteData: $d) { id } }',
        { d: { responseID: m1Response!.id } }
      );
      expect(attempt.errors?.[0]?.extensions?.code).toBe('FORBIDDEN_POLICY');
      expect((await lookupAs('admin', formAdmins.formId)).total).toBe(3);
    });
  }
);
