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
      // Every subspace persona is ALSO a member of each ancestor Space.
      // `assignActorToRole` enforces a parent-membership precondition, so a
      // user listed only on L2 silently receives neither MEMBER nor ADMIN
      // there — the assignment fails and the factory logs and continues. The
      // "admin authorized only at L2" test below then runs as an actor with
      // no roles at all and gets a blanket FORBIDDEN_POLICY instead of the
      // typed INVITATION_TO_PARENT_NOT_AUTHORIZED outcome it exists to pin.
      // Mirrors the user-invitation precedent in
      // `notifications/space/community/invitations.it-spec.ts`.
      members: [
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSUBSPACE_ADMIN],
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

// Removing a role the organization does not hold is not a no-op server-side:
// `validateActorPolicyLimits` compares the CURRENT count against the role
// policy minimum, so a count of 0 against a minimum of 0 raises
// `Min limit of organizations reached for role 'member'`. The helper therefore
// asks which Spaces the organization actually holds a role in first and only
// removes those — otherwise every teardown emits a burst of errors that hides
// the real ones (13 of them before this was fixed) and the `.catch()` cannot
// swallow, because the request wrapper resolves with an error payload rather
// than rejecting.
const clearOrgFromHierarchy = async () => {
  const spacesWithRoles = await orgSpaceRoles();
  const held = new Set<string>();
  for (const l0 of spacesWithRoles) {
    if ((l0?.roles ?? []).includes('member')) held.add(l0.id);
    for (const sub of l0?.subspaces ?? []) {
      if ((sub?.roles ?? []).includes('member')) held.add(sub.id);
    }
  }

  for (const [spaceId, roleSetId] of [
    [baseScenario.space.id, baseScenario.space.community.roleSetId],
    [baseScenario.subspace.id, baseScenario.subspace.community.roleSetId],
    [baseScenario.subsubspace.id, baseScenario.subsubspace.community.roleSetId],
  ] as const) {
    if (!held.has(spaceId)) continue;
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
    // Invite into L1: this L2 admin IS authorized there (ADMIN of L2 carries
    // the implicit SPACE_SUBSPACE_ADMIN credential on L1, and L1 has
    // `allowSubspaceAdminsToInviteMembers` on), but NOT on L1's own parent
    // L0 — whose same setting grants only L1's admins. The organization is
    // not a member of L0 either, so the parent leg is refused and the whole
    // invite resolves to the typed INVITATION_TO_PARENT_NOT_AUTHORIZED
    // rather than creating anything.
    //
    // `expect(error).toBeUndefined()` guards the failure mode this test hit
    // before the scenario's membership chain was fixed: with the persona
    // holding no roles, the mutation was rejected outright with
    // FORBIDDEN_POLICY and `getSingleInvitationResult` returned undefined —
    // so the assertion below compared undefined against the expected outcome
    // instead of exercising the parent check at all.
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [baseScenario.organization.id],
      [],
      message,
      [RoleName.Member],
      TestUser.SUBSUBSPACE_ADMIN
    );
    const result = getSingleInvitationResult(invitationData);

    expect(invitationData?.error).toBeUndefined();
    expect(result?.type).toEqual(
      RoleSetInvitationResultType.InvitationToParentNotAuthorized
    );
    expect(result?.invitation).toBeFalsy();
  });

  test('the inviting Space admin reads spacesToJoinOnAccept as null — denied without an error, no ancestor data leaked', async () => {
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
    //
    // The denial is an ABSENCE, not an error: the resolver checks the
    // privilege inline and the field is declared nullable, precisely so the
    // shared `InvitationData` fragment — spread by the top-bar pending
    // memberships dialog and the in-app notifications panel — does not
    // attach a GraphQL error to every notifications fetch (which, under the
    // non-null `CommunityInvitationResult.invitation`, would null out the
    // whole `me` query). See `invitation.resolver.fields.ts`.
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

    // No GraphQL error at all — that is the contract.
    expect(response.body?.errors).toBeUndefined();

    // The rest of the query still resolves; only the gated field is null, so
    // nothing about the ancestor chain is leaked to the inviter.
    const roleSet = response.body?.data?.lookup?.roleSet;
    expect(roleSet).not.toBeNull();
    const invitation = roleSet?.invitations?.find(
      (candidate: { id: string }) => candidate.id === invitationId
    );
    expect(invitation).toBeDefined();
    expect(invitation?.spacesToJoinOnAccept).toBeNull();
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
