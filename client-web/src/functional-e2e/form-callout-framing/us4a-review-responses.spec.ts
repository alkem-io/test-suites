import { expect, type Browser, type Page, test } from '@playwright/test';
import { fillSecret } from '../helpers/login.helper';

/**
 * workspace#080-form-callout-framing — User Story 4a (P1): Review responses.
 *
 * AS1  single-response dialog + all-at-once table: rows per respondent, question
 *      columns (a removed question stays readable under its snapshot prompt),
 *      option labels, "No answer given", "Deleted user".
 * AS2  120 API-created responses load in pages of 50 and all 120 are reachable.
 * AS3  deleting a response asks for confirmation first; the row goes away; no
 *      edit affordance exists anywhere.
 * AS4  with "Space members" visibility a member reads every response but has no
 *      delete on the others'; the API delete of another's response is forbidden.
 *
 * Self-contained: provisions its own Kratos identities (admin API), Space,
 * Subspace and Forms through the non-interactive GraphQL endpoint, then walks the
 * real UI. Nothing is shared with other specs.
 *
 * Environment (defaults suit the local forge stack):
 *   ALKEMIO_BASE_URL      http://localhost:3000
 *   KRATOS_ADMIN_URL      Kratos ADMIN base incl. /admin, e.g. http://localhost:32841/admin
 *   ALKEMIO_ADMIN_EMAIL   admin@alkem.io
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
const USER_PASSWORD = 'Forge080-Passw0rd!x';

const RUN = Date.now().toString(36);
const email = (tag: string) => `us4a-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'm2' | 'gone';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  m2: email('m2'),
  gone: email('gone'),
};

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

type GqlResult<T = any> = { data?: T; errors?: Array<any> };

async function gql<T = any>(
  userEmail: string,
  query: string,
  variables: Record<string, unknown> = {},
  password = USER_PASSWORD
): Promise<GqlResult<T>> {
  const token = await mintToken(
    userEmail,
    userEmail === ADMIN_EMAIL ? ADMIN_PASSWORD : password
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
  expect(result.errors, `${what}: ${JSON.stringify(result.errors)}`).toBeUndefined();
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

async function meId(userEmail: string) {
  const data = await must(await gql(userEmail, '{ me { user { id } } }'), 'me');
  return data.me.user.id as string;
}

type Question = {
  id: string;
  prompt: string;
  options?: Array<{ id: string; label: string }> | null;
};

async function createForm(
  displayName: string,
  questions: Array<Record<string, unknown>>,
  settings: Record<string, unknown> | undefined
) {
  const created = await must(
    await gql(
      personaEmail.a2,
      `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $d) {
          id
          framing { profile { url } form { id questions { id prompt options { id label } } } }
        }
      }`,
      {
        d: {
          calloutsSetID: fixture.calloutsSetId,
          framing: {
            type: 'FORM',
            profile: { displayName, description: 'US4a form' },
            form: { questions, settings },
          },
          settings: {
            visibility: 'DRAFT',
            contribution: { enabled: false },
            framing: { commentsEnabled: false },
          },
        },
      }
    ),
    'create form'
  );
  const callout = created.createCalloutOnCalloutsSet;
  await must(
    await gql(
      personaEmail.a2,
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
    'publish form'
  );
  return {
    url: callout.framing.profile.url as string,
    formId: callout.framing.form.id as string,
    questions: callout.framing.form.questions as Question[],
  };
}

const SUBMIT = `mutation ($d: SubmitCalloutFormResponseInput!) {
  submitCalloutFormResponse(responseData: $d) { id createdBy { id } }
}`;

async function submit(
  persona: Persona,
  formId: string,
  visibility: 'ADMINS' | 'MEMBERS',
  answers: Array<Record<string, unknown>>
) {
  const data = await must(
    await gql(personaEmail[persona], SUBMIT, {
      d: { formID: formId, acknowledgedVisibility: visibility, answers },
    }),
    `submit as ${persona}`
  );
  return data.submitCalloutFormResponse.id as string;
}

const totalOf = async (persona: Persona, formId: string) => {
  const data = await must(
    await gql(
      personaEmail[persona],
      'query ($id: UUID!) { lookup { calloutFormResponses(formID: $id) { all { total } } } }',
      { id: formId }
    ),
    'total'
  );
  return data.lookup.calloutFormResponses.all.total as number;
};

async function signIn(browser: Browser, userEmail: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(BASE);
  const login = page.getByRole('link', { name: 'Log in', exact: true });
  await login.waitFor({ state: 'visible', timeout: 30_000 });
  await login.click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(userEmail);
  await fillSecret(page.getByRole('textbox', { name: 'Password' }), USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/, { timeout: 30_000 });
  const newDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (await newDesign.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await newDesign.click();
  }
  return page;
}

const fixture = {
  calloutsSetId: '',
  userIds: {} as Record<Persona, string>,
};

let one: Awaited<ReturnType<typeof createForm>>;
let many: Awaited<ReturnType<typeof createForm>>;
let members: Awaited<ReturnType<typeof createForm>>;
const membersResponses: Record<string, string> = {};

test.describe.configure({ mode: 'serial' });

test.describe(
  'US4a — review responses',
  { tag: ['@forge-acceptance'] },
  () => {
    test.setTimeout(300_000);

    test.beforeAll(async () => {
      expect(
        KRATOS_ADMIN,
        'KRATOS_ADMIN_URL must point at the Kratos admin API (e.g. http://localhost:32841/admin)'
      ).not.toBe('');

      await createIdentity(personaEmail.a2, 'Ada', 'Reviewer');
      await createIdentity(personaEmail.m1, 'Mia', 'Memberone');
      await createIdentity(personaEmail.m2, 'Max', 'Membertwo');
      await createIdentity(personaEmail.gone, 'Gina', 'Goner');
      for (const p of ['a2', 'm1', 'm2', 'gone'] as Persona[]) {
        fixture.userIds[p] = await meId(personaEmail[p]);
      }

      const admin = ADMIN_EMAIL;
      const me = await must(
        await gql(admin, '{ me { user { account { id } } } }'),
        'admin account'
      );
      const space = (
        await must(
          await gql(
            admin,
            `mutation ($d: CreateSpaceOnAccountInput!) {
              createSpace(spaceData: $d) { id community { roleSet { id } } }
            }`,
            {
              d: {
                accountID: me.me.user.account.id,
                nameID: `us4a-space-${RUN}`,
                about: { profileData: { displayName: `US4a Space ${RUN}` } },
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
            admin,
            `mutation ($d: CreateSubspaceInput!) {
              createSubspace(subspaceData: $d) {
                id
                community { roleSet { id } }
                collaboration { calloutsSet { id } }
              }
            }`,
            {
              d: {
                spaceID: space.id,
                nameID: `us4a-sub-${RUN}`,
                about: { profileData: { displayName: `US4a Sub ${RUN}` } },
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
      fixture.calloutsSetId = sub.collaboration.calloutsSet.id;

      const assign = async (roleSetID: string, p: Persona, role: string) =>
        must(
          await gql(
            admin,
            'mutation ($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }',
            { d: { actorID: fixture.userIds[p], role, roleSetID } }
          ),
          `assign ${role} ${p}`
        );
      for (const p of ['a2', 'm1', 'm2', 'gone'] as Persona[]) {
        await assign(space.community.roleSet.id, p, 'MEMBER');
        await assign(sub.community.roleSet.id, p, 'MEMBER');
      }
      await assign(sub.community.roleSet.id, 'a2', 'ADMIN');

      // Form One — 5 questions (the last is removed later), ADMINS, SINGLE.
      one = await createForm(
        'US4a Form One',
        [
          { prompt: 'What is your name?', type: 'SHORT_TEXT', required: true },
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
            options: [
              { label: 'One' },
              { label: 'Two' },
              { label: 'Three' },
              { label: 'Four' },
            ],
          },
          { prompt: 'Dietary needs (to be removed)', type: 'SHORT_TEXT' },
        ],
        undefined
      );
      const [name, more, pick, several, diet] = one.questions;
      const opt = (q: Question, label: string) =>
        q.options!.find(o => o.label === label)!.id;
      await submit('m1', one.formId, 'ADMINS', [
        { questionID: name.id, text: 'Mia Memberone' },
        { questionID: more.id, text: 'Loves pizza' },
        { questionID: pick.id, selectedOptionIDs: [opt(pick, 'Beta')] },
        {
          questionID: several.id,
          selectedOptionIDs: [opt(several, 'One'), opt(several, 'Three')],
        },
        { questionID: diet.id, text: 'Vegan' },
      ]);
      await submit('m2', one.formId, 'ADMINS', [
        { questionID: name.id, text: 'Max Membertwo' },
      ]);
      await submit('gone', one.formId, 'ADMINS', [
        { questionID: name.id, text: 'Gina Goner' },
        { questionID: pick.id, selectedOptionIDs: [opt(pick, 'Gamma')] },
        { questionID: diet.id, text: 'Nuts allergy' },
      ]);
      await submit('a2', one.formId, 'ADMINS', [
        { questionID: name.id, text: 'Ada Reviewer' },
        { questionID: several.id, selectedOptionIDs: [opt(several, 'Two')] },
      ]);
      // Remove the last question (its answers stay, under the snapshot prompt).
      await must(
        await gql(
          personaEmail.a2,
          'mutation ($d: UpdateCalloutFormInput!) { updateCalloutForm(formData: $d) { id } }',
          {
            d: {
              formID: one.formId,
              questions: (
                [
                  [name, 'SHORT_TEXT', true],
                  [more, 'LONG_TEXT', false],
                  [pick, 'SINGLE_CHOICE', false],
                  [several, 'MULTIPLE_CHOICE', false],
                ] as Array<[Question, string, boolean]>
              ).map(([q, type, required]) => ({
                id: q.id,
                prompt: q.prompt,
                type,
                required,
                options: q.options?.map(o => ({ id: o.id, label: o.label })),
              })),
            },
          }
        ),
        'remove question'
      );
      // The submitter deletes their account -> the response is anonymised.
      await must(
        await gql(
          admin,
          'mutation ($d: DeleteUserInput!) { deleteUser(deleteData: $d) { id } }',
          { d: { ID: fixture.userIds.gone, deleteIdentity: true } }
        ),
        'delete account'
      );
    });

    test('US4a-AS1 single dialog and all-at-once table', async ({ browser }) => {
      const page = await signIn(browser, personaEmail.a2);
      await page.goto(one.url);
      await page.getByRole('button', { name: /View responses \(4\)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Form responses' });
      await expect(dialog.getByRole('row')).toHaveCount(5);
      await expect(
        dialog.getByRole('columnheader', { name: /Dietary needs \(to be removed\)/ })
      ).toContainText('removed question');
      const gone = dialog.getByRole('row').filter({ hasText: 'Gina Goner' });
      await expect(gone.getByRole('cell').first()).toHaveText('Deleted user');
      await expect(gone).toContainText('Gamma');
      await expect(gone).toContainText('Nuts allergy');
      await expect(gone).toContainText('No answer given');
      const mia = dialog.getByRole('row').filter({ hasText: 'Mia Memberone' });
      await expect(mia).toContainText('Beta');
      await expect(mia).toContainText('One, Three');

      await gone.getByRole('button', { name: 'Open response' }).click();
      const single = page.getByRole('dialog', {
        name: 'Response from Deleted user',
      });
      await expect(single.getByText('Nuts allergy')).toBeVisible();
      await expect(
        single.getByText('Dietary needs (to be removed) (removed question)')
      ).toBeVisible();
      await expect(single.getByText('No answer given').first()).toBeVisible();
      await page.context().close();
    });

    test('US4a-AS2 120 responses load in pages of 50', async ({ browser }) => {
      many = await createForm(
        'US4a Form Many',
        [
          { prompt: 'Attendee name', type: 'SHORT_TEXT', required: true },
          {
            prompt: 'Diet',
            type: 'SINGLE_CHOICE',
            options: [{ label: 'Vegan' }, { label: 'Vegetarian' }, { label: 'Any' }],
          },
        ],
        { responseMode: 'MULTIPLE' }
      );
      const [attendee, diet] = many.questions;
      for (let i = 1; i <= 120; i++) {
        await submit('m1', many.formId, 'ADMINS', [
          { questionID: attendee.id, text: `Attendee ${String(i).padStart(3, '0')}` },
          { questionID: diet.id, selectedOptionIDs: [diet.options![i % 3].id] },
        ]);
      }
      expect(await totalOf('a2', many.formId)).toBe(120);

      const page = await signIn(browser, personaEmail.a2);
      const pageSizes: number[] = [];
      page.on('request', request => {
        const body = request.postData() ?? '';
        if (request.method() === 'POST' && body.includes('calloutFormResponses')) {
          const first = (JSON.parse(body).variables ?? {}).first;
          if (typeof first === 'number' && first > 1) pageSizes.push(first);
        }
      });
      const failures: string[] = [];
      page.on('response', response => {
        if (response.status() >= 500) failures.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(many.url);
      await page.getByRole('button', { name: /View responses \(120\)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Form responses' });
      await expect(dialog.getByRole('row')).toHaveCount(51);
      await expect(dialog.getByText('Showing 50 of 120')).toBeVisible();
      await dialog.getByRole('button', { name: 'Load more' }).click();
      await expect(dialog.getByText('Showing 100 of 120')).toBeVisible();
      await dialog.getByRole('button', { name: 'Load more' }).click();
      await expect(dialog.getByText('Showing 120 of 120')).toBeVisible();
      await expect(dialog.getByRole('row')).toHaveCount(121);
      await expect(dialog.getByRole('button', { name: 'Load more' })).toHaveCount(0);
      await expect(dialog.getByText('Attendee 120')).toBeVisible();
      expect(Math.max(...pageSizes)).toBeLessThanOrEqual(50);
      expect(failures).toEqual([]);
      await page.context().close();
    });

    test('US4a-AS3 delete asks for confirmation; no edit affordance', async ({
      browser,
    }) => {
      const page = await signIn(browser, personaEmail.a2);
      await page.goto(one.url);
      await page.getByRole('button', { name: /View responses \(4\)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Form responses' });
      await expect(dialog.getByRole('row')).toHaveCount(5);
      await expect(dialog.locator('input, textarea')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: /edit|modify/i })
      ).toHaveCount(0);

      const max = () => dialog.getByRole('row').filter({ hasText: 'Max Membertwo' });
      const confirm = page.getByRole('alertdialog', { name: 'Delete this response?' });
      await max().getByRole('button', { name: 'Delete response' }).click();
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toBeHidden();
      await expect(max()).toHaveCount(1);
      expect(await totalOf('a2', one.formId)).toBe(4);

      await max().getByRole('button', { name: 'Delete response' }).click();
      await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(max()).toHaveCount(0);
      await expect(dialog.getByRole('row')).toHaveCount(4);
      expect(await totalOf('a2', one.formId)).toBe(3);
      await page.context().close();
    });

    test('US4a-AS4 members read all, cannot delete others', async ({ browser }) => {
      members = await createForm(
        'US4a Form Members',
        [
          { prompt: 'Your name', type: 'SHORT_TEXT', required: true },
          {
            prompt: 'Colour',
            type: 'SINGLE_CHOICE',
            options: [{ label: 'Red' }, { label: 'Blue' }],
          },
        ],
        { visibility: 'MEMBERS' }
      );
      const [who, colour] = members.questions;
      for (const [p, n, o] of [
        ['m1', 'Mia One', 0],
        ['m2', 'Max Two', 1],
        ['a2', 'Ada Admin', 0],
      ] as Array<[Persona, string, number]>) {
        membersResponses[p] = await submit(p, members.formId, 'MEMBERS', [
          { questionID: who.id, text: n },
          { questionID: colour.id, selectedOptionIDs: [colour.options![o].id] },
        ]);
      }

      const page = await signIn(browser, personaEmail.m2);
      await page.goto(members.url);
      await page.getByRole('button', { name: /View responses \(3\)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Form responses' });
      await expect(dialog.getByRole('row')).toHaveCount(4);
      await expect(dialog).toContainText('Mia One');
      await expect(dialog).toContainText('Max Two');
      await expect(dialog).toContainText('Ada Admin');
      await expect(dialog.getByRole('button', { name: 'Delete response' })).toHaveCount(0);
      await dialog
        .getByRole('row')
        .filter({ hasText: 'Mia One' })
        .getByRole('button', { name: 'Open response' })
        .click();
      const single = page.getByRole('dialog', { name: /Response from/ });
      await expect(single.getByText('Mia One')).toBeVisible();
      await expect(single.getByRole('button', { name: 'Delete response' })).toHaveCount(0);
      await page.context().close();

      for (const target of ['m1', 'a2']) {
        const res = await gql(
          personaEmail.m2,
          'mutation ($d: DeleteCalloutFormResponseInput!) { deleteCalloutFormResponse(deleteData: $d) { id } }',
          { d: { responseID: membersResponses[target] } }
        );
        expect(res.data ?? null).toBeNull();
        expect(res.errors?.[0]?.extensions?.code).toBe('FORBIDDEN_POLICY');
      }
      expect(await totalOf('a2', members.formId)).toBe(3);
    });
  }
);
