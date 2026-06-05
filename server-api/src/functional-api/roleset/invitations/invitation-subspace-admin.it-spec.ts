import {
  deleteExternalInvitation,
  deleteInvitation,
  getSpaceInvitation,
  inviteForEntryRoleOnRoleSet,
} from './invitation.request.params';
import { updateSpaceSettings } from '../../journey/space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  registerVerifiedUser,
  deleteUser,
} from '../../contributor-management/user/user.request.params';
import { getRoleSetInvitationsApplications } from '../application/application.request.params';
import { getSingleInvitationResult } from '../roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();
const message = 'Hello, feel free to join our community!';

let externalUserEmail = '';
let externalUserId = '';
let platformInvitationId = '';
let invitationId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'invitation-subspace-admin',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
      ],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Subspace admin invitations - allowSubspaceAdminsToInviteMembers', () => {
  beforeEach(() => {
    externalUserEmail = `subspace.ext.${uniqueId}.${Math.random()
      .toString(36)
      .slice(2, 7)}@alkem.io`;
  });

  afterEach(async () => {
    if (platformInvitationId) {
      await deleteExternalInvitation(platformInvitationId);
      platformInvitationId = '';
    }
    if (invitationId) {
      await deleteInvitation(invitationId);
      invitationId = '';
    }
    if (externalUserId) {
      await deleteUser(externalUserId);
      externalUserId = '';
    }
  });

  describe('flag = true (subspace admin allowed)', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        membership: { allowSubspaceAdminsToInviteMembers: true },
      });
    });

    test('subspace admin can invite an external user to parent space', async () => {
      // Act
      const invitationData = await inviteForEntryRoleOnRoleSet(
        baseScenario.space.community.roleSetId,
        [],
        [externalUserEmail],
        message,
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );
      const invitationResult = getSingleInvitationResult(invitationData);
      if (invitationResult?.platformInvitation) {
        platformInvitationId = invitationResult.platformInvitation.id;
      }
      externalUserId = await registerVerifiedUser(
        externalUserEmail,
        `First${uniqueId}`,
        `Last${uniqueId}`
      );

      const getInvAfter = await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(invitationData?.error).toBeUndefined();
      expect(platformInvitationId.length).toEqual(36);
      expect(
        getInvAfter?.data?.lookup?.roleSet?.platformInvitations?.[0].email
      ).toEqual(externalUserEmail);
    });

    test('subspace admin can invite a platform user to parent space', async () => {
      // Act
      const invitationData = await inviteForEntryRoleOnRoleSet(
        baseScenario.space.community.roleSetId,
        [TestUserManager.users.nonSpaceMember.id],
        [],
        message,
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );
      const invitationResult = getSingleInvitationResult(invitationData);
      if (invitationResult?.invitation) {
        invitationId = invitationResult.invitation.id;
      }

      const getInv = await getSpaceInvitation(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const invitations =
        getInv?.data?.lookup?.space?.community?.roleSet.invitations;

      // Assert
      expect(invitationData?.error).toBeUndefined();
      expect(invitationId.length).toEqual(36);
      expect(invitationResult?.invitation?.state).toEqual('invited');
      expect(invitations?.[0].state).toEqual('invited');
    });
  });

  describe('flag = false (subspace admin not allowed)', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        membership: { allowSubspaceAdminsToInviteMembers: false },
      });
    });

    test('subspace admin cannot invite an external user to parent space', async () => {
      // Act
      const invitationData = await inviteForEntryRoleOnRoleSet(
        baseScenario.space.community.roleSetId,
        [],
        [externalUserEmail],
        message,
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );
      const invitationResult = getSingleInvitationResult(invitationData);
      if (invitationResult?.platformInvitation) {
        platformInvitationId = invitationResult.platformInvitation.id;
      }

      const getInvAfter = await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(invitationData?.error?.errors?.[0]?.message).toBeDefined();
      expect(invitationData?.error?.errors?.[0]?.message).toContain(
        'roleset-entry-role-invite'
      );
      expect(
        getInvAfter?.data?.lookup?.roleSet?.platformInvitations
      ).toHaveLength(0);
    });

    test('subspace admin cannot invite a platform user to parent space', async () => {
      // Act
      const invitationData = await inviteForEntryRoleOnRoleSet(
        baseScenario.space.community.roleSetId,
        [TestUserManager.users.nonSpaceMember.id],
        [],
        message,
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );
      const invitationResult = getSingleInvitationResult(invitationData);
      if (invitationResult?.invitation) {
        invitationId = invitationResult.invitation.id;
      }

      const getInv = await getSpaceInvitation(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const invitations =
        getInv?.data?.lookup?.space?.community?.roleSet.invitations;

      // Assert
      expect(invitationData?.error?.errors?.[0]?.message).toBeDefined();
      expect(invitationData?.error?.errors?.[0]?.message).toContain(
        'roleset-entry-role-invite'
      );
      expect(invitations).toHaveLength(0);
    });
  });
});
