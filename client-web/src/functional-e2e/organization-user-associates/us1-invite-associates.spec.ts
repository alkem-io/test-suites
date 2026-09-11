// User Story 1: "Organization admin or owner invites users to become
// associates" (workspace#062-organization-user-associates, P1).
//
// server-api coverage (it-specs, same scenarios, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/organization-associate-invitation.it-spec.ts
//
// @forge-acceptance
//
// Every organization fixture is purpose-built (own display name, own state) so
// scenarios never depend on one another's outcome, except AS2 → AS7, which are
// deliberately chained on the SAME persona/session and the SAME invitation
// (AS7 revokes the very row AS2 created) — mirroring the manual walk in
// quickstart.md ("... Revoke."). `baseTest.describe.configure({ mode: 'serial' })`
// forces one worker for the whole file (061 precedent,
// organization-space-invitations/us1-invite-organization.spec.ts) so
// `beforeAll` cannot run twice under `fullyParallel` and the AS2→AS7 order is
// guaranteed.
//
// AS3 (role-offer caps), AS4 (pre-existing state), AS6 (email invites
// rejected) and AS8's API half are pure API acceptance walks: the dialog
// itself already excludes an existing associate/invitee from its candidate
// search (defence in depth proven by the server-side typed outcome, same
// precedent as US1-AS5 in the 061 sibling file) and never offers an
// email-paste path for organizations at all, so there is no honest UI path to
// any of them. AS8's settings-guard half IS driven through the browser (a
// plain associate navigating to the Associates tab).

import { expect, test as baseTest } from '@playwright/test';
import {
  createOrganization,
  deleteOrganization,
  getGraphqlClient,
  getUserToken,
  postGraphqlRaw,
  registerInKratosOrFail,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const runSuffix = UniqueIDGenerator.getID();

// One organization fixture per independent piece of state, created once in
// beforeAll: the AS3 caps need a clean, purpose-filled roleSet each (a shared
// org would make the two caps interfere with AS1/AS2/AS5's own role grants).
baseTest.describe.configure({ mode: 'serial' });

type OrgFixture = { id: string; nameID: string; roleSetId: string; displayName: string };
type Persona = { email: string; token: string; id: string; displayName: string; firstName: string };

let orgMain: OrgFixture; // AS1, AS2, AS4, AS5, AS6, AS7, AS8
let orgAS3Admin: OrgFixture; // AS3 — Admin cap (max 6)
let orgAS3Owner: OrgFixture; // AS3 — Owner cap (max 3)

// UI-driving personas — literal, module-scope emails (createPersonaTest reads
// them at module load time, before beforeAll registers the identities; same
// constraint as organization-space-invitations/us1-invite-organization.spec.ts).
const orgAdminNotOwnerEmail = `us1-orgadmin-${runSuffix}@test.alkem.io`;
const orgOwnerNotAdminEmail = `us1-orgowner-${runSuffix}@test.alkem.io`;
const plainAssociateAS8Email = `us1-plainassoc-${runSuffix}@test.alkem.io`;

const orgAdminNotOwnerTest = createPersonaTest(orgAdminNotOwnerEmail);
const orgOwnerNotAdminTest = createPersonaTest(orgOwnerNotAdminEmail);
const plainAssociateAS8Test = createPersonaTest(plainAssociateAS8Email);

let orgAdminNotOwner: Persona; // ADMIN, not OWNER — AS1/AS2/AS7 actor, AS5 admin half
let orgOwnerNotAdmin: Persona; // OWNER, not ADMIN — AS5 owner half
let plainAssociateAS8: Persona; // ASSOCIATE only — AS8

let as2Invitee1: Persona; // AS2: invited as Associate; AS7 revokes this exact invitation
let as2Invitee2: Persona; // AS2: invited as Associate + Owner
let as4AlreadyAssociate: Persona; // AS4: already an associate
let as4AlreadyInvited: Persona; // AS4: already has a pending invitation
let as4AlreadyInvitedInvitationId: string; // the pre-seeded invitation AS4 re-invites against
let as4OpenApplication: Persona; // AS4: has an open application
let as3AdminOverflow: Persona; // AS3: offered Admin once the cap is full
let as3OwnerOverflow: Persona; // AS3: offered Owner once the cap is full

// ─── Fixture-registration helpers ──────────────────────────────────────────

/** Registers + verifies a disposable identity and returns its bearer token,
 * actor id and profile display name — `graphqlErrorWrapper` (this package's
 * usual entry point) only ever attaches a `TestUser` persona's cached bearer,
 * which cannot represent a freshly registered disposable user (same
 * rationale as us7-pending-lists-integrity.spec.ts / 054-delete-own-account),
 * so every call these personas make goes through `postGraphqlRaw`. */
const registerPersona = async (email: string, firstName: string): Promise<Persona> => {
  // Idempotent: the authenticated-session fixture resolves BEFORE this hook and
  // provisions any UI persona it has to log in as, so for those three emails the
  // identity already exists and Kratos answers 400. That is not a failure — the
  // display name below is read back from the server rather than assumed, so an
  // identity created either way is equally usable.
  let verificationFlowId: string | undefined;
  try {
    ({ verificationFlowId } = await registerInKratosOrFail(firstName, 'US1E2E', email));
  } catch {
    // already registered — fall through to verification, which is also idempotent
  }
  await verifyInKratosOrFail(email, verificationFlowId);
  const token = await getUserToken(email);
  const meRes = await postGraphqlRaw<{ me: { user: { id: string; profile: { displayName: string } } } }>(
    'query { me { user { id profile { displayName } } } }',
    { bearerToken: token }
  );
  const id = meRes.body.data?.me.user.id;
  const displayName = meRes.body.data?.me.user.profile.displayName;
  if (!id || !displayName) {
    throw new Error(`registerPersona(${email}) produced no user: ${meRes.raw}`);
  }
  return { email, token, id, displayName, firstName };
};

let disposableCounter = 0;
const registerDisposablePersona = (label: string): Promise<Persona> => {
  disposableCounter += 1;
  const email = `us1-${label.toLowerCase()}-${runSuffix}-${disposableCounter}@test.alkem.io`;
  return registerPersona(email, `${label}${runSuffix}`);
};

const createTestOrganization = async (label: string): Promise<OrgFixture> => {
  const displayName = `US1 ${label} ${runSuffix}`;
  const nameID = `us1${label.replace(/[^a-zA-Z0-9]/g, '')}${runSuffix}`.toLowerCase().slice(0, 24);
  const res = await createOrganization(displayName, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(`Failed to create organization "${label}": ${JSON.stringify(res.error)}`);
  }
  return {
    id: res.data.createOrganization.id,
    nameID: res.data.createOrganization.nameID,
    roleSetId: res.data.createOrganization.roleSet.id,
    displayName,
  };
};

/** Grants `role` directly on an organization's own roleSet (bypasses
 * invite/accept — the "direct add" shape used to seed fixtures). */
const assignOrgRole = async (
  roleSetID: string,
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.assignRoleToUser(
        { roleData: { actorID, roleSetID, role } },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error) {
    throw new Error(`assignOrgRole(${role}) failed for ${actorID} on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
};

/** Grants `role` to each filler until the role set's cap refuses the next one,
 * then stops. The caller only cares that the cap ends up full; the number of
 * grants that takes depends on who already holds the role (an organization's
 * creator holds ADMIN from the moment it exists). Any error other than the cap
 * being reached is re-thrown. */
const fillRoleToCap = async (
  roleSetID: string,
  fillers: Array<{ id: string }>,
  role: RoleName
): Promise<void> => {
  for (const filler of fillers) {
    await assignOrgRole(roleSetID, filler.id, RoleName.Associate);
    try {
      await assignOrgRole(roleSetID, filler.id, role);
    } catch (error) {
      if (String(error).includes('ROLESET_POLICY_ROLE_LIMITS_VIOLATED')) return;
      throw error;
    }
  }
};

/** Invites via the typed mutation as an authorized TestUser persona. Returns
 * the raw wrapper result (never throws on a non-"sent" typed outcome —
 * AS3/AS4/AS6 assert on those). */
const inviteForRoles = async (
  roleSetId: string,
  invitedActorIds: string[],
  welcomeMessage: string,
  extraRoles: RoleName[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  return graphqlErrorWrapper(
    authToken =>
      client.InviteForEntryRoleOnRoleSet(
        { roleSetId, invitedActorIds, invitedUserEmails: [], extraRoles, welcomeMessage },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(300_000);

  // `TestUserManager.users` is a per-process map: global-setup runs in its own
  // process, so a worker starts with it empty. The sibling specs get it filled
  // as a side effect of `TestScenarioFactory.createBaseScenario`; this file
  // creates its organizations directly, so it has to populate the map itself —
  // without it every `graphqlErrorWrapper` call fails with "UserModel with type
  // ... not found".
  await TestUserManager.populateUserModelMap();

  [orgMain, orgAS3Admin, orgAS3Owner] = await Promise.all([
    createTestOrganization('Main'),
    createTestOrganization('AS3Admin'),
    createTestOrganization('AS3Owner'),
  ]);

  [
    orgAdminNotOwner,
    orgOwnerNotAdmin,
    plainAssociateAS8,
    as2Invitee1,
    as2Invitee2,
    as4AlreadyAssociate,
    as4AlreadyInvited,
    as4OpenApplication,
    as3AdminOverflow,
    as3OwnerOverflow,
  ] = await Promise.all([
    registerPersona(orgAdminNotOwnerEmail, `OrgAdminNotOwner${runSuffix}`),
    registerPersona(orgOwnerNotAdminEmail, `OrgOwnerNotAdmin${runSuffix}`),
    registerPersona(plainAssociateAS8Email, `PlainAssociate${runSuffix}`),
    registerDisposablePersona('As2Invitee1'),
    registerDisposablePersona('As2Invitee2'),
    registerDisposablePersona('As4Associate'),
    registerDisposablePersona('As4Invited'),
    registerDisposablePersona('As4Applied'),
    registerDisposablePersona('As3AdminOverflow'),
    registerDisposablePersona('As3OwnerOverflow'),
  ]);

  // orgMain: an ADMIN who is not an OWNER (AS1/AS2/AS7's actor, AS5's admin
  // half), an OWNER who is not an ADMIN (AS5's owner half), and a plain
  // ASSOCIATE (AS8).
  await assignOrgRole(orgMain.roleSetId, orgAdminNotOwner.id, RoleName.Associate);
  await assignOrgRole(orgMain.roleSetId, orgAdminNotOwner.id, RoleName.Admin);
  await assignOrgRole(orgMain.roleSetId, orgOwnerNotAdmin.id, RoleName.Associate);
  await assignOrgRole(orgMain.roleSetId, orgOwnerNotAdmin.id, RoleName.Owner);
  await assignOrgRole(orgMain.roleSetId, plainAssociateAS8.id, RoleName.Associate);

  // AS4 fixtures on orgMain: already an associate; already invited (never
  // accepted); an open application.
  await assignOrgRole(orgMain.roleSetId, as4AlreadyAssociate.id, RoleName.Associate);

  const preSeededInvite = await inviteForRoles(
    orgMain.roleSetId,
    [as4AlreadyInvited.id],
    `US1 AS4 pre-seeded invitation ${runSuffix}`,
    []
  );
  if (
    preSeededInvite.error ||
    preSeededInvite.data?.inviteForEntryRoleOnRoleSet?.[0]?.type !== RoleSetInvitationResultType.InvitedToRoleSet
  ) {
    throw new Error(
      `AS4 pre-seed invitation failed: ${JSON.stringify(preSeededInvite.error ?? preSeededInvite.data)}`
    );
  }
  as4AlreadyInvitedInvitationId =
    preSeededInvite.data!.inviteForEntryRoleOnRoleSet![0]!.invitation!.id;

  const preSeededApplication = await postGraphqlRaw<{ applyForEntryRoleOnRoleSet: { id: string } }>(
    'mutation($roleSetID: UUID!) { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id } }',
    { bearerToken: as4OpenApplication.token, variables: { roleSetID: orgMain.roleSetId } }
  );
  if ((preSeededApplication.body.errors ?? []).length > 0 || !preSeededApplication.body.data?.applyForEntryRoleOnRoleSet.id) {
    throw new Error(`AS4 pre-seed application failed: ${preSeededApplication.raw}`);
  }

  // AS3 admin-cap fixture: six granted ADMIN holders on a dedicated
  // organization. Existing TestUserManager personas — only their actorID is
  // needed here; they never act as this organization's admin.
  const adminFillers = [
    TestUserManager.users.globalSupportAdmin,
    TestUserManager.users.globalLicenseAdmin,
    TestUserManager.users.spaceMember,
    TestUserManager.users.subspaceMember,
    TestUserManager.users.subsubspaceMember,
    TestUserManager.users.nonSpaceMember,
  ];
  // Fill until the cap actually bites rather than assuming the organization
  // starts with zero admins — its creator already holds ADMIN, so granting all
  // six fillers would ask for a seventh and fail. What AS3 needs is simply that
  // the cap is FULL; how many grants that took is irrelevant.
  await fillRoleToCap(orgAS3Admin.roleSetId, adminFillers, RoleName.Admin);

  // AS3 owner-cap fixture: three granted OWNER holders on a dedicated
  // organization.
  const ownerFillers = [
    TestUserManager.users.spaceAdmin,
    TestUserManager.users.subspaceAdmin,
    TestUserManager.users.subsubspaceAdmin,
  ];
  await fillRoleToCap(orgAS3Owner.roleSetId, ownerFillers, RoleName.Owner);
});

baseTest.afterAll(async () => {
  await deleteOrganization(orgMain.id).catch(() => undefined);
  await deleteOrganization(orgAS3Admin.id).catch(() => undefined);
  await deleteOrganization(orgAS3Owner.id).catch(() => undefined);
});

// ─── UI walk (source-derived selectors — see
// client-web/src/crd/components/community/InviteMembersDialog.tsx,
// client-web/src/main/crdPages/topLevelPages/organizationPages/settings/community/
// OrgInviteAssociatesDialogConnector.tsx and
// client-web/src/crd/i18n/community/community.en.json) ───

orgAdminNotOwnerTest.describe('US1-AS1 — the Associates-tab invite dialog offers only organization-appropriate affordances', () => {
  orgAdminNotOwnerTest(
    'an organization admin who is not a platform admin gets a name-only search, no email paste, no language control, a pre-filled message, and Associate locked plus Admin/Owner',
    async ({ page }) => {
      await page.goto(`${baseUrl}/organization/${orgMain.nameID}/settings/community`);
      await page.getByRole('button', { name: 'Invite', exact: true }).click();

      await expect(page.getByRole('dialog').getByText(`Invite associates to "${orgMain.displayName}"`)).toBeVisible();

      // Name-only search — no email-paste path (organizations only invite
      // existing Alkemio users, FR-004).
      await expect(page.getByRole('textbox', { name: 'Search for users by name' })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toHaveCount(0);

      // No suggested-language control on the organization target.
      await expect(page.getByLabel('Suggested language for invitee')).toHaveCount(0);

      // Message pre-filled with organization-specific copy.
      await expect(page.getByLabel('Invitation message')).toHaveValue(new RegExp(orgMain.displayName));

      // Role picker: Associate locked (checked, disabled); Admin/Owner offered.
      await page.getByRole('button', { name: 'Choose roles for the invitees' }).click();
      const associateCheckbox = page.getByRole('checkbox', { name: 'Associate' });
      await expect(associateCheckbox).toBeChecked();
      await expect(associateCheckbox).toBeDisabled();
      await expect(page.getByRole('checkbox', { name: 'Admin' })).toBeEnabled();
      await expect(page.getByRole('checkbox', { name: 'Owner' })).toBeEnabled();

      // Regression guard (previously-fixed defect F-US1-AS1 / P5 / FR-021 /
      // SC-008): the helper text must speak of "Associate", never the Space
      // dialog's "Member" copy.
      await expect(
        page.getByText('Associate is always granted on accepting the invitation.')
      ).toBeVisible();
      await expect(page.getByText(/Member is always granted/i)).toHaveCount(0);
    }
  );
});

orgAdminNotOwnerTest.describe('US1-AS2 → AS7 — invite, list, then revoke (chained on the same session)', () => {
  orgAdminNotOwnerTest(
    'US1-AS2: inviting U1 as Associate and U2 as Associate + Owner with a message both show "Invitation sent"; both appear in Pending applications & invitations with the offered role, date and Revoke',
    async ({ page }) => {
      await page.goto(`${baseUrl}/organization/${orgMain.nameID}/settings/community`);

      // U1 — Associate only.
      await page.getByRole('button', { name: 'Invite', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search for users by name' }).fill(as2Invitee1.firstName);
      await page.getByRole('button', { name: as2Invitee1.displayName }).click();
      await page.getByLabel('Invitation message').fill(`US1-AS2 welcome ${runSuffix}`);
      await page.getByRole('button', { name: 'Send' }).click();
      await expect(page.getByRole('dialog').getByText('Invitation sent')).toBeVisible();
      await page.getByRole('button', { name: 'Close', exact: true }).click();

      // U2 — Associate + Owner.
      await page.getByRole('button', { name: 'Invite', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search for users by name' }).fill(as2Invitee2.firstName);
      await page.getByRole('button', { name: as2Invitee2.displayName }).click();
      await page.getByLabel('Invitation message').fill(`US1-AS2 welcome ${runSuffix}`);
      await page.getByRole('button', { name: 'Choose roles for the invitees' }).click();
      await page.getByRole('checkbox', { name: 'Owner' }).check();
      await page.getByRole('button', { name: 'Choose roles for the invitees' }).click(); // close the popover
      await page.getByRole('button', { name: 'Send' }).click();
      await expect(page.getByRole('dialog').getByText('Invitation sent')).toBeVisible();
      await page.getByRole('button', { name: 'Close', exact: true }).click();

      // Pending applications & invitations: both rows, offered role, Revoke.
      const row1 = page.getByRole('row', { name: new RegExp(as2Invitee1.displayName) });
      await expect(row1).toContainText('Associate');
      await expect(row1).not.toContainText('Associate +');
      await expect(row1.getByRole('button', { name: 'Delete' })).toBeVisible();

      const row2 = page.getByRole('row', { name: new RegExp(as2Invitee2.displayName) });
      await expect(row2).toContainText('Associate + Owner');
      await expect(row2.getByRole('button', { name: 'Delete' })).toBeVisible();
    }
  );

  orgAdminNotOwnerTest(
    "US1-AS7: revoking U1's pending invitation removes it from the Associates pending list",
    async ({ page }) => {
      await page.goto(`${baseUrl}/organization/${orgMain.nameID}/settings/community`);
      const row = page.getByRole('row', { name: new RegExp(as2Invitee1.displayName) });
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('row', { name: new RegExp(as2Invitee1.displayName) })).toHaveCount(0);
    }
  );

  baseTest(
    "US1-AS7 (invitee view): the revoked invitation is gone from U1's own pending organization invitations",
    async () => {
      const res = await postGraphqlRaw<{ me: { organizationInvitations: Array<{ organization: { id: string } }> } }>(
        'query { me { organizationInvitations { organization { id } } } }',
        { bearerToken: as2Invitee1.token }
      );
      const stillPending = (res.body.data?.me.organizationInvitations ?? []).some(
        i => i.organization.id === orgMain.id
      );
      expect(stillPending).toBe(false);
    }
  );
});

orgOwnerNotAdminTest.describe('US1-AS5 — no inviter-role ceiling (R1): an OWNER who is not an ADMIN may also offer any of the three roles', () => {
  orgOwnerNotAdminTest(
    'an organization OWNER who is not an ADMIN sees Associate/Admin/Owner all offerable',
    async ({ page }) => {
      await page.goto(`${baseUrl}/organization/${orgMain.nameID}/settings/community`);
      await page.getByRole('button', { name: 'Invite', exact: true }).click();
      await page.getByRole('button', { name: 'Choose roles for the invitees' }).click();
      await expect(page.getByRole('checkbox', { name: 'Associate' })).toBeChecked();
      await expect(page.getByRole('checkbox', { name: 'Admin' })).toBeEnabled();
      await expect(page.getByRole('checkbox', { name: 'Owner' })).toBeEnabled();
      // AS1's own walk (an ADMIN who is not an OWNER) already proves the other
      // half of R1 — both dialog affordances are identical by construction
      // (one shared RoleMultiSelect), so together the two walks cover
      // "both may offer any of the three roles".
    }
  );
});

plainAssociateAS8Test.describe('US1-AS8 (UI half) — a plain associate is refused the organization settings surface', () => {
  plainAssociateAS8Test('navigating to the Associates settings tab does not land there', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgMain.nameID}/settings/community`);
    await expect(page).not.toHaveURL(/\/settings\/community/);
  });
});

// ─── API safety-net walk — AS3, AS4, AS6, AS8's API half ──────────────────
//
// None of these outcomes has an honest UI path: the invite dialog's candidate
// search already excludes an existing associate/invited/applied user (so
// there is no sequence of clicks that reaches "already an associate" /
// "already invited" / "has an open application"), organizations never offer
// an email-paste affordance at all (AS6), and a plain associate cannot even
// reach the dialog (AS8's UI half, above). The mutation is public API and
// must stay correct for any other caller, so each typed outcome is asserted
// at the layer where it is actually reachable — same rationale as US1-AS5's
// "server safety net" case in the 061 sibling file.

baseTest.describe('US1-AS3 — role-offer caps are enforced at invite time', () => {
  baseTest(
    'offering Admin once six admins are already granted returns "role limit reached" and creates nothing',
    async () => {
      const res = await inviteForRoles(
        orgAS3Admin.roleSetId,
        [as3AdminOverflow.id],
        `US1 AS3 admin overflow ${runSuffix}`,
        [RoleName.Admin]
      );
      expect(res.error).toBeFalsy();
      expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
        RoleSetInvitationResultType.ExtraRoleLimitReached
      );
      expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation).toBeFalsy();
    }
  );

  baseTest(
    'offering Owner once three owners are already granted returns "role limit reached" and creates nothing',
    async () => {
      const res = await inviteForRoles(
        orgAS3Owner.roleSetId,
        [as3OwnerOverflow.id],
        `US1 AS3 owner overflow ${runSuffix}`,
        [RoleName.Owner]
      );
      expect(res.error).toBeFalsy();
      expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
        RoleSetInvitationResultType.ExtraRoleLimitReached
      );
      expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation).toBeFalsy();
    }
  );
});

baseTest.describe('US1-AS4 — pre-existing state produces the typed outcome, never a duplicate row', () => {
  baseTest('inviting an existing associate returns the "already an associate" typed outcome', async () => {
    const res = await inviteForRoles(orgMain.roleSetId, [as4AlreadyAssociate.id], `US1 AS4 dup ${runSuffix}`, []);
    expect(res.error).toBeFalsy();
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
      RoleSetInvitationResultType.AlreadyMemberOfRoleSet
    );
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation).toBeFalsy();
  });

  baseTest('re-inviting an already-invited user returns the "already invited" typed outcome', async () => {
    const res = await inviteForRoles(orgMain.roleSetId, [as4AlreadyInvited.id], `US1 AS4 dup ${runSuffix}`, []);
    expect(res.error).toBeFalsy();
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
      RoleSetInvitationResultType.AlreadyInvitedToRoleSet
    );
    // ALREADY_INVITED carries the EXISTING invitation rather than nothing —
    // shipped behaviour on both role-set types (server#5088, 061 R36). "No
    // second row" means the id is the original invitation's, not that the field
    // is empty. The other typed outcomes here really do create nothing, so they
    // keep asserting falsy.
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation?.id).toEqual(
      as4AlreadyInvitedInvitationId
    );
  });

  baseTest('inviting a user with an open application returns the "has an open application" typed outcome', async () => {
    const res = await inviteForRoles(orgMain.roleSetId, [as4OpenApplication.id], `US1 AS4 dup ${runSuffix}`, []);
    expect(res.error).toBeFalsy();
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
      RoleSetInvitationResultType.AlreadyHasOpenApplication
    );
    expect(res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation).toBeFalsy();
  });
});

baseTest.describe('US1-AS6 — organizations only invite existing Alkemio users', () => {
  baseTest('an invitedUserEmails entry is rejected with a validation error and nothing is created', async () => {
    const client = getGraphqlClient();
    const res = await graphqlErrorWrapper(
      authToken =>
        client.InviteForEntryRoleOnRoleSet(
          {
            roleSetId: orgMain.roleSetId,
            invitedActorIds: [],
            invitedUserEmails: ['nobody-on-platform@example.com'],
            extraRoles: [],
            welcomeMessage: `US1 AS6 ${runSuffix}`,
          },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    expect(res.error).toBeTruthy();
    expect(JSON.stringify(res.error)).toMatch(/existing Alkemio users/i);
  });
});

baseTest.describe('US1-AS8 (API half) — a plain associate cannot invite through the API', () => {
  baseTest('inviteForEntryRoleOnRoleSet is refused with a forbidden-policy error', async () => {
    const res = await postGraphqlRaw<{ inviteForEntryRoleOnRoleSet: unknown }>(
      `mutation($roleSetID: UUID!, $actorID: UUID!) {
        inviteForEntryRoleOnRoleSet(invitationData: {
          roleSetID: $roleSetID
          invitedActorIDs: [$actorID]
          invitedUserEmails: []
          extraRoles: []
          welcomeMessage: "US1 AS8 probe"
        }) { type }
      }`,
      {
        bearerToken: plainAssociateAS8.token,
        variables: { roleSetID: orgMain.roleSetId, actorID: as4AlreadyInvited.id },
      }
    );
    expect(res.body.data).toBeFalsy();
    const errors = res.body.errors ?? [];
    expect(errors.length).toBeGreaterThan(0);
    expect(res.raw).toMatch(/FORBIDDEN_POLICY/);
  });
});
