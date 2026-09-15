// User Story 5: "The Associates tab replaces the Community and Authorization
// tabs" (workspace#062-organization-user-associates, P2) — the browser halves:
// the `/settings/authorization` redirect (AS1), the row editor's three
// readable refusals (AS3) and the "switches live on Settings, none on
// Associates" split (AS4).
//
// server-api coverage (it-specs, same scenarios, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/organization-associate-invitation.it-spec.ts
//   (role caps as typed outcomes) and the `usersInRoles` read behind AS2.
//
// @forge-acceptance
//
// Every refusal gets its own purpose-built organization so the caps never
// interfere: one filled to six Admins, one to three Owners, one whose only
// Owner is the row under edit. The UI actor is a fresh ASSOCIATE + ADMIN on
// all three (an admin holds the manage standing and is never the row being
// edited, so the self-Admin interface guard stays out of the picture).
//
// The refusal copy is asserted as the English strings behind
// `org.associates.errors.limitAdmin` / `limitOwner` / `minOwner` in
// client-web's `contributorSettings.en.json` — the readable message the
// scenario demands, not whichever fallback the interface shows today.
//
// `baseTest.describe.configure({ mode: 'serial' })` forces one worker for the
// whole file (061/us1 precedent) so `beforeAll` cannot run twice under
// `fullyParallel`.

import { expect, Page, test as baseTest } from '@playwright/test';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  assignUserRoleOnOrganization,
  cleanUpTestOrganizations,
  createTestOrganization,
  getUserIdsInRole,
  getUserToken,
  OrgFixture,
  postGraphqlRaw,
  registerPersona,
  removeUserRoleOnOrganization,
  runSuffix,
  TestUserManager,
} from './organization-user-associates.helpers';

baseTest.describe.configure({ mode: 'serial' });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// Readable refusal copy — `org.associates.errors.*` in contributorSettings.en.json.
const COPY = {
  limitAdmin: 'An organisation can have at most 6 admins',
  limitOwner: 'An organisation can have at most 3 owners',
  minOwner: 'An organisation must keep at least one owner',
  membershipSwitches: [
    'Allow Spaces to invite this organisation',
    'Allow users matching this domain to join',
    'Allow users to apply to associate',
  ],
} as const;

const ADMIN_CAP = 6;
const OWNER_CAP = 3;

// The UI actor's email is fixed at module load so `createPersonaTest` can
// capture it; `registerPersona(label)` yields exactly `${label}-${runSuffix}@alkem.io`.
const actorLabel = 'us5-editor-admin';
const actorEmail = `${actorLabel}-${runSuffix}@alkem.io`;
const actorTest = createPersonaTest(actorEmail);

const seventhAdminLabel = 'us5-seventh-admin';
const fourthOwnerLabel = 'us5-fourth-owner';
const soleOwnerLabel = 'us5-sole-owner';

let orgAdminCap: OrgFixture; // AS3 (a): six Admins granted
let orgOwnerCap: OrgFixture; // AS3 (b): three Owners granted
let orgSoleOwner: OrgFixture; // AS3 (c): exactly one Owner — the row under edit

let seventhAdminId: string; // plain associate on orgAdminCap
let fourthOwnerId: string; // plain associate on orgOwnerCap
let soleOwnerId: string; // ASSOCIATE + OWNER on orgSoleOwner

const seventhAdminName = `${seventhAdminLabel}-${runSuffix}`;
const fourthOwnerName = `${fourthOwnerLabel}-${runSuffix}`;
const soleOwnerName = `${soleOwnerLabel}-${runSuffix}`;

// ─── Fixture helpers ───────────────────────────────────────────────────────

async function userIdFor(email: string): Promise<string> {
  const bearerToken = await getUserToken(email);
  const res = await postGraphqlRaw<{ me: { user: { id: string } } }>('query { me { user { id } } }', { bearerToken });
  const id = res.body.data?.me.user.id;
  if (!id) throw new Error(`Could not resolve user id for ${email}: ${JSON.stringify(res.body.errors)}`);
  return id;
}

/** Grants `role` to shared personas until the cap refuses (the organization's
 * creator may already hold it, so the count is not assumed) and returns the
 * holders as the server reports them. */
async function fillRoleToCap(roleSetId: string, role: RoleName, cap: number): Promise<string[]> {
  const fillers = [
    TestUserManager.users.spaceAdmin,
    TestUserManager.users.spaceMember,
    TestUserManager.users.subspaceAdmin,
    TestUserManager.users.subspaceMember,
    TestUserManager.users.subsubspaceAdmin,
    TestUserManager.users.subsubspaceMember,
    TestUserManager.users.nonSpaceMember,
  ];
  for (const filler of fillers) {
    if ((await getUserIdsInRole(roleSetId, role)).length >= cap) break;
    await assignUserRoleOnOrganization(roleSetId, filler.id, RoleName.Associate);
    try {
      await assignUserRoleOnOrganization(roleSetId, filler.id, role);
    } catch (error) {
      if (String(error).includes('ROLESET_POLICY_ROLE_LIMITS_VIOLATED')) break;
      throw error;
    }
  }
  const holders = await getUserIdsInRole(roleSetId, role);
  if (holders.length !== cap) {
    throw new Error(`Expected ${role} on ${roleSetId} filled to ${cap}, found ${holders.length}`);
  }
  return holders;
}

baseTest.beforeAll(async () => {
  baseTest.setTimeout(240_000);

  // `TestUserManager.users` is a per-process map: global-setup runs in its own
  // process, so every worker has to populate it before touching the shared
  // personas (same as the other walks in this directory).
  await TestUserManager.populateUserModelMap();

  // Sequential — parallel Kratos registration flows collide (registerTestUser's
  // own doc comment / 061 walk precedent).
  await registerPersona(actorLabel);
  const seventhAdminEmail = await registerPersona(seventhAdminLabel);
  const fourthOwnerEmail = await registerPersona(fourthOwnerLabel);
  const soleOwnerEmail = await registerPersona(soleOwnerLabel);

  [orgAdminCap, orgOwnerCap, orgSoleOwner] = await Promise.all([
    createTestOrganization('US5AdminCap', runSuffix),
    createTestOrganization('US5OwnerCap', runSuffix),
    createTestOrganization('US5SoleOwner', runSuffix),
  ]);

  const actorId = await userIdFor(actorEmail);
  [seventhAdminId, fourthOwnerId, soleOwnerId] = await Promise.all([
    userIdFor(seventhAdminEmail),
    userIdFor(fourthOwnerEmail),
    userIdFor(soleOwnerEmail),
  ]);

  // The actor manages all three organizations as ASSOCIATE + ADMIN.
  for (const org of [orgAdminCap, orgOwnerCap, orgSoleOwner]) {
    await assignUserRoleOnOrganization(org.roleSetId, actorId, RoleName.Associate);
    await assignUserRoleOnOrganization(org.roleSetId, actorId, RoleName.Admin);
  }

  // (a) six Admins granted; the seventh is a plain associate.
  await fillRoleToCap(orgAdminCap.roleSetId, RoleName.Admin, ADMIN_CAP);
  await assignUserRoleOnOrganization(orgAdminCap.roleSetId, seventhAdminId, RoleName.Associate);

  // (b) three Owners granted; the fourth is a plain associate.
  await fillRoleToCap(orgOwnerCap.roleSetId, RoleName.Owner, OWNER_CAP);
  await assignUserRoleOnOrganization(orgOwnerCap.roleSetId, fourthOwnerId, RoleName.Associate);

  // (c) exactly one Owner. The creating platform admin is granted OWNER on
  // creation, so hand the role to the row under edit first and then take the
  // creator's away — the minimum rule would refuse the reverse order.
  await assignUserRoleOnOrganization(orgSoleOwner.roleSetId, soleOwnerId, RoleName.Associate);
  await assignUserRoleOnOrganization(orgSoleOwner.roleSetId, soleOwnerId, RoleName.Owner);
  for (const ownerId of await getUserIdsInRole(orgSoleOwner.roleSetId, RoleName.Owner)) {
    if (ownerId !== soleOwnerId) {
      await removeUserRoleOnOrganization(orgSoleOwner.roleSetId, ownerId, RoleName.Owner);
    }
  }
  expect(await getUserIdsInRole(orgSoleOwner.roleSetId, RoleName.Owner)).toEqual([soleOwnerId]);
});

baseTest.afterAll(async () => {
  // Organizations carry every role this walk granted; the run-suffixed
  // identities are left to the shared harness cleanup like the us3 walk's.
  await cleanUpTestOrganizations();
});

// ─── Page-level helpers ────────────────────────────────────────────────────

async function openAssociatesTab(page: Page, orgNameId: string) {
  await page.goto(`${baseUrl}/organization/${orgNameId}/settings/community`);
  await expect(page.getByRole('heading', { name: 'Associates' })).toBeVisible({ timeout: 15_000 });
}

/** Opens the pencil editor of the associates-list row whose display name
 * carries `name`; resolves to the open dialog (labelled by its "Edit {{name}}" title). */
async function openRowEditor(page: Page, name: string) {
  const row = page.getByRole('listitem').filter({ hasText: new RegExp(name, 'i') });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.getByRole('button', { name: new RegExp(`^Edit .*${name}`, 'i') }).click();
  const dialog = page.getByRole('dialog', { name: new RegExp(`^Edit .*${name}`, 'i') });
  await expect(dialog).toBeVisible();
  return dialog;
}

// ─── US5-AS1 ────────────────────────────────────────────────────────────

actorTest.describe('US5-AS1 — the retired Authorization URL lands on the Associates tab', () => {
  actorTest('/settings/authorization redirects to /settings/community and shows the Associates card', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgAdminCap.nameID}/settings/authorization`);
    await expect(page).toHaveURL(new RegExp(`/organization/${orgAdminCap.nameID}/settings/community$`), {
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Associates' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Pending applications & invitations' })).toBeVisible();
  });
});

// ─── US5-AS3 ────────────────────────────────────────────────────────────

actorTest.describe('US5-AS3 — the row editor refuses the seventh Admin, the fourth Owner and removing the last Owner, readably', () => {
  actorTest('(a) toggling Admin on for a seventh admin shows the Admin-limit message and grants nothing', async ({ page }) => {
    await openAssociatesTab(page, orgAdminCap.nameID);
    const dialog = await openRowEditor(page, seventhAdminName);

    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(dialog.getByText(COPY.limitAdmin, { exact: true })).toBeVisible({ timeout: 10_000 });
    // The editor stays open on the refusal rather than closing as if saved.
    await expect(dialog).toBeVisible();

    expect(await getUserIdsInRole(orgAdminCap.roleSetId, RoleName.Admin)).not.toContain(seventhAdminId);
    expect(await getUserIdsInRole(orgAdminCap.roleSetId, RoleName.Admin)).toHaveLength(ADMIN_CAP);
  });

  actorTest('(b) toggling Owner on for a fourth owner shows the Owner-limit message and grants nothing', async ({ page }) => {
    await openAssociatesTab(page, orgOwnerCap.nameID);
    const dialog = await openRowEditor(page, fourthOwnerName);

    await dialog.getByRole('switch', { name: 'Owner', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(dialog.getByText(COPY.limitOwner, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toBeVisible();

    expect(await getUserIdsInRole(orgOwnerCap.roleSetId, RoleName.Owner)).not.toContain(fourthOwnerId);
    expect(await getUserIdsInRole(orgOwnerCap.roleSetId, RoleName.Owner)).toHaveLength(OWNER_CAP);
  });

  actorTest('(c) confirming Remove on the sole Owner shows the Owner-minimum message and removes nothing', async ({ page }) => {
    await openAssociatesTab(page, orgSoleOwner.nameID);
    const dialog = await openRowEditor(page, soleOwnerName);

    await dialog.getByRole('button', { name: 'Remove from organisation', exact: true }).click();

    // The destructive confirmation names the person and re-uses the Remove label.
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(new RegExp(`Remove .*${soleOwnerName}.* from the organisation\\?`, 'i'))).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove from organisation', exact: true }).click();

    await expect(page.getByText(COPY.minOwner, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Owner → Admin → Associate is the removal order, and the very first step
    // is the one refused — so every role the row held is still in place.
    expect(await getUserIdsInRole(orgSoleOwner.roleSetId, RoleName.Owner)).toEqual([soleOwnerId]);
    expect(await getUserIdsInRole(orgSoleOwner.roleSetId, RoleName.Associate)).toContain(soleOwnerId);
  });
});

// ─── US5-AS4 ────────────────────────────────────────────────────────────

actorTest.describe('US5-AS4 — the three membership switches live on Settings, none on Associates', () => {
  actorTest('the Settings tab Membership card renders exactly the three switches, once each', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgAdminCap.nameID}/settings/settings`);
    const membershipCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Membership', exact: true }) });
    await expect(membershipCard).toBeVisible({ timeout: 15_000 });

    await expect(membershipCard.getByRole('switch')).toHaveCount(COPY.membershipSwitches.length);
    for (const label of COPY.membershipSwitches) {
      await expect(membershipCard.getByRole('switch', { name: label, exact: true })).toHaveCount(1);
    }
  });

  actorTest('the Associates tab carries no settings switch at all', async ({ page }) => {
    await openAssociatesTab(page, orgAdminCap.nameID);
    // The list has rendered (the actor's own row is on it) before the absence is asserted.
    await expect(page.getByRole('listitem').filter({ hasText: new RegExp(actorLabel, 'i') })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('switch')).toHaveCount(0);
  });
});
