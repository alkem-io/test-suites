import { expect, type Locator, type Page } from '@playwright/test';
import {
  assignPlatformRole,
  assignUserRoleOnRoleSet,
  createOrganization,
  delay,
  deleteOrganization,
  getMailsToSince,
  getUserToken,
  markMailbox,
  readMyConversations,
  readUserSettings,
  RoleName,
  TestUser,
  UniqueIDGenerator,
  type MailboxMark,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  spaceSidebar,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  deleteDisposableUser,
  registerDisposableUser,
  runCleanup,
  usersInOrgRole,
  type DisposableUser,
} from '../contributors-crud/contributors-crud.helpers';
import {
  decodeMailBody,
  MAIL_DELIVERY_TIMEOUT_MS,
  MAIL_QUIET_MS,
} from '../organization-email-invitations/organization-email-invitations.helpers';
import { openSettingsSection } from '../helpers/settings-section.helper';

/**
 * Shared set-up, locators and read-backs for W2 journey 10
 * (docs/qa/server-rebuild/plan.md § W2; client-net audit rows F3, F4):
 * message the leads of an organisation or a Space, and an organisation
 * notification setting that persists across a reload.
 *
 * Every recipient is a disposable identity registered in the file's
 * `beforeAll`, so its mailbox holds only its own sign-up mail and this run's
 * messages, and its notification settings are the platform defaults (read
 * back, never assumed). Mail is read through the lib's recipient-scoped
 * readers (every page of the sink): a recipient's box is marked before the
 * action and only what arrived since the mark, with the run-unique subject,
 * counts. The shared inbox is never pruned.
 */

export {
  baseUrl,
  decodeMailBody,
  deleteDisposableUser,
  expectMutationAnswered,
  markMailbox,
  openPersonaPage,
  registerDisposableUser,
  runCleanup,
  usersInOrgRole,
  type MailboxMark,
  type DisposableUser,
  type PersonaPage,
};

/** A fresh run id; each spec takes one at module scope. */
export const uid = (): string => UniqueIDGenerator.getID();

// ------------------------------------------------------------------ mail

/** Mails with exactly `subject` that reached the mark's recipient since the mark. */
export const mailsSince = async (mark: MailboxMark, subject: string) =>
  (await getMailsToSince(mark)).filter(m => m.subject === subject);

/**
 * Waits until at least one mail with `subject` has reached the mark's
 * recipient since the mark. Other suites mail these users too (platform-wide
 * notifications), so the wait is on the subject, never on "any new mail".
 */
export const awaitMailSince = async (
  mark: MailboxMark,
  subject: string,
  who: string,
  timeout: number = MAIL_DELIVERY_TIMEOUT_MS
): Promise<void> =>
  expect
    .poll(async () => (await mailsSince(mark, subject)).length, {
      timeout,
      message: `"${subject}" never reached ${who}`,
    })
    .toBeGreaterThan(0);

/**
 * The settle behind every "exactly one" and "none" for an immediate
 * (non-digest) notification: one event is fanned out to all its recipients
 * at once, so once the expected mails are in, a further or misaddressed one
 * would land within the same quiet period the house mail reader uses.
 */
export const settleImmediateMail = async (): Promise<void> => {
  // eslint-disable-next-line no-restricted-syntax -- negative settle window: MAIL_QUIET_MS, the house reader's quiet period for immediate notifications
  await delay(MAIL_QUIET_MS);
};

// ----------------------------------------------------------- organisation

export type MessageOrganisation = {
  id: string;
  nameId: string;
  roleSetId: string;
  displayName: string;
};

/**
 * An organisation built the way the product builds one, with its Associates
 * and Admins EXACTLY the given users:
 *
 * 1. `creator` (a disposable user) is granted Feature Organization Creator and
 *    creates the organisation with its own token, so the server makes it the
 *    first Associate + Admin (`profile-editing` H1-2 pins this).
 * 2. As that admin it assigns every other Associate, then every other Admin;
 *    an organisation admin holds both the entry-role assign and GRANT.
 *
 * Neither the platform admin nor the lib's organisation-role fallback is
 * involved: seeding through them left one run's admin out of the server's
 * message recipients (2026-11-12, local stack) and another run without an
 * admin to fall back to. Both sets are read back before any walk starts.
 */
export const seedMessageOrganisation = async (
  id: string,
  {
    creator,
    associateIds,
    adminIds,
    onCreated,
  }: {
    creator: DisposableUser;
    associateIds: string[];
    adminIds: string[];
    /** Called the moment the organisation exists, so a later failure here still lets `afterAll` delete it. */
    onCreated: (org: MessageOrganisation) => void;
  }
): Promise<MessageOrganisation> => {
  must(
    await assignPlatformRole(creator.id, RoleName.FeatureOrganizationCreator),
    'grant Feature Organization Creator'
  );
  const asCreator = { bearerToken: await getUserToken(creator.email) };
  const nameId = `w2-msg-org-${id}`;
  const displayName = `W2 Message Org ${id}`;
  const created = must(
    await createOrganization(
      displayName,
      nameId,
      undefined,
      undefined,
      undefined,
      undefined,
      asCreator
    ),
    `createOrganization(${nameId})`
  ).createOrganization;
  const org: MessageOrganisation = {
    id: created.id,
    nameId,
    roleSetId: created.roleSet.id,
    displayName,
  };
  onCreated(org);
  const wanted: Array<[RoleName, string[]]> = [
    [RoleName.Associate, associateIds],
    [RoleName.Admin, adminIds],
  ];
  for (const [role, ids] of wanted) {
    for (const userId of ids.filter(u => u !== creator.id)) {
      must(
        await assignUserRoleOnRoleSet(userId, org.roleSetId, role, asCreator),
        `assign organisation ${role} to ${userId}`
      );
    }
  }
  for (const [role, ids] of wanted) {
    expect(
      [...(await usersInOrgRole(org.roleSetId, role))].sort(),
      `the organisation's ${role} set is exactly the run-owned users`
    ).toEqual([...new Set([creator.id, ...ids])].sort());
  }
  return org;
};

export const deleteMessageOrganisation = async (
  org: MessageOrganisation | undefined
): Promise<void> => {
  if (!org) return;
  must(await deleteOrganization(org.id), `deleteOrganization(${org.nameId})`);
};

/** The notifications service's subject for a message to an organisation. */
export const organisationMessageSubject = (senderDisplayName: string): string =>
  `${senderDisplayName} sent a message to your organization`;

/** The sender's own confirmation copy of a message to an organisation. */
export const organisationMessageSenderSubject = (
  orgDisplayName: string
): string => `You have sent a message to ${orgDisplayName}!`;

/**
 * Sends `text` from the organisation's public page: the hero's "Message"
 * opens the email composer ("Send an email", delivered to the admins). The
 * `sendMessageToOrganization` answer is awaited so a server refusal fails
 * here, with its message.
 */
export const messageOrganisationInUi = async (
  page: Page,
  org: MessageOrganisation,
  text: string
): Promise<void> => {
  await page.goto(`${baseUrl}/organization/${org.nameId}`);
  await expect(
    page.getByRole('heading', { level: 1, name: org.displayName, exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Message', exact: true }).click();
  const composer = page.getByRole('dialog', { name: 'Compose message' });
  await expect(
    composer.getByText('Send an email', { exact: true })
  ).toBeVisible();
  await expect(
    composer.getByText("Delivered to the organisation's administrators.", {
      exact: true,
    })
  ).toBeVisible();
  await composer.getByRole('textbox', { name: 'Compose message' }).fill(text);
  const answered = expectMutationAnswered(page, 'sendMessageToOrganization');
  await composer.getByRole('button', { name: 'Send', exact: true }).click();
  await answered();
  await expect(
    page.getByText('Your message has been sent.', { exact: true })
  ).toBeVisible();
  await expect(composer).toBeHidden();
};

// -------------------------------------------------------------- settings

export type Channels = { email: boolean; inApp: boolean; push: boolean };

/** One user's organisation "message received" channels, read by the platform admin. */
export const orgMessageChannels = async (userId: string): Promise<Channels> => {
  const setting = must(
    await readUserSettings(userId, TestUser.GLOBAL_ADMIN),
    `readUserSettings(${userId})`
  ).user.settings.notification.organization.adminMessageReceived;
  return { email: setting.email, inApp: setting.inApp, push: setting.push };
};

export const ORG_MESSAGE_ROW = 'Receive direct messages to my organisation';

export const notificationsSettingsUrl = `${baseUrl}/user/me/settings/notifications`;

/** Opens the signed-in user's Notifications tab with the Organisation group expanded. */
export const openOrganisationNotifications = async (
  page: Page
): Promise<void> => {
  await page.goto(notificationsSettingsUrl);
  await openSettingsSection(page, /^Organisation Notifications/);
  await expect(page.getByText(ORG_MESSAGE_ROW, { exact: true })).toBeVisible();
};

export const orgMessageSwitch = (
  page: Page,
  channel: 'Email' | 'In-App'
): Locator =>
  page.getByRole('switch', {
    name: `Toggle ${channel} notification for: ${ORG_MESSAGE_ROW}`,
    exact: true,
  });

// ------------------------------------------------------------ Space leads

/**
 * Opens a Space's Community tab: the default sidebar layout carries the
 * "Contact Leads" widget there only (sidebar-widgets US1-AS2).
 */
export const openCommunityTab = async (
  page: Page,
  spaceNameId: string
): Promise<void> => {
  await page.goto(`${baseUrl}/${spaceNameId}`);
  const tab = page
    .getByRole('navigation', { name: 'Space navigation tabs' })
    .getByRole('tab', { name: 'Community', exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
};

/** The Space sidebar's "Contact Leads" button (shown when the Space has a user lead). */
export const contactLeadsButton = (page: Page): Locator =>
  spaceSidebar(page).getByRole('button', {
    name: 'Contact Leads',
    exact: true,
  });

export const contactLeadsDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Contact the leads', exact: true });

/** The recipient chips of the "Contact the leads" dialog, as displayed names. */
export const contactLeadsRecipients = (dialog: Locator): Locator =>
  dialog.getByRole('list').getByRole('listitem');

/** The direct-message digest's subject when one counterpart wrote one message. */
export const directDigestSubject = (senderDisplayName: string): string =>
  `${senderDisplayName} sent you a message`;

export type DirectConversation = {
  memberIds: string[];
  messagesCount: number;
  lastMessage: string | undefined;
};

/**
 * The conversations `email` can see whose members include `counterpartId`,
 * read with that user's own token (`me.conversations`). Anything but a
 * successful read throws, so an empty answer always means "none".
 */
export const conversationsWith = async (
  email: string,
  counterpartId: string
): Promise<DirectConversation[]> => {
  const conversations = must(
    await readMyConversations({ bearerToken: await getUserToken(email) }),
    `me.conversations of ${email}`
  ).me.conversations.conversations;
  return conversations
    .filter(c => c.members.some(m => m.id === counterpartId))
    .map(c => ({
      memberIds: c.members.map(m => m.id),
      messagesCount: c.room?.messagesCount ?? 0,
      lastMessage: c.room?.lastMessage?.message,
    }));
};
