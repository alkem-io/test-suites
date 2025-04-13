import '@utils/array.matcher';
import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
} from './invitation.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '../../journey/space/space.request.params';
import { TestUser } from '@alkemio/tests-lib';
import {
  registerVerifiedUser,
  deleteUser,
} from '../../contributor-management/user/user.request.params';
import { getRoleSetInvitationsApplications } from '../application/application.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';

const uniqueId = UniqueIDGenerator.getID();

let emailExternalUser = '';
const firstNameExternalUser = `FirstName${uniqueId}`;
const message = 'Hello, feel free to join our community!';

let invitationId = '';
let userId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'invitation-external',
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
    await deleteExternalInvitation(invitationId);
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
      TestUser.GLOBAL_ADMIN
    );

    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
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
      TestUser.GLOBAL_ADMIN
    );

    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    // Act
    const invitationData2 = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [],
      [userEmail],
      message,
      TestUser.GLOBAL_ADMIN
    );
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
    expect(invitationData2.error?.errors[0].message).toContain(
      `An invitation with the provided email address (${userEmail}) already exists for the specified roleSet: ${baseScenario.space.community.roleSetId}`
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
      TestUser.GLOBAL_ADMIN
    );

    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    const invData = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    await deleteExternalInvitation(invitationId);

    const invitationData2 = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [],
      [userEmail],
      message,
      TestUser.GLOBAL_ADMIN
    );

    const invitationsResults2 =
      invitationData2?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults2 && invitationsResults2.length > 0) {
      const invitation2 = invitationsResults2[0].invitation;
      if (invitation2) {
        invitationId = invitation2.id;
      }
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
      TestUser.GLOBAL_ADMIN
    );

    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    // Act
    await inviteForEntryRoleOnRoleSet(
      secondSpaceRoleSetId,
      [],
      [userEmail],
      message,
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
