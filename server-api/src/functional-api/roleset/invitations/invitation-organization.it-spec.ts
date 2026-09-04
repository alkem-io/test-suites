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
  const nameID = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
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
      TestUser.SUBSPACE_MEMBER
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
      'An organization cannot be invited with a role its policy forbids'
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
