import { execSync } from 'node:child_process';
import { expect, type Browser, type Page, test } from '@playwright/test';
import {
  assignRoleToUser,
  getQueueStats,
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  createSpaceOnAccount,
  createSubspaceWithData,
  harnessPostgresConfigured,
  queryHarnessDb,
  rabbitMqManagementConfigured,
  getMailsTo,
  readMyNotifications,
  readMyUser,
  RoleName,
  SpacePrivacyMode,
  submitCalloutFormResponse,
  subscribeToPushNotifications,
  updateCalloutVisibility,
  type CreateCalloutFormQuestionInput,
  type CreateCalloutFormSettingsInput,
} from '@alkemio/tests-lib';
import { fillSecret } from '../helpers/login.helper';
import { must } from '../helpers/lib-actor.helper';
import {
  actorFor,
  ADMIN_EMAIL,
  FormFixtureLedger,
  formRunId,
  harnessPassword,
  joinAsSelf,
  loadHarnessPersonas,
  openMembership,
} from './form-callout-framing.helpers';

/**
 * workspace#080-form-callout-framing — User Story 4 (P1): Notifications on
 * response submission.
 *
 * AS1  a member's submission notifies the (sub)space admins (email with the
 *      pinned subject, in-app linking to the Post); a parent-Space-only admin
 *      receives nothing. The push emit per active subscription is US4-AS1p.
 * AS2  the submitter gets ONE receipt (pinned subject) that states who can
 *      read the response, links to the Post and repeats none of the answers.
 * AS3  no generic "new contribution" notification, mail or in-app, to anyone.
 * AS4  the admin email / in-app text names the submitter and the Form, links to
 *      the Post and carries no answer text.
 * AS5  an admin who submits gets the receipt only — no admin notification (mail,
 *      in-app) for their own response; push: US4-AS5p.
 * AS6  (@local-stack: NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD) RE-SCOPED:
 *      the spec's "delivery fails" (FR-024a, the server's publish failing) has
 *      no infrastructure lever here and is covered by server unit tests. This
 *      walk proves the weaker, operational property instead: with the
 *      notifications CONSUMER stopped the submission still succeeds and the
 *      queued mails arrive once it is back (at-least-once delivery).
 * AS7  MULTIPLE mode, three submissions -> three admin emails (no batching).
 * AS8  (@local-stack: the loopback harness Postgres, POSTGRES_*) a user_settings row
 *      stripped of the new key still gets
 *      notified with the all-on default and the settings page loads with the row.
 *
 * AS1p/AS5p (@local-stack: RABBITMQ_MANAGEMENT_*) one push emit for a member's
 *      submission to an admin with an active subscription; none for the admin's own.
 *
 * Self-contained (form-callout-framing.helpers.ts): registers its own disposable
 * identities through public Kratos, joins them to its own Space and Subspace as
 * themselves, seeds the Forms through `@alkemio/tests-lib`, reads mail only
 * through the lib's recipient-scoped reader (`getMailsTo`), and deletes all of
 * it in a file-level `afterAll`. The nightly runs AS1-AS5 and AS7; the three
 * `@local-stack` cases run with `pnpm run test:local-stack`, which also needs:
 *   RABBITMQ_MANAGEMENT_ENDPOINT / _USER / _PASSWORD   AS1p/AS5p
 *   POSTGRES_*                AS8 — the loopback-guarded harness database
 *   NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD   AS6
 */

const BASE = (process.env.ALKEMIO_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const STOP_CMD = process.env.NOTIFICATIONS_STOP_CMD || '';
const START_CMD = process.env.NOTIFICATIONS_START_CMD || '';
const RUN = formRunId();
const SPACE_NAME = `US4 Space ${RUN}`;
const SUB_NAME = `US4 Sub ${RUN}`;
const email = (tag: string) => `us4-${tag}-${RUN}@alkem.io`;

type Persona = 'a2' | 'm1' | 'sa';
const personaEmail: Record<Persona, string> = {
  a2: email('a2'),
  m1: email('m1'),
  sa: email('sa'),
};

/** Every Space and user this file seeds; removed by the file-level afterAll. */
const ledger = new FormFixtureLedger();

// ---------------------------------------------------------------------------
// Mail (the lib's recipient-scoped reader; the sink is the lib's business)
// ---------------------------------------------------------------------------

type Mail = { id: string; subject: string; body: string; toAddresses: string[] };

const decode = (s: string) =>
  s
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * Everyone this file's Forms can notify: the Space and Subspace members and
 * admins it seeded, and the platform admin who created both. Nobody else is a
 * member, so "no mail to anyone" is "no mail to these addresses".
 */
const fixtureAddresses = () => [
  personaEmail.a2,
  personaEmail.m1,
  personaEmail.sa,
  ADMIN_EMAIL,
];

async function fixtureMails(): Promise<Mail[]> {
  // One mail can name several fixture addresses; keep each mail once.
  const byId = new Map<string, Awaited<ReturnType<typeof getMailsTo>>[number]>();
  for (const address of fixtureAddresses())
    for (const m of await getMailsTo(address)) byId.set(String(m.id), m);
  return [...byId.values()].map(m => ({
    id: String(m.id ?? ''),
    subject: decode(m.subject ?? ''),
    body: m.body ?? '',
    toAddresses: m.toAddresses ?? [],
  }));
}

const adminSubject = (form: string) =>
  `${SUB_NAME} - New Form response to "${form}"`;
const receiptSubject = (form: string) =>
  `${SUB_NAME} - Your response to "${form}" was received`;

/** Mails about one Form (subject carries the unique Form name). */
const mailsAbout = async (form: string) =>
  (await fixtureMails()).filter(m => m.subject.includes(`"${form}"`));

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

const QUESTIONS: CreateCalloutFormQuestionInput[] = [
  {
    prompt: 'What is your name?',
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
  settings: CreateCalloutFormSettingsInput
): Promise<FormFixture> {
  const a2 = await actorFor(personaEmail.a2);
  const created = must(
    await createCalloutWithData(
      {
        calloutsSetID: fixture.calloutsSetId,
        sendNotification: false,
        framing: {
          type: CalloutFramingType.Form,
          profile: { displayName: name, description: 'US4 form' },
          form: { questions: QUESTIONS, settings },
        },
        settings: {
          visibility: CalloutVisibility.Draft,
          contribution: { enabled: false },
          framing: { commentsEnabled: false },
        },
      },
      a2
    ),
    'create form'
  ).createCalloutOnCalloutsSet;
  must(
    await updateCalloutVisibility(
      created.id,
      CalloutVisibility.Published,
      a2,
      false
    ),
    'publish form'
  );
  return {
    name,
    url: created.framing.profile.url,
    formId: created.framing.form!.id,
    calloutId: created.id,
    questions: created.framing.form!.questions,
  };
}

async function submit(persona: Persona, form: FormFixture, marker: string) {
  const [name, more, pick] = form.questions;
  const result = await submitCalloutFormResponse(
    {
      formID: form.formId,
      acknowledgedVisibility: CalloutFormResponseVisibility.Admins,
      answers: [
        { questionID: name.id, text: marker },
        { questionID: more.id, text: `more ${marker}` },
        { questionID: pick.id, selectedOptionIDs: [pick.options![0].id] },
      ],
    },
    await actorFor(personaEmail[persona])
  );
  return must(result, `submit as ${persona}`).submitCalloutFormResponse.id;
}

const inApp = async (persona: Persona) =>
  must(
    await readMyNotifications(await actorFor(personaEmail[persona]), {
      first: 100,
    }),
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

const PUSH_QUEUE = 'alkemio-push-notifications';
const pushPublished = async () => (await getQueueStats(PUSH_QUEUE)).publishedTotal;

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
  await fillSecret(
    page.getByRole('textbox', { name: 'Password' }),
    harnessPassword()
  );
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

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await ledger.teardown();
});

test.describe(
  'US4 — notifications on response submission',
  { tag: ['@forge-acceptance'] },
  () => {
    test.beforeAll(async () => {
      // Three self-registrations, each a verification-mail round trip.
      test.setTimeout(300_000);
      await loadHarnessPersonas();
      submitterName = `Mia Member${RUN}`;
      fixture.userIds.a2 = await ledger.registerUser(personaEmail.a2, 'Ada', `Subadmin${RUN}`);
      fixture.userIds.m1 = await ledger.registerUser(personaEmail.m1, 'Mia', `Member${RUN}`);
      fixture.userIds.sa = await ledger.registerUser(personaEmail.sa, 'Sam', `Spaceadmin${RUN}`);

      const admin = await actorFor(ADMIN_EMAIL);
      const account = must(await readMyUser(admin), 'account').me.user!
        .account!.id;
      const space = must(
        await createSpaceOnAccount(
          {
            accountID: account,
            nameID: `us4-space-${RUN}`,
            about: { profileData: { displayName: SPACE_NAME } },
            collaborationData: { calloutsSetData: {} },
            settings: {
              privacy: { mode: SpacePrivacyMode.Public },
              membership: openMembership('space'),
            },
          },
          admin
        ),
        'create space'
      ).createSpace;
      ledger.space(space.id);
      const sub = must(
        await createSubspaceWithData(
          {
            spaceID: space.id,
            nameID: `us4-sub-${RUN}`,
            about: { profileData: { displayName: SUB_NAME } },
            collaborationData: { calloutsSetData: {} },
            settings: { membership: openMembership('subspace') },
          },
          admin
        ),
        'create subspace'
      ).createSubspace;
      fixture.calloutsSetId = sub.collaboration.calloutsSet.id;
      fixture.subRoleSetId = sub.about.membership.roleSetID;

      const assign = async (roleSetID: string, p: Persona, role: RoleName) =>
        must(
          await assignRoleToUser(fixture.userIds[p], roleSetID, role, admin),
          `assign ${p} ${role}`
        );
      // Slice B: membership is joined as self — the Space first, then the
      // Subspace; ADMIN is granted on top. sa administers the Space only.
      const spaceRoleSet = space.about.membership.roleSetID;
      await joinAsSelf(
        spaceRoleSet,
        (['sa', 'a2', 'm1'] as Persona[]).map(p => personaEmail[p]),
        'the Space'
      );
      await assign(spaceRoleSet, 'sa', RoleName.Admin);
      await joinAsSelf(
        fixture.subRoleSetId,
        (['a2', 'm1'] as Persona[]).map(p => personaEmail[p]),
        'the Subspace'
      );
      await assign(fixture.subRoleSetId, 'a2', RoleName.Admin);

      // A2 (default settings) gets one active push subscription so the push
      // emit is a real, countable assertion.
      const uid = `us4-a2-${RUN}`;
      must(
        await subscribeToPushNotifications(
          {
            endpoint: `https://fcm.googleapis.com/fcm/send/${uid}`,
            p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uid}`,
            auth: `tBHItJI5svbpC7htN-${uid.slice(0, 8)}`,
            userAgent: 'us4-forge-acceptance',
          },
          await actorFor(personaEmail.a2)
        ),
        'push subscribe'
      );

      one = await createForm(`US4 Form One ${RUN}`, {
        visibility: CalloutFormResponseVisibility.Admins,
        responseMode: CalloutFormResponseMode.Single,
      });
      multi = await createForm(`US4 Form Multi ${RUN}`, {
        visibility: CalloutFormResponseVisibility.Admins,
        responseMode: CalloutFormResponseMode.Multiple,
      });
    });

    test('US4-AS1 admins are notified per default settings (email, in-app); a Space-only admin is not', async ({
      browser,
    }) => {
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
      // In-app is asynchronous: hold the negative check over a settle window.
      await staysAt(
        async () => (await formInApp('a2', one.calloutId)).length,
        inAppBefore
      );
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
    // @local-stack: stopping the notifications consumer is a host command the
    // shared test cluster does not offer.
    test('US4-AS6 (re-scoped: consumer outage, not a publish failure) with the notifications consumer stopped the submission succeeds and the queued mails arrive after restart', { tag: '@local-stack' }, async () => {
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

    // @local-stack: a settings row WITHOUT the new key cannot be produced
    // through GraphQL (every write stores the whole notification object), so
    // the precondition is written in the loopback harness Postgres, which the
    // shared test cluster does not expose.
    test('US4-AS8 a settings row without the new key notifies with the all-on default and the settings page loads', { tag: '@local-stack' }, async ({
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
      // The settings page folds each group into a collapsed section; the Form
      // row lives under "Space Admin Notifications".
      const adminSection = page.getByRole('button', {
        name: /^Space Admin Notifications/,
      });
      await adminSection.click();
      await expect(adminSection).toHaveAttribute('aria-expanded', 'true');
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

    // @local-stack: the emit is counted at the RabbitMQ management API, which
    // the shared test cluster does not expose. Its own Form, so the mail
    // counts of the cases above are untouched.
    test('US4-AS1p/AS5p a member\'s submission emits one push for the subscribed admin; the admin\'s own submission emits none', { tag: '@local-stack' }, async () => {
      test.skip(
        !rabbitMqManagementConfigured(),
        'RABBITMQ_MANAGEMENT_ENDPOINT is not configured'
      );
      const push = await createForm(`US4 Form Push ${RUN}`, {
        visibility: CalloutFormResponseVisibility.Admins,
        responseMode: CalloutFormResponseMode.Multiple,
      });
      const before = await pushPublished();
      await submit('m1', push, `US4-PUSH-SECRET-${RUN}`);
      await expect
        .poll(async () => (await pushPublished()) - before, { timeout: 30_000 })
        .toBe(1);
      // Settle on the member's emit before the negative half starts.
      await expect
        .poll(async () => (await formInApp('a2', push.calloutId)).length, {
          timeout: 30_000,
        })
        .toBe(1);
      const afterMember = await pushPublished();
      await submit('a2', push, `US4-PUSH-OWN-${RUN}`);
      // RabbitMQ management stats lag by ~5 s: hold the negative over the window.
      await staysAt(async () => (await pushPublished()) - afterMember, 0);
    });
  }
);
