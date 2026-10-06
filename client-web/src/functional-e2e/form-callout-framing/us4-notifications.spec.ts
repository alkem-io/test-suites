import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { expect, type Browser, type Page, test } from '@playwright/test';
import { harnessPostgresConfigured, queryHarnessDb } from '@alkemio/tests-lib';
import { fillSecret } from '../helpers/login.helper';

/**
 * workspace#080-form-callout-framing — User Story 4 (P1): Notifications on
 * response submission.
 *
 * AS1  a member's submission notifies the (sub)space admins (email with the
 *      pinned subject, in-app linking to the Post, one push emit per active
 *      subscription); a parent-Space-only admin receives nothing.
 * AS2  the submitter gets ONE receipt (pinned subject) that states who can
 *      read the response, links to the Post and repeats none of the answers.
 * AS3  no generic "new contribution" notification, mail or in-app, to anyone.
 * AS4  the admin email / in-app text names the submitter and the Form, links to
 *      the Post and carries no answer text.
 * AS5  an admin who submits gets the receipt only — no admin notification (mail,
 *      in-app, push) for their own response.
 * AS6  (needs NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD) RE-SCOPED:
 *      the spec's "delivery fails" (FR-024a, the server's publish failing) has
 *      no infrastructure lever here and is covered by server unit tests. This
 *      walk proves the weaker, operational property instead: with the
 *      notifications CONSUMER stopped the submission still succeeds and the
 *      queued mails arrive once it is back (at-least-once delivery).
 * AS7  MULTIPLE mode, three submissions -> three admin emails (no batching).
 * AS8  (needs the loopback harness Postgres, POSTGRES_*) a user_settings row
 *      stripped of the new key still gets
 *      notified with the all-on default and the settings page loads with the row.
 *
 * Self-contained: provisions its own Kratos identities (admin API), Space,
 * Subspace and Forms through the non-interactive GraphQL endpoint, and asserts
 * mails through the MailSlurper REST API. Nothing is shared with other specs and
 * no fixed sleeps are used (every wait is an `expect.poll` / `toPass`).
 *
 * Environment (defaults suit the local forge stack):
 *   ALKEMIO_BASE_URL          http://localhost:3000
 *   KRATOS_ADMIN_URL          Kratos ADMIN base incl. /admin (required)
 *   MAIL_SLURPER_ENDPOINT     http://localhost:4437/mail
 *   ALKEMIO_ADMIN_EMAIL       admin@alkem.io
 *   ALKEMIO_ADMIN_PASSWORD    the platform admin's password
 *   RABBITMQ_MANAGEMENT_ENDPOINT / _USER / _PASSWORD   push-emit counting (optional)
 *   POSTGRES_*                AS8 only — the loopback-guarded harness database
 *   NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD   AS6 only
 */

const BASE = (process.env.ALKEMIO_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const KRATOS_ADMIN = (process.env.KRATOS_ADMIN_URL || '').replace(/\/$/, '');
const MAIL_API =
  process.env.MAIL_SLURPER_ENDPOINT || 'http://localhost:4437/mail';
const ADMIN_EMAIL = process.env.ALKEMIO_ADMIN_EMAIL || 'admin@alkem.io';
const ADMIN_PASSWORD =
  process.env.ALKEMIO_ADMIN_PASSWORD ||
  process.env.AUTH_ADMIN_PASSWORD ||
  'password';
const RMQ = (process.env.RABBITMQ_MANAGEMENT_ENDPOINT || '').replace(/\/$/, '');
const RMQ_AUTH = `Basic ${Buffer.from(
  `${process.env.RABBITMQ_MANAGEMENT_USER || 'alkemio-admin'}:${
    process.env.RABBITMQ_MANAGEMENT_PASSWORD || 'alkemio!'
  }`
).toString('base64')}`;
const STOP_CMD = process.env.NOTIFICATIONS_STOP_CMD || '';
const START_CMD = process.env.NOTIFICATIONS_START_CMD || '';
const GRAPHQL = `${BASE}/api/private/non-interactive/graphql`;
// Per-run secret for the throwaway identities this walk provisions (override with
// FORGE_PERSONA_PASSWORD); a fixed literal would leave them loginable after the run.
const USER_PASSWORD =
  process.env.FORGE_PERSONA_PASSWORD || `F080-${randomUUID()}-Aa1!`;

const RUN = Date.now().toString(36);
const SPACE_NAME = `US4 Space ${RUN}`;
const SUB_NAME = `US4 Sub ${RUN}`;
const email = (tag: string) => `us4-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'sa';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  sa: email('sa'),
};

const tokens = new Map<string, string>();

async function mintToken(userEmail: string, password: string) {
  const cached = tokens.get(userEmail);
  if (cached) return cached;
  let token = '';
  // The endpoint is rate limited; retry with a bounded backoff.
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

function must<T = any>(result: GqlResult<T>, what: string): T {
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
  const data = must(await gql(userEmail, '{ me { user { id } } }'), 'me');
  return data.me.user.id as string;
}

// ---------------------------------------------------------------------------
// MailSlurper
// ---------------------------------------------------------------------------

type Mail = { id: string; subject: string; body: string; toAddresses: string[] };

const decode = (s: string) =>
  s
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

async function allMails(): Promise<Mail[]> {
  const out: Mail[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${MAIL_API}?pageNumber=${page}`);
    const json = (await res.json()) as { mailItems: Mail[]; totalPages: number };
    out.push(...json.mailItems);
    if (page >= json.totalPages) break;
  }
  return out.map(m => ({ ...m, subject: decode(m.subject) }));
}

const adminSubject = (form: string) =>
  `${SUB_NAME} - New Form response to "${form}"`;
const receiptSubject = (form: string) =>
  `${SUB_NAME} - Your response to "${form}" was received`;

/** Mails about one Form (subject carries the unique Form name). */
const mailsAbout = async (form: string) =>
  (await allMails()).filter(m => m.subject.includes(`"${form}"`));

const to = (mails: Mail[], subject: string, address: string) =>
  mails.filter(
    m => m.subject === subject && m.toAddresses?.includes(address)
  );

const text = (html: string) =>
  decode(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fixture = {
  calloutsSetId: '',
  userIds: {} as Record<Persona, string>,
  subRoleSetId: '',
};

const QUESTIONS = [
  { prompt: 'What is your name?', type: 'SHORT_TEXT', required: true },
  { prompt: 'Tell us more', type: 'LONG_TEXT', required: false },
  {
    prompt: 'Pick one',
    type: 'SINGLE_CHOICE',
    required: false,
    options: [{ label: 'Alpha' }, { label: 'Beta' }],
  },
];

type FormFixture = {
  name: string;
  url: string;
  formId: string;
  calloutId: string;
  questions: Array<{ id: string; options?: Array<{ id: string }> | null }>;
};

async function createForm(
  name: string,
  settings: Record<string, unknown>
): Promise<FormFixture> {
  const created = must(
    await gql(
      personaEmail.a2,
      `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $d) {
          id
          framing { profile { url } form { id questions { id options { id } } } }
        }
      }`,
      {
        d: {
          calloutsSetID: fixture.calloutsSetId,
          sendNotification: false,
          framing: {
            type: 'FORM',
            profile: { displayName: name, description: 'US4 form' },
            form: { questions: QUESTIONS, settings },
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
  ).createCalloutOnCalloutsSet;
  must(
    await gql(
      personaEmail.a2,
      `mutation ($d: UpdateCalloutVisibilityInput!) {
        updateCalloutVisibility(calloutData: $d) { id }
      }`,
      {
        d: {
          calloutID: created.id,
          visibility: 'PUBLISHED',
          sendNotification: false,
        },
      }
    ),
    'publish form'
  );
  return {
    name,
    url: created.framing.profile.url,
    formId: created.framing.form.id,
    calloutId: created.id,
    questions: created.framing.form.questions,
  };
}

async function submit(persona: Persona, form: FormFixture, marker: string) {
  const [name, more, pick] = form.questions;
  const result = await gql(
    personaEmail[persona],
    `mutation ($d: SubmitCalloutFormResponseInput!) {
      submitCalloutFormResponse(responseData: $d) { id createdBy { id } }
    }`,
    {
      d: {
        formID: form.formId,
        acknowledgedVisibility: 'ADMINS',
        answers: [
          { questionID: name.id, text: marker },
          { questionID: more.id, text: `more ${marker}` },
          { questionID: pick.id, selectedOptionIDs: [pick.options![0].id] },
        ],
      },
    }
  );
  return must(result, `submit as ${persona}`).submitCalloutFormResponse.id as string;
}

const inApp = async (persona: Persona) =>
  must(
    await gql(
      personaEmail[persona],
      `{ me { notifications(first: 100) { inAppNotifications {
          id type
          triggeredBy { id }
          payload { __typename ... on InAppNotificationPayloadSpaceCollaborationCallout {
            callout { id framing { profile { url displayName } } }
          } }
      } } } }`
    ),
    'in-app'
  ).me.notifications.inAppNotifications as Array<{
    id: string;
    type: string;
    triggeredBy?: { id: string };
    payload: {
      callout?: { id: string; framing: { profile: { url: string } } };
    };
  }>;

const FORM_EVENT = 'SPACE_ADMIN_COLLABORATION_CALLOUT_FORM_RESPONSE';

const formInApp = async (persona: Persona, calloutId: string) =>
  (await inApp(persona)).filter(
    n => n.type === FORM_EVENT && n.payload.callout?.id === calloutId
  );

/**
 * Negative check for asynchronous channels: `read()` must equal `expected` on every
 * sample across the settle window (RabbitMQ management stats lag by ~5s).
 */
async function staysAt(
  read: () => Promise<number>,
  expected: number,
  windowMs = 10_000
): Promise<void> {
  const until = Date.now() + windowMs;
  for (;;) {
    expect(await read()).toBe(expected);
    if (Date.now() >= until) return;
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
}

async function pushPublished(): Promise<number | undefined> {
  if (!RMQ) return undefined;
  const res = await fetch(`${RMQ}/api/queues/%2F/alkemio-push-notifications`, {
    headers: { authorization: RMQ_AUTH },
  });
  return ((await res.json()) as { message_stats?: { publish?: number } })
    .message_stats?.publish ?? 0;
}

async function signIn(browser: Browser, userEmail: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(BASE);
  const cookies = page.getByRole('button', { name: /accept all cookies/i });
  if (await cookies.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await cookies.click();
  }
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

let one: FormFixture;
let multi: FormFixture;
let submitterName = '';

test.describe.configure({ mode: 'serial' });

test.describe(
  'US4 — notifications on response submission',
  { tag: ['@forge-acceptance'] },
  () => {
    test.setTimeout(300_000);

    test.beforeAll(async () => {
      expect(
        KRATOS_ADMIN,
        'KRATOS_ADMIN_URL (Kratos admin base incl. /admin) is required'
      ).not.toBe('');
      submitterName = `Mia Member${RUN}`;
      await createIdentity(personaEmail.a2, 'Ada', `Subadmin${RUN}`);
      await createIdentity(personaEmail.m1, 'Mia', `Member${RUN}`);
      await createIdentity(personaEmail.sa, 'Sam', `Spaceadmin${RUN}`);
      for (const p of ['a2', 'm1', 'sa'] as Persona[]) {
        fixture.userIds[p] = await meId(personaEmail[p]);
      }

      const admin = ADMIN_EMAIL;
      const account = must(
        await gql(admin, '{ me { user { account { id } } } }'),
        'account'
      ).me.user.account.id as string;
      const space = must(
        await gql(
          admin,
          `mutation ($d: CreateSpaceOnAccountInput!) {
            createSpace(spaceData: $d) {
              id about { membership { roleSetID } }
            }
          }`,
          {
            d: {
              accountID: account,
              nameID: `us4-space-${RUN}`,
              about: { profileData: { displayName: SPACE_NAME } },
              collaborationData: { calloutsSetData: {} },
              settings: { privacy: { mode: 'PUBLIC' } },
            },
          }
        ),
        'create space'
      ).createSpace;
      const sub = must(
        await gql(
          admin,
          `mutation ($d: CreateSubspaceInput!) {
            createSubspace(subspaceData: $d) {
              id
              about { membership { roleSetID } }
              collaboration { calloutsSet { id } }
            }
          }`,
          {
            d: {
              spaceID: space.id,
              nameID: `us4-sub-${RUN}`,
              about: { profileData: { displayName: SUB_NAME } },
              collaborationData: { calloutsSetData: {} },
            },
          }
        ),
        'create subspace'
      ).createSubspace;
      fixture.calloutsSetId = sub.collaboration.calloutsSet.id;
      fixture.subRoleSetId = sub.about.membership.roleSetID;

      const assign = async (roleSetID: string, p: Persona, role: string) =>
        must(
          await gql(
            admin,
            `mutation ($d: AssignRoleOnRoleSetInput!) {
              assignRoleToUser(roleData: $d) { id }
            }`,
            { d: { actorID: fixture.userIds[p], role, roleSetID } }
          ),
          `assign ${p} ${role}`
        );
      const spaceRoleSet = space.about.membership.roleSetID as string;
      for (const p of ['sa', 'a2', 'm1'] as Persona[]) {
        await assign(spaceRoleSet, p, 'MEMBER');
      }
      await assign(spaceRoleSet, 'sa', 'ADMIN');
      for (const p of ['a2', 'm1'] as Persona[]) {
        await assign(fixture.subRoleSetId, p, 'MEMBER');
      }
      await assign(fixture.subRoleSetId, 'a2', 'ADMIN');

      // A2 (default settings) gets one active push subscription so the push
      // emit is a real, countable assertion.
      const uid = `us4-a2-${RUN}`;
      must(
        await gql(
          personaEmail.a2,
          `mutation ($d: SubscribeToPushNotificationsInput!) {
            subscribeToPushNotifications(subscriptionData: $d) { id status }
          }`,
          {
            d: {
              endpoint: `https://fcm.googleapis.com/fcm/send/${uid}`,
              p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uid}`,
              auth: `tBHItJI5svbpC7htN-${uid.slice(0, 8)}`,
              userAgent: 'us4-forge-acceptance',
            },
          }
        ),
        'push subscribe'
      );

      one = await createForm(`US4 Form One ${RUN}`, {
        visibility: 'ADMINS',
        responseMode: 'SINGLE',
      });
      multi = await createForm(`US4 Form Multi ${RUN}`, {
        visibility: 'ADMINS',
        responseMode: 'MULTIPLE',
      });
    });

    test('US4-AS1 admins are notified per default settings (email, in-app, push); a Space-only admin is not', async ({
      browser,
    }) => {
      const pushBefore = await pushPublished();
      const marker = `US4-SECRET-ANSWER-${RUN}`;
      await submit('m1', one, marker);

      await expect
        .poll(
          async () =>
            to(await mailsAbout(one.name), adminSubject(one.name), personaEmail.a2)
              .length,
          { timeout: 60_000 }
        )
        .toBe(1);

      await expect
        .poll(async () => (await formInApp('a2', one.calloutId)).length, {
          timeout: 30_000,
        })
        .toBe(1);
      const [note] = await formInApp('a2', one.calloutId);
      expect(note.payload.callout!.framing.profile.url).toBe(one.url);

      if (pushBefore !== undefined) {
        await expect
          .poll(async () => (await pushPublished())! - pushBefore, {
            timeout: 30_000,
          })
          .toBe(1);
      }

      // The parent-Space-only admin hears nothing: deliveries are asynchronous,
      // so hold both negatives over the settle window.
      await Promise.all([
        staysAt(
          async () =>
            (await mailsAbout(one.name)).filter(m =>
              m.toAddresses.includes(personaEmail.sa)
            ).length,
          0
        ),
        staysAt(async () => (await formInApp('sa', one.calloutId)).length, 0),
      ]);

      // In-app is reachable in the UI and links to the Post.
      const page = await signIn(browser, personaEmail.a2);
      await page.getByRole('button', { name: 'Notifications' }).click();
      const item = page
        .getByText(`${submitterName} responded to the form "${one.name}"`)
        .first();
      await expect(item).toBeVisible();
      await item.click();
      await expect(page).toHaveURL(new RegExp(`${one.url.split('/').pop()}$`));
      await page.context().close();
    });

    test('US4-AS2 the submitter gets one receipt stating who can read it, with a link and no answers', async () => {
      const receipts = to(
        await mailsAbout(one.name),
        receiptSubject(one.name),
        personaEmail.m1
      );
      expect(receipts).toHaveLength(1);
      const body = text(receipts[0].body);
      expect(body).toContain(`Only the admins of ${SUB_NAME} can read your response`);
      expect(receipts[0].body).toContain(one.url);
      expect(body).not.toContain('US4-SECRET-ANSWER');
      expect(body).not.toContain('more US4-SECRET');
    });

    test('US4-AS3 no generic contribution notification reaches anyone', async () => {
      // Held over the settle window so a late generic notification is caught.
      await Promise.all([
        staysAt(
          async () =>
            (await mailsAbout(one.name)).filter(m =>
              m.subject.toLowerCase().includes('contribution')
            ).length,
          0
        ),
        ...(['a2', 'm1', 'sa'] as Persona[]).map(p =>
          staysAt(
            async () =>
              (await inApp(p)).filter(n => n.type.includes('CONTRIBUTION')).length,
            0
          )
        ),
      ]);
    });

    test('US4-AS4 the admin email and in-app name the submitter and the Form, link to the Post, carry no answer', async () => {
      const [mail] = to(
        await mailsAbout(one.name),
        adminSubject(one.name),
        personaEmail.a2
      );
      const body = text(mail.body);
      expect(body).toContain(submitterName);
      expect(body).toContain(one.name);
      expect(mail.body).toContain(one.url);
      expect(body).not.toContain('US4-SECRET-ANSWER');
      expect(body).not.toContain('Alpha');
    });

    test('US4-AS5 an admin who submits gets the receipt only', async () => {
      const inAppBefore = (await formInApp('a2', one.calloutId)).length;
      const pushBefore = await pushPublished();
      const marker = `US4-A2-OWN-ANSWER-${RUN}`;
      await submit('a2', one, marker);

      await expect
        .poll(
          async () =>
            to(await mailsAbout(one.name), receiptSubject(one.name), personaEmail.a2)
              .length,
          { timeout: 60_000 }
        )
        .toBe(1);
      // The other Sub admin (the platform admin, creator of the Sub) is told; A2 is not.
      await expect
        .poll(
          async () =>
            to(await mailsAbout(one.name), adminSubject(one.name), ADMIN_EMAIL)
              .length,
          { timeout: 60_000 }
        )
        .toBe(2);
      // Read after the poll so a late admin mail to A2 is not missed.
      const about = await mailsAbout(one.name);
      expect(to(about, adminSubject(one.name), personaEmail.a2)).toHaveLength(1);
      // In-app and push are asynchronous: hold the negative checks over a settle window.
      await Promise.all([
        staysAt(async () => (await formInApp('a2', one.calloutId)).length, inAppBefore),
        pushBefore !== undefined
          ? staysAt(async () => (await pushPublished())! - pushBefore, 0)
          : undefined,
      ]);
    });

    test('US4-AS7 MULTIPLE mode: three submissions -> three admin emails', async () => {
      for (let i = 0; i < 3; i++) {
        await submit('m1', multi, `US4-MULTI-SECRET-${RUN}-${i}`);
      }
      await expect
        .poll(
          async () =>
            to(await mailsAbout(multi.name), adminSubject(multi.name), personaEmail.a2)
              .length,
          { timeout: 90_000 }
        )
        .toBe(3);
      await expect
        .poll(async () => (await formInApp('a2', multi.calloutId)).length, {
          timeout: 30_000,
        })
        .toBe(3);
      // No fourth (duplicate) delivery lands late on either channel.
      await Promise.all([
        staysAt(
          async () =>
            to(await mailsAbout(multi.name), adminSubject(multi.name), personaEmail.a2)
              .length,
          3
        ),
        staysAt(async () => (await formInApp('a2', multi.calloutId)).length, 3),
      ]);
      const about = await mailsAbout(multi.name);
      expect(about.some(m => m.body.includes('US4-MULTI-SECRET'))).toBe(false);
    });

    // Re-scoped, see the header: this is a consumer OUTAGE, not FR-024a's
    // publish failure. It proves at-least-once delivery after a restart.
    test('US4-AS6 (re-scoped: consumer outage, not a publish failure) with the notifications consumer stopped the submission succeeds and the queued mails arrive after restart', async () => {
      test.skip(
        !STOP_CMD || !START_CMD,
        'NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD not provided'
      );
      const before = to(
        await mailsAbout(multi.name),
        adminSubject(multi.name),
        personaEmail.a2
      ).length;
      execSync(STOP_CMD, { stdio: 'inherit' });
      try {
        const id = await submit('m1', multi, `US4-AS6-SECRET-${RUN}`);
        expect(id).toBeTruthy();
      } finally {
        execSync(START_CMD, { stdio: 'inherit' });
      }
      await expect
        .poll(
          async () =>
            to(await mailsAbout(multi.name), adminSubject(multi.name), personaEmail.a2)
              .length,
          { timeout: 120_000 }
        )
        .toBe(before + 1);
    });

    test('US4-AS8 a settings row without the new key notifies with the all-on default and the settings page loads', async ({
      browser,
    }) => {
      // Through the loopback-guarded harness client only: it refuses any
      // database that is not a local/CI compose stack.
      test.skip(
        !harnessPostgresConfigured(),
        'the loopback harness Postgres (POSTGRES_*) is not configured'
      );
      const userId = fixture.userIds.a2;
      const settingsOfUser =
        'where id = (select "settingsId" from "user" where id = $1)';
      await queryHarnessDb(
        `update user_settings set notification = notification #- '{space,admin,collaborationCalloutFormResponseReceived}' ${settingsOfUser}`,
        [userId]
      );
      const [stripped] = await queryHarnessDb<{ present: boolean }>(
        `select notification->'space'->'admin' ? 'collaborationCalloutFormResponseReceived' as present from user_settings ${settingsOfUser}`,
        [userId]
      );
      expect(stripped?.present).toBe(false);

      const before = to(
        await mailsAbout(multi.name),
        adminSubject(multi.name),
        personaEmail.a2
      ).length;
      const inAppBefore = (await formInApp('a2', multi.calloutId)).length;
      await submit('m1', multi, `US4-AS8-SECRET-${RUN}`);
      await expect
        .poll(
          async () =>
            to(await mailsAbout(multi.name), adminSubject(multi.name), personaEmail.a2)
              .length,
          { timeout: 60_000 }
        )
        .toBe(before + 1);
      await expect
        .poll(async () => (await formInApp('a2', multi.calloutId)).length, {
          timeout: 30_000,
        })
        .toBe(inAppBefore + 1);

      const page = await signIn(browser, personaEmail.a2);
      await page.goto(`${BASE}/user/me/settings/notifications`);
      const row = page
        .getByText(/submits a response to a Form in a Space you administer/i)
        .first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      const switches = row.locator('xpath=ancestor::*[.//*[@role="switch"]][1]').locator(
        '[role="switch"]'
      );
      await expect(switches).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await expect(switches.nth(i)).toBeChecked();
      }
      await page.context().close();
    });
  }
);
