/* eslint-disable prettier/prettier */
import '@test/utils/array.matcher';
import {
  deleteExternalInvitationCodegen,
  inviteExternalUserCodegen,
  getSpaceInvitationCodegen,
} from './invitation.request.params';
import {
  createTestSpaceCodegen,
  deleteSpaceCodegen,
} from '../../journey/space/space.request.params';
import { deleteOrganizationCodegen } from '../../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';
import { registerVerifiedUser, deleteUserCodegen } from '../user.request.params';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';

let emailExternalUser = '';
const firstNameExternalUser = `FirstName${uniqueId}`;
const message = 'Hello, feel free to join our community!';

let invitationId = '';
let invitationData: any;
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;
let userId = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

afterEach(async () => {
  await deleteUserCodegen(userId);
});

describe('Invitations', () => {
  beforeEach(async () => {
    emailExternalUser = `external${uniqueId}@alkem.io`;
  });
  afterEach(async () => {
    await deleteExternalInvitationCodegen(invitationId);
  });
  test('should create external invitation', async () => {
    // Arrange
    const getInvBefore = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    invitationData = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      emailExternalUser,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData?.data?.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo?.id ?? '';

    userId = await registerVerifiedUser(
      emailExternalUser,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const getInvAfter = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore?.data?.space?.community?.invitationsExternal
    ).toHaveLength(0);
    expect(
      getInvAfter?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(emailExternalUser);
  });

  test('should fail to create second external invitation from same community to same user', async () => {
    // Arrange
    const userEmail = `2+${emailExternalUser}`;

    const getInvBefore = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    invitationData = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData?.data?.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo?.id ?? '';

    // Act
    const invitationData2 = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const getInvAfter = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore?.data?.space?.community?.invitationsExternal
    ).toHaveLength(0);
    expect(
      getInvAfter?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(userEmail);
    expect(invitationData2.error?.errors[0].message).toContain(
      `An invitation with the provided email address (${userEmail}) already exists for the specified community: ${entitiesId.spaceCommunityId}`
    );
  });

  test('should create second external invitation from same community to same user, after the first is deleted', async () => {
    // Arrange
    const userEmail = `3+${emailExternalUser}`;

    invitationData = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData?.data?.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo?.id ?? '';

    const invData = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    await deleteExternalInvitationCodegen(invitationId);

    const invitationData2 = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo2 =
      invitationData2?.data?.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo2?.id ?? '';

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const invData2 = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invData?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(userEmail);
    expect(
      invData2?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(userEmail);
  });

  test('should create second external invitation from different community to same user', async () => {
    // Arrange
    const userEmail = `4+${emailExternalUser}`;
    const spaceName = `sp2-${uniqueId}`;
    const responseSpace2 = await createTestSpaceCodegen(
      spaceName,
      spaceName,
      entitiesId.organizationId
    );

    const secondSpaceData = responseSpace2?.data?.createSpace;
    const secondSpaceId = secondSpaceData?.id ?? '';
    const secondSpaceCommunityId = secondSpaceData?.community?.id ?? '';

    invitationData = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData?.data?.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Act
    await inviteExternalUserCodegen(
      secondSpaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    userId = await registerVerifiedUser(
      userEmail,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const invSpace1 = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    const invSpace2 = await getSpaceInvitationCodegen(
      secondSpaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invSpace1?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(userEmail);
    expect(
      invSpace2?.data?.space?.community?.invitationsExternal?.[0].email
    ).toEqual(userEmail);
    await deleteSpaceCodegen(secondSpaceId);
  });
});
