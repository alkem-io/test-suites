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
    const getInvBefore = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
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

    userId = await registerVerifiedUser(
      emailExternalUser,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const getInvAfter = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore?.data?.lookup?.roleSet?.platformInvitations
    ).toHaveLength(0);
    expect(
      getInvAfter?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(emailExternalUser);
  });

  test('should fail to create second external invitation from same community to same user', async () => {
    // Arrange
    const userEmail = `2+${emailExternalUser}`;

    const getInvBefore = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
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
      baseScenario.space.community.roleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );
    const invitationResult2 = getSingleInvitationResult(invitationMutation2);

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const getInvAfter = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore?.data?.lookup?.roleSet?.platformInvitations
    ).toHaveLength(0);
    expect(
      getInvAfter?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(userEmail);
    expect(invitationResult2?.type).toEqual(
      RoleSetInvitationResultType.AlreadyInvitedToPlatformAndRoleSet
    );
  });

  test('should create second external invitation from same community to same user, after the first is deleted', async () => {
    // Arrange
    const userEmail = `3+${emailExternalUser}`;

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
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

    const invData = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    await deleteExternalInvitation(platformInvitationId);

    const invitationData2 = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
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

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const invData2 = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invData?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(userEmail);
    expect(
      invData2?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(userEmail);
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

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
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
    await inviteForEntryRoleOnRoleSet(
      secondSpaceRoleSetId,
      [],
      [userEmail],
      message,
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const invSpace1 = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    const invSpace2 = await getRoleSetInvitationsApplications(
      secondSpaceRoleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invSpace1?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(userEmail);
    expect(
      invSpace2?.data?.lookup?.roleSet?.platformInvitations?.[0].email
    ).toEqual(userEmail);
    await deleteSpace(secondSpaceId);
  });
});
