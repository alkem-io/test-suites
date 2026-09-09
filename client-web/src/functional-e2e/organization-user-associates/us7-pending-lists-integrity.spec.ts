// User Story 7: "Platform integrity: pending lists stay partitioned and
// confidential" (workspace#062-organization-user-associates, P1).
//
// server-api coverage (it-specs, same scenarios, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/me-pending-partition.it-spec.ts
//   server-api/src/functional-api/roleset/associates/pending-confidentiality.it-spec.ts
//
// @forge-acceptance
//
// Every scenario here is a pure API acceptance walk — the spec text (US7-AS1..
// AS6) is entirely about GraphQL read/mutation behaviour (partitioning, GRANT
// gating, cascade-on-delete, the reset-loop eligibility signal), with no UI
// surface of its own to drive. That mirrors the existing precedent in this
// directory (organization-space-invitations/us1-invite-organization.spec.ts's
// "US1-AS5 (server safety net)" case): a plain `@playwright/test` `test`, no
// `page`, run in one `beforeAll`-seeded fixture so the six scenarios can share
// one organization/Space without re-deriving them six times.
//
// Two GraphQL operations this walk needs (`rolesUser.invitations/applications`
// for an arbitrary actor, and an organization's roleSet authorization-policy
// id) have no generated-SDK method yet — the same situation this repo's own
// `postGraphqlRaw` was built for (account-deletion, chat-avatars). Used here
// exactly as there: an inline document + a persona's bearer token.

import { test as baseTest, expect } from '@playwright/test';
import {
  createOrganization,
  deleteOrganization,
  getGraphqlClient,
  getUserToken,
  postGraphqlRaw,
  queryHarnessDb,
  registerInKratosOrFail,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  NotificationEvent,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

// One organization fixture per scenario that needs its own isolated state, so
// scenarios never depend on one another's row counts — created once in
// beforeAll and deleted (or, for AS5's second half, deliberately deleted BY a
// scenario) in afterAll.
baseTest.describe.configure({ mode: 'serial' });

const runSuffix = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let spaceRoleSetId: string;

type OrgFixture = { id: string; nameID: string; roleSetId: string };
let orgO: OrgFixture; // holds the invitee's org invitation; AS2/AS4 confidentiality + cleanup fixture
let orgO2: OrgFixture; // holds the invitee's org application (AS1 partition)
let orgO3: OrgFixture; // AS6 — its stored APPLY rule is stripped mid-test, then reset
let orgToDelete: OrgFixture; // AS5 — deleted while it still holds a pending application

let inviteeInvitationId: string; // invitee's org O invitation
let inviteeApplicationO2Id: string; // invitee's org O2 application
let spaceInvitationId: string; // invitee's Space invitation

const inviteeId = () => TestUserManager.getUserModelByType(TestUser.SUBSUBSPACE_MEMBER).id;

/** Grants `role` to `actorID` directly on an organization's own roleset (bypasses
 * invite/accept — the same "direct add" shape US1/US5 use to seed fixtures). */
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

const removeOrgRole = async (
  roleSetID: string,
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.removeRoleFromUser(
        { roleData: { actorID, roleSetID, role } },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error) {
    throw new Error(`removeOrgRole(${role}) failed for ${actorID} on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
};

const inviteToRoleSet = async (
  roleSetId: string,
  invitedActorIds: string[],
  welcomeMessage: string,
  userRole: TestUser
): Promise<string> => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.InviteForEntryRoleOnRoleSet(
        { roleSetId, invitedActorIds, invitedUserEmails: [], extraRoles: [], welcomeMessage },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error) {
    throw new Error(`inviteToRoleSet failed on ${roleSetId}: ${JSON.stringify(res.error)}`);
  }
  const invitation = res.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation;
  if (!invitation?.id) {
    throw new Error(`inviteToRoleSet produced no invitation on ${roleSetId}: ${JSON.stringify(res.data)}`);
  }
  return invitation.id;
};

const applyToRoleSet = async (roleSetID: string, userRole: TestUser): Promise<string> => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.applyForEntryRole(
        { applicationData: { roleSetID, questions: [] } },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error) {
    throw new Error(`applyToRoleSet failed on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
  const id = res.data?.applyForEntryRoleOnRoleSet?.id;
  if (!id) {
    throw new Error(`applyToRoleSet produced no application on ${roleSetID}: ${JSON.stringify(res.data)}`);
  }
  return id;
};

/** ID for a pending application/invitation *result* row is the wrapper `id`
 * on `OrganizationInvitationResult`/`OrganizationApplicationResult` — equal
 * to the underlying invitation/application id (data-model.md). */
const ME_ORGANIZATION_PENDING_QUERY = `
  query {
    me {
      communityInvitations { invitation { id } }
      communityApplications { application { id } }
      communityInvitationsCount
      organizationInvitations { id organization { id nameID } }
      organizationApplications { id organization { id nameID } }
      organizationInvitationsCount
    }
  }`;

/** `rolesUser.invitations/applications` (Space-shaped only, per US7) has no
 * generated-SDK selection yet — GetUserRoles.graphql only selects
 * spaces/organizations, not the pending arrays this scenario needs. */
const ROLES_USER_PENDING_QUERY = `
  query($actorID: UUID!) {
    rolesUser(rolesData: { actorID: $actorID }) {
      invitations { id }
      applications { id }
    }
  }`;

const ORGANIZATION_ROLESET_PENDING_QUERY = `
  query($id: UUID!) {
    organization(ID: $id) {
      roleSet {
        applications { id }
        invitations { id }
        platformInvitations { id }
      }
    }
  }`;

const ORGANIZATION_ROLESET_AUTHORIZATION_ID_QUERY = `
  query($id: UUID!) {
    organization(ID: $id) {
      roleSet { authorization { id } }
    }
  }`;

const ORGANIZATION_ELIGIBILITY_QUERY = `
  query($id: UUID!) {
    organization(ID: $id) {
      myAssociateEligibility { canApply canJoinDirectly reason }
    }
  }`;

const bearerFor = (userRole: TestUser) =>
  TestUserManager.getUserModelByType(userRole).authToken;

const createTestOrganization = async (label: string): Promise<OrgFixture> => {
  const displayName = `US7 ${label} ${runSuffix}`;
  const nameID = `us7${label.replace(/[^a-zA-Z0-9]/g, '')}${runSuffix}`
    .toLowerCase()
    .slice(0, 24);
  const res = await createOrganization(displayName, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(`Failed to create organization "${label}": ${JSON.stringify(res.error)}`);
  }
  return {
    id: res.data.createOrganization.id,
    nameID: res.data.createOrganization.nameID,
    roleSetId: res.data.createOrganization.roleSet.id,
  };
};

const scenarioConfig: TestScenarioConfig = {
  name: `org-associates-us7-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
    community: {
      admins: [TestUser.SPACE_ADMIN],
    },
  },
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(180_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  spaceRoleSetId = baseScenario.space.community.roleSetId;

  [orgO, orgO2, orgO3, orgToDelete] = await Promise.all([
    createTestOrganization('OrgO'),
    createTestOrganization('OrgO2'),
    createTestOrganization('OrgO3'),
    createTestOrganization('OrgDel'),
  ]);

  // Org O: QA_USER as owner+admin+associate (the acting inviter/admin/owner
  // reader); GLOBAL_BETA_TESTER as ADMIN only, NOT an associate (US5's own
  // "union list" shape, reused here as the AS2 admin-who-reads persona).
  await assignOrgRole(orgO.roleSetId, TestUserManager.users.qaUser.id, RoleName.Associate);
  await assignOrgRole(orgO.roleSetId, TestUserManager.users.qaUser.id, RoleName.Admin);
  await assignOrgRole(orgO.roleSetId, TestUserManager.users.qaUser.id, RoleName.Owner);
  await assignOrgRole(orgO.roleSetId, TestUserManager.users.betaTester.id, RoleName.Admin);

  // The invitee (SUBSUBSPACE_MEMBER): one org invitation (org O), one org
  // application (org O2), one Space invitation — US7-AS1's three pending rows.
  inviteeInvitationId = await inviteToRoleSet(
    orgO.roleSetId,
    [inviteeId()],
    `US7 org invitation ${runSuffix}`,
    TestUser.QA_USER
  );
  spaceInvitationId = await inviteToRoleSet(
    spaceRoleSetId,
    [inviteeId()],
    `US7 space invitation ${runSuffix}`,
    TestUser.SPACE_ADMIN
  );
  inviteeApplicationO2Id = await applyToRoleSet(orgO2.roleSetId, TestUser.SUBSUBSPACE_MEMBER);
});

baseTest.afterAll(async () => {
  await deleteOrganization(orgO.id).catch(() => undefined);
  await deleteOrganization(orgO2.id).catch(() => undefined);
  await deleteOrganization(orgO3.id).catch(() => undefined);
  // orgToDelete is deleted BY the AS5 scenario itself; best-effort here too,
  // in case that scenario didn't run (focused/failed run).
  await deleteOrganization(orgToDelete.id).catch(() => undefined);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

baseTest.describe('US7-AS1 — the me/roles partition stays exact with organization rows present', () => {
  baseTest('Space lists, count and rolesUser read Space rows only, with an exact count', async () => {
    const res = await postGraphqlRaw<{
      me: {
        communityInvitations: Array<{ invitation: { id: string } }>;
        communityApplications: Array<{ application: { id: string } }>;
        communityInvitationsCount: number;
        organizationInvitations: Array<{ id: string; organization: { id: string } }>;
        organizationApplications: Array<{ id: string; organization: { id: string } }>;
        organizationInvitationsCount: number;
      };
    }>(ME_ORGANIZATION_PENDING_QUERY, { bearerToken: bearerFor(TestUser.SUBSUBSPACE_MEMBER) });

    expect(res.status).toBe(200);
    expect(res.body.errors ?? []).toEqual([]);
    const me = res.body.data!.me;

    // Space rows only, exact count — no over-count from the two org rows.
    expect(me.communityInvitations.map(i => i.invitation.id)).toEqual([spaceInvitationId]);
    expect(me.communityApplications).toEqual([]);
    expect(me.communityInvitationsCount).toBe(1);

    // The organization rows surface only on their own, separate fields.
    expect(me.organizationInvitations.map(i => i.id)).toEqual([inviteeInvitationId]);
    expect(me.organizationInvitations[0].organization.id).toBe(orgO.id);
    expect(me.organizationApplications.map(a => a.id)).toEqual([inviteeApplicationO2Id]);
    expect(me.organizationApplications[0].organization.id).toBe(orgO2.id);
    expect(me.organizationInvitationsCount).toBe(1);

    // rolesUser (platform-admin-only view of an arbitrary actor) shows the
    // same Space-only shape — the org invitation must NOT leak in here either.
    const rolesRes = await postGraphqlRaw<{
      rolesUser: { invitations: Array<{ id: string }>; applications: Array<{ id: string }> };
    }>(ROLES_USER_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.GLOBAL_ADMIN),
      variables: { actorID: inviteeId() },
    });
    expect(rolesRes.status).toBe(200);
    expect(rolesRes.body.errors ?? []).toEqual([]);
    expect(rolesRes.body.data!.rolesUser.invitations.map(i => i.id)).toEqual([spaceInvitationId]);
    expect(rolesRes.body.data!.rolesUser.applications).toEqual([]);
  });
});

baseTest.describe('US7-AS2 — organization pending lists require ADMIN/OWNER standing', () => {
  baseTest('a plain registered user is refused; an org ADMIN (not associate) and the OWNER read them', async () => {
    const denied = await postGraphqlRaw(ORGANIZATION_ROLESET_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER),
      variables: { id: orgO.id },
    });
    expect(denied.body.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN_POLICY' });

    for (const persona of [TestUser.GLOBAL_BETA_TESTER, TestUser.QA_USER]) {
      const allowed = await postGraphqlRaw<{
        organization: { roleSet: { applications: unknown[]; invitations: unknown[]; platformInvitations: unknown[] } };
      }>(ORGANIZATION_ROLESET_PENDING_QUERY, {
        bearerToken: bearerFor(persona),
        variables: { id: orgO.id },
      });
      expect(allowed.body.errors ?? []).toEqual([]);
      expect(allowed.body.data!.organization.roleSet.invitations.length).toBeGreaterThan(0);
    }
  });
});

// The Space-side pending list has no `organization(ID)` parent — its
// roleSet hangs off `lookup` directly — so it gets its own query string
// rather than reusing ORGANIZATION_ROLESET_PENDING_QUERY.
const SPACE_ROLESET_PENDING_QUERY = `
  query($id: UUID!) {
    lookup {
      roleSet(ID: $id) {
        applications { id }
        invitations { id }
        platformInvitations { id }
      }
    }
  }`;

baseTest.describe('US7-AS3 — the same GRANT gate applies to a public Space (deliberate R3 change)', () => {
  baseTest('a plain registered user (not a Space admin) is refused; the Space admin reads them', async () => {
    const deniedSpace = await postGraphqlRaw(SPACE_ROLESET_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER),
      variables: { id: spaceRoleSetId },
    });
    expect(deniedSpace.body.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN_POLICY' });

    const allowedSpace = await postGraphqlRaw<{
      lookup: { roleSet: { invitations: Array<{ id: string }> } };
    }>(SPACE_ROLESET_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.SPACE_ADMIN),
      variables: { id: spaceRoleSetId },
    });
    expect(allowedSpace.body.errors ?? []).toEqual([]);
    expect(allowedSpace.body.data!.lookup.roleSet.invitations.map(i => i.id)).toContain(spaceInvitationId);
  });
});

baseTest.describe('US7-AS4 — removing an associate deletes their organization in-app rows', () => {
  baseTest('an admin-standing associate loses their org in-app rows once removed from the organization', async () => {
    // Grant SUBSPACE_ADMIN admin+associate on org O so an application produces
    // an in-app row for them (organisation-side events reach ADMIN standing).
    await assignOrgRole(orgO.roleSetId, TestUserManager.users.subspaceAdmin.id, RoleName.Associate);
    await assignOrgRole(orgO.roleSetId, TestUserManager.users.subspaceAdmin.id, RoleName.Admin);

    // Trigger one "someone applied to associate" event on org O.
    await applyToRoleSet(orgO.roleSetId, TestUser.NON_SPACE_MEMBER);

    const notificationsQuery = async () => {
      const client = getGraphqlClient();
      const res = await graphqlErrorWrapper(
        authToken =>
          client.MeInAppNotifications(
            { types: [NotificationEvent.OrganizationAdminAssociateApplication] },
            { authorization: `Bearer ${authToken}` }
          ),
        TestUser.SUBSPACE_ADMIN
      );
      if (res.error) {
        throw new Error(`MeInAppNotifications failed: ${JSON.stringify(res.error)}`);
      }
      return res.data!.me.notifications.inAppNotifications;
    };

    await expect
      .poll(async () => (await notificationsQuery()).length, { timeout: 20_000 })
      .toBeGreaterThan(0);

    await removeOrgRole(orgO.roleSetId, TestUserManager.users.subspaceAdmin.id, RoleName.Admin);
    await removeOrgRole(orgO.roleSetId, TestUserManager.users.subspaceAdmin.id, RoleName.Associate);

    await expect.poll(async () => (await notificationsQuery()).length, { timeout: 20_000 }).toBe(0);
  });
});

baseTest.describe('US7-AS5 — account deletion and organization deletion both clear pending rows', () => {
  baseTest('deleting a user with open org rows removes them; deleting an organization with an open application completes', async () => {
    // A disposable, never-reused identity — self-deletion requires a
    // freshly-established session the harness token cannot satisfy
    // (SESSION_REFRESH_REQUIRED), so this walk deletes it as GLOBAL_ADMIN,
    // exactly as an operator-initiated removal would.
    const uniqueId = UniqueIDGenerator.getID();
    const email = `us7-disposable-${uniqueId}@test.alkem.io`;
    const { verificationFlowId } = await registerInKratosOrFail('US7Disposable', uniqueId, email);
    await verifyInKratosOrFail(email, verificationFlowId);
    const disposableToken = await getUserToken(email);
    const meRes = await postGraphqlRaw<{ me: { user: { id: string } } }>(
      'query { me { user { id } } }',
      { bearerToken: disposableToken }
    );
    const disposableUserId = meRes.body.data?.me.user.id;
    expect(disposableUserId).toBeTruthy();

    // One open application (org O) + one open invitation (org O2, invited by
    // a global admin — an org invitation is not self-servable). The
    // generated SDK's `applyForEntryRole` is built for `graphqlErrorWrapper`,
    // which only ever attaches a fixed `TestUser` persona's cached bearer —
    // it cannot carry this freshly registered disposable identity's own
    // token, so this one call goes through `postGraphqlRaw` instead (same
    // rationale as the query helpers above).
    const applyRaw = await postGraphqlRaw<{ applyForEntryRoleOnRoleSet: { id: string } }>(
      'mutation($roleSetID: UUID!) { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id } }',
      { bearerToken: disposableToken, variables: { roleSetID: orgO.roleSetId } }
    );
    expect(applyRaw.body.errors ?? []).toEqual([]);
    const disposableApplicationId = applyRaw.body.data!.applyForEntryRoleOnRoleSet.id;

    const disposableInvitationId = await inviteToRoleSet(
      orgO2.roleSetId,
      [disposableUserId!],
      `US7 disposable invitation ${runSuffix}`,
      TestUser.GLOBAL_ADMIN
    );

    // Pre-flight: an open org application/invitation is never itself a
    // deletion blocker.
    const preflight = await postGraphqlRaw<{ me: { accountDeletion: { canDelete: boolean } } }>(
      'query { me { accountDeletion { canDelete } } }',
      { bearerToken: disposableToken }
    );
    expect(preflight.body.data?.me.accountDeletion.canDelete).toBe(true);

    const client = getGraphqlClient();
    const deleteRes = await graphqlErrorWrapper(
      authToken =>
        client.deleteUser(
          { deleteData: { ID: disposableUserId! } },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    expect(deleteRes.error).toBeUndefined();

    const orgOPending = await postGraphqlRaw<{
      organization: { roleSet: { applications: Array<{ id: string }> } };
    }>(ORGANIZATION_ROLESET_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.QA_USER),
      variables: { id: orgO.id },
    });
    expect(orgOPending.body.data!.organization.roleSet.applications.map(a => a.id)).not.toContain(
      disposableApplicationId
    );

    const orgO2Pending = await postGraphqlRaw<{
      organization: { roleSet: { invitations: Array<{ id: string }> } };
    }>(ORGANIZATION_ROLESET_PENDING_QUERY, {
      bearerToken: bearerFor(TestUser.GLOBAL_ADMIN),
      variables: { id: orgO2.id },
    });
    expect(orgO2Pending.body.data!.organization.roleSet.invitations.map(i => i.id)).not.toContain(
      disposableInvitationId
    );

    // Separately: deleting an ORGANIZATION that still holds an open
    // application completes without error, and the applicant's own pending
    // view stops listing it.
    const orgDeleteApplicationId = await applyToRoleSet(orgToDelete.roleSetId, TestUser.SUBSUBSPACE_MEMBER);
    const deleteOrgRes = await deleteOrganization(orgToDelete.id);
    expect(deleteOrgRes.error).toBeUndefined();

    const inviteeAfter = await postGraphqlRaw<{
      me: { organizationApplications: Array<{ id: string }> };
    }>(ME_ORGANIZATION_PENDING_QUERY, { bearerToken: bearerFor(TestUser.SUBSUBSPACE_MEMBER) });
    expect(inviteeAfter.body.errors ?? []).toEqual([]);
    expect(inviteeAfter.body.data!.me.organizationApplications.map(a => a.id)).not.toContain(
      orgDeleteApplicationId
    );
  });
});

baseTest.describe('US7-AS6 — the eligibility signal reflects the reset-loop window', () => {
  baseTest('APPLY_NOT_GRANTED before the per-organization reset loop; ELIGIBLE_TO_APPLY after', async () => {
    // org O3 was created AFTER this feature deployed, so it is born with the
    // stored APPLY rule already bound — simulate a PRE-EXISTING organization
    // (created before the rule existed) by stripping the rule directly from
    // its stored authorization policy, exactly as a pre-deploy org would read.
    const authIdRes = await postGraphqlRaw<{
      organization: { roleSet: { authorization: { id: string } } };
    }>(ORGANIZATION_ROLESET_AUTHORIZATION_ID_QUERY, {
      bearerToken: bearerFor(TestUser.GLOBAL_ADMIN),
      variables: { id: orgO3.id },
    });
    const authorizationId = authIdRes.body.data!.organization.roleSet.authorization.id;

    const baseline = await postGraphqlRaw<{
      organization: { myAssociateEligibility: { canApply: boolean; reason: string } };
    }>(ORGANIZATION_ELIGIBILITY_QUERY, {
      bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER),
      variables: { id: orgO3.id },
    });
    expect(baseline.body.data!.organization.myAssociateEligibility.reason).toBe('ELIGIBLE_TO_APPLY');

    await queryHarnessDb(
      `UPDATE authorization_policy
       SET "credentialRules" = (
         SELECT jsonb_agg(elem) FROM jsonb_array_elements("credentialRules") elem
         WHERE elem->>'name' != 'credentialRuleTypes-organizationRoleSetApply'
       )
       WHERE id = $1`,
      [authorizationId]
    );

    const stripped = await postGraphqlRaw<{
      organization: { myAssociateEligibility: { canApply: boolean; reason: string } };
    }>(ORGANIZATION_ELIGIBILITY_QUERY, {
      bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER),
      variables: { id: orgO3.id },
    });
    expect(stripped.body.data!.organization.myAssociateEligibility).toMatchObject({
      canApply: false,
      reason: 'APPLY_NOT_GRANTED',
    });

    // The mutation-side gate matches the read-side signal — no exposure
    // through a stale client bypassing the disabled interface affordance.
    const blockedApply = await postGraphqlRaw(
      'mutation($roleSetID: UUID!) { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id } }',
      { bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER), variables: { roleSetID: orgO3.roleSetId } }
    );
    expect(blockedApply.body.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN_POLICY' });

    const client = getGraphqlClient();
    const resetRes = await graphqlErrorWrapper(
      authToken =>
        client.AuthorizationPolicyResetOnOrganization(
          { organizationID: orgO3.id },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    expect(resetRes.error).toBeUndefined();

    const restored = await postGraphqlRaw<{
      organization: { myAssociateEligibility: { canApply: boolean; reason: string } };
    }>(ORGANIZATION_ELIGIBILITY_QUERY, {
      bearerToken: bearerFor(TestUser.NON_SPACE_MEMBER),
      variables: { id: orgO3.id },
    });
    expect(restored.body.data!.organization.myAssociateEligibility).toMatchObject({
      canApply: true,
      reason: 'ELIGIBLE_TO_APPLY',
    });
  });
});
