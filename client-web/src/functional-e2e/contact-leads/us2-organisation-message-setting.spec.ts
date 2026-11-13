// spec: client-web/src/functional-e2e/contact-leads/contact-leads-test-plan.md
// W2 journey 10 (docs/qa/server-rebuild/plan.md § W2; audit row F4): an
// organisation admin switches "Receive direct messages to my organisation"
// email off in the UI; it persists across a reload, reads back off, is
// honoured by the next message, and switches back on the same way.

import { test, expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import {
  deleteDisposableUser,
  deleteMessageOrganisation,
  awaitMailSince,
  mailsSince,
  markMailbox,
  messageOrganisationInUi,
  openOrganisationNotifications,
  openPersonaPage,
  orgMessageChannels,
  orgMessageSwitch,
  organisationMessageSubject,
  registerDisposableUser,
  runCleanup,
  seedMessageOrganisation,
  settleImmediateMail,
  uid,
  type Channels,
  type DisposableUser,
  type MessageOrganisation,
  type PersonaPage,
} from './contact-leads.helpers';

/**
 *   muted      disposable — an admin of the organisation; switches the email
 *              channel off (and back on) in its own Notifications tab
 *   control    disposable — the other admin, settings untouched (positive control)
 *   sender     disposable — messages the organisation from its page
 *
 * No harness persona's settings are touched: the user who toggles is this
 * file's own identity, deleted in `afterAll`.
 */
const id = uid();
const text = `W2 J10 muted check ${id}`;

let org: MessageOrganisation | undefined;
let muted: DisposableUser | undefined;
let control: DisposableUser | undefined;
let sender: DisposableUser | undefined;
let mutedPage: PersonaPage | undefined;
let senderPage: PersonaPage | undefined;
let before: Channels | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  // The lib's actor map (platform admin read-backs) is per worker.
  await TestUserManager.populateUserModelMap();
  muted = await registerDisposableUser(`j10m${id}`);
  control = await registerDisposableUser(`j10k${id}`);
  sender = await registerDisposableUser(`j10t${id}`);
  await seedMessageOrganisation(id, {
    onCreated: created => (org = created),
    creator: control,
    associateIds: [muted.id, control.id],
    adminIds: [muted.id, control.id],
  });
  mutedPage = await openPersonaPage(browser, muted.email);
  senderPage = await openPersonaPage(browser, sender.email);
});

test.afterAll(async () => {
  await mutedPage?.close();
  await senderPage?.close();
  await runCleanup([
    ['organisation', () => deleteMessageOrganisation(org)],
    ['muted admin', () => deleteDisposableUser(muted)],
    ['control admin', () => deleteDisposableUser(control)],
    ['sender', () => deleteDisposableUser(sender)],
  ]);
});

const subject = () => organisationMessageSubject(sender!.displayName);

test.describe('W2 journey 10 — an organisation notification setting persists across reload', () => {
  test('N1-1 the admin switches the email channel off; the switch is still off after a reload and the server holds email off, in-app and push untouched', async () => {
    const page = mutedPage!.page;
    before = await orgMessageChannels(muted!.id);
    // The starting state the UI must show, read from the server, not assumed.
    expect(before.email, 'email channel before the toggle').toBe(true);

    await openOrganisationNotifications(page);
    const email = orgMessageSwitch(page, 'Email');
    await expect(email).toBeChecked();
    await email.click();
    await expect(email).not.toBeChecked();
    await expect
      .poll(async () => (await orgMessageChannels(muted!.id)).email, {
        message: 'the server never stored email off',
      })
      .toBe(false);

    await page.reload();
    await openOrganisationNotifications(page);
    await expect(orgMessageSwitch(page, 'Email')).not.toBeChecked();
    await expect(orgMessageSwitch(page, 'In-App')).toBeChecked({
      checked: before.inApp,
    });
    expect(await orgMessageChannels(muted!.id)).toEqual({
      ...before,
      email: false,
    });
  });

  test('N1-2 the next message to the organisation reaches the other admin and not the one who switched email off', async () => {
    const controlMark = await markMailbox(control!.email);
    const mutedMark = await markMailbox(muted!.email);
    await messageOrganisationInUi(senderPage!.page, org!, text);

    await awaitMailSince(controlMark, subject(), 'the control admin');
    await settleImmediateMail();
    expect(
      await mailsSince(controlMark, subject()),
      'mails to the control admin'
    ).toHaveLength(1);
    // The control admin's mail is in and the quiet period has passed, so the
    // muted admin's would be too.
    expect(
      await mailsSince(mutedMark, subject()),
      'mails to the admin who switched email off'
    ).toHaveLength(0);
  });

  test('N1-3 the admin switches the email channel back on; it is on after a reload and on the server', async () => {
    const page = mutedPage!.page;
    await openOrganisationNotifications(page);
    const email = orgMessageSwitch(page, 'Email');
    await expect(email).not.toBeChecked();
    await email.click();
    await expect(email).toBeChecked();
    await expect
      .poll(async () => (await orgMessageChannels(muted!.id)).email, {
        message: 'the server never stored email on',
      })
      .toBe(true);

    await page.reload();
    await openOrganisationNotifications(page);
    await expect(orgMessageSwitch(page, 'Email')).toBeChecked();
    expect(await orgMessageChannels(muted!.id)).toEqual(before);
  });
});
