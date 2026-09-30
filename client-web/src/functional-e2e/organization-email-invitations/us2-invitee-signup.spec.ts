// User Story 2: "The invitee receives a dedicated email, signs up and responds"
// (priority 1).
//
// server-api coverage (registration precedence, conversion, deletion):
//   server-api/src/functional-api/roleset/associates/organization-email-invitation-registration.it-spec.ts
//   server-api/src/functional-api/notifications/organization/associate-email-invitation.it-spec.ts
//
// @forge-acceptance
//
// AS1/AS7 read the real email out of MailSlurper. AS2 → AS3 are one chained
// walk on the SAME logged-out browser session: follow the email's call to
// action, land on sign-up with the return URL preserved, register the invited
// address (Kratos — the multi-step sign-up form itself is not this feature's
// concern and does not drive reliably headless, see language-offer/
// us1-signup-offer.spec.ts), sign in from that page and find the organization
// invitation in the pending-invitations dialog, then accept it. AS4 (a
// same-domain address is asked, not auto-joined, with a control) and AS6 (the
// admin's pending table) run against a verified organization whose domain and
// "matching domain may join" switch are on.
//
// Serial: the walks share one organization, one MailSlurper mailbox and a
// handful of Kratos registrations (see the --workers=1 note in the test plan).

import { expect, test as baseTest, type BrowserContext, type Page } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { fillUpSignInPageElements, pressSignInButtonSignInPage } from '../identity-flows/signin-page-objects';
import {
  assignUserRoleOnOrganization,
  baseUrl,
  cleanUpTestOrganizations,
  createDomainJoinOrganization,
  decodeMailBody,
  deletePersonasByEmail,
  escapeRegExp,
  getUserIdsInRole,
  inviteRaw,
  invitationLinkFromMail,
  listInvitations,
  openEmailAddresses,
  organizationInvitationSubject,
  postGraphqlRaw,
  registerUserAtAddress,
  RoleName,
  runSuffix,
  waitForMailsTo,
  adminToken,
  TestUserManager,
  type OrgFixture,
  type RegisteredUser,
} from './organization-email-invitations.helpers';

baseTest.describe.configure({ mode: 'serial' });

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const domain = `inv081${runSuffix}.example.com`.toLowerCase();
const secretPhrase = `secret-phrase-${runSuffix}`;
const welcomeMessage = `<b>hi</b> ${secretPhrase}`;

const adminEmail = `us081b-admin-${runSuffix}@test.alkem.io`;
const adminTest = createPersonaTest(adminEmail);

const invitee1Email = `new1-${runSuffix}@${domain}`; // AS1, AS2, AS3, AS7 — the full walk
const invitee4Email = `new4-${runSuffix}@${domain}`; // AS4, AS6 — same-domain precedence
const controlEmail = `control-${runSuffix}@${domain}`; // AS4 — no invitation, still auto-joined

let org: OrgFixture;
let admin: RegisteredUser;
let globalAdminToken: string;
let eligibleLanguage: string | undefined;
let invitationLink: string | undefined;
let invitee1: RegisteredUser | undefined;
let invitee4: RegisteredUser | undefined;
let control: RegisteredUser | undefined;

let inviteeContext: BrowserContext | undefined;
let inviteePage: Page | undefined;

baseTest.beforeAll(async () => {
  baseTest.setTimeout(300_000);
  await TestUserManager.populateUserModelMap();
  globalAdminToken = await adminToken();

  org = await createDomainJoinOrganization('SignupOrg', domain);
  admin = await registerUserAtAddress(adminEmail, `Us081BAdmin${runSuffix}`);
  await assignUserRoleOnOrganization(org.roleSetId, admin.id, RoleName.Associate);
  await assignUserRoleOnOrganization(org.roleSetId, admin.id, RoleName.Admin);

  const language = await postGraphqlRaw<{
    platform: { configuration: { language: { eligible: string[]; default: string } } };
  }>('query { platform { configuration { language { eligible default } } } }');
  const config = language.body.data?.platform.configuration.language;
  eligibleLanguage = config?.eligible.find(code => code !== config.default) ?? config?.eligible[0];

  // Both invitations are created while neither address has an account: invitee 1
  // offered Associate + Admin with markup in the message, invitee 4 offered Admin.
  for (const [email, message] of [
    [invitee1Email, welcomeMessage],
    [invitee4Email, `US2 AS4 ${runSuffix}`],
  ] as const) {
    const res = await inviteRaw(org.roleSetId, admin.token, {
      emails: [email],
      roles: [RoleName.Admin],
      message,
      language: eligibleLanguage,
    });
    if (res.errors.length > 0 || res.data?.inviteForEntryRoleOnRoleSet[0]?.type !== 'INVITED_TO_PLATFORM_AND_ROLE_SET') {
      throw new Error(`invitation for ${email} was not created: ${res.raw}`);
    }
  }
});

baseTest.afterAll(async () => {
  await inviteeContext?.close().catch(() => undefined);
  const failures: string[] = [];
  try {
    await cleanUpTestOrganizations();
  } catch (error) {
    failures.push((error as Error)?.message ?? String(error));
  }
  failures.push(...(await deletePersonasByEmail([adminEmail, invitee1Email, invitee4Email, controlEmail])));
  if (failures.length > 0) {
    throw new Error(`[us2-invitee-signup afterAll] ${failures.length} fixture(s) could not be torn down:\n  ${failures.join('\n  ')}`);
  }
});

// ─── US2-AS1 / US2-AS7 — the email ────────────────────────────────────────

baseTest.describe('US2-AS1 / US2-AS7 — one dedicated email, message escaped and out of the subject', () => {
  baseTest('exactly one mail reaches the address: organization subject, inviter, organization, offered role, the escaped message and a link to the invitations entry point', async () => {
    const mails = await waitForMailsTo(invitee1Email, 1);
    expect(mails).toHaveLength(1);
    const mail = mails[0];

    // The organization template — never the Space external-invitation one.
    expect(mail.subject).toEqual(organizationInvitationSubject(org.displayName));
    expect(mail.subject).not.toContain(secretPhrase);

    const body = decodeMailBody(mail.body);
    expect(body).toContain(admin.displayName);
    expect(body).toContain(org.displayName);
    expect(body).toContain('Associate + Admin');
    expect(body).toContain(secretPhrase);

    // US2-AS7: markup in the message is shown, never interpreted.
    expect(body).toContain('&lt;b&gt;hi&lt;/b&gt;');
    expect(body).not.toContain('<b>hi</b>');

    invitationLink = invitationLinkFromMail(mail.body);
    expect(invitationLink, 'the email carries a call-to-action link to the invitations dialog').toBeTruthy();
    expect(invitationLink).toMatch(/dialog=invitations/);
  });
});

// ─── US2-AS2 → US2-AS3 — follow the link, sign up, answer ─────────────────

baseTest.describe('US2-AS2 → US2-AS3 — follow the link, register, find the invitation, accept it', () => {
  baseTest('US2-AS2: a logged-out invitee following the link is sent to sign-up; after registering with the invited address the pending dialog lists the organization invitation with the role, the inviter and the message', async ({ browser }) => {
    baseTest.setTimeout(240_000);
    expect(invitationLink).toBeTruthy();
    inviteeContext = await browser.newContext();
    inviteePage = await inviteeContext.newPage();
    const page = inviteePage;

    // Logged out: the invitations link is handed to sign-up with the URL kept as the return URL.
    await page.goto(invitationLink!);
    await expect(page).toHaveURL(/sign_up/, { timeout: 30_000 });
    await expect(page).toHaveURL(/returnUrl=/);

    // Register the invited address. The Alkemio user is created on first
    // authenticated contact, which is where the open invitation is converted.
    invitee1 = await registerUserAtAddress(invitee1Email, `New1${runSuffix}`);

    // Sign in from the sign-up page — the pending return URL travels with the link.
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await fillUpSignInPageElements(invitee1Email, password, page);
    await pressSignInButtonSignInPage(page);
    await expect(page).toHaveURL(/dialog=invitations/, { timeout: 30_000 });

    const list = page.getByRole('dialog');
    await expect(list.getByText('Associate Invitations')).toBeVisible({ timeout: 20_000 });
    const card = list.getByRole('button', { name: org.displayName });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Associate + Admin');
    await expect(card).toContainText(`Invited by ${admin.displayName}`);

    await card.click();
    const detail = page.getByRole('dialog');
    await expect(detail).toContainText(`Invitation to associate with ${org.displayName}`, { timeout: 15_000 });
    await expect(detail).toContainText(secretPhrase);
  });

  baseTest('US2-AS3: accepting makes the invitee an associate and an admin, and the Associates tab badges both', async () => {
    baseTest.setTimeout(180_000);
    const page = inviteePage!;
    await page.getByRole('dialog').getByRole('button', { name: 'Accept' }).click();

    // Accepting returns to the list (no navigation to a Space) and the card is gone.
    await expect(page.getByRole('dialog')).not.toContainText('Invitation to associate with', { timeout: 20_000 });

    await expect
      .poll(async () => getUserIdsInRole(org.roleSetId, RoleName.Associate, globalAdminToken), { timeout: 20_000 })
      .toContain(invitee1!.id);
    expect(await getUserIdsInRole(org.roleSetId, RoleName.Admin, globalAdminToken)).toContain(invitee1!.id);

    // Now an admin, the invitee opens the Associates tab and sees their own row with both badges.
    await page.goto(`${baseUrl}/organization/${org.nameID}/settings/community`);
    const ownRow = page.getByRole('listitem').filter({ hasText: new RegExp(escapeRegExp(`New1${runSuffix}`), 'i') });
    await expect(ownRow).toBeVisible({ timeout: 20_000 });
    await expect(ownRow.getByText('Associate', { exact: true })).toBeVisible();
    await expect(ownRow.getByText('Admin', { exact: true })).toBeVisible();
  });
});

// ─── US2-AS4 — the invitation wins over the domain auto-join ──────────────

baseTest.describe('US2-AS4 — a same-domain address with an open invitation is asked, not auto-joined', () => {
  baseTest('registering succeeds, the user is not an associate, exactly one Admin invitation is pending with the original inviter; the control address with no invitation is auto-joined', async () => {
    baseTest.setTimeout(180_000);
    // Registration must not fail mid-finalize on the colliding domain join.
    invitee4 = await registerUserAtAddress(invitee4Email, `New4${runSuffix}`);
    control = await registerUserAtAddress(controlEmail, `Control${runSuffix}`);

    const associates = await getUserIdsInRole(org.roleSetId, RoleName.Associate, globalAdminToken);
    expect(associates).not.toContain(invitee4.id);

    const pending = (await listInvitations(org.roleSetId, globalAdminToken)).filter(i => i.actor.id === invitee4!.id);
    expect(pending).toHaveLength(1);
    expect(pending[0].state).toEqual('invited');
    expect(pending[0].extraRoles).toEqual([RoleName.Admin]);
    expect(pending[0].createdBy?.id).toEqual(admin.id);
    expect(pending[0].welcomeMessage).toEqual(`US2 AS4 ${runSuffix}`);
    if (eligibleLanguage) expect(pending[0].suggestedLanguage).toEqual(eligibleLanguage);

    // Control: no invitation, same domain — unchanged behaviour.
    expect(associates).toContain(control.id);
  });
});

// ─── US2-AS6 — what the admin sees while the invitee has not answered ─────

adminTest.describe('US2-AS6 — the email row is gone and the converted invitation is listed under the invitee', () => {
  adminTest('the pending table shows the invitee by name with the offered role and Revoke, and no external row for their address', async ({ page }) => {
    adminTest.setTimeout(120_000);
    await page.goto(`${baseUrl}/organization/${org.nameID}/settings/community`);

    const converted = page.getByRole('row', { name: new RegExp(escapeRegExp(invitee4!.displayName)) });
    await expect(converted).toBeVisible({ timeout: 20_000 });
    await expect(converted).toContainText('Associate + Admin');
    await expect(converted.getByRole('button', { name: 'Delete' })).toBeVisible();
    // A converted invitation is a regular one: there is nothing to resend.
    await expect(converted.getByRole('button', { name: 'Resend invitation email' })).toHaveCount(0);

    await expect(page.getByRole('row').filter({ hasText: 'Invited (external)' })).toHaveCount(0);
    expect(await openEmailAddresses(org.roleSetId, admin.token)).not.toContain(invitee4Email);
    expect(await openEmailAddresses(org.roleSetId, admin.token)).not.toContain(invitee1Email);
  });
});
