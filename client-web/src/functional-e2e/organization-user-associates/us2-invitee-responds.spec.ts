// User Story 2: "The invited user answers the invitation from the organization
// profile or their pending list" (workspace#062, P1, risk high).
//
// server-api coverage (the API halves of AS5/AS6/AS7, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/organization-associate-invitation.it-spec.ts
//
// @forge-acceptance
//
// This file covers the halves that only exist in the browser and that the
// it-spec cannot reach: the hero action an invitee actually sees, the accept and
// decline paths from it, the distinct Organisation section of the personal
// pending dialog, and — the one FR-003 calls out as never allowed to be silent —
// the notice an invitee gets when an offered role could not be granted.
//
// Serial: every scenario drives the same handful of personas through login, and
// the walks share one MailSlurper/Kratos verification round-trip (see the
// --workers=1 note in the test plan).

import { expect, test as baseTest, type Page } from '@playwright/test';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignUserRoleOnOrganization,
  cleanUpTestOrganizations,
  createTestOrganization,
  getAssociateEligibility,
  getUserIdsInRole,
  getUserToken,
  inviteUserToOrganizationRaw,
  postGraphqlRaw,
  registerPersona,
  removeUserRoleOnOrganization,
  runSuffix,
  TestUserManager,
  type OrgFixture,
} from './organization-user-associates.helpers';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// Organization OWNER cap (mirrors OWNER_CAP in the server-api sibling it-spec).
const OWNER_CAP = 3;

// The exact sentence FR-003 requires — `orgProfile.invitationDialog.withheld`
// with `roleName.owner` interpolated (client-web crd profilePages i18n).
const WITHHELD_OWNER_NOTICE = 'The Owner role could not be granted. You are an associate.';

baseTest.describe.configure({ mode: 'serial' });

let orgO: OrgFixture; // AS2/AS3/AS4/AS5: two admins, ordinary invitations + one Associate + Owner offer
let adminEmail: string;
let accepterEmail: string;
let declinerEmail: string;
let listAccepterEmail: string;
let withheldEmail: string;
let accepterId: string;
let listAccepterId: string;
let withheldId: string;

const accepterTest = createPersonaTest(`us2-accepter-${runSuffix}@alkem.io`);
const declinerTest = createPersonaTest(`us2-decliner-${runSuffix}@alkem.io`);
const listAccepterTest = createPersonaTest(`us2-listaccepter-${runSuffix}@alkem.io`);
const withheldTest = createPersonaTest(`us2-withheld-${runSuffix}@alkem.io`);

/**
 * Every (user, role) a scenario granted on orgO — by accepting in the UI, or as
 * an AS5 cap filler — newest first, so OWNER comes off before the ASSOCIATE it
 * depends on. Released in afterAll BEFORE the organization is deleted (see the
 * 061 helper on why an organization must be stripped before a delete).
 */
const grantedRoles: Array<{ actorID: string; role: RoleName; who: string }> = [];
const trackGrant = (actorID: string, role: RoleName, who: string) => grantedRoles.unshift({ actorID, role, who });
let adminDisplayName = ''; // the inviter, as the respond dialog names them (US2-AS2)

const userIdFor = async (email: string): Promise<string> => {
  const bearerToken = await getUserToken(email);
  const res = await postGraphqlRaw<{ me: { user: { id: string } } }>('query { me { user { id } } }', {
    bearerToken,
  });
  const id = res.body.data?.me.user.id;
  if (!id) throw new Error(`no user for ${email}: ${res.raw}`);
  return id;
};

baseTest.beforeAll(async () => {
  // Five Kratos registration + mailbox-verification cycles below; the default
  // hook budget is nowhere near enough (us1/us3/us7 raise theirs the same way).
  baseTest.setTimeout(180_000);

  // createTestOrganization authenticates through TestUserManager; without this
  // its model map is undefined and the helper throws before anything is created.
  await TestUserManager.populateUserModelMap();

  adminEmail = await registerPersona('us2-admin');
  accepterEmail = await registerPersona('us2-accepter');
  declinerEmail = await registerPersona('us2-decliner');
  listAccepterEmail = await registerPersona('us2-listaccepter');
  withheldEmail = await registerPersona('us2-withheld');

  orgO = await createTestOrganization('OrgO', runSuffix);

  const adminId = await userIdFor(adminEmail);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminId, RoleName.Associate);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminId, RoleName.Admin);

  const adminToken = await getUserToken(adminEmail);
  const adminMe = await postGraphqlRaw<{ me: { user: { profile: { displayName: string } } } }>(
    'query { me { user { profile { displayName } } } }',
    { bearerToken: adminToken }
  );
  adminDisplayName = adminMe.body.data?.me.user.profile.displayName ?? '';
  if (!adminDisplayName) throw new Error(`no display name for ${adminEmail}: ${adminMe.raw}`);
  [accepterId, listAccepterId, withheldId] = await Promise.all([
    userIdFor(accepterEmail),
    userIdFor(listAccepterEmail),
    userIdFor(withheldEmail),
  ]);
  // US2-AS2 is the Associate + Admin path of the spec, so the accepter is
  // offered Admin; the decliner and the list accepter are plain Associate.
  for (const [invitee, extraRoles] of [
    [accepterEmail, [RoleName.Admin]],
    [declinerEmail, []],
    [listAccepterEmail, []],
  ] as const) {
    const inviteeId = await userIdFor(invitee);
    await inviteUserToOrganizationRaw(
      orgO.roleSetId,
      inviteeId,
      `US2 welcome ${runSuffix}`,
      adminToken,
      [...extraRoles]
    );
  }

  // AS5: offered Associate + OWNER NOW, while there is still Owner headroom.
  // 062 validates the cap at invite time too, so filling the cap first would
  // refuse the invitation and the accept-time path could never be reached.
  // The remaining Owner slots are consumed inside the AS5 scenario itself.
  const withheldInvite = await inviteUserToOrganizationRaw(
    orgO.roleSetId,
    withheldId,
    `US2 owner welcome ${runSuffix}`,
    adminToken,
    [RoleName.Owner]
  );
  if (withheldInvite.type !== 'INVITED_TO_ROLE_SET' || !withheldInvite.invitationId) {
    throw new Error(`AS5 Associate + Owner invitation was not created: ${JSON.stringify(withheldInvite)}`);
  }
});

baseTest.afterAll(async () => {
  // Release every role a scenario granted (UI accepts, AS5 fillers) before the
  // organization goes — inspected, reported, never thrown.
  const failures: string[] = [];
  for (const g of grantedRoles.splice(0, grantedRoles.length)) {
    try {
      await removeUserRoleOnOrganization(orgO.roleSetId, g.actorID, g.role);
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      // The last OWNER cannot be released (min-owner policy, by design); the
      // organization is deleted right below, which takes that role with it.
      if (g.role === RoleName.Owner && message.includes('ROLESET_POLICY_ROLE_LIMITS_VIOLATED')) continue;
      failures.push(`${g.role} from ${g.who}: ${message}`);
    }
  }
  if (failures.length > 0) {
    console.error(`[us2-invitee-responds afterAll] ${failures.length} role(s) could not be released:\n  ${failures.join('\n  ')}`);
  }
  await cleanUpTestOrganizations();
});

const openOrganizationProfile = async (page: Page) => {
  await page.goto(`${baseUrl}/organization/${orgO.nameID}`);
  await page.waitForLoadState('networkidle');
};

/** The API's view of the invitee's standing — polled, because the accept
 * mutation's refetch and the eligibility read are independent requests. */
const expectAssociateViaApi = async (email: string) => {
  const bearerToken = await getUserToken(email);
  await expect
    .poll(async () => (await getAssociateEligibility(orgO.id, bearerToken)).reason, { timeout: 20_000 })
    .toBe('ALREADY_ASSOCIATE');
};

// ─── US2-AS2 ────────────────────────────────────────────────────────────────

accepterTest.describe('US2-AS2 — the invitee answers from the organization profile', () => {
  accepterTest(
    'the hero offers Respond to invitation; the dialog names the organization, the offered role (Associate + Admin), the inviter and the message; accepting grants both roles and the Associates tab badges them',
    async ({ page }) => {
      await openOrganizationProfile(page);

      // Not "Apply": an invitation is pending, so the hero must reflect that state.
      const respond = page.getByRole('button', { name: 'Respond to invitation' });
      await expect(respond).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Apply to associate' })).toHaveCount(0);

      await respond.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(orgO.displayName);
      await expect(dialog).toContainText(`US2 welcome ${runSuffix}`);
      // The offered role and the inviter are the two facts the invitee decides
      // on (spec US2-AS2); copy from profilePages.en.json `respondDialog`.
      await expect(dialog).toContainText('Offered role');
      await expect(dialog).toContainText('Associate + Admin');
      await expect(dialog).toContainText(`Invited by ${adminDisplayName}`);

      await dialog.getByRole('button', { name: 'Accept' }).click();

      // The hero drops the action entirely once the viewer is an associate.
      await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0, {
        timeout: 20_000,
      });
      await expect(page.getByRole('button', { name: 'Apply to associate' })).toHaveCount(0);

      // Admin is tracked AFTER Associate so teardown removes it first.
      trackGrant(accepterId, RoleName.Associate, accepterEmail);
      trackGrant(accepterId, RoleName.Admin, accepterEmail);
      await expectAssociateViaApi(accepterEmail);
      // The offered Admin role was granted with the entry role, not withheld.
      await expect
        .poll(() => getUserIdsInRole(orgO.roleSetId, RoleName.Admin), { timeout: 15_000 })
        .toContain(accepterId);

      // Now an admin, the accepter can open the Associates tab and sees their
      // own row carrying both badges (org.associates.badge.*).
      await page.goto(`${baseUrl}/organization/${orgO.nameID}/settings/community`);
      const ownRow = page
        .getByRole('listitem')
        .filter({ hasText: new RegExp(accepterEmail.replace('@alkem.io', ''), 'i') });
      await expect(ownRow).toBeVisible({ timeout: 15_000 });
      await expect(ownRow.getByText('Associate', { exact: true })).toBeVisible();
      await expect(ownRow.getByText('Admin', { exact: true })).toBeVisible();
    }
  );
});

// ─── US2-AS3 ────────────────────────────────────────────────────────────────

declinerTest.describe('US2-AS3 — declining leaves the invitee outside the organization', () => {
  declinerTest('the invitation is gone from the profile and the invitee is not an associate', async ({ page }) => {
    await openOrganizationProfile(page);

    await page.getByRole('button', { name: 'Respond to invitation' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Decline' }).click();

    await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0, {
      timeout: 20_000,
    });
    // Declining is not joining: the profile falls back to the apply state
    // (orgO accepts applications by default), never to the associate state.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply to associate' })).toBeVisible({ timeout: 15_000 });
  });
});

// ─── US2-AS4 ────────────────────────────────────────────────────────────────

listAccepterTest.describe('US2-AS4 — the personal pending list keeps organization invitations distinct', () => {
  listAccepterTest(
    'the organisation invitation renders in its own section with the organisation name, and accepting returns to the list',
    async ({ page }) => {
      await page.goto(`${baseUrl}/home`);
      await page.waitForLoadState('networkidle');

      // The pending-memberships dialog is reached from the top bar; the
      // organization row must be visually separated from Space invitations
      // rather than folded in among them.
      const pendingEntry = page.getByRole('button', { name: /pending|invitation/i }).first();
      await pendingEntry.click();

      const list = page.getByRole('dialog');
      await expect(list).toBeVisible({ timeout: 15_000 });
      // "Associate Invitations", NOT the 061 "Organisation Invitations" section (which is
       // about Spaces inviting an organisation this user administers). The two sections sit
       // in the same dialog, so the title has to identify one of them unambiguously.
      await expect(list.getByText(/Associate invitations/i)).toBeVisible({ timeout: 15_000 });
      await expect(list.getByText('Organisation Invitations', { exact: true })).toHaveCount(0);
      // The card is a button whose accessible name carries the organisation name.
      const orgCard = list.getByRole('button', { name: orgO.displayName });
      await expect(orgCard).toBeVisible();
      // Visually distinct from a Space invitation: the card carries the offered
      // role and the "Organisation" badge (dashboard.en.json `orgAssociateCard`).
      await expect(orgCard).toContainText('Associate');
      await expect(orgCard).toContainText('Organisation');

      // Opening the card swaps the list for the organisation's own detail
      // dialog (not the Space one), which carries the welcome message.
      await orgCard.click();
      const detail = page.getByRole('dialog');
      await expect(detail).toContainText(`Invitation to associate with ${orgO.displayName}`, { timeout: 15_000 });
      await expect(detail).toContainText(`US2 welcome ${runSuffix}`);
      await detail.getByRole('button', { name: 'Accept' }).click();

      // Accepting returns to the list — no navigation to a Space — and the
      // organisation card is gone from it.
      const listAgain = page.getByRole('dialog');
      await expect(listAgain).toContainText('Pending Memberships', { timeout: 20_000 });
      await expect(listAgain).not.toContainText('Invitation to associate with');
      await expect(listAgain.getByRole('button', { name: orgO.displayName })).toHaveCount(0);

      trackGrant(listAccepterId, RoleName.Associate, listAccepterEmail);
      await expectAssociateViaApi(listAccepterEmail);
    }
  );
});

// ─── US2-AS5 ────────────────────────────────────────────────────────────────

withheldTest.describe('US2-AS5 — an offered role that can no longer be granted is withheld, and the invitee is told', () => {
  withheldTest(
    'accepting Associate + Owner after the Owner cap filled grants Associate only and shows the withheld sentence',
    async ({ page }) => {
      // Fill every REMAINING Owner slot now, after the invitation was created
      // in beforeAll with headroom (sequence mirrors the it-spec's US2-AS5).
      // Fillers are existing TestUserManager personas — only their actorID is
      // needed; each needs ASSOCIATE before OWNER, and both are released in
      // afterAll via `grantedRoles`.
      const ownersNow = await getUserIdsInRole(orgO.roleSetId, RoleName.Owner);
      const fillers = [
        TestUserManager.users.spaceAdmin,
        TestUserManager.users.subspaceAdmin,
        TestUserManager.users.subsubspaceAdmin,
      ].filter(u => !ownersNow.includes(u.id));
      for (let granted = ownersNow.length; granted < OWNER_CAP; granted++) {
        const filler = fillers.shift();
        if (!filler) throw new Error(`AS5: not enough Owner fillers to reach the cap of ${OWNER_CAP}`);
        await assignUserRoleOnOrganization(orgO.roleSetId, filler.id, RoleName.Associate);
        trackGrant(filler.id, RoleName.Associate, filler.email);
        await assignUserRoleOnOrganization(orgO.roleSetId, filler.id, RoleName.Owner);
        trackGrant(filler.id, RoleName.Owner, filler.email);
      }
      expect((await getUserIdsInRole(orgO.roleSetId, RoleName.Owner)).length).toBe(OWNER_CAP);

      await openOrganizationProfile(page);
      const respond = page.getByRole('button', { name: 'Respond to invitation' });
      await expect(respond).toBeVisible({ timeout: 15_000 });
      await respond.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Associate + Owner'); // what was OFFERED
      await dialog.getByRole('button', { name: 'Accept' }).click();

      // FR-003: never silent. The DISTINCT withheld sentence — not merely the
      // offered role name — is raised as a notification (the dialog closes on
      // settle, so the inline notice alone would never be seen).
      await expect(page.getByText(WITHHELD_OWNER_NOTICE)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0, {
        timeout: 20_000,
      });

      trackGrant(withheldId, RoleName.Associate, withheldEmail);
      await expectAssociateViaApi(withheldEmail);
      // ... and an associate ONLY: Owner was withheld, not granted.
      expect(await getUserIdsInRole(orgO.roleSetId, RoleName.Owner)).not.toContain(withheldId);
    }
  );
});
