import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
} from './invitation.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '../../journey/space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  registerVerifiedUser,
  deleteUser,
} from '../../contributor-management/user/user.request.params';
import { getRoleSetInvitationsApplications } from '../application/application.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { getSingleInvitationResult } from '../roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

// An email invitation is listed as pending only while it is OPEN: the address
// has not registered yet. Registering consumes it — the platform invitation
// leaves the role set's `platformInvitations` list and the same offer shows up
// as a regular invitation addressed to the new user. The reads below therefore
// happen on both sides of `registerVerifiedUser`.
const uniqueId = UniqueIDGenerator.getID();

let emailExternalUser = '';
const firstNameExternalUser = `FirstName${uniqueId}`;
const message = 'Hello, feel free to join our community!';

let platformInvitationId = '';
let userId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'invitation-external',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
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
    settings: { membership: { allowSubspaceAdminsToInviteMembers: true } },
  },
};

/** The open email invitations (and the regular invitations) of a role set. */
const readRoleSet = async (roleSetId: string) => {
  const res = await getRoleSetInvitationsApplications(
    roleSetId,
    TestUser.GLOBAL_ADMIN
  );
  expect(res?.error).toBeUndefined();
  const roleSet = res?.data?.lookup?.roleSet;
  return {
    platformInvitations: roleSet?.platformInvitations ?? [],
    invitations: roleSet?.invitations ?? [],
  };
};

const listedFor = (
  platformInvitations: Array<{ email: string; profileCreated: boolean }>,
  email: string
) => platformInvitations.filter(p => p.email === email);

const convertedFor = (
  invitations: Array<{ state: string; actor: { id: string } }>,
  actorId: string
) => invitations.filter(i => i.actor.id === actorId);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

afterEach(async () => {
  await deleteUser(userId);
});

describe('Invitations', () => {
  beforeEach(async () => {
    emailExternalUser = `external${uniqueId}@alkem.io`;
  });
  afterEach(async () => {
    await deleteExternalInvitation(platformInvitationId);
  });
  test('should create external invitation', async () => {
    // Arrange
    const roleSetId = baseScenario.space.community.roleSetId;
    const before = await readRoleSet(roleSetId);

    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      [emailExternalUser],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );
    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.platformInvitation) {
      platformInvitationId = invitationResult.platformInvitation.id;
    }
    const whileOpen = await readRoleSet(roleSetId);

    userId = await registerVerifiedUser(
      emailExternalUser,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const after = await readRoleSet(roleSetId);

    // Assert
    expect(before.platformInvitations).toHaveLength(0);
    expect(invitationResult?.type).toEqual(
      RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
    );
    // Open: listed, not consumed.
    expect(listedFor(whileOpen.platformInvitations, emailExternalUser)).toEqual([
      expect.objectContaining({
        email: emailExternalUser,
        profileCreated: false,
      }),
    ]);
    // Consumed: no longer listed as pending, and converted into an invitation
    // for the new user.
    expect(listedFor(after.platformInvitations, emailExternalUser)).toHaveLength(
      0
    );
    const converted = convertedFor(after.invitations, userId);
    expect(converted).toHaveLength(1);
    expect(converted[0].state).toEqual('invited');
  });

  test('should fail to create second external invitation from same community to same user', async () => {
    // Arrange
    const userEmail = `2+${emailExternalUser}`;
    const roleSetId = baseScenario.space.community.roleSetId;

    const before = await readRoleSet(roleSetId);

    const invitationData = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.platformInvitation) {
      platformInvitationId = invitationResult.platformInvitation.id;
    }

    // Act
    const invitationMutation2 = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );
    const invitationResult2 = getSingleInvitationResult(invitationMutation2);

    const whileOpen = await readRoleSet(roleSetId);

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const after = await readRoleSet(roleSetId);

    // Assert
    expect(before.platformInvitations).toHaveLength(0);
    expect(invitationResult2?.type).toEqual(
      RoleSetInvitationResultType.AlreadyInvitedToPlatformAndRoleSet
    );
    // One open row, not two.
    expect(listedFor(whileOpen.platformInvitations, userEmail)).toHaveLength(1);
    expect(listedFor(after.platformInvitations, userEmail)).toHaveLength(0);
    expect(convertedFor(after.invitations, userId)).toHaveLength(1);
  });

  test('should create second external invitation from same community to same user, after the first is deleted', async () => {
    // Arrange
    const userEmail = `3+${emailExternalUser}`;
    const roleSetId = baseScenario.space.community.roleSetId;

    const invitationData = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.platformInvitation) {
      platformInvitationId = invitationResult.platformInvitation.id;
    }

    const invData = await readRoleSet(roleSetId);

    // Act
    await deleteExternalInvitation(platformInvitationId);
    const afterDelete = await readRoleSet(roleSetId);

    const invitationData2 = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    const invitationResult2 = getSingleInvitationResult(invitationData2);
    if (invitationResult2 && invitationResult2.platformInvitation) {
      platformInvitationId = invitationResult2.platformInvitation.id;
    }

    const invData2 = await readRoleSet(roleSetId);

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const invData3 = await readRoleSet(roleSetId);

    // Assert
    expect(listedFor(invData.platformInvitations, userEmail)).toHaveLength(1);
    expect(listedFor(afterDelete.platformInvitations, userEmail)).toHaveLength(
      0
    );
    expect(invitationResult2?.type).toEqual(
      RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
    );
    expect(listedFor(invData2.platformInvitations, userEmail)).toEqual([
      expect.objectContaining({ email: userEmail, profileCreated: false }),
    ]);
    expect(listedFor(invData3.platformInvitations, userEmail)).toHaveLength(0);
    expect(convertedFor(invData3.invitations, userId)).toHaveLength(1);
  });

  test('should create second external invitation from different community to same user', async () => {
    // Arrange
    const userEmail = `4+${emailExternalUser}`;
    const spaceName = `sp2-${uniqueId}`;
    const responseSpace2 = await createSpaceAndGetData(
      spaceName,
      spaceName,
      baseScenario.organization.accountId
    );

    const secondSpaceData = responseSpace2?.data?.lookup?.space;
    const secondSpaceId = secondSpaceData?.id ?? '';
    const secondSpaceRoleSetId = secondSpaceData?.community?.roleSet.id ?? '';
    const firstRoleSetId = baseScenario.space.community.roleSetId;
    let secondInvitationId = '';

    try {
      const invitationData = await inviteForEntryRoleOnRoleSet(
        firstRoleSetId,
        [],
        [userEmail],
        message,
        [RoleName.Member],
        TestUser.GLOBAL_ADMIN
      );

      const invitationResult = getSingleInvitationResult(invitationData);
      if (invitationResult && invitationResult.platformInvitation) {
        platformInvitationId = invitationResult.platformInvitation.id;
      }

      // Act
      const secondInvitationData = await inviteForEntryRoleOnRoleSet(
        secondSpaceRoleSetId,
        [],
        [userEmail],
        message,
        [RoleName.Member],
        TestUser.GLOBAL_ADMIN
      );
      secondInvitationId =
        getSingleInvitationResult(secondInvitationData)?.platformInvitation
          ?.id ?? '';

      const space1WhileOpen = await readRoleSet(firstRoleSetId);
      const space2WhileOpen = await readRoleSet(secondSpaceRoleSetId);

      userId = await registerVerifiedUser(
        userEmail,
        firstNameExternalUser,
        firstNameExternalUser
      );

      const space1 = await readRoleSet(firstRoleSetId);
      const space2 = await readRoleSet(secondSpaceRoleSetId);

      // Assert
      expect(listedFor(space1WhileOpen.platformInvitations, userEmail)).toHaveLength(
        1
      );
      expect(listedFor(space2WhileOpen.platformInvitations, userEmail)).toHaveLength(
        1
      );
      expect(listedFor(space1.platformInvitations, userEmail)).toHaveLength(0);
      expect(listedFor(space2.platformInvitations, userEmail)).toHaveLength(0);
      expect(convertedFor(space1.invitations, userId)).toHaveLength(1);
      expect(convertedFor(space2.invitations, userId)).toHaveLength(1);
    } finally {
      if (secondInvitationId) {
        await deleteExternalInvitation(secondInvitationId);
      }
      await deleteSpace(secondSpaceId);
    }
  });
});
