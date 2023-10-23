/* eslint-disable prettier/prettier */
import '@test/utils/array.matcher';
import {
  createApplicationCodegen,
  meQueryCodegen,
  deleteApplicationCodegen,
} from '@test/functional-api/user-management/application/application.request.params';
import {
  getInvitation,
  getInvitations,
  inviteExistingUser,
  removeInvitation,
  deleteInvitationCodegen,
  inviteExistingUserCodegen,
  getSpaceInvitationCodegen,
} from './invitation.request.params';
import {
  getSpaceData,
  removeSpace,
} from '../../integration/space/space.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  eventOnCommunityInvitation,
  eventOnCommunityInvitationCodegen,
} from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpaceWithUsers } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser, delay } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege } from '@test/non-functional/auth/my-privileges/common';
import {
  assignCommunityRoleToUser,
  assignCommunityRoleToUserCodegen,
  removeCommunityRoleFromUser,
  removeCommunityRoleFromUserCodegen,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { CommunityRole } from '@alkemio/client-lib';

let invitationId = '';
let invitationData: any;
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;

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

describe.skip('Invitations', () => {
  afterEach(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
    await deleteInvitationCodegen(invitationId);
  });
  test('should create invitation', async () => {
    // Act
    invitationData = await inviteExistingUserCodegen(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    // console.log(
    //   invitationData?.data?.inviteExistingUserForCommunityMembership[0]
    // );
    const invitationInfo =
      invitationData?.data?.inviteExistingUserForCommunityMembership[0];

    invitationId = invitationInfo?.id;
    const getInv = await getSpaceInvitationCodegen(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    console.log(getInv);

    console.log(getInv.error?.errors[0].message);

    const data = getInv?.data?.space?.community?.invitations;
   // console.log(invitationInfo);
    // Assert
    expect(invitationInfo?.lifecycle.state).toEqual('invited');
    expect(invitationInfo).toEqual(data);
  });

  test('should create space invitation, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    invitationData = await inviteExistingUserCodegen(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    console.log(invitationData?.data);
    const invitationInfo =
      invitationData?.data?.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo?.id;

    // Reject and Archive Space invitation
    await eventOnCommunityInvitationCodegen(invitationId, 'REJECT');
    await eventOnCommunityInvitationCodegen(invitationId, 'ARCHIVE');

    // Act
    // Creates invitation second time
    const invitationDataTwo = await inviteExistingUserCodegen(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    console.log(invitationDataTwo?.data);

    const invitationInfoTwo =
      invitationDataTwo?.data?.inviteExistingUserForCommunityMembership[0];
    const invitationIdTwo = invitationInfoTwo?.id ?? '';

    const userAppsData = await meQueryCodegen(TestUser.NON_HUB_MEMBER);
    console.log(userAppsData.data);
    const membershipData = userAppsData?.data?.me;

    // Assert
    expect(membershipData?.invitations).toHaveLength(1);
    await deleteInvitationCodegen(invitationIdTwo);
  });

  test('should remove invitation', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo.id;

    // Act
    const removeInv = await removeInvitation(invitationId);
    const getInv = await getInvitations(entitiesId.spaceId);

    // Assert
    expect(removeInv.body.data.deleteInvitation.id).toEqual(invitationId);
    expect(getInv.body.data.space.community.invitations).toHaveLength(0);
  });

  // Skipped until implemented
  test.skip('should throw error for quering not existing invitation', async () => {
    // Act
    const invId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getInv = await getInvitation(entitiesId.spaceId);

    // Assert
    expect(getInv.status).toBe(200);
    expect(getInv.text).toContain(
      `Invitation with ID ${invId} can not be found!`
    );
  });

  test('should throw error for creating the same invitation twice', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo.id;

    // Act
    const invitationDataTwo = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(invitationDataTwo.text).toContain(
      `An open invitation (ID: ${invitationId}) already exists for user ${users.nonSpaceMemberId} on Community: ${entitiesId.spaceCommunityId}.`
    );
  });
});

describe('Invitations-flows', () => {
  afterEach(async () => {
    await removeCommunityRoleFromUser(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
    await removeInvitation(invitationId);
  });

  test('invitee is able to ACCEPT invitation and access space data', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo.id;

    // Approve Space invitation
    await eventOnCommunityInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_HUB_MEMBER
    );
    await delay(1000);

    const spaceData = await getSpaceData(spaceNameId, TestUser.NON_HUB_MEMBER);

    // Assert
    expect(spaceData.body.data.space.authorization.myPrivileges).toEqual(
      readPrivilege
    );
  });

  test('invitee is able to REJECT and ARCHIVE invitation: no access to space data', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo.id;

    // Approve Space invitation
    await eventOnCommunityInvitation(
      invitationId,
      'REJECT',
      TestUser.NON_HUB_MEMBER
    );
    await delay(1000);
    await eventOnCommunityInvitation(
      invitationId,
      'ARCHIVE',
      TestUser.NON_HUB_MEMBER
    );
    await delay(1000);
    const spaceData = await getSpaceData(spaceNameId, TestUser.NON_HUB_MEMBER);

    // Assert
    expect(spaceData.body.data.space.authorization.myPrivileges).toEqual([]);
  });

  test('should throw error, when sending invitation to a member', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.nonSpaceMemberEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.nonSpaceMemberEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    // Act
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(invitationData.text).toContain(
      `User ${users.nonSpaceMemberNameId} is already a member of the Community: ${entitiesId.spaceCommunityId}.`
    );
  });

  test('should fail to send invitation, when user has active application', async () => {
    // Arrange
    const res = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );
    const applicationId = res?.data?.applyForCommunityMembership?.id ?? '';

    // Act
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(invitationData.text).toContain(
      `An open application (ID: ${applicationId}) already exists for user ${users.nonSpaceMemberId} on Community: ${entitiesId.spaceCommunityId}.`
    );
    await deleteApplicationCodegen(applicationId);
  });

  test('User with received inviation, cannot apply to the community', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership[0];
    invitationId = invitationInfo.id;

    // Act
    const res = await createApplicationCodegen(entitiesId.spaceCommunityId);
    const userAppsData = await meQueryCodegen(TestUser.NON_HUB_MEMBER);

    const membershipData = userAppsData?.data?.me;

    // Assert
    expect(membershipData?.invitations).toHaveLength(1);
    expect(res.error?.errors[0].message).toContain(
      `An open invitation (ID: ${invitationId}) already exists for user ${users.nonSpaceMemberId} on Community: ${entitiesId.spaceCommunityId}.`
    );
  });
});

describe('Invitations - Authorization', () => {
  const authErrorUpdateInvitationMessage =
    "Authorization: unable to grant 'update' privilege: event on invitation";
  const authErrorCreateInvitationMessage =
    "Authorization: unable to grant 'community-invite' privilege";
  const createInvitationMessage = 'inviteExistingUserForCommunityMembership';
  const accepted = 'accepted';
  const invited = 'invited';

  afterEach(async () => {
    await removeCommunityRoleFromUser(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
    await removeInvitation(invitationId);
  });
  describe('DDT rights to change invitation state', () => {
    // Arrange
    test.each`
      user                          | text
      ${TestUser.NON_HUB_MEMBER}    | ${accepted}
      ${TestUser.GLOBAL_ADMIN}      | ${invited}
      ${TestUser.GLOBAL_HUBS_ADMIN} | ${invited}
      ${TestUser.HUB_ADMIN}         | ${invited}
      ${TestUser.HUB_MEMBER}        | ${authErrorUpdateInvitationMessage}
      ${TestUser.QA_USER}           | ${authErrorUpdateInvitationMessage}
    `(
      'User: "$user", should get: "$text" to update invitation of another user',
      async ({ user, text }) => {
        invitationData = await inviteExistingUser(
          entitiesId.spaceCommunityId,
          [users.nonSpaceMemberId],
          TestUser.GLOBAL_ADMIN
        );
        const invitationInfo =
          invitationData.body.data.inviteExistingUserForCommunityMembership[0];
        invitationId = invitationInfo.id;

        const result = await eventOnCommunityInvitation(
          invitationId,
          'ACCEPT',
          user
        );

        // Assert
        expect(result.text).toContain(text);
      }
    );
  });

  describe('DDT users with rights to create invitation', () => {
    // Arrange
    test.each`
      user                               | text
      ${TestUser.GLOBAL_ADMIN}           | ${createInvitationMessage}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${createInvitationMessage}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${createInvitationMessage}
      ${TestUser.HUB_ADMIN}              | ${createInvitationMessage}
    `(
      'User: "$user", should get: "$text" to create invitation to another user',
      async ({ user, text }) => {
        invitationData = await inviteExistingUser(
          entitiesId.spaceCommunityId,
          [users.nonSpaceMemberId],
          user
        );
        console.log(invitationData.body);

        const invitationInfo =
          invitationData.body.data.inviteExistingUserForCommunityMembership[0];
        invitationId = invitationInfo.id;

        // Assert
        expect(invitationData.text).toContain(text);
      }
    );
  });

  describe('DDT users with NO rights to create invitation', () => {
    // Arrange
    test.each`
      user                       | text
      ${TestUser.HUB_MEMBER}     | ${authErrorCreateInvitationMessage}
      ${TestUser.QA_USER}        | ${authErrorCreateInvitationMessage}
      ${TestUser.NON_HUB_MEMBER} | ${authErrorCreateInvitationMessage}
    `(
      'User: "$user", should get: "$text" to create invitation to another user',
      async ({ user, text }) => {
        invitationData = await inviteExistingUser(
          entitiesId.spaceCommunityId,
          [users.nonSpaceMemberId],
          user
        );

        // Assert
        expect(invitationData.text).toContain(text);
      }
    );
  });
});
