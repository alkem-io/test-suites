// User Story 3: "Organization admin accepts or declines on behalf of the organization".
// server-api coverage: server-api/src/functional-api/roleset/invitations/invitation-organization.it-spec.ts
//   (Gate 0 — the organization admin's ACCOUNT_ADMIN-derived accept privilege —
//   is also proven there against a mocked-then-live authorization graph.)
//
// forge-verify note (2026-09-04): every scenario below was independently walked
// live via the GraphQL API against the running forge-061 stack in this same
// session — including a fix verification pass for three defects landed
// immediately before this spec was written (organization-invited email/in-app
// crash — missing `profile` relation; the subspace organization Lead cap
// silently defaulting to 9 instead of 2; and `eventOnInvitation(ACCEPT)`
// checking only the generic UPDATE privilege instead of the ACCEPT-specific
// one). This spec is the durable, UI-driven form of that same walk.

import { expect, Page, test as baseTest } from '@playwright/test';
import {
  getUserToken,
  registerTestUser,
  TestScenarioConfig,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  assignOrganizationAdmin,
  assignOrgRole,
  createTestOrganization,
  inviteOrganizationViaApi,
  OrgFixture,
  runSuffix,
  setAllowSpaceInvitations,
  TestUser,
} from './organization-space-invitations.helpers';

/**
 * @forge-acceptance
 *
 * Live acceptance walk for User Story 3 ("Organization admin accepts or
 * declines on behalf of the organization", P1) — scenarios AS1..AS8.
 *
 * One dynamically-registered organization-admin persona (`orgAdminTest`)
 * administers every org fixture used by AS1/AS2/AS3/AS4/AS6/AS7 — this
 * mirrors production (one person can administer several organizations) and
 * keeps the walk to a single Gate-0 login instead of nine. AS8 needs two more
 * personas that must NOT hold admin standing on the org under test: a plain
 * associate (`orgAssociateTest`) and the platform admin (`platformAdminTest`,
 * shared with US1). Every persona is registered via the raw Kratos API
 * (`registerTestUser`, no UI) — the UI sign-up flow itself is not this
 * story's concern.
 */

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';

const orgAdminEmail = `orgadmin-us3-${runSuffix}@alkem.io`;
const orgAssociateEmail = `orgassoc-us3-${runSuffix}@alkem.io`;

const orgAdminTest = createPersonaTest(orgAdminEmail);
const orgAssociateTest = createPersonaTest(orgAssociateEmail);
const platformAdminTest = createPersonaTest(adminEmail);

let baseScenario: OrganizationWithSpaceModel;

// One organization fixture per scenario that needs one.
let orgAS1: OrgFixture; // never invited — empty state
let orgAS2: OrgFixture; // invited Member + Lead on the root Space
let orgAS3: OrgFixture; // invited Member on the root Space — declined
let orgAS4: OrgFixture; // invited Member on the L2 subspace (parents not yet joined)
let orgAS6: OrgFixture; // invited Member — org opts out AFTER the invite, invite must survive
let orgAS7: OrgFixture; // invited Member + Lead on the subspace — Lead slots fill before accept
let orgAS7FillerA: OrgFixture; // granted Lead directly, filling slot 1/2 after orgAS7's invite
let orgAS7FillerB: OrgFixture; // granted Lead directly, filling slot 2/2 after orgAS7's invite
let orgAS8: OrgFixture; // invited Member — associate/global-admin denial + admin revoke

const scenarioConfig: TestScenarioConfig = {
  name: `org-invite-us3-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      subspace: {
        collaboration: { addTutorialCallouts: false },
      },
    },
  },
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(240_000);

  // Register the two dynamic personas via the raw Kratos API — no UI, no
  // mailbox polling; the sign-up FLOW itself is not this story's concern.
  await registerTestUser(`orgadmin-us3-${runSuffix}`);
  await registerTestUser(`orgassoc-us3-${runSuffix}`);

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const spaceRoleSetId = baseScenario.space.community.roleSetId;
  const subspaceRoleSetId = baseScenario.subspace.community.roleSetId;
  const subsubspaceRoleSetId = baseScenario.subsubspace.community.roleSetId;

  [orgAS1, orgAS2, orgAS3, orgAS4, orgAS6, orgAS7, orgAS7FillerA, orgAS7FillerB, orgAS8] =
    await Promise.all([
      createTestOrganization('US3AS1 Empty', runSuffix),
      createTestOrganization('US3AS2 GateZero', runSuffix),
      createTestOrganization('US3AS3 Declines', runSuffix),
      createTestOrganization('US3AS4 Subspace', runSuffix),
      createTestOrganization('US3AS6 OptsOut', runSuffix),
      createTestOrganization('US3AS7 LeadRace', runSuffix),
      createTestOrganization('US3AS7 FillerA', runSuffix),
      createTestOrganization('US3AS7 FillerB', runSuffix),
      createTestOrganization('US3AS8 Denial', runSuffix),
    ]);

  // Gate 0: the SAME org-admin persona administers every org except AS8
  // (which must specifically NOT have this persona on it).
  const orgAdminUserID = await getUserIdFor(orgAdminEmail);
  await Promise.all(
    [orgAS1, orgAS2, orgAS3, orgAS4, orgAS6, orgAS7].map(org =>
      assignOrganizationAdmin(org.roleSetId, orgAdminUserID)
    )
  );

  // AS8's associate persona — ASSOCIATE only, never ADMIN, on orgAS8.
  const orgAssociateUserID = await getUserIdFor(orgAssociateEmail);
  await assignOrgRoleOnOwnOrg(orgAS8.roleSetId, orgAssociateUserID, RoleName.Associate);

  // AS2: Member + Lead, on the root Space.
  await inviteWithExtraRole(spaceRoleSetId, orgAS2.id, `US3-AS2 ${runSuffix}`, [RoleName.Lead]);

  // AS3: Member only, root Space — declined in the walk below.
  await inviteOrganizationViaApi(spaceRoleSetId, orgAS3.id, `US3-AS3 ${runSuffix}`, TestUser.SPACE_ADMIN);

  // AS4: Member only, on the L2 subspace — orgAS4 is not yet a member of the
  // root Space or the L1 subspace, so accepting must join all three.
  await inviteOrganizationViaApi(subsubspaceRoleSetId, orgAS4.id, `US3-AS4 ${runSuffix}`, TestUser.SPACE_ADMIN);

  // AS6: Member only, root Space — invited, THEN the org opts out (below).
  await inviteOrganizationViaApi(spaceRoleSetId, orgAS6.id, `US3-AS6 ${runSuffix}`, TestUser.SPACE_ADMIN);
  await setAllowSpaceInvitations(orgAS6.id, false);

  // AS7: Member + Lead, on the SUBSPACE (its own, unused 2-slot Lead
  // capacity — orgAS7FillerA/B fill both slots via direct grant AFTER the
  // invite, simulating "the slots filled while the invitation was pending").
  await inviteWithExtraRole(subspaceRoleSetId, orgAS7.id, `US3-AS7 ${runSuffix}`, [RoleName.Lead]);
  await assignOrgRole(orgAS7FillerA.id, subspaceRoleSetId, RoleName.Member);
  await assignOrgRole(orgAS7FillerA.id, subspaceRoleSetId, RoleName.Lead);
  await assignOrgRole(orgAS7FillerB.id, subspaceRoleSetId, RoleName.Member);
  await assignOrgRole(orgAS7FillerB.id, subspaceRoleSetId, RoleName.Lead);

  // AS8: Member only, root Space — neither the associate nor the global
  // admin may accept; the global admin may revoke.
  await inviteOrganizationViaApi(spaceRoleSetId, orgAS8.id, `US3-AS8 ${runSuffix}`, TestUser.SPACE_ADMIN);
});

baseTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// ─── Raw helpers not covered by the generated SDK (`@alkemio/tests-lib`
// exposes `createOrganization`/role mutations but not `me.user.id` lookup by
// email, `assignRoleToUser` on an organization's OWN roleset, an invite that
// carries `extraRoles`, or `organizationsInRoles` — plain `fetch` against the
// same private GraphQL endpoint the generated SDK targets, using
// `getUserToken` for the bearer, same convention as `graphqlErrorWrapper`). ───

const gqlEndpoint = process.env.ALKEMIO_SERVER || 'http://localhost:3000/api/private/non-interactive/graphql';

async function rawGql<T>(query: string, variables: Record<string, unknown>, token: string): Promise<T> {
  const res = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data as T;
}

async function getUserIdFor(email: string): Promise<string> {
  const token = await getUserToken(email);
  const data = await rawGql<{ me: { user: { id: string } } }>('query { me { user { id } } }', {}, token);
  return data.me.user.id;
}

async function assignOrgRoleOnOwnOrg(orgOwnRoleSetId: string, actorID: string, role: RoleName): Promise<void> {
  const adminToken = await getUserToken(adminEmail);
  await rawGql(
    `mutation($roleSetID: UUID!, $actorID: UUID!, $role: RoleName!) {
      assignRoleToUser(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: $role }) { id }
    }`,
    { roleSetID: orgOwnRoleSetId, actorID, role },
    adminToken
  );
}

/** Invites `orgID` on `roleSetID` with `extraRoles` and a welcome message — the
 * shared `inviteOrganizationViaApi` (US1) never offers `extraRoles`, and
 * US3's Member+Lead fixtures (AS2, AS7) need one. */
async function inviteWithExtraRole(
  roleSetID: string,
  orgID: string,
  welcomeMessage: string,
  extraRoles: RoleName[]
): Promise<void> {
  const adminToken = await getUserToken(adminEmail);
  await rawGql(
    `mutation($roleSetID: UUID!, $orgID: UUID!, $welcomeMessage: String!, $extraRoles: [RoleName!]!) {
      inviteForEntryRoleOnRoleSet(invitationData: {
        roleSetID: $roleSetID, invitedActorIDs: [$orgID], invitedUserEmails: [],
        welcomeMessage: $welcomeMessage, extraRoles: $extraRoles
      }) { invitation { id } }
    }`,
    { roleSetID, orgID, welcomeMessage, extraRoles },
    adminToken
  );
}

async function organizationsInRole(roleSetID: string, role: RoleName): Promise<string[]> {
  const adminToken = await getUserToken(adminEmail);
  const data = await rawGql<{
    lookup: { roleSet: { organizationsInRoles: Array<{ role: string; organizations: Array<{ id: string }> }> } };
  }>(
    `query($id: UUID!, $roles: [RoleName!]!) {
      lookup { roleSet(ID: $id) { organizationsInRoles(roles: $roles) { role organizations { id } } } }
    }`,
    { id: roleSetID, roles: [role] },
    adminToken
  );
  const entry = data.lookup.roleSet.organizationsInRoles.find(r => r.role === role);
  return entry ? entry.organizations.map(o => o.id) : [];
}

/** Drives `eventOnInvitation(ACCEPT)` for `orgID`'s pending invitation on
 * `roleSetID`, as `actorEmail` — used for the US3-AS8 half the UI cannot
 * exercise (a global admin attempting to accept on the organization's
 * behalf must be rejected, never silently no-op'd — see the fix note above). */
async function eventOnInvitationRaw(
  orgID: string,
  roleSetID: string,
  eventName: 'ACCEPT',
  actorEmail: string
): Promise<{ state?: string; error?: string }> {
  const token = await getUserToken(actorEmail);
  const adminToken = await getUserToken(adminEmail);
  const data = await rawGql<{ lookup: { roleSet: { invitations: Array<{ id: string; invitedActorID: string }> } } }>(
    'query($id: UUID!) { lookup { roleSet(ID: $id) { invitations { id invitedActorID } } } }',
    { id: roleSetID },
    adminToken
  );
  const invitationID = data.lookup.roleSet.invitations.find(inv => inv.invitedActorID === orgID)?.id;
  if (!invitationID) throw new Error(`No pending invitation for org ${orgID} on roleSet ${roleSetID}`);
  try {
    const result = await rawGql<{ eventOnInvitation: { id: string; state: string } }>(
      `mutation($invitationID: UUID!, $eventName: String!) {
        eventOnInvitation(eventData: { invitationID: $invitationID, eventName: $eventName }) { id state }
      }`,
      { invitationID, eventName },
      token
    );
    return { state: result.eventOnInvitation.state };
  } catch (e: unknown) {
    return { error: String(e) };
  }
}

// ─── Page-level helpers (source-derived selectors — see
// client-web/src/main/crdPages/topLevelPages/organizationPages/settings/invitations/
// and client-web/src/crd/components/organization/settings/OrgInvitationsTabView.tsx) ───

async function openInvitationsTab(page: Page, org: OrgFixture) {
  await page.goto(`${baseUrl}/organization/${org.nameID}/settings/invitations`);
  await expect(page.getByRole('heading', { name: 'Space Invitations' })).toBeVisible();
}

async function acceptViaTab(page: Page, spaceDisplayName: string) {
  const row = page.locator('li').filter({ hasText: spaceDisplayName });
  await row.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByRole('dialog', { name: 'Accept this invitation?' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept invitation' }).click();
}

orgAdminTest.describe('US3-AS1 — Invitations tab always present, empty state when none', () => {
  orgAdminTest('an org admin with zero pending invitations sees the explanatory empty state', async ({ page }) => {
    await openInvitationsTab(page, orgAS1);
    await expect(page.getByText('No pending Space invitations.')).toBeVisible();
  });
});

orgAdminTest.describe('US3-AS2 — Gate 0: org admin views and accepts a Member + Lead invitation', () => {
  orgAdminTest(
    'the row shows Space, invited-by, role "Member + Lead" and the message; accepting grants both roles',
    async ({ page }) => {
      await openInvitationsTab(page, orgAS2);
      const spaceDisplayName = baseScenario.space.about.profile.displayName;
      const row = page.locator('li').filter({ hasText: spaceDisplayName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Member + Lead');
      await expect(row).toContainText(`US3-AS2 ${runSuffix}`);
      await expect(row.getByRole('link', { name: spaceDisplayName })).toHaveAttribute(
        'href',
        `/${baseScenario.space.nameId}`
      );

      await acceptViaTab(page, spaceDisplayName);
      await expect(page.locator('li').filter({ hasText: spaceDisplayName })).toHaveCount(0);

      const [members, leads] = await Promise.all([
        organizationsInRole(baseScenario.space.community.roleSetId, RoleName.Member),
        organizationsInRole(baseScenario.space.community.roleSetId, RoleName.Lead),
      ]);
      expect(members).toContain(orgAS2.id);
      expect(leads).toContain(orgAS2.id);
    }
  );
});

orgAdminTest.describe('US3-AS3 — declining a pending invitation', () => {
  orgAdminTest('declining removes the row and the organization never becomes a member', async ({ page }) => {
    const spaceDisplayName = baseScenario.space.about.profile.displayName;
    await openInvitationsTab(page, orgAS3);
    const row = page.locator('li').filter({ hasText: spaceDisplayName });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Decline' }).click();
    await expect(page.locator('li').filter({ hasText: spaceDisplayName })).toHaveCount(0);

    const members = await organizationsInRole(baseScenario.space.community.roleSetId, RoleName.Member);
    expect(members).not.toContain(orgAS3.id);
  });
});

orgAdminTest.describe('US3-AS4 — subspace invitation enumerates every Space that will be joined', () => {
  orgAdminTest(
    'the row lists the root Space and every intermediate Space; accepting joins exactly that set',
    async ({ page }) => {
      const l0 = baseScenario.space.about.profile.displayName;
      const l1 = baseScenario.subspace.about.profile.displayName;
      const l2 = baseScenario.subsubspace.about.profile.displayName;

      await openInvitationsTab(page, orgAS4);
      const row = page.locator('li').filter({ hasText: l2 });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Accepting also joins:');
      await expect(row).toContainText(l0);
      await expect(row).toContainText(l1);
      await expect(row).toContainText(l2);

      await acceptViaTab(page, l2);
      await expect(page.locator('li').filter({ hasText: l2 })).toHaveCount(0);

      const [membersL0, membersL1, membersL2] = await Promise.all([
        organizationsInRole(baseScenario.space.community.roleSetId, RoleName.Member),
        organizationsInRole(baseScenario.subspace.community.roleSetId, RoleName.Member),
        organizationsInRole(baseScenario.subsubspace.community.roleSetId, RoleName.Member),
      ]);
      expect(membersL0).toContain(orgAS4.id);
      expect(membersL1).toContain(orgAS4.id);
      expect(membersL2).toContain(orgAS4.id);
    }
  );
});

orgAdminTest.describe('US3-AS6 — opting out never hides or blocks a pending invitation', () => {
  orgAdminTest(
    'after switching "Allow Spaces to invite this organisation" off, the pending row stays listed and actionable',
    async ({ page }) => {
      const spaceDisplayName = baseScenario.space.about.profile.displayName;

      await page.goto(`${baseUrl}/organization/${orgAS6.nameID}/settings/settings`);
      const toggle = page.getByRole('switch', { name: 'Allow Spaces to invite this organisation' });
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-checked', 'false'); // set off in beforeAll

      await openInvitationsTab(page, orgAS6);
      const row = page.locator('li').filter({ hasText: spaceDisplayName });
      await expect(row).toBeVisible();
      await expect(row.getByRole('button', { name: 'Accept' })).toBeEnabled();
      await expect(row.getByRole('button', { name: 'Decline' })).toBeEnabled();
    }
  );
});

orgAdminTest.describe('US3-AS7 — a granted Lead slot fills while the Lead invitation is pending', () => {
  orgAdminTest(
    'accepting after both Lead slots are taken silently downgrades the organization to Member only',
    async ({ page }) => {
      const spaceDisplayName = baseScenario.subspace.about.profile.displayName;

      const leadsBefore = await organizationsInRole(baseScenario.subspace.community.roleSetId, RoleName.Lead);
      expect(leadsBefore).toContain(orgAS7FillerA.id);
      expect(leadsBefore).toContain(orgAS7FillerB.id);
      expect(leadsBefore).not.toContain(orgAS7.id);

      await openInvitationsTab(page, orgAS7);
      const row = page.locator('li').filter({ hasText: spaceDisplayName });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Member + Lead');

      await acceptViaTab(page, spaceDisplayName);
      await expect(page.locator('li').filter({ hasText: spaceDisplayName })).toHaveCount(0);

      const [membersAfter, leadsAfter] = await Promise.all([
        organizationsInRole(baseScenario.subspace.community.roleSetId, RoleName.Member),
        organizationsInRole(baseScenario.subspace.community.roleSetId, RoleName.Lead),
      ]);
      expect(membersAfter).toContain(orgAS7.id);
      expect(leadsAfter).not.toContain(orgAS7.id);
    }
  );
});

orgAssociateTest.describe('US3-AS8 — a plain associate cannot see or act on the invitation', () => {
  orgAssociateTest('navigating to the Invitations tab redirects away from Settings entirely', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgAS8.nameID}/settings/invitations`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/settings/invitations');
  });
});

platformAdminTest.describe('US3-AS8 — a global admin cannot accept, but can revoke from Space settings', () => {
  platformAdminTest('accept is rejected by the API; revoke from Member Organisations succeeds', async ({ page }) => {
    const result = await eventOnInvitationRaw(orgAS8.id, baseScenario.space.community.roleSetId, 'ACCEPT', adminEmail);
    expect(result.state).toBeUndefined();
    expect(result.error).toBeTruthy();

    const membersAfterDeniedAccept = await organizationsInRole(baseScenario.space.community.roleSetId, RoleName.Member);
    expect(membersAfterDeniedAccept).not.toContain(orgAS8.id);

    await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/community`);
    const toggle = page.getByRole('button', { name: /Member Organisations/ });
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    await expect(page.locator('li').filter({ hasText: orgAS8.displayName })).toBeVisible();
    await page.getByRole('button', { name: `Revoke invitation to ${orgAS8.displayName}` }).click();
    await expect(page.locator('li').filter({ hasText: orgAS8.displayName })).toHaveCount(0);
  });
});
