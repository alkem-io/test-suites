// User Story 3: "An admin resends a pending email invitation (Space and
// Organization)" (priority 1).
//
// server-api coverage (same scenarios as it-specs, repository-internal detail):
//   server-api/src/functional-api/roleset/invitations/invitation-external-resend.it-spec.ts
//   server-api/src/functional-api/roleset/associates/organization-associate-invitation-external.it-spec.ts
//
// @forge-acceptance
//
// AS1 (organization table), AS2 (Space table) and AS3 (the refused second
// click) are driven through the real pending tables by an organization admin
// and a Space admin. AS4 (consumed), AS5 (authorization) and AS6 (the original
// inviter deleted) are API acceptance walks — the table never offers Resend for
// a consumed row and a plain member cannot reach the table at all.
//
// The cooldown belongs to the address on its role set (five minutes by
// default), not to the invitation: revoking and re-inviting the same address does
// not reset it (asserted in the server-api resend it-spec). The independence of
// two addresses IS asserted here (AS3). "After the window a resend succeeds
// again" is asserted only when the stack runs with a short window the harness
// also exports as PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS (the stack runner
// sets 5); with the 300 s default that case is skipped rather than waited out.
//
// Serial: one scenario, one MailSlurper mailbox, several Kratos registrations.

import { expect, test as baseTest, type Page } from '@playwright/test';
import { TestScenarioFactory, TestUser } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  adminToken,
  assignUserRoleOnOrganization,
  baseUrl,
  decodeMailBody,
  deletePersonasByEmail,
  errorCodeOf,
  escapeRegExp,
  inviteRaw,
  lookupEmailInvitationRaw,
  mailsTo,
  organizationInvitationSubject,
  recordedInviterId,
  registerUserAtAddress,
  resendCooldownSeconds,
  resendEmailInvitationRaw,
  RoleName,
  runSuffix,
  settledMailsTo,
  TestUserManager,
  waitForMailsTo,
  type RegisteredUser,
} from './organization-email-invitations.helpers';

baseTest.describe.configure({ mode: 'serial' });

const THROTTLED_CODE = 'ROLESET_INVITATION_RESEND_THROTTLED';
// RoleSetInvitationException: resending a consumed email invitation (FR-016).
const CONSUMED_CODE = 'ROLESET_INVITATION';

// Longest window a walk is willing to sit out; the server default is far above it.
const MAX_WAITABLE_WINDOW_SECONDS = 30;
// Slack after the window so the marker has certainly expired.
const WINDOW_SETTLE_MS = 3_000;

const orgAdminTest = createPersonaTest(`${TestUser.ORGANIZATION_ADMIN}@alkem.io`);
const spaceAdminTest = createPersonaTest(`${TestUser.SPACE_ADMIN}@alkem.io`);

const address = (label: string) => `us081c-${label}-${runSuffix}@example.com`;
const goneAdminEmail = `us081c-goneadmin-${runSuffix}@test.alkem.io`;
const consumedEmail = address('consumed');

let scenario: OrganizationWithSpaceModel;
let globalAdminToken: string;
let orgAdminToken: string;
let orgRoleSetId: string;
let spaceRoleSetId: string;

const registered: string[] = [goneAdminEmail, consumedEmail];

const orgEmail = address('org');
const orgEmail2 = address('org2');
const spaceEmail = address('space');
let orgInvitationId = '';
let orgInvitation2Id = '';
let spaceInvitationId = '';

const createEmailInvitation = async (roleSetId: string, email: string, roles: RoleName[]): Promise<string> => {
  const res = await inviteRaw(roleSetId, globalAdminToken, { emails: [email], roles, message: `US3 resend ${runSuffix}` });
  const outcome = res.data?.inviteForEntryRoleOnRoleSet[0];
  if (res.errors.length > 0 || outcome?.type !== 'INVITED_TO_PLATFORM_AND_ROLE_SET' || !outcome.platformInvitation) {
    throw new Error(`email invitation for ${email} was not created: ${res.raw}`);
  }
  return outcome.platformInvitation.id;
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(300_000);
  await TestUserManager.populateUserModelMap();
  globalAdminToken = await adminToken();

  scenario = await TestScenarioFactory.createBaseScenario({
    name: 'org-email-resend',
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
    },
  });
  orgRoleSetId = scenario.organization.roleSetId;
  spaceRoleSetId = scenario.space.community.roleSetId;
  orgAdminToken = TestUserManager.users.organizationAdmin.authToken;

  // A plain associate: may read the organization, may not manage invitations.
  await assignUserRoleOnOrganization(orgRoleSetId, TestUserManager.users.betaTester.id, RoleName.Associate);

  orgInvitationId = await createEmailInvitation(orgRoleSetId, orgEmail, [RoleName.Admin]);
  orgInvitation2Id = await createEmailInvitation(orgRoleSetId, orgEmail2, []);
  spaceInvitationId = await createEmailInvitation(spaceRoleSetId, spaceEmail, [RoleName.Member]);
  // Let the three creation mails land so every later count is a true delta.
  await Promise.all([waitForMailsTo(orgEmail, 1), waitForMailsTo(orgEmail2, 1), waitForMailsTo(spaceEmail, 1)]);
});

baseTest.afterAll(async () => {
  const failures: string[] = [];
  try {
    await TestScenarioFactory.cleanUpBaseScenario(scenario);
  } catch (error) {
    failures.push(`scenario: ${(error as Error)?.message ?? String(error)}`);
  }
  failures.push(...(await deletePersonasByEmail(registered)));
  if (failures.length > 0) {
    throw new Error(`[us3-resend afterAll] ${failures.length} fixture(s) could not be torn down:\n  ${failures.join('\n  ')}`);
  }
});

const pendingRow = (page: Page, email: string) => page.getByRole('row', { name: new RegExp(escapeRegExp(email)) });
const resendButton = (page: Page, email: string) =>
  pendingRow(page, email).getByRole('button', { name: 'Resend invitation email' });

// ─── US3-AS1 + US3-AS3 — the organization table ───────────────────────────

orgAdminTest.describe('US3-AS1 / US3-AS3 — Resend in the organization Associates pending table', () => {
  orgAdminTest('US3-AS1: one click sends exactly one more email naming the resending admin and leaves the row unchanged', async ({ page }) => {
    orgAdminTest.setTimeout(150_000);
    const before = await lookupEmailInvitationRaw(orgInvitationId, globalAdminToken);
    const mailsBefore = (await mailsTo(orgEmail)).length;

    await page.goto(`${baseUrl}/organization/${scenario.organization.nameId}/settings/community`);
    await expect(pendingRow(page, orgEmail)).toBeVisible({ timeout: 20_000 });
    await resendButton(page, orgEmail).click();
    await expect(page.getByText('Invitation email sent again')).toBeVisible({ timeout: 15_000 });

    const mails = await waitForMailsTo(orgEmail, mailsBefore + 1);
    expect(mails).toHaveLength(mailsBefore + 1);
    // MailSlurper lists newest first and the original invitation mail is in the same mailbox, so the
    // resent mail is identified by what distinguishes it: it names the resending admin as the inviter
    // (the original names the platform admin who created the invitation).
    const resendingAdmin = TestUserManager.users.organizationAdmin.displayName;
    const resent = mails.find(m => decodeMailBody(m.body).includes(resendingAdmin));
    expect(resent, 'a mail naming the resending admin as the inviter').toBeDefined();
    expect(resent?.subject).toEqual(organizationInvitationSubject(scenario.organization.profile.displayName));
    const body = decodeMailBody(resent?.body);
    expect(body).toContain('Associate + Admin');
    expect(body).toContain(`US3 resend ${runSuffix}`);

    // The row is exactly what it was.
    const after = await lookupEmailInvitationRaw(orgInvitationId, globalAdminToken);
    expect(after.data?.lookup.platformInvitation).toEqual(before.data?.lookup.platformInvitation);
  });

  orgAdminTest('US3-AS3: a second click on the same row is refused with the readable message and sends nothing; another address is independent', async ({ page }) => {
    orgAdminTest.setTimeout(150_000);
    const mailsBefore = (await mailsTo(orgEmail)).length;

    await page.goto(`${baseUrl}/organization/${scenario.organization.nameId}/settings/community`);
    await expect(pendingRow(page, orgEmail)).toBeVisible({ timeout: 20_000 });
    await resendButton(page, orgEmail).click();
    await expect(page.getByText('Already resent recently — try again in a few minutes')).toBeVisible({ timeout: 15_000 });
    expect(await settledMailsTo(orgEmail)).toHaveLength(mailsBefore);

    // A different address has its own cooldown.
    const otherBefore = (await mailsTo(orgEmail2)).length;
    await resendButton(page, orgEmail2).click();
    await expect(page.getByText('Invitation email sent again')).toBeVisible({ timeout: 15_000 });
    expect(await waitForMailsTo(orgEmail2, otherBefore + 1)).toHaveLength(otherBefore + 1);
  });

  orgAdminTest('US3-AS3: after the window the same address can be resent again', async ({ page }) => {
    const windowSeconds = resendCooldownSeconds();
    orgAdminTest.skip(
      windowSeconds > MAX_WAITABLE_WINDOW_SECONDS,
      `the resend cooldown is ${windowSeconds} s; run the stack with PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS set to ${MAX_WAITABLE_WINDOW_SECONDS} or less (the stack runner uses 5) and export the same value to this run`
    );
    orgAdminTest.setTimeout(150_000 + windowSeconds * 1000);
    const mailsBefore = (await mailsTo(orgEmail)).length;

    // The earlier tests claimed this address's window; let it lapse.
    await page.waitForTimeout(windowSeconds * 1000 + WINDOW_SETTLE_MS);

    await page.goto(`${baseUrl}/organization/${scenario.organization.nameId}/settings/community`);
    await expect(pendingRow(page, orgEmail)).toBeVisible({ timeout: 20_000 });
    await resendButton(page, orgEmail).click();
    await expect(page.getByText('Invitation email sent again')).toBeVisible({ timeout: 15_000 });
    expect(await waitForMailsTo(orgEmail, mailsBefore + 1)).toHaveLength(mailsBefore + 1);
  });
});

// ─── US3-AS2 — the Space table ────────────────────────────────────────────

spaceAdminTest.describe('US3-AS2 — Resend in the Space community pending table', () => {
  spaceAdminTest('one click sends exactly one more email on the unchanged Space external-invitation template and leaves the row unchanged', async ({ page }) => {
    spaceAdminTest.setTimeout(150_000);
    const before = await lookupEmailInvitationRaw(spaceInvitationId, globalAdminToken);
    const mailsBefore = (await mailsTo(spaceEmail)).length;

    await page.goto(`${baseUrl}/${scenario.space.nameId}/settings`);
    await page.getByRole('tab', { name: 'Community' }).click();
    await expect(pendingRow(page, spaceEmail)).toBeVisible({ timeout: 25_000 });
    await resendButton(page, spaceEmail).click();
    await expect(page.getByText('Invitation email sent again')).toBeVisible({ timeout: 15_000 });

    const mails = await waitForMailsTo(spaceEmail, mailsBefore + 1);
    expect(mails).toHaveLength(mailsBefore + 1);
    // The Space template and subject — not the organization one. The original and the resent mail share
    // the mailbox, so every mail counted must carry the Space subject: whichever one is the resent mail,
    // a resend on the organization template would leave a differing subject among them.
    const spaceSubject = `Invitation to join ${scenario.space.about.profile.displayName}`;
    expect(mails.map(m => m.subject)).toEqual(mails.map(() => spaceSubject));

    const after = await lookupEmailInvitationRaw(spaceInvitationId, globalAdminToken);
    expect(after.data?.lookup.platformInvitation).toEqual(before.data?.lookup.platformInvitation);
  });
});

// ─── API walks: AS4, AS5, AS6 ─────────────────────────────────────────────

baseTest.describe('US3-AS4 — a consumed invitation cannot be resent', () => {
  baseTest('once the address has registered, resending its id is refused with a typed error (not the throttle) and sends nothing', async () => {
    baseTest.setTimeout(180_000);
    const id = await createEmailInvitation(orgRoleSetId, consumedEmail, []);
    await waitForMailsTo(consumedEmail, 1);
    await registerUserAtAddress(consumedEmail, `Consumed${runSuffix}`);
    const mailsBefore = (await settledMailsTo(consumedEmail, 6_000)).length;

    const res = await resendEmailInvitationRaw(id, orgAdminToken);
    expect(res.errors.length, res.raw).toBeGreaterThan(0);
    expect(errorCodeOf(res)).not.toEqual(THROTTLED_CODE);
    // The typed "consumed" refusal, not just any error (an unknown id or an
    // authorization refusal must not satisfy this case).
    expect(errorCodeOf(res), res.raw).toEqual(CONSUMED_CODE);
    expect(res.errors[0]?.message).toMatch(/already consumed/i);
    expect(res.data?.resendPlatformInvitation).toBeUndefined();
    expect(await settledMailsTo(consumedEmail)).toHaveLength(mailsBefore);
  });
});

baseTest.describe('US3-AS5 — only someone who may invite may resend', () => {
  baseTest('a plain associate and a registered non-admin are refused on the organization, a plain member on the Space; nothing is sent', async () => {
    const forbidden = /FORBIDDEN_POLICY|unable to grant/i;
    const orgBefore = (await mailsTo(orgEmail2)).length;
    const spaceBefore = (await mailsTo(spaceEmail)).length;

    for (const persona of [TestUserManager.users.betaTester, TestUserManager.users.qaUser]) {
      const res = await resendEmailInvitationRaw(orgInvitation2Id, persona.authToken);
      expect(res.errors.length, persona.email).toBeGreaterThan(0);
      expect(res.raw).toMatch(forbidden);
    }
    const member = await resendEmailInvitationRaw(spaceInvitationId, TestUserManager.users.spaceMember.authToken);
    expect(member.errors.length).toBeGreaterThan(0);
    expect(member.raw).toMatch(forbidden);

    expect(await settledMailsTo(orgEmail2)).toHaveLength(orgBefore);
    expect(await settledMailsTo(spaceEmail, 1_000)).toHaveLength(spaceBefore);
  });
});

baseTest.describe('US3-AS6 — the original inviter was deleted', () => {
  baseTest('another admin can still resend: the email goes out naming the resending admin and the recorded inviter is unchanged', async () => {
    baseTest.setTimeout(240_000);
    const goneAdmin: RegisteredUser = await registerUserAtAddress(goneAdminEmail, `GoneAdmin${runSuffix}`);
    await assignUserRoleOnOrganization(orgRoleSetId, goneAdmin.id, RoleName.Admin);

    const inviteeEmail = address('orphan');
    const created = await inviteRaw(orgRoleSetId, goneAdmin.token, { emails: [inviteeEmail], roles: [RoleName.Admin], message: `US3 orphan ${runSuffix}` });
    expect(created.errors, created.raw).toEqual([]);
    const id = created.data!.inviteForEntryRoleOnRoleSet[0]!.platformInvitation!.id;
    await waitForMailsTo(inviteeEmail, 1);
    const before = await lookupEmailInvitationRaw(id, globalAdminToken);

    // The inviter's account goes away; the invitation addressed to someone else stays.
    expect(await deletePersonasByEmail([goneAdminEmail])).toEqual([]);

    const mailsBefore = (await mailsTo(inviteeEmail)).length;
    const res = await resendEmailInvitationRaw(id, orgAdminToken);
    expect(res.errors, res.raw).toEqual([]);

    const mails = await waitForMailsTo(inviteeEmail, mailsBefore + 1);
    expect(mails).toHaveLength(mailsBefore + 1);
    // Newest first: the original mail names the deleted inviter's account, the resent one names the resending admin.
    expect(mails.some(m => decodeMailBody(m.body).includes(TestUserManager.users.organizationAdmin.displayName))).toBe(true);

    const after = await lookupEmailInvitationRaw(id, globalAdminToken);
    expect(after.data?.lookup.platformInvitation).toEqual(before.data?.lookup.platformInvitation);
    // The recorded inviter is a bare reference that no longer resolves through
    // the API, so it is read from the table where the harness can reach it.
    const inviter = await recordedInviterId(id);
    if (inviter !== undefined) expect(inviter).toEqual(goneAdmin.id);
  });
});
