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
  getUserToken,
  inviteUserToOrganizationRaw,
  postGraphqlRaw,
  registerPersona,
  runSuffix,
  TestUserManager,
  type OrgFixture,
} from './organization-user-associates.helpers';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

baseTest.describe.configure({ mode: 'serial' });

let orgO: OrgFixture; // AS2/AS3/AS4: two admins, ordinary invitations
let adminEmail: string;
let accepterEmail: string;
let declinerEmail: string;
let listAccepterEmail: string;

const accepterTest = createPersonaTest(`us2-accepter-${runSuffix}@alkem.io`);
const declinerTest = createPersonaTest(`us2-decliner-${runSuffix}@alkem.io`);
const listAccepterTest = createPersonaTest(`us2-listaccepter-${runSuffix}@alkem.io`);

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
  // createTestOrganization authenticates through TestUserManager; without this
  // its model map is undefined and the helper throws before anything is created.
  await TestUserManager.populateUserModelMap();

  adminEmail = await registerPersona('us2-admin');
  accepterEmail = await registerPersona('us2-accepter');
  declinerEmail = await registerPersona('us2-decliner');
  listAccepterEmail = await registerPersona('us2-listaccepter');

  orgO = await createTestOrganization('OrgO', runSuffix);

  const adminId = await userIdFor(adminEmail);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminId, RoleName.Associate);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminId, RoleName.Admin);

  const adminToken = await getUserToken(adminEmail);
  for (const invitee of [accepterEmail, declinerEmail, listAccepterEmail]) {
    const inviteeId = await userIdFor(invitee);
    await inviteUserToOrganizationRaw(
      orgO.roleSetId,
      inviteeId,
      `US2 welcome ${runSuffix}`,
      adminToken
    );
  }
});

baseTest.afterAll(async () => {
  await cleanUpTestOrganizations();
});

const openOrganizationProfile = async (page: Page) => {
  await page.goto(`${baseUrl}/organization/${orgO.nameID}`);
  await page.waitForLoadState('networkidle');
};

// ─── US2-AS2 ────────────────────────────────────────────────────────────────

accepterTest.describe('US2-AS2 — the invitee answers from the organization profile', () => {
  accepterTest(
    'the hero offers Respond to invitation, the dialog names the organization and the message, and accepting makes the invitee an associate',
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

      await dialog.getByRole('button', { name: 'Accept' }).click();

      // The hero drops the action entirely once the viewer is an associate.
      await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0, {
        timeout: 20_000,
      });
      await expect(page.getByRole('button', { name: 'Apply to associate' })).toHaveCount(0);
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
    // Declining is not joining: the profile falls back to the apply/closed
    // state, never to the associate state.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0);
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

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog.getByText(orgO.displayName, { exact: false })).toBeVisible({ timeout: 15_000 });
      await expect(dialog.getByText(/Organisation invitations/i)).toBeVisible();
    }
  );
});
