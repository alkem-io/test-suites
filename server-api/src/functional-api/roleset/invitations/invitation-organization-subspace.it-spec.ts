/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from './invitation.request.params';
import { getSingleInvitationResult } from '../roleset.request.params';
import { eventOnRoleSetInvitation } from '../roleset-events.request.params';
import {
  assignRoleToOrganization,
  getRoleName,
  removeRoleFromOrganization,
} from '../roles-request.params';
import { meQuery } from '../application/application.request.params';
import { updateSpaceSettings } from '../../journey/space/space.request.params';

const message = 'You would join every ancestor Space too — L2 test';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-invite-subspace',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN],
      },
      subspace: {
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

let invitationId = '';

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Lets an admin of a direct subspace also invite into that subspace's own
  // parent (needed by the "admin authorized only at L2" negative case below,
  // mirroring the existing user-invitation precedent in invitations.it-spec.ts).
  await updateSpaceSettings(baseScenario.space.id, {
    membership: { allowSubspaceAdminsToInviteMembers: true },
  });
  await updateSpaceSettings(baseScenario.subspace.id, {
    membership: { allowSubspaceAdminsToInviteMembers: true },
  });

  // baseScenario.organization is the L0 Space's own hosting organization, and
  // the server auto-grants it Member+Lead on that Space at creation time.
  // Every test below treats the organization as a fresh invitee into the
  // whole hierarchy, so strip that auto-grant before the first invite runs —
  // otherwise the L0 leg of the very first invite resolves to
  // ALREADY_MEMBER_OF_ROLE_SET instead of a real invitation.
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
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const clearOrgFromHierarchy = async () => {
  for (const roleSetId of [
    baseScenario.space.community.roleSetId,
    baseScenario.subspace.community.roleSetId,
    baseScenario.subsubspace.community.roleSetId,
  ]) {
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      roleSetId,
      RoleName.Member
    ).catch(() => undefined);
  }
};

// rolesOrganization only nests one level: `spaces` holds L0 entries and each
// L0 entry's `subspaces` is a flat list of every L1 *and* L2 descendant
// (grouped server-side by levelZeroSpaceID, not by direct parent) — see
// get.space.roles.for.contributor.query.result.ts in server.
const orgSpaceRoles = async () => {
  const res = await getRoleName(baseScenario.organization.id);
  return (res?.data?.rolesOrganization?.spaces ?? []) as any[];
};

// `spacesToJoinOnAccept` is gated to ROLESET_ENTRY_ROLE_INVITE_ACCEPT, granted
// only to account admins of the invited actor — never to the inviting Space
// admin, so every ancestor-chain assertion below reads it as the invited
// organization's own admin via `me.communityInvitations`, not from the
// invite mutation's own result.
const spacesToJoinOnAcceptForOrgAdmin = async (
  targetInvitationId: string
): Promise<string[]> => {
  const me = await meQuery(TestUser.ORGANIZATION_ADMIN);
  const seen = me?.data?.me?.communityInvitations?.find(
    (i: any) => i.invitation?.id === targetInvitationId
  );
  return (seen?.invitation?.spacesToJoinOnAccept ?? []).map(
    (s: any) => s.id
  );
};

describe('Organization Space invitations — subspace ancestor chain (invitedToParent, spacesToJoinOnAccept)', () => {
  afterEach(async () => {
    await clearOrgFromHierarchy();
    if (invitationId) {
      await deleteInvitation(invitationId).catch(() => undefined);
      invitationId = '';
    }
  });

  test('space admin invites the organization to L2: invitedToParent is true and every ancestor Space is listed', async () => {
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subsubspace.community.roleSetId,
      [baseScenario.organization.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SPACE_ADMIN
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';

    expect(invitationId.length).toEqual(36);
    expect(result?.invitation?.invitedToParent).toEqual(true);

    const joinedSpaceIds = await spacesToJoinOnAcceptForOrgAdmin(
      invitationId
    );
    expect(joinedSpaceIds).toEqual([
      baseScenario.space.about.id,
      baseScenario.subspace.about.id,
      baseScenario.subsubspace.about.id,
    ]);

    await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    // Assert — member of exactly the three enumerated Spaces, nothing more:
    // one top-level (L0) entry, whose `subspaces` list is exactly [L1, L2].
    const orgSpaces = await orgSpaceRoles();
    expect(orgSpaces.map((s: any) => s.id)).toEqual([baseScenario.space.id]);
    const l0 = orgSpaces[0];
    const l1 = l0?.subspaces?.find(
      (s: any) => s.id === baseScenario.subspace.id
    );
    const l2 = l0?.subspaces?.find(
      (s: any) => s.id === baseScenario.subsubspace.id
    );
    expect(l0?.roles).toEqual(expect.arrayContaining(['member']));
    expect(l1?.roles).toEqual(expect.arrayContaining(['member']));
    expect(l2?.roles).toEqual(expect.arrayContaining(['member']));
    expect((l0?.subspaces ?? []).map((s: any) => s.id).sort()).toEqual(
      [baseScenario.subspace.id, baseScenario.subsubspace.id].sort()
    );
  });

  test('when the organization already belongs to L0, spacesToJoinOnAccept lists only L1 and L2', async () => {
    await assignRoleToOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subsubspace.community.roleSetId,
      [baseScenario.organization.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SPACE_ADMIN
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';

    expect(invitationId.length).toEqual(36);
    const joinedSpaceIds = await spacesToJoinOnAcceptForOrgAdmin(
      invitationId
    );
    expect(joinedSpaceIds).toEqual([
      baseScenario.subspace.about.id,
      baseScenario.subsubspace.about.id,
    ]);
  });

  test('an admin authorized only at L2 cannot invite into its parent (unchanged behavior)', async () => {
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [baseScenario.organization.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SUBSUBSPACE_ADMIN
    );
    const result = getSingleInvitationResult(invitationData);

    expect(result?.type).toEqual(
      RoleSetInvitationResultType.InvitationToParentNotAuthorized
    );
    expect(result?.invitation).toBeFalsy();
  });

  test('the inviting Space admin cannot select spacesToJoinOnAccept — authorization error, no ancestor data leaked', async () => {
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subsubspace.community.roleSetId,
      [baseScenario.organization.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SPACE_ADMIN
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    // The inviter (a Space admin, not the invited organization's account
    // admin) holds generic READ on the invitation but not
    // ROLESET_ENTRY_ROLE_INVITE_ACCEPT, so this field must be denied even
    // though every other invitation field is readable to them.
    const requestParams = {
      operationName: 'GetInvitationSpacesToJoinAsInviter',
      query: `
        query GetInvitationSpacesToJoinAsInviter($roleSetId: UUID!) {
          lookup {
            roleSet(ID: $roleSetId) {
              id
              invitations {
                id
                spacesToJoinOnAccept {
                  id
                }
              }
            }
          }
        }
      `,
      variables: { roleSetId: baseScenario.subsubspace.community.roleSetId },
    };
    const response = await graphqlRequestAuth(
      requestParams,
      TestUser.SPACE_ADMIN
    );

    expect(response.body?.errors?.[0]?.message).toContain(
      "Authorization: unable to grant 'roleset-entry-role-invite-accept' privilege: Invitation.spacesToJoinOnAccept"
    );
    // The field is declared non-nullable, so the error nulls the nearest
    // nullable ancestor (`lookup.roleSet`) rather than leaking a partial list.
    expect(response.body?.data?.lookup?.roleSet).toBeNull();
  });

  test('spacesToJoinOnAccept is not filtered per-ancestor: a private L0 root still appears in the invited organization admin\'s own read', async () => {
    // This is the live counterpart to the mock-only server unit test
    // (invitation.resolver.fields.spec.ts) that pins the same deliberate
    // design: the field-level ROLESET_ENTRY_ROLE_INVITE_ACCEPT gate already
    // confines this whole field to the invited actor's own account admins,
    // so the resolver does NOT additionally filter individual ancestor
    // Spaces by that admin's personal READ_ABOUT — the admin is reviewing
    // what the ORGANIZATION is about to join, not what they themselves can
    // browse. Filtering here would silently drop a private ancestor and
    // desync this field from the identical, unfiltered list the same
    // audience already gets via email and `me.communityInvitations`.
    await updateSpaceSettings(baseScenario.space.id, {
      privacy: { mode: SpacePrivacyMode.Private },
    });
    try {
      const invitationData = await inviteForEntryRoleOnRoleSet(
        baseScenario.subsubspace.community.roleSetId,
        [baseScenario.organization.id],
        [],
        message,
        [RoleName.Member],
        TestUser.SPACE_ADMIN
      );
      const result = getSingleInvitationResult(invitationData);
      invitationId = result?.invitation?.id ?? '';
      expect(invitationId.length).toEqual(36);

      const joinedSpaceIds = await spacesToJoinOnAcceptForOrgAdmin(
        invitationId
      );
      expect(joinedSpaceIds).toEqual([
        baseScenario.space.about.id,
        baseScenario.subspace.about.id,
        baseScenario.subsubspace.about.id,
      ]);
    } finally {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    }
  });
});
