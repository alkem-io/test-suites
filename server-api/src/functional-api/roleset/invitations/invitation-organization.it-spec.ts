/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CommunityMembershipPolicy } from '@alkemio/client-lib';
import {
  ActorType,
  RoleName,
  RoleSetInvitationResultNotice,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteInvitation,
  getSpaceInvitation,
  inviteForEntryRoleOnRoleSet,
} from './invitation.request.params';
import { getSingleInvitationResult } from '../roleset.request.params';
import { eventOnRoleSetInvitation } from '../roleset-events.request.params';
import {
  assignRoleToOrganization,
  assignRoleToUser,
  getRoleName,
  removeRoleFromOrganization,
  removeRoleFromUser,
} from '../roles-request.params';
import {
  createApplication,
  deleteApplication,
  meQuery,
} from '../application/application.request.params';
import {
  createOrganization,
  deleteOrganization,
  updateOrganizationSettings,
} from '../../contributor-management/organization/organization.request.params';

const uniqueId = UniqueIDGenerator.getID();
const message = `You are cordially invited! ${uniqueId}`;

// Space admin (TestUser.SPACE_ADMIN) invites; the organization-side personas
// below are assigned directly onto baseScenario.organization's role set
// (beyond the factory default of `organizationAdmin` as ADMIN+ASSOCIATE),
// reusing spare personas that have no role on this scenario's own Space:
//   TestUser.QA_USER        -> ASSOCIATE + OWNER
//   TestUser.SUBSPACE_ADMIN -> ADMIN, deliberately NOT an ASSOCIATE
//   TestUser.SUBSPACE_MEMBER -> ASSOCIATE only (no manager credential)
let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-invite-roleset',
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: {
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

let invitationId = '';

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // baseScenario.organization is the Space's own hosting organization, and
  // the server auto-grants it Member+Lead on the Space at creation time. Every
  // test in this file treats the organization as a fresh invitee, so strip
  // that auto-grant before the first invite runs — otherwise it deterministically
  // resolves to ALREADY_MEMBER_OF_ROLE_SET instead of a real invitation.
  await removeRoleFromOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Lead
  ).catch(() => undefined);
  await removeRoleFromOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Member
  ).catch(() => undefined);

  await assignRoleToUser(
    TestUserManager.users.qaUser.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
  await assignRoleToUser(
    TestUserManager.users.qaUser.id,
    baseScenario.organization.roleSetId,
    RoleName.Owner
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const inviteOrg = async (
  actorId: string,
  extraRoles: RoleName[] = [RoleName.Member],
  userRole: TestUser = TestUser.SPACE_ADMIN
) =>
  inviteForEntryRoleOnRoleSet(
    baseScenario.space.community.roleSetId,
    [actorId],
    [],
    message,
    extraRoles,
    userRole
  );

const clearOrgAFromSpace = async () => {
  await removeRoleFromOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Member
  ).catch(() => undefined);
  await removeRoleFromOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Lead
  ).catch(() => undefined);
};

const spaceRolesForOrg = async (organizationID: string) => {
  const res = await getRoleName(organizationID);
  const spaces = res?.data?.rolesOrganization?.spaces ?? [];
  return spaces.find((s: any) => s.id === baseScenario.space.id);
};

const createTestOrganization = async (
  label: string,
  creatorRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const name = `${label}${uniqueId}`;
  // The run suffix is what makes a nameID unique across runs, so it must SURVIVE
  // truncation: trim the LABEL to fit, then append the whole suffix. Slugifying
  // `label + uniqueId` and cutting the result to 24 instead ate into the suffix
  // for any longer label, so two runs collided on one nameID and organization
  // creation failed at fixture setup. Same rule as
  // `client-web/src/functional-e2e/organization-space-invitations/organization-space-invitations.helpers.ts`.
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = slug(uniqueId);
  const nameID = `${slug(label).slice(0, Math.max(0, 24 - suffix.length))}${suffix}`;
  const res = await createOrganization(
    name,
    nameID,
    undefined,
    undefined,
    undefined,
    undefined,
    creatorRole
  );
  if (!res.data?.createOrganization) {
    throw new Error(
      `Failed to create organization "${label}": ${JSON.stringify(res.error)}`
    );
  }
  return {
    id: res.data.createOrganization.id,
    roleSetId: res.data.createOrganization.roleSet.id,
  };
};

describe('Organization Space invitations — GATE 0 core roleset flow', () => {
  afterEach(async () => {
    await clearOrgAFromSpace();
    if (invitationId) {
      await deleteInvitation(invitationId).catch(() => undefined);
      invitationId = '';
    }
  });

  test('GATE 0 — space admin invites an organization as Member; the org ADMIN sees and accepts it', async () => {
    // Act
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';

    // Assert — invited, and the invitee actor is reported as an ORGANIZATION
    expect(invitationId.length).toEqual(36);
    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(result?.invitation?.actor.type).toEqual(ActorType.Organization);

    // Assert — the org ADMIN sees it in their personal pending-invitations list
    const me = await meQuery(TestUser.ORGANIZATION_ADMIN);
    const seen = me?.data?.me?.communityInvitations?.find(
      (i: any) => i.invitation?.id === invitationId
    );
    expect(seen).toBeDefined();
    expect(seen?.invitation?.actor?.type).toEqual(ActorType.Organization);

    // Act — accept as the org ADMIN
    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    // Assert — the organization now holds MEMBER in the Space
    expect(accept?.error).toBeUndefined();
    expect(accept?.data?.eventOnInvitation.state).toContain('accepted');
    const spaceRoles = await spaceRolesForOrg(baseScenario.organization.id);
    expect(spaceRoles?.roles).toEqual(expect.arrayContaining(['member']));
  });

  test('the org OWNER can also accept on behalf of the organization', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.QA_USER
    );

    expect(accept?.error).toBeUndefined();
    expect(accept?.data?.eventOnInvitation.state).toContain('accepted');
    const spaceRoles = await spaceRolesForOrg(baseScenario.organization.id);
    expect(spaceRoles?.roles).toEqual(expect.arrayContaining(['member']));
  });

  test('an ADMIN who is not an ASSOCIATE can also accept on behalf of the organization', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.SUBSPACE_ADMIN
    );

    expect(accept?.error).toBeUndefined();
    expect(accept?.data?.eventOnInvitation.state).toContain('accepted');
  });

  test('a Member + Lead invitation, once accepted, grants both roles', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);
    expect(result?.invitation?.extraRoles).toEqual(
      expect.arrayContaining(['LEAD'])
    );

    await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    const spaceRoles = await spaceRolesForOrg(baseScenario.organization.id);
    expect(spaceRoles?.roles).toEqual(
      expect.arrayContaining(['member', 'lead'])
    );
  });

  test('an ASSOCIATE who is not an admin/owner cannot ACCEPT on the organization behalf', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.SUBSPACE_MEMBER
    );

    expect(accept?.error?.errors?.[0]?.message).toContain(
      "Authorization: unable to grant 'update' privilege: event on invitation"
    );
  });

  test('a global admin cannot ACCEPT on the organization behalf, but can revoke the invitation', async () => {
    // createOrganization() auto-grants Associate+Admin on the new org to its
    // CREATING actor (server-side, pre-existing/unrelated behavior). Using
    // baseScenario.organization here would make TestUser.GLOBAL_ADMIN — the
    // default createOrganization actor — the org's own admin, so its accept
    // would legitimately succeed via account-admin credentials rather than
    // exercising a global-admin bypass. Create a dedicated organization with
    // a disinterested creator instead, so GLOBAL_ADMIN holds no org-admin
    // credential on it.
    const orgNonAdmin = await createTestOrganization(
      'globalAdminReject',
      TestUser.GLOBAL_BETA_TESTER
    );

    const invitationData = await inviteOrg(orgNonAdmin.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.GLOBAL_ADMIN
    );
    expect(accept?.error?.errors?.[0]?.message).toBeDefined();

    const removed = await deleteInvitation(invitationId, TestUser.GLOBAL_ADMIN);
    expect(removed?.data?.deleteInvitation.id).toEqual(invitationId);
    invitationId = '';

    const remaining = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    expect(
      remaining?.data?.lookup?.space?.community?.roleSet.invitations
    ).toHaveLength(0);

    await deleteOrganization(orgNonAdmin.id).catch(() => undefined);
  });

  test('REJECT leaves the organization out of the Space', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const reject = await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.ORGANIZATION_ADMIN
    );

    expect(reject?.data?.eventOnInvitation.state).toContain('rejected');
    const spaceRoles = await spaceRolesForOrg(baseScenario.organization.id);
    expect(spaceRoles).toBeUndefined();
  });

  test('a global admin cannot REJECT on the organization behalf — only revoke (FR-010)', async () => {
    // Same trap as the ACCEPT sibling above: createOrganization() auto-grants
    // Associate+Admin to its CREATING actor, so inviting
    // baseScenario.organization (created by GLOBAL_ADMIN) would let the
    // rejection legitimately succeed via account-admin credentials and prove
    // nothing about the global-admin bypass this test exists to forbid.
    const orgNonAdmin = await createTestOrganization(
      'globalAdminRejectFr010',
      TestUser.GLOBAL_BETA_TESTER
    );

    const invitationData = await inviteOrg(orgNonAdmin.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    // Declining is a consent decision, so it needs the same invite-accept
    // privilege ACCEPT does — otherwise a third party could decline and the
    // Space admins would be emailed that the organization declined, a decision
    // the organization never made.
    const reject = await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.GLOBAL_ADMIN
    );

    expect(reject?.error).toBeDefined();

    // Assert on THIS invitation's own lifecycle state, not on the serialized
    // blob: `JSON.stringify(state).toContain('invited')` is satisfied by
    // `invitedToParent` and by the welcome message ("You are cordially
    // invited!"), so it passes whatever the state actually is.
    const state = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    const invitation = state?.data?.lookup?.space?.community?.roleSet.invitations?.find(
      (candidate: any) => candidate.id === invitationId
    );
    expect(invitation?.state).toEqual('invited');

    await deleteInvitation(invitationId).catch(() => undefined);
    invitationId = '';
    await deleteOrganization(orgNonAdmin.id).catch(() => undefined);
  });
});

describe('Organization Space invitations — opt-out (allowSpaceInvitations)', () => {
  afterEach(async () => {
    await clearOrgAFromSpace();
    if (invitationId) {
      await deleteInvitation(invitationId).catch(() => undefined);
      invitationId = '';
    }
    // Restore the default so later describe blocks are unaffected.
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: true,
      },
    });
  });

  test('an organization that opted out cannot be invited', async () => {
    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: false,
      },
    });

    const before = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    const countBefore =
      before?.data?.lookup?.space?.community?.roleSet.invitations?.length ??
      0;

    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);

    expect(result?.type).toEqual(
      RoleSetInvitationResultType.OrganizationNotAcceptingInvitations
    );
    expect(result?.invitation).toBeFalsy();

    const after = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    expect(
      after?.data?.lookup?.space?.community?.roleSet.invitations
    ).toHaveLength(countBefore);
  });

  test('opting out AFTER a pending invitation leaves it listed and acceptable', async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowSpaceInvitations: false,
      },
    });

    const me = await meQuery(TestUser.ORGANIZATION_ADMIN);
    const seen = me?.data?.me?.communityInvitations?.find(
      (i: any) => i.invitation?.id === invitationId
    );
    expect(seen).toBeDefined();

    const accept = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );
    expect(accept?.error).toBeUndefined();
    expect(accept?.data?.eventOnInvitation.state).toContain('accepted');
  });
});

describe('Organization Space invitations — invalid extra role', () => {
  test('inviting an organization with the Admin extra role (policy forbids it) is rejected, nothing created', async () => {
    const before = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    const countBefore =
      before?.data?.lookup?.space?.community?.roleSet.invitations?.length ??
      0;

    const invitationData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Admin,
    ]);

    expect(invitationData?.error?.errors?.[0]?.message).toContain(
      'An invitee cannot be invited with a role its policy forbids'
    );

    const after = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    expect(
      after?.data?.lookup?.space?.community?.roleSet.invitations
    ).toHaveLength(countBefore);
  });
});

describe('Organization Space invitations — already member / already invited', () => {
  afterEach(async () => {
    await clearOrgAFromSpace();
    if (invitationId) {
      await deleteInvitation(invitationId).catch(() => undefined);
      invitationId = '';
    }
  });

  test('inviting an already-invited organization returns ALREADY_INVITED_TO_ROLE_SET', async () => {
    const first = await inviteOrg(baseScenario.organization.id);
    const firstResult = getSingleInvitationResult(first);
    invitationId = firstResult?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    const second = await inviteOrg(baseScenario.organization.id);
    const secondResult = getSingleInvitationResult(second);

    expect(secondResult?.type).toEqual(
      RoleSetInvitationResultType.AlreadyInvitedToRoleSet
    );
    // The generic role-set flow intentionally echoes back the existing open
    // invitation alongside ALREADY_INVITED_TO_ROLE_SET, rather than omitting it.
    expect(secondResult?.invitation).toBeDefined();
    expect(secondResult?.invitation?.id).toEqual(invitationId);
  });

  test('inviting an already-member organization returns ALREADY_MEMBER_OF_ROLE_SET', async () => {
    await assignRoleToOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    const invitationData = await inviteOrg(baseScenario.organization.id);
    const result = getSingleInvitationResult(invitationData);

    expect(result?.type).toEqual(
      RoleSetInvitationResultType.AlreadyMemberOfRoleSet
    );
    expect(result?.invitation).toBeFalsy();
  });
});

describe('Organization Space invitations — Lead role limit', () => {
  let orgB: { id: string; roleSetId: string };
  let orgC: { id: string; roleSetId: string };
  let pendingInvitationId = '';

  beforeAll(async () => {
    orgB = await createTestOrganization('leadB');
    orgC = await createTestOrganization('leadC');
  });

  afterAll(async () => {
    await deleteOrganization(orgB.id).catch(() => undefined);
    await deleteOrganization(orgC.id).catch(() => undefined);
  });

  test('two granted Lead organizations block a third Lead invitation', async () => {
    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await assignRoleToOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );

    const invitationData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const result = getSingleInvitationResult(invitationData);

    expect(result?.type).toEqual(
      RoleSetInvitationResultType.OrganizationLeadRoleLimitReached
    );
    expect(result?.invitation).toBeFalsy();

    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await removeRoleFromOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await removeRoleFromOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
  });

  test('one granted Lead plus one pending Lead invitation also blocks a third; revoking the pending one frees the slot', async () => {
    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );

    const pendingData = await inviteOrg(orgC.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const pendingResult = getSingleInvitationResult(pendingData);
    pendingInvitationId = pendingResult?.invitation?.id ?? '';
    expect(pendingInvitationId.length).toEqual(36);

    const blockedData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const blockedResult = getSingleInvitationResult(blockedData);
    expect(blockedResult?.type).toEqual(
      RoleSetInvitationResultType.OrganizationLeadRoleLimitReached
    );

    await deleteInvitation(pendingInvitationId);
    pendingInvitationId = '';

    const freedData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const freedResult = getSingleInvitationResult(freedData);
    expect(freedResult?.type).toEqual(
      RoleSetInvitationResultType.InvitedToRoleSet
    );

    const freedInvitationId = freedResult?.invitation?.id ?? '';
    await deleteInvitation(freedInvitationId);

    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
  });
});

describe('Organization Space invitations — accept-time Lead downgrade', () => {
  test('a pending Lead invitation is downgraded to Member if the Lead slots fill before acceptance', async () => {
    const orgB = await createTestOrganization('downgradeB');
    const orgC = await createTestOrganization('downgradeC');

    const invitationData = await inviteOrg(baseScenario.organization.id, [
      RoleName.Member,
      RoleName.Lead,
    ]);
    const result = getSingleInvitationResult(invitationData);
    const pendingId = result?.invitation?.id ?? '';
    expect(pendingId.length).toEqual(36);

    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await assignRoleToOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );

    await eventOnRoleSetInvitation(
      pendingId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    const spaceRoles = await spaceRolesForOrg(baseScenario.organization.id);
    expect(spaceRoles?.roles).toEqual(expect.arrayContaining(['member']));
    expect(spaceRoles?.roles).not.toEqual(expect.arrayContaining(['lead']));

    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await removeRoleFromOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await removeRoleFromOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );
    await removeRoleFromOrganization(
      orgC.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await deleteOrganization(orgB.id);
    await deleteOrganization(orgC.id);
  });
});

describe('Organization Space invitations — zero-admin organization notice', () => {
  test('inviting an organization with no admins or owners still creates the invitation, with an informational notice', async () => {
    const orgD = await createTestOrganization('zeroAdmin');
    // The creator (GLOBAL_ADMIN, the default createOrganization actor) is
    // auto-granted ASSOCIATE + ADMIN; strip ADMIN to leave zero managers
    // (ASSOCIATE alone does not count as a manager credential).
    await removeRoleFromUser(
      TestUserManager.users.globalAdmin.id,
      orgD.roleSetId,
      RoleName.Admin
    );

    const invitationData = await inviteOrg(orgD.id);
    const result = getSingleInvitationResult(invitationData);

    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(result?.notice).toEqual(
      RoleSetInvitationResultNotice.OrganizationHasNoAdministrators
    );
    const invId = result?.invitation?.id ?? '';
    expect(invId.length).toEqual(36);

    await deleteInvitation(invId);
    await deleteOrganization(orgD.id);
  });
});

describe('Organization Space invitations — invitee actor-type validation', () => {
  test('inviting a non-contributor actor (the Space itself) is rejected and does not wedge later invites/applications', async () => {
    const before = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    const countBefore =
      before?.data?.lookup?.space?.community?.roleSet.invitations?.length ??
      0;

    // A Space is itself an Actor (of ActorType SPACE), so its own id is a
    // valid-looking but non-contributor invitee id.
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [baseScenario.space.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SPACE_ADMIN
    );

    expect(invitationData?.error?.errors?.[0]?.message).toContain(
      'Invitees must be a user, organization or virtual contributor'
    );

    const after = await getSpaceInvitation(
      baseScenario.space.id,
      TestUser.GLOBAL_ADMIN
    );
    expect(
      after?.data?.lookup?.space?.community?.roleSet.invitations
    ).toHaveLength(countBefore);

    // The Space's next legitimate invitation still succeeds
    const nextInvite = await inviteOrg(baseScenario.organization.id);
    const nextResult = getSingleInvitationResult(nextInvite);
    const nextInvitationId = nextResult?.invitation?.id ?? '';
    expect(nextInvitationId.length).toEqual(36);
    await deleteInvitation(nextInvitationId);

    // ...and so does its next application
    const applicationRes = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    const applicationId =
      applicationRes?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    expect(applicationId.length).toEqual(36);
    await deleteApplication(applicationId);
  });
});

/**
 * R32 / FR-002a. The invite flow is only half a feature if the Space admin who
 * brought the organization in cannot then manage it. `ROLESET_ENTRY_ROLE_ASSIGN_
 * ORGANIZATION` gates bringing a NEW organization in (global admins, support and
 * beta testers only, because a direct add never asks the organization); once the
 * organization holds the entry role, both mutations need `GRANT` alone, which a
 * Space admin has.
 */
describe('Organization Space invitations — the Space admin can manage the organization afterwards (R32)', () => {
  beforeEach(async () => {
    await clearOrgAFromSpace();
  });

  afterEach(async () => {
    await clearOrgAFromSpace();
  });

  const acceptInviteAsOrgAdmin = async () => {
    const invitationData = await inviteOrg(baseScenario.organization.id);
    const invitationId =
      getSingleInvitationResult(invitationData)?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);
    await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );
    return invitationId;
  };

  test('promotes the accepted organization to Lead and demotes it again', async () => {
    await acceptInviteAsOrgAdmin();
    expect((await spaceRolesForOrg(baseScenario.organization.id))?.roles).toContain(
      'member'
    );

    const promote = await assignRoleToOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead,
      TestUser.SPACE_ADMIN
    );
    expect(promote?.error).toBeUndefined();
    expect((await spaceRolesForOrg(baseScenario.organization.id))?.roles).toContain(
      'lead'
    );

    const demote = await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead,
      TestUser.SPACE_ADMIN
    );
    expect(demote?.error).toBeUndefined();
    expect(
      (await spaceRolesForOrg(baseScenario.organization.id))?.roles
    ).not.toContain('lead');
  });

  test('removes the accepted organization from the Space', async () => {
    await acceptInviteAsOrgAdmin();

    const removal = await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member,
      TestUser.SPACE_ADMIN
    );
    expect(removal?.error).toBeUndefined();
    expect(await spaceRolesForOrg(baseScenario.organization.id)).toBeUndefined();
  });

  test('still cannot ADD an organization that is not already in the Space', async () => {
    // The consent gate this feature exists to protect: a direct add never asks
    // the organization, so it stays with platform admins (R6).
    const orgB = await createTestOrganization('r32addguard');

    const directAdd = await assignRoleToOrganization(
      orgB.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member,
      TestUser.SPACE_ADMIN
    );
    expect(directAdd?.error?.errors?.[0]?.message).toContain('Authorization');
    expect(await spaceRolesForOrg(orgB.id)).toBeUndefined();

    await deleteOrganization(orgB.id).catch(() => undefined);
  });

  test('a Space member who is not an admin can do none of it', async () => {
    await acceptInviteAsOrgAdmin();

    const promote = await assignRoleToOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead,
      TestUser.SPACE_MEMBER
    );
    expect(promote?.error?.errors?.[0]?.message).toContain('Authorization');

    const removal = await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member,
      TestUser.SPACE_MEMBER
    );
    expect(removal?.error?.errors?.[0]?.message).toContain('Authorization');
    expect((await spaceRolesForOrg(baseScenario.organization.id))?.roles).toContain(
      'member'
    );
  });
});
