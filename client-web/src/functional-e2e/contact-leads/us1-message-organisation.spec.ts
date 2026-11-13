// spec: client-web/src/functional-e2e/contact-leads/contact-leads-test-plan.md
// W2 journey 10 (docs/qa/server-rebuild/plan.md § W2; audit row F3): a user
// messages an organisation from its public page; every admin gets exactly one
// mail, an associate who is not an admin gets none, and the sender gets one
// confirmation copy.

import { test, expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import {
  decodeMailBody,
  deleteDisposableUser,
  awaitMailSince,
  deleteMessageOrganisation,
  mailsSince,
  markMailbox,
  messageOrganisationInUi,
  openPersonaPage,
  orgMessageChannels,
  organisationMessageSenderSubject,
  organisationMessageSubject,
  registerDisposableUser,
  runCleanup,
  seedMessageOrganisation,
  settleImmediateMail,
  uid,
  type MailboxMark,
  type DisposableUser,
  type MessageOrganisation,
  type PersonaPage,
} from './contact-leads.helpers';

/**
 *   sender     disposable — signed in, messages the organisation from its page
 *   adminA     disposable — creates the organisation (so Associate + Admin)
 *   adminB     disposable — made Associate, then Admin, by adminA
 *   adminOnly  disposable — Admin but NOT Associate (defect J10-D1, M1-2)
 *   associate  disposable — Associate, NOT Admin (negative control)
 *
 * The platform admin never joins the organisation, so the role sets are
 * exactly these users (read back in `beforeAll`).
 */
const id = uid();
const text = `W2 J10 hello organisation ${id}`;

let org: MessageOrganisation | undefined;
let sender: DisposableUser | undefined;
let adminA: DisposableUser | undefined;
let adminB: DisposableUser | undefined;
let adminOnly: DisposableUser | undefined;
let associate: DisposableUser | undefined;
let senderPage: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  // The lib's actor map (platform admin read-backs) is per worker.
  await TestUserManager.populateUserModelMap();
  sender = await registerDisposableUser(`j10s${id}`);
  adminA = await registerDisposableUser(`j10a${id}`);
  adminB = await registerDisposableUser(`j10b${id}`);
  adminOnly = await registerDisposableUser(`j10d${id}`);
  associate = await registerDisposableUser(`j10c${id}`);
  await seedMessageOrganisation(id, {
    onCreated: created => (org = created),
    creator: adminA,
    associateIds: [adminA.id, adminB.id, associate.id],
    adminIds: [adminA.id, adminB.id, adminOnly.id],
  });
  senderPage = await openPersonaPage(browser, sender.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await senderPage?.close();
  await runCleanup([
    ['organisation', () => deleteMessageOrganisation(org)],
    ['sender', () => deleteDisposableUser(sender)],
    ['admin A', () => deleteDisposableUser(adminA)],
    ['admin B', () => deleteDisposableUser(adminB)],
    ['admin-only', () => deleteDisposableUser(adminOnly)],
    ['associate', () => deleteDisposableUser(associate)],
  ]);
});

const subject = () => organisationMessageSubject(sender!.displayName);
const senderSubject = () => organisationMessageSenderSubject(org!.displayName);
/** Every user's mailbox, marked right before M1-1's send (M1-2 reads adminOnly's). */
let marks: Record<string, MailboxMark> = {};

test.describe('W2 journey 10 — message an organisation', () => {
  test('M1-1 the sender messages the organisation from its page; each admin gets exactly one mail carrying the text, the sender one copy, the associate none', async () => {
    // Every negative is falsifiable only if that user WOULD be mailed were it
    // a recipient: each one's "message to my organisation" email channel is on
    // (the platform default, read back, not assumed).
    for (const user of [adminA!, adminB!, associate!]) {
      expect(
        (await orgMessageChannels(user.id)).email,
        `${user.displayName} email channel`
      ).toBe(true);
    }

    const users = { adminA, adminB, adminOnly, associate, sender };
    marks = Object.fromEntries(
      await Promise.all(
        Object.entries(users).map(
          async ([who, u]) => [who, await markMailbox(u!.email)] as const
        )
      )
    );

    await messageOrganisationInUi(senderPage!.page, org!, text);

    await awaitMailSince(marks.adminA, subject(), 'admin A');
    await awaitMailSince(marks.adminB, subject(), 'admin B');
    await awaitMailSince(marks.sender, senderSubject(), 'the sender');
    await settleImmediateMail();
    for (const who of ['adminA', 'adminB']) {
      const mails = await mailsSince(marks[who], subject());
      expect(mails, `mails "${subject()}" to ${who}`).toHaveLength(1);
      expect(decodeMailBody(mails[0].body)).toContain(text);
    }
    expect(
      await mailsSince(marks.sender, senderSubject()),
      'the sender copy'
    ).toHaveLength(1);
    // The admins' mails are in and the quiet period has passed, so a mail to
    // the associate (or an admin mail to the sender) would be too.
    expect(
      await mailsSince(marks.associate, subject()),
      'mails to the associate'
    ).toHaveLength(0);
    expect(
      await mailsSince(marks.sender, subject()),
      'admin mail to the sender'
    ).toHaveLength(0);
  });

  // J10-D1 (draft, not filed): `ORGANIZATION_ADMIN_MESSAGE` recipients are
  // resolved from ORGANIZATION_ASSOCIATE credentials filtered by
  // RECEIVE_NOTIFICATIONS_ADMIN (server notification.recipients.service.ts ›
  // getOrganizationCredentialCriteria), so an Admin who is not an Associate
  // gets no mail, although the composer says "Delivered to the organisation's
  // administrators" and every other organisation-admin event resolves by
  // admin standing (061 R17b). Reproduced 2026-11-12 on the local stack.
  // Recorded on alkem-io/test-suites#724 (not yet filed against server); swap
  // the link for the server issue once filed. Drop the skip when fixed.
  test.skip('M1-2 an admin who is not an associate also gets exactly one mail (defect J10-D1, alkem-io/test-suites#724)', async () => {
    expect(
      (await orgMessageChannels(adminOnly!.id)).email,
      'admin-only email channel'
    ).toBe(true);
    await awaitMailSince(
      marks.adminOnly,
      subject(),
      'the admin who is not an associate'
    );
    await settleImmediateMail();
    expect(await mailsSince(marks.adminOnly, subject())).toHaveLength(1);
  });
});
