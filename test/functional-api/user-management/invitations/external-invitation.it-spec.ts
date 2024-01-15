/* eslint-disable prettier/prettier */
import '@test/utils/array.matcher';
import {
  getExternalInvitation,
  inviteExternalUserCodegen,
  removeExternalInvitation,
} from './invitation.request.params';
import {
  createTestSpace,
  removeSpace,
} from '../../integration/space/space.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';
import { registerVerifiedUser, removeUser } from '../user.request.params';
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
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

afterEach(async () => {
  await removeUser(userId);
});

describe.skip('Invitations', () => {
  beforeEach(async () => {
    emailExternalUser = `external${uniqueId}@alkem.io`;
  });
  afterEach(async () => {
    await removeExternalInvitation(invitationId);
  });
  test('should create external invitation', async () => {
    // Arrange
    const getInvBefore = await getExternalInvitation(
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
      invitationData.body.data.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

    userId = await registerVerifiedUser(
      emailExternalUser,
      firstNameExternalUser,
      firstNameExternalUser
    );

    const getInvAfter = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore.body.data.space.community.invitationsExternal
    ).toHaveLength(0);
    expect(
      getInvAfter.body.data.space.community.invitationsExternal[0].email
    ).toEqual(emailExternalUser);
  });

  test('should fail to create second external invitation from same community to same user', async () => {
    // Arrange
    const userEmail = `2+${emailExternalUser}`;

    const getInvBefore = await getExternalInvitation(
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
      invitationData.body.data.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

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

    const getInvAfter = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      getInvBefore.body.data.space.community.invitationsExternal
    ).toHaveLength(0);
    expect(
      getInvAfter.body.data.space.community.invitationsExternal[0].email
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
      invitationData.body.data.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

    const invData = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Act
    await removeExternalInvitation(invitationId);

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

    const invData2 = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invData.body.data.space.community.invitationsExternal[0].email
    ).toEqual(userEmail);
    expect(
      invData2.body.data.space.community.invitationsExternal[0].email
    ).toEqual(userEmail);
  });

  // Skipped until this issue is resolved: Placeholder: Invite external user from 2 different communities is not possible #3011
  test('should create second external invitation from different community to same user', async () => {
    // Arrange
    const userEmail = `4+${emailExternalUser}`;
    const spaceName = `sp2-${uniqueId}`;
    const responseSpace2 = await createTestSpace(
      spaceName,
      spaceName,
      entitiesId.organizationId
    );

    const secondSpaceData = responseSpace2.body.data.createSpace;
    const secondSpaceId = secondSpaceData.id;
    const secondSpaceCommunityId = secondSpaceData.community.id;

    invitationData = await inviteExternalUserCodegen(
      entitiesId.spaceCommunityId,
      userEmail,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData.body.data.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Act
    const invitationData2 = await inviteExternalUserCodegen(
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

    const invSpace1 = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    const invSpace2 = await getExternalInvitation(
      secondSpaceId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(
      invSpace1.body.data.space.community.invitationsExternal[0].email
    ).toEqual(userEmail);
    expect(
      invSpace2.body.data.space.community.invitationsExternal[0].email
    ).toEqual(userEmail);
    await removeSpace(secondSpaceId);
  });
});
