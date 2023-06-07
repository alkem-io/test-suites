/* eslint-disable prettier/prettier */
import '@test/utils/array.matcher';
import {
  createApplication,
  removeApplication,
} from '@test/functional-api/user-management/application/application.request.params';
import {
  getInvitation,
  getInvitations,
  inviteExistingUser,
  removeInvitation,
} from './invitation.request.params';
import {
  getHubData,
  removeHub,
} from '../../integration/hub/hub.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { mutation } from '@test/utils/graphql.request';
import { eventOnCommunityInvitation } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

import { createOrgAndHubWithUsers } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { TestUser, delay } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege } from '@test/non-functional/auth/my-privileges/common';
import {
  rolesUserQuery,
  rolesUserQueryVariablesData,
} from '@test/utils/queries/roles';

let invitationId = '';
let invitationData: any;
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const hubName = 'appl-eco-name' + uniqueId;
const hubNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Invitations', () => {
  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );

    await removeInvitation(invitationId);
  });
  test('should create invitation', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;

    invitationId = invitationInfo.id;
    const getInv = await getInvitation(entitiesId.hubId, TestUser.GLOBAL_ADMIN);

    // Assert
    expect(invitationInfo.lifecycle.state).toEqual('invited');
    expect(invitationInfo).toEqual(
      getInv.body.data.hub.community.invitations[0]
    );
  });

  test('should create hub invitation, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Reject and Archive Hub invitation
    await eventOnCommunityInvitation(invitationId, 'REJECT');
    await eventOnCommunityInvitation(invitationId, 'ARCHIVE');

    // Act
    // Creates invitation second time
    const invitationDataTwo = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfoTwo =
      invitationDataTwo.body.data.inviteExistingUserForCommunityMembership;
    const invitationIdTwo = invitationInfoTwo.id;
    // const getInv = await getInvitation(entitiesId.hubId, TestUser.GLOBAL_ADMIN);

    // Assert

    const userAppsData = await mutation(
      rolesUserQuery,
      rolesUserQueryVariablesData(users.nonHubMemberId)
    );

    const membershipData = userAppsData.body.data.rolesUser;

    // Assert
    expect(membershipData.invitations).toHaveLength(1);
    // expect(invitationInfoTwo.lifecycle.state).toEqual('invited');
    // expect(invitationInfoTwo).toEqual(
    //   getInv.body.data.hub.community.invitations[0]
    // );
    await removeInvitation(invitationIdTwo);
  });

  test('should remove invitation', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Act
    const removeInv = await removeInvitation(invitationId);
    const getInv = await getInvitations(entitiesId.hubId);

    // Assert
    expect(removeInv.body.data.deleteInvitation.id).toEqual(invitationId);
    expect(getInv.body.data.hub.community.invitations).toHaveLength(0);
  });

  // Skipped until implemented
  test.skip('should throw error for quering not existing invitation', async () => {
    // Act
    const invId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getInv = await getInvitation(entitiesId.hubId);

    // Assert
    expect(getInv.status).toBe(200);
    expect(getInv.text).toContain(
      `Invitation with ID ${invId} can not be found!`
    );
  });

  // Skipped, as for the moment is failing due to missing implementation: #2884
  test.skip('should throw error for creating the same invitation twice', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );

    const invitationDataTwo = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );

    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;

    invitationId = invitationInfo.id;

    // Assert
    expect(invitationDataTwo.text).toContain('error');
  });
});

describe('Invitations-flows', () => {
  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
    await removeInvitation(invitationId);
  });

  test('invitee is able to ACCEPT invitation and access hub data', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Approve Hub invitation
    await eventOnCommunityInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_HUB_MEMBER
    );
    await delay(1000);

    const hubData = await getHubData(hubNameId, TestUser.NON_HUB_MEMBER);

    // Assert
    expect(hubData.body.data.hub.authorization.myPrivileges).toEqual(
      readPrivilege
    );
  });

  test('invitee is able to REJECT and ARCHIVE invitation: no access to hub data', async () => {
    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Approve Hub invitation
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
    const hubData = await getHubData(hubNameId, TestUser.NON_HUB_MEMBER);

    // Assert
    expect(hubData.body.data.hub.authorization.myPrivileges).toEqual([]);
  });

  test('should throw error, when sending invitation to a member', async () => {
    // Arrange
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      )
    );

    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(invitationData.text).toContain(
      `User ${users.nonHubMemberNameId} is already a member of the Community: ${hubName}.`
    );
  });

  test('User application, should not receive invitation', async () => {
    // Arrange
    const res = await createApplication(entitiesId.hubCommunityId);
    const applicationId = res.body.data.applyForCommunityMembership.id;

    // Act
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(invitationData.text).toContain(
      `An application (ID: ${applicationId}) already exists for user non.hub@alkem.io on Community: ${hubName} that is not finalized.`
    );
    await removeApplication(applicationId);
  });

  test('User with received inviation, can apply to community', async () => {
    // Arrange
    invitationData = await inviteExistingUser(
      entitiesId.hubCommunityId,
      users.nonHubMemberId,
      TestUser.GLOBAL_ADMIN
    );
    const invitationInfo =
      invitationData.body.data.inviteExistingUserForCommunityMembership;
    invitationId = invitationInfo.id;

    // Act
    const res = await createApplication(entitiesId.hubCommunityId);
    const applicationId = res.body.data.applyForCommunityMembership.id;

    const userAppsData = await mutation(
      rolesUserQuery,
      rolesUserQueryVariablesData(users.nonHubMemberId)
    );

    const membershipData = userAppsData.body.data.rolesUser;

    // Assert
    expect(membershipData.applications).toHaveLength(1);
    expect(membershipData.invitations).toHaveLength(1);
    expect(res.text).toContain('applyForCommunityMembership');
    await removeApplication(applicationId);
  });
});

describe('Invitations - Authorization', () => {
  const authErrorUpdateInvitationMessage =
    'Authorization: unable to grant \'update\' privilege: event on invitation';
  const authErrorCreateInvitationMessage =
    'Authorization: unable to grant \'community-invite\' privilege';
  const authSuccessMessage = 'eventOnCommunityInvitation';
  const createInvitationMessage = 'inviteExistingUserForCommunityMembership';
  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
    await removeInvitation(invitationId);
  });
  describe('DDT rights to change invitation state', () => {
    // Arrange
    test.each`
      user                               | text
      ${TestUser.NON_HUB_MEMBER}         | ${authSuccessMessage}
      ${TestUser.GLOBAL_ADMIN}           | ${authSuccessMessage}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${authSuccessMessage}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${authErrorUpdateInvitationMessage}
      ${TestUser.HUB_ADMIN}              | ${authErrorUpdateInvitationMessage}
      ${TestUser.HUB_MEMBER}             | ${authErrorUpdateInvitationMessage}
      ${TestUser.QA_USER}                | ${authErrorUpdateInvitationMessage}
    `(
      'User: "$user", should get: "$text" to update invitation of another user',
      async ({ user, text }) => {
        invitationData = await inviteExistingUser(
          entitiesId.hubCommunityId,
          users.nonHubMemberId,
          TestUser.GLOBAL_ADMIN
        );
        const invitationInfo =
          invitationData.body.data.inviteExistingUserForCommunityMembership;
        invitationId = invitationInfo.id;

        const result = await eventOnCommunityInvitation(
          invitationId,
          'ACCEPT',
          user
        );
        await delay(1000);

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
          entitiesId.hubCommunityId,
          users.nonHubMemberId,
          user
        );
        const invitationInfo =
          invitationData.body.data.inviteExistingUserForCommunityMembership;
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
          entitiesId.hubCommunityId,
          users.nonHubMemberId,
          user
        );

        // Assert
        expect(invitationData.text).toContain(text);
      }
    );
  });
});
