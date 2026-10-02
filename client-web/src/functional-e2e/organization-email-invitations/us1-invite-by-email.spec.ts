// User Story 1: "An organization admin invites someone who is not on Alkemio yet,
// by email" (priority 1).
//
// server-api coverage (same scenarios as it-specs, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/organization-associate-invitation-external.it-spec.ts
//
// @forge-acceptance
//
// AS1, AS2, AS4, AS5 and AS7 are driven through the real invite dialog and the
// Associates pending table by an organization admin who is NOT a platform admin
// (source-derived selectors — client-web/src/crd/components/community/
// InviteMembersDialog.tsx, .../organizationPages/settings/community/
// OrgInviteAssociatesDialogConnector.tsx, crd i18n community.en.json and
// spaceSettings.en.json). AS3, AS6 and AS8 are API acceptance walks: a typed
// address that belongs to a registered user, the no-invite-time-cap rule for
// emails and the authorization matrix have no UI path beyond what AS2/AS5
// already drive.
//
// AS2 → AS4 → AS7 are deliberately chained on the SAME address and session
// (AS4 repeats AS2's invite, AS7 revokes AS2's row and re-invites it), hence
// `describe.configure({ mode: 'serial' })` (the same serial discipline as the other organization walks).

import { expect, test as baseTest, type Page } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  adminToken,
  assignUserRoleOnOrganization,
  baseUrl,
  cleanUpTestOrganizations,
  createTestOrganization,
  deleteEmailInvitationRaw,
  deletePersonasByEmail,
  errorCodeOf,
  escapeRegExp,
  getUserIdsInRole,
  getUserToken,
  inviteRaw,
  listInvitations,
  listOpenEmailInvitations,
  lookupEmailInvitationRaw,
  mailsTo,
  openEmailAddresses,
  organizationInvitationSubject,
  postGraphqlRaw,
  registerUserAtAddress,
  resendEmailInvitationRaw,
  RoleName,
  runSuffix,
  settledMailsTo,
  TestUserManager,
  waitForMailsTo,
  type OrgFixture,
  type RegisteredUser,
} from './organization-email-invitations.helpers';

baseTest.describe.configure({ mode: 'serial' });

/** Endonyms of the eligible language codes as the dialog's select renders them. */
const LANGUAGE_ENDONYMS: Record<string, string> = {
  bg: 'Български',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  nl: 'Nederlands',
  pt: 'Português (Brasil)',
  ua: 'Українська',
};

// UI persona — literal, module-scope email (createPersonaTest reads it at
// module load, before beforeAll registers the identity).
const adminEmail = `us081-admin-${runSuffix}@test.alkem.io`;
const adminTest = createPersonaTest(adminEmail);

const address = (label: string) => `us081-${label}-${runSuffix}@example.com`;
const personaAddress = (label: string) => `us081-${label}-${runSuffix}@test.alkem.io`;

let org: OrgFixture;
let capOrg: OrgFixture;
let admin: RegisteredUser; // ADMIN + ASSOCIATE — the UI actor
let owner: RegisteredUser; // OWNER-not-admin
let plainAssociate: RegisteredUser; // ASSOCIATE only
let nonAdmin: RegisteredUser; // registered, no role on the organization
let picked: RegisteredUser; // AS5 — picked in the dialog
let registeredAs5: RegisteredUser; // AS5 — typed by address
let registeredAs3: RegisteredUser; // AS3 — typed by address
let capInvitee: RegisteredUser; // AS6 — existing-user advisory path
let globalAdminToken: string;
let supportToken: string;

let eligibleLanguage: string | undefined; // a language to suggest, when the platform offers any

// The AS2 → AS4 → AS7 chain.
const chainEmail = address('chain');
let chainInvitationId = '';
const chainMessage = `US1 AS2 welcome ${runSuffix}`;

const registeredEmails = [
  adminEmail,
  personaAddress('owner'),
  personaAddress('plain'),
  personaAddress('nonadmin'),
  personaAddress('picked'),
  personaAddress('regas5'),
  personaAddress('regas3'),
  personaAddress('capinvitee'),
];

baseTest.beforeAll(async () => {
  baseTest.setTimeout(300_000);
  await TestUserManager.populateUserModelMap();
  globalAdminToken = await adminToken();
  supportToken = await getUserToken(TestUserManager.users.globalSupportAdmin.email);

  [org, capOrg] = await Promise.all([createTestOrganization('EmailInv', runSuffix), createTestOrganization('EmailCap', runSuffix)]);

  admin = await registerUserAtAddress(adminEmail, `Us081Admin${runSuffix}`);
  owner = await registerUserAtAddress(personaAddress('owner'), `Us081Owner${runSuffix}`);
  plainAssociate = await registerUserAtAddress(personaAddress('plain'), `Us081Plain${runSuffix}`);
  nonAdmin = await registerUserAtAddress(personaAddress('nonadmin'), `Us081NonAdmin${runSuffix}`);
  picked = await registerUserAtAddress(personaAddress('picked'), `Us081Picked${runSuffix}`);
  registeredAs5 = await registerUserAtAddress(personaAddress('regas5'), `Us081Reg5${runSuffix}`);
  registeredAs3 = await registerUserAtAddress(personaAddress('regas3'), `Us081Reg3${runSuffix}`);
  capInvitee = await registerUserAtAddress(personaAddress('capinvitee'), `Us081Cap${runSuffix}`);

  await assignUserRoleOnOrganization(org.roleSetId, admin.id, RoleName.Associate);
  await assignUserRoleOnOrganization(org.roleSetId, admin.id, RoleName.Admin);
  await assignUserRoleOnOrganization(org.roleSetId, owner.id, RoleName.Associate);
  await assignUserRoleOnOrganization(org.roleSetId, owner.id, RoleName.Owner);
  await assignUserRoleOnOrganization(org.roleSetId, plainAssociate.id, RoleName.Associate);

  // The language the dialog can suggest, read from the same config the dialog reads.
  const language = await postGraphqlRaw<{
    platform: { configuration: { language: { eligible: string[]; default: string } } };
  }>('query { platform { configuration { language { eligible default } } } }');
  const config = language.body.data?.platform.configuration.language;
  eligibleLanguage = config?.eligible.find(code => code !== config.default) ?? config?.eligible[0];
});

baseTest.afterAll(async () => {
  // Organizations first (their role sets carry every invitation and role), then
  // the registered identities. Everything is attempted; the hook then fails with
  // the lot — a teardown that only logs leaves fixtures behind a green run.
  const failures: string[] = [];
  try {
    await cleanUpTestOrganizations();
  } catch (error) {
    failures.push((error as Error)?.message ?? String(error));
  }
  failures.push(...(await deletePersonasByEmail(registeredEmails)));
  if (failures.length > 0) {
    throw new Error(`[us1-invite-by-email afterAll] ${failures.length} fixture(s) could not be torn down:\n  ${failures.join('\n  ')}`);
  }
});

// ─── UI helpers ───────────────────────────────────────────────────────────

const openInviteDialog = async (page: Page) => {
  await page.goto(`${baseUrl}/organization/${org.nameID}/settings/community`);
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(`Invite associates to "${org.displayName}"`)).toBeVisible();
};

const searchBox = (page: Page) => page.getByRole('textbox', { name: 'Search for users by name or email' });

const addEmailChip = async (page: Page, email: string) => {
  await searchBox(page).fill(email);
  await searchBox(page).press('Enter');
};

const offerAdminRole = async (page: Page) => {
  await page.getByRole('button', { name: 'Choose roles for the invitees' }).click();
  await page.getByRole('checkbox', { name: 'Admin' }).check();
  await page.getByRole('button', { name: 'Choose roles for the invitees' }).click(); // close the popover
};

const pendingRow = (page: Page, email: string) => page.getByRole('row', { name: new RegExp(escapeRegExp(email)) });

// ─── US1-AS1 ──────────────────────────────────────────────────────────────

adminTest.describe('US1-AS1 — the dialog offers the registered-user search and email paste, the suggested language, a pre-filled message and the role choice', () => {
  adminTest('an organization admin who is not a platform admin sees all of them', async ({ page }) => {
    adminTest.setTimeout(120_000);
    await openInviteDialog(page);

    await expect(searchBox(page)).toBeVisible();
    await expect(page.getByText('Search for people below or directly add their email address')).toBeVisible();

    const language = page.getByRole('combobox', { name: /Suggested language for invitee/i });
    if (eligibleLanguage) await expect(language).toBeVisible();
    else await expect(language).toHaveCount(0);

    await expect(page.getByLabel('Invitation message')).toHaveValue(new RegExp(escapeRegExp(org.displayName)));

    await page.getByRole('button', { name: 'Choose roles for the invitees' }).click();
    const associate = page.getByRole('checkbox', { name: 'Associate' });
    await expect(associate).toBeChecked();
    await expect(associate).toBeDisabled();
    await expect(page.getByRole('checkbox', { name: 'Admin' })).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: 'Owner' })).toBeEnabled();
  });
});

// ─── US1-AS2 → AS4 → AS7 (chained on one address) ─────────────────────────

adminTest.describe('US1-AS2 → AS4 → AS7 — invite an unknown address, repeat it, then revoke and re-invite', () => {
  adminTest(
    'US1-AS2: a pasted unknown address sent as Associate + Admin with a message and a language reads "Invitation sent", and the pending table shows an external row with the offered role, Revoke and Resend',
    async ({ page }) => {
      adminTest.setTimeout(150_000);
      await openInviteDialog(page);

      await addEmailChip(page, chainEmail);
      await page.getByLabel('Invitation message').fill(chainMessage);
      await offerAdminRole(page);
      if (eligibleLanguage) {
        await page.getByRole('combobox', { name: /Suggested language for invitee/i }).click();
        await page.getByRole('option', { name: LANGUAGE_ENDONYMS[eligibleLanguage] ?? eligibleLanguage }).click();
      }
      await page.getByRole('button', { name: 'Send' }).click();
      await expect(page.getByRole('dialog').getByText('Invitation sent', { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Close', exact: true }).click();

      // The pending table: no name, the address, "Invited (external)", the
      // offered role, and both row actions.
      const row = pendingRow(page, chainEmail);
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText('Invited (external)');
      await expect(row).toContainText('Associate + Admin');
      await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Resend invitation email' })).toBeVisible();

      // The server's record: roles, message and language carried, created by the admin.
      const listed = (await listOpenEmailInvitations(org.roleSetId, admin.token)).data?.lookup.roleSet.platformInvitations ?? [];
      const record = listed.find(p => p.email === chainEmail);
      expect(record).toBeDefined();
      expect(record).toMatchObject({ profileCreated: false, roleSetExtraRoles: [RoleName.Admin], welcomeMessage: chainMessage });
      if (eligibleLanguage) expect(record?.suggestedLanguage).toEqual(eligibleLanguage);
      chainInvitationId = record!.id;

      // One email, on the organization template.
      const mails = await waitForMailsTo(chainEmail, 1);
      expect(mails).toHaveLength(1);
      expect(mails[0].subject).toEqual(organizationInvitationSubject(org.displayName));

      // The organization role set carries the record. That no Space lists it is structural (a platform
      // invitation holds exactly one role set reference), so there is no Space list for a walk to read.
      expect(await openEmailAddresses(org.roleSetId, admin.token)).toContain(chainEmail);
    }
  );

  adminTest('US1-AS4: inviting the same address again reads "Already invited" — no second row, no second email', async ({ page }) => {
    adminTest.setTimeout(150_000);
    await openInviteDialog(page);
    await addEmailChip(page, chainEmail);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('dialog').getByText('Already invited', { exact: true })).toBeVisible({ timeout: 20_000 });

    const addresses = await openEmailAddresses(org.roleSetId, admin.token);
    expect(addresses.filter(a => a === chainEmail)).toHaveLength(1);
    expect(await settledMailsTo(chainEmail)).toHaveLength(1);
  });

  adminTest('US1-AS7: Revoke (confirmed) removes the row and the record; re-inviting creates a fresh row and sends a new email', async ({ page }) => {
    adminTest.setTimeout(180_000);
    await page.goto(`${baseUrl}/organization/${org.nameID}/settings/community`);
    const row = pendingRow(page, chainEmail);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: 'Delete' }).click();
    // Revoking destroys a pending invitation, so it is confirmed: answer the
    // dialog explicitly rather than asserting on a table that is inert behind it.
    await page.getByRole('button', { name: 'Revoke invitation' }).click();
    await expect(pendingRow(page, chainEmail)).toHaveCount(0, { timeout: 15_000 });

    // The row leaves the table once the delete mutation resolves; poll the
    // server read rather than racing the refetch that follows it.
    await expect
      .poll(() => openEmailAddresses(org.roleSetId, admin.token), { timeout: 10_000 })
      .not.toContain(chainEmail);
    const gone = await lookupEmailInvitationRaw(chainInvitationId, globalAdminToken);
    // Gone means entity-not-found (or null data); any other error, such as an authorization refusal, is not proof.
    if (gone.errors.length > 0) expect(errorCodeOf(gone), gone.raw).toEqual('ENTITY_NOT_FOUND');
    else expect(gone.data?.lookup.platformInvitation).toBeFalsy();
    // "A later sign-up finds nothing" is asserted in organization-associate-invitation-external.it-spec.ts (US1-AS7).

    // Re-inviting creates a fresh invitation and a fresh email.
    const mailsBefore = (await mailsTo(chainEmail)).length;
    const reinvite = await inviteRaw(org.roleSetId, admin.token, {
      emails: [chainEmail],
      roles: [RoleName.Admin],
      message: chainMessage,
    });
    expect(reinvite.errors).toEqual([]);
    const outcome = reinvite.data?.inviteForEntryRoleOnRoleSet[0];
    expect(outcome?.type).toEqual('INVITED_TO_PLATFORM_AND_ROLE_SET');
    expect(outcome?.platformInvitation?.id).not.toEqual(chainInvitationId);
    chainInvitationId = outcome!.platformInvitation!.id;
    expect(await waitForMailsTo(chainEmail, mailsBefore + 1)).toHaveLength(mailsBefore + 1);
  });
});

// ─── US1-AS5 (through the dialog) ─────────────────────────────────────────

adminTest.describe('US1-AS5 — a mixed batch gives every chip its own outcome', () => {
  adminTest(
    'a picked user, a new address, a registered address and the picked user typed as an email: the picked user is invited once, the new address gets an email invitation, and no "role limit" outcome lands anywhere',
    async ({ page }) => {
      adminTest.setTimeout(180_000);
      const newAddress = address('mixed');

      await openInviteDialog(page);
      await searchBox(page).fill(picked.firstName);
      await page.getByRole('button', { name: picked.displayName }).click();
      await addEmailChip(page, newAddress);
      await addEmailChip(page, registeredAs5.email);
      await addEmailChip(page, picked.email);
      await offerAdminRole(page);
      await page.getByRole('button', { name: 'Send' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Invitation sent', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
      // No outcome lands on the wrong chip: nothing here can be a role-limit or a failure.
      await expect(dialog.getByText('The offered role limit has been reached')).toHaveCount(0);
      await expect(dialog.getByText('Invitation failed.')).toHaveCount(0);

      // The server agrees: P once (as an existing user), R once, the new address as an email row.
      const invitations = await listInvitations(org.roleSetId, admin.token);
      expect(invitations.filter(i => i.actor.id === picked.id)).toHaveLength(1);
      expect(invitations.filter(i => i.actor.id === registeredAs5.id)).toHaveLength(1);
      const addresses = await openEmailAddresses(org.roleSetId, admin.token);
      expect(addresses).toContain(newAddress);
      expect(addresses).not.toContain(picked.email);
      expect(addresses).not.toContain(registeredAs5.email);
    }
  );
});

// ─── API walks: AS3, AS6, AS8 ─────────────────────────────────────────────

baseTest.describe('US1-AS3 — a registered user\'s stored address typed exactly is a normal invitation', () => {
  baseTest('the outcome is INVITED_TO_ROLE_SET for that user and no email-invitation row exists', async () => {
    const res = await inviteRaw(org.roleSetId, admin.token, { emails: [registeredAs3.email], roles: [] });
    expect(res.errors).toEqual([]);
    const outcome = res.data?.inviteForEntryRoleOnRoleSet[0];
    expect(outcome?.type).toEqual('INVITED_TO_ROLE_SET');
    expect(outcome?.invitedActorID).toEqual(registeredAs3.id);
    expect(outcome?.invitedEmail).toEqual(registeredAs3.email);
    expect(outcome?.platformInvitation).toBeNull();
    expect(await openEmailAddresses(org.roleSetId, admin.token)).not.toContain(registeredAs3.email);
  });
});

baseTest.describe('US1-AS6 — no invite-time role cap for an email invitee; the existing-user advisory is unchanged', () => {
  baseTest('with six admins an email invitation offering Admin is created and emailed, while a registered user gets the role-limit outcome', async () => {
    // Fill Admin to its cap: grant until the next grant is refused. The
    // organization's creator already holds ADMIN, so how many grants that takes
    // is not fixed — only that the cap ends up full.
    const fillers = [
      TestUserManager.users.globalLicenseAdmin,
      TestUserManager.users.spaceMember,
      TestUserManager.users.subspaceMember,
      TestUserManager.users.subsubspaceMember,
      TestUserManager.users.nonSpaceMember,
      TestUserManager.users.spaceAdmin,
      TestUserManager.users.subspaceAdmin,
    ];
    for (const filler of fillers) {
      await assignUserRoleOnOrganization(capOrg.roleSetId, filler.id, RoleName.Associate);
      try {
        await assignUserRoleOnOrganization(capOrg.roleSetId, filler.id, RoleName.Admin);
      } catch (error) {
        if (String(error).includes('ROLESET_POLICY_ROLE_LIMITS_VIOLATED')) break;
        throw error;
      }
    }
    expect((await getUserIdsInRole(capOrg.roleSetId, RoleName.Admin, globalAdminToken)).length).toBeGreaterThanOrEqual(6);

    const capAddress = address('cap');
    const res = await inviteRaw(capOrg.roleSetId, globalAdminToken, { emails: [capAddress], roles: [RoleName.Admin] });
    expect(res.errors).toEqual([]);
    expect(res.data?.inviteForEntryRoleOnRoleSet[0]?.type).toEqual('INVITED_TO_PLATFORM_AND_ROLE_SET');
    expect(await waitForMailsTo(capAddress, 1)).toHaveLength(1);

    const advisory = await inviteRaw(capOrg.roleSetId, globalAdminToken, { actorIds: [capInvitee.id], roles: [RoleName.Admin] });
    expect(advisory.errors).toEqual([]);
    expect(advisory.data?.inviteForEntryRoleOnRoleSet[0]?.type).toEqual('EXTRA_ROLE_LIMIT_REACHED');
  });
});

baseTest.describe('US1-AS8 — who may invite by email, list, revoke and resend', () => {
  const forbidden = /FORBIDDEN_POLICY|unable to grant/i;

  baseTest('a plain associate and a registered non-admin are refused all four; an OWNER and platform support are not', async () => {
    const seededEmail = address('as8-seed');
    const seeded = await inviteRaw(org.roleSetId, admin.token, { emails: [seededEmail], roles: [] });
    const seededId = seeded.data!.inviteForEntryRoleOnRoleSet[0]!.platformInvitation!.id;

    for (const persona of [plainAssociate, nonAdmin]) {
      const attempted = address(`as8-${persona.firstName.toLowerCase()}`);
      const invite = await inviteRaw(org.roleSetId, persona.token, { emails: [attempted], roles: [] });
      expect(invite.errors.length, `${persona.email} invite`).toBeGreaterThan(0);
      expect(invite.raw).toMatch(forbidden);

      const list = await listOpenEmailInvitations(org.roleSetId, persona.token);
      expect(list.errors.length, `${persona.email} list`).toBeGreaterThan(0);
      expect(list.raw).toMatch(forbidden);

      const revoke = await deleteEmailInvitationRaw(seededId, persona.token);
      expect(revoke.errors.length, `${persona.email} revoke`).toBeGreaterThan(0);

      const resend = await resendEmailInvitationRaw(seededId, persona.token);
      expect(resend.errors.length, `${persona.email} resend`).toBeGreaterThan(0);
      expect(resend.raw).toMatch(forbidden);

      expect(await openEmailAddresses(org.roleSetId, admin.token)).not.toContain(attempted);
    }
    // The refused revoke left the seeded row in place.
    expect(await openEmailAddresses(org.roleSetId, admin.token)).toContain(seededEmail);

    // An OWNER can do all four.
    const ownerEmail = address('as8-owner');
    const ownerInvite = await inviteRaw(org.roleSetId, owner.token, { emails: [ownerEmail], roles: [] });
    expect(ownerInvite.errors).toEqual([]);
    const ownerRowId = ownerInvite.data!.inviteForEntryRoleOnRoleSet[0]!.platformInvitation!.id;
    expect(await openEmailAddresses(org.roleSetId, owner.token)).toContain(ownerEmail);
    expect((await resendEmailInvitationRaw(ownerRowId, owner.token)).errors).toEqual([]);
    expect((await deleteEmailInvitationRaw(ownerRowId, owner.token)).errors).toEqual([]);

    // Platform support can invite, list and resend.
    const supportEmail = address('as8-support');
    const supportInvite = await inviteRaw(org.roleSetId, supportToken, { emails: [supportEmail], roles: [] });
    expect(supportInvite.errors).toEqual([]);
    const supportRowId = supportInvite.data!.inviteForEntryRoleOnRoleSet[0]!.platformInvitation!.id;
    expect(await openEmailAddresses(org.roleSetId, supportToken)).toContain(supportEmail);
    const supportResend = await resendEmailInvitationRaw(supportRowId, supportToken);
    expect(supportResend.errors, supportResend.raw).toEqual([]);
    expect(errorCodeOf(supportResend)).toBeUndefined();
  });
});
