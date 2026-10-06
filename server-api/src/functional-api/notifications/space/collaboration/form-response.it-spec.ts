import {
  deleteMailSlurperMails,
  rabbitMqManagementConfigured,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutFormResponseVisibility,
  UpdateUserSettingsEntityInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  answersFor,
  createFormCallout,
  FormCallout,
  submitFormResponse,
  uniqueFormName,
} from '@functional-api/callout/form/form.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  assertCleanupSucceeded,
  expectPushEmitAfter,
  getActivePushSubscriptionCount,
  getMailsDataSettled,
  getPushQueuePublishedTotal,
  MailItem,
  notif,
  snapshotNotificationSettings,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  waitForPushQueueQuiet,
} from '../../notification.helpers';

/**
 * Form response notifications: the exact (sub)space admins are told (one email
 * each), the submitter gets a receipt stating who can read the response, an
 * admin who submits gets only the receipt, and a Form response is never
 * announced as a generic contribution. Email subjects are pinned literally
 * (contract of the notifications service). Answer text never reaches a mail.
 */

const uniqueId = UniqueIDGenerator.getID();
const ANSWER_MARKER = `private-answer-${uniqueId}`;

const ADMINS = CalloutFormResponseVisibility.Admins;
const MEMBERS = CalloutFormResponseVisibility.Members;

const scenarioConfig: TestScenarioConfig = {
  name: 'form-response-notifications',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: false,
        addPostCollectionCallout: false,
        addWhiteboardCallout: false,
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

const adminRow = (on: boolean): UpdateUserSettingsEntityInput => ({
  notification: {
    space: {
      admin: {
        collaborationCalloutFormResponseReceived: {
          email: on,
          inApp: on,
          push: on,
        },
      },
    },
  },
});

// FR-023a: the generic "new contribution" rows are switched ON for everyone
// involved, so "no contribution mail" cannot pass because a row was muted.
const genericContributionRowsOn: UpdateUserSettingsEntityInput = {
  notification: {
    space: {
      admin: { collaborationCalloutContributionCreated: notif(true) },
      collaborationCalloutContributionCreated: notif(true),
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const snapshots = new Map<string, UpdateUserSettingsEntityInput>();

const users = () => ({
  // The scenario creator: it creates the subspace, so it holds the subspace
  // admin role too and is a legitimate recipient of the admin notification.
  globalAdmin: TestUserManager.users.globalAdmin,
  spaceAdmin: TestUserManager.users.spaceAdmin,
  spaceMember: TestUserManager.users.spaceMember,
  subspaceAdmin: TestUserManager.users.subspaceAdmin,
  subspaceMember: TestUserManager.users.subspaceMember,
});

const subspaceName = () => baseScenario.subspace.about.profile.displayName;

const adminSubject = (form: FormCallout) =>
  `${subspaceName()} - New Form response to &#34;${form.displayName}&#34;`;
const receiptSubject = (form: FormCallout) =>
  `${subspaceName()} - Your response to &#34;${form.displayName}&#34; was received`;

const newForm = (tag: string, visibility = ADMINS) =>
  createFormCallout(baseScenario.subspace.collaboration.calloutsSetId, {
    displayName: uniqueFormName(`notif-${tag}-${uniqueId}`),
    settings: { visibility },
  });

const respond = async (
  form: FormCallout,
  user: TestUser,
  visibility = ADMINS
) => {
  const result = await submitFormResponse(
    form.formId,
    answersFor(form.questions, { 0: { text: ANSWER_MARKER } }),
    visibility,
    user
  );
  if (result.error) {
    throw new Error(
      `${user} could not respond: ${JSON.stringify(result.error.errors)}`
    );
  }
};

/** Mails about this Form only (the shared mailbox can carry stragglers). */
const aboutForm =
  (form: FormCallout) =>
  (mail: MailItem): boolean =>
    Boolean(mail.subject?.includes(form.displayName)) ||
    Boolean(mail.body?.includes(ANSWER_MARKER));

const to = (mails: MailItem[], subject: string, email: string) =>
  mails.filter(
    mail => mail.subject === subject && mail.toAddresses?.includes(email)
  );

/**
 * Scope for ONE mail: `subject` to `email`. The scenario creator (Global
 * Admin) is a subspace admin too and gets its own admin mail about every
 * Form, so a wait on `aboutForm(form)` alone can end before the mail under
 * test lands. Wait for that mail itself, then read the window.
 */
const mailTo =
  (subject: string, email: string) =>
  (mail: MailItem): boolean =>
    mail.subject === subject && Boolean(mail.toAddresses?.includes(email));

const summary = (mails: MailItem[]) =>
  JSON.stringify(mails.map(m => ({ subject: m.subject, to: m.toAddresses })));

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // The personas are shared by every notifications spec: put back exactly what
  // was found, and switch the row on so a suppressed mail cannot be a default.
  for (const user of Object.values(users())) {
    snapshots.set(user.id, await snapshotNotificationSettings(user.id));
  }
  for (const user of [users().spaceAdmin, users().subspaceAdmin]) {
    assertCleanupSucceeded(
      'switch the Form response row on',
      await updateUserSettings(user.id, adminRow(true))
    );
  }
  for (const user of Object.values(users())) {
    assertCleanupSucceeded(
      'switch the generic contribution rows on',
      await updateUserSettings(user.id, genericContributionRowsOn)
    );
  }
});

afterAll(async () => {
  for (const user of Object.values(users())) {
    const original = snapshots.get(user.id);
    if (original) {
      assertCleanupSucceeded(
        'restore notification settings',
        await updateUserSettings(user.id, original)
      );
    }
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

beforeEach(async () => {
  await deleteMailSlurperMails();
});

describe('Form response notifications — a member responds', () => {
  test('the subspace admin gets the admin email, the parent-space admin none, the member a receipt', async () => {
    const form = await newForm('member');

    await respond(form, TestUser.SUBSPACE_MEMBER);

    await getMailsDataSettled(1, {
      scope: mailTo(receiptSubject(form), users().subspaceMember.email),
    });
    await getMailsDataSettled(1, {
      scope: mailTo(adminSubject(form), users().subspaceAdmin.email),
    });
    const [mails] = await getMailsDataSettled(2, { scope: aboutForm(form) });
    const detail = summary(mails);
    expect(
      to(mails, adminSubject(form), users().subspaceAdmin.email),
      detail
    ).toHaveLength(1);
    // The exact (sub)space's admins only: the parent space's admin is not told,
    // although the same row is on for them.
    expect(
      mails.filter(m => m.toAddresses?.includes(users().spaceAdmin.email)),
      detail
    ).toHaveLength(0);
    // The submitter is not sent the admin email.
    expect(
      to(mails, adminSubject(form), users().subspaceMember.email),
      detail
    ).toHaveLength(0);
    // SC-004: a member who is not an admin of the subspace hears nothing.
    expect(
      mails.filter(m => m.toAddresses?.includes(users().spaceMember.email)),
      detail
    ).toHaveLength(0);

    // US4-AS4: the admin email names the submitter and links to the Post.
    const adminBody =
      to(mails, adminSubject(form), users().subspaceAdmin.email)[0]?.body ?? '';
    expect(adminBody).toContain(users().subspaceMember.displayName);
    expect(adminBody).toContain(form.url);
    expect(adminBody).not.toContain(ANSWER_MARKER);

    const receipts = to(
      mails,
      receiptSubject(form),
      users().subspaceMember.email
    );
    expect(receipts, detail).toHaveLength(1);
    const body = receipts[0].body ?? '';
    // D-9: the receipt names who can read the response, for this subspace.
    expect(body).toContain(
      `Only the admins of ${subspaceName()} can read your response`
    );
    expect(body).toContain(form.url);
    expect(body).not.toContain(ANSWER_MARKER);
  });

  test('no mail carries the answer, and none is announced as a post contribution', async () => {
    const form = await newForm('no-leak');

    await respond(form, TestUser.SUBSPACE_MEMBER);

    const [mails] = await getMailsDataSettled(2, { scope: aboutForm(form) });
    expect(mails.length).toBeGreaterThanOrEqual(2);
    for (const mail of mails) {
      expect(mail.subject ?? '').not.toContain(ANSWER_MARKER);
      expect(mail.body ?? '').not.toContain(ANSWER_MARKER);
      expect((mail.subject ?? '').toLowerCase()).not.toContain(
        'post contribution'
      );
    }
    // Nothing else about this Form went out under a contribution subject.
    const [everything] = await getMailsDataSettled(0, { quietMs: 3_000 });
    expect(
      everything.filter(m =>
        (m.subject ?? '').includes('New post contribution')
      ),
      summary(everything)
    ).toHaveLength(0);
  });

  test('a Form whose responses are visible to members says so in the receipt', async () => {
    const form = await newForm('members', MEMBERS);

    await respond(form, TestUser.SUBSPACE_MEMBER, MEMBERS);

    const [mails] = await getMailsDataSettled(2, { scope: aboutForm(form) });
    const receipts = to(
      mails,
      receiptSubject(form),
      users().subspaceMember.email
    );
    expect(receipts, summary(mails)).toHaveLength(1);
    expect(receipts[0].body).toContain(
      `Members of ${subspaceName()} can read your response`
    );
    expect(receipts[0].body).not.toContain('Only the admins of');
  });
});

describe('Form response notifications — an admin responds', () => {
  test('the admin gets only the receipt, no admin email about their own response', async () => {
    const form = await newForm('admin');

    await respond(form, TestUser.SUBSPACE_ADMIN);

    await getMailsDataSettled(1, {
      scope: mailTo(receiptSubject(form), users().subspaceAdmin.email),
    });
    const [mails] = await getMailsDataSettled(1, { scope: aboutForm(form) });
    const detail = summary(mails);
    expect(
      to(mails, receiptSubject(form), users().subspaceAdmin.email),
      detail
    ).toHaveLength(1);
    expect(
      to(mails, adminSubject(form), users().subspaceAdmin.email),
      detail
    ).toHaveLength(0);
    // The parent-space admin still hears nothing.
    expect(
      mails.filter(m => m.toAddresses?.includes(users().spaceAdmin.email)),
      detail
    ).toHaveLength(0);
  });
});

describe('Form response notifications — the admin row is off', () => {
  afterEach(async () => {
    assertCleanupSucceeded(
      'switch the Form response row back on',
      await updateUserSettings(users().subspaceAdmin.id, adminRow(true))
    );
  });

  test('the admin gets no admin email but the receipt still reaches the member', async () => {
    assertCleanupSucceeded(
      'switch the Form response row off',
      await updateUserSettings(users().subspaceAdmin.id, adminRow(false))
    );
    const form = await newForm('row-off');

    await respond(form, TestUser.SUBSPACE_MEMBER);

    // Wait for the receipt (the mail that must arrive), then read the whole
    // window: the admin mail would have been sent alongside it.
    await getMailsDataSettled(1, {
      scope: mailTo(receiptSubject(form), users().subspaceMember.email),
    });
    const [mails] = await getMailsDataSettled(1, { scope: aboutForm(form) });
    const detail = summary(mails);
    expect(
      to(mails, receiptSubject(form), users().subspaceMember.email),
      detail
    ).toHaveLength(1);
    expect(
      to(mails, adminSubject(form), users().subspaceAdmin.email),
      detail
    ).toHaveLength(0);
  });
});

describe('Form response notifications — push', () => {
  test.skipIf(!rabbitMqManagementConfigured())(
    'the subspace admin gets one push publish per active subscription',
    async () => {
      const form = await newForm('push');
      // The scenario creator is a subspace admin as well, and a real browser
      // may hold an active subscription for it on a shared stack: switch its
      // row off (restored from the snapshot in afterAll) so the delta below
      // is attributable to the subspace admin alone.
      assertCleanupSucceeded(
        'switch the Form response row off for the scenario creator',
        await updateUserSettings(users().globalAdmin.id, adminRow(false))
      );
      const handles = await subscribeRecipientsToPush([
        { userRole: TestUser.SUBSPACE_ADMIN, label: `form-admin-${uniqueId}` },
      ]);
      try {
        const subscriptions = await getActivePushSubscriptionCount(
          TestUser.SUBSPACE_ADMIN
        );
        expect(subscriptions).toBeGreaterThanOrEqual(1);
        const baseline = await waitForPushQueueQuiet();

        const result = await expectPushEmitAfter(
          () => respond(form, TestUser.SUBSPACE_MEMBER),
          subscriptions,
          { baseline }
        );

        // Only the subspace admin's row is on here, and the receipt has no push.
        expect(result.delta).toBe(subscriptions);
        expect(await getPushQueuePublishedTotal()).toBe(
          result.baseline + subscriptions
        );
      } finally {
        await unsubscribeRecipientsFromPush(handles);
      }
    }
  );
});
