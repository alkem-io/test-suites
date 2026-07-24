import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  eventOnRoleSetApplication,
  eventOnRoleSetInvitation,
} from '@functional-api/roleset/roleset-events.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Move L2 to L1 - pre-existing applications and invitations
 * (workspace#030-move-subspace-parent, US2-AS1 / FR-004)
 *
 * A cross-L0 move drops the moved L2 subspace's pending invitations and
 * applications along with all community roles. Mirrors
 * move-L1-to-L2-applications-invitations.it-spec.ts on an L2 source.
 */

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;
let invitationId: string;
let applicationId: string;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l2-l1-inv-src',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          membership: { policy: CommunityMembershipPolicy.Applications },
          privacy: { mode: SpacePrivacyMode.Private },
        },
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l2-l1-inv-tgt',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);

  // Create pending invitation on the L2 before move
  const invitationData = await inviteForEntryRoleOnRoleSet(
    sourceScenario.subsubspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome before move',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application on the L2 before move
  const applicationData = await createApplication(
    sourceScenario.subsubspace.community.roleSetId,
    TestUser.SPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Execute cross-L0 L2→L1 move
  await moveSpaceL2ToSpaceL1(
    sourceScenario.subsubspace.id,
    targetScenario.subspace.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L2 to L1 - pre-existing applications and invitations', () => {
  test('pending invitation is invalidated after cross-L0 move (FR-004)', async () => {
    const acceptResult = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );

    const hasError =
      acceptResult.error?.errors !== undefined &&
      acceptResult.error.errors.length > 0;
    expect(hasError).toBe(true);
  });

  test('pending application is invalidated after cross-L0 move (FR-004)', async () => {
    const approveResult = await eventOnRoleSetApplication(
      applicationId,
      'APPROVE'
    );

    const hasError =
      approveResult.error?.errors !== undefined &&
      approveResult.error.errors.length > 0;
    expect(hasError).toBe(true);
  });

  test('new invitation can be created after move', async () => {
    const newInvitation = await inviteForEntryRoleOnRoleSet(
      sourceScenario.subsubspace.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome after move',
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    const result = getSingleInvitationResult(newInvitation);
    expect(result?.invitation?.id).toBeDefined();
  });

  test('new application can be submitted and approved after move', async () => {
    // Apply as a member of the moved L2's NEW direct parent (target L1). After
    // the move, apply-eligibility is recomputed from the new hierarchy:
    //   - direct-parent (target L1) members get ROLESET_ENTRY_ROLE_APPLY
    //     unconditionally (privacy-independent);
    //   - the broader "any authenticated platform user" tier applies ONLY when
    //     every ancestor is public + opted-in — a private L0/L1 removes it.
    // The moved L2's chain here is private, so a former L2 member
    // (SUBSUBSPACE_MEMBER, wiped by the move and absent from the new chain)
    // correctly cannot apply. SUBSPACE_MEMBER is a target-L1 member and not a
    // member of the wiped L2, so it is genuinely eligible.
    const newApp = await createApplication(
      sourceScenario.subsubspace.community.roleSetId,
      TestUser.SUBSPACE_MEMBER
    );
    const newAppId = newApp?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    expect(newAppId).not.toBe('');

    const approveResult = await eventOnRoleSetApplication(newAppId, 'APPROVE');
    expect(approveResult.status).toBe(200);
    expect(approveResult?.data?.eventOnApplication?.state).toContain(
      'approved'
    );
  });
});
