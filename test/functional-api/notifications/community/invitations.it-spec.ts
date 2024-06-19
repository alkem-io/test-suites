import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  inviteContributorsCodegen,
  deleteInvitationCodegen,
} from '@test/functional-api/user-management/invitations/invitation.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;
const opportunityName = 'opportunity-name';
const challengeName = 'challlenge-name';
const ecoName = spaceName;

let invitationId = '';
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });

  await createChallengeWithUsersCodegen(challengeName);

  await updateSpaceSettingsCodegen(entitiesId.challengeId, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });
  await createOpportunityWithUsersCodegen(opportunityName);

  preferencesConfig = [
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - invitations', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  afterEach(async () => {
    await deleteInvitationCodegen(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('non space user receive invitation for SPACE community from space admin', async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.HUB_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${ecoName}`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('non space user receive invitation for SPACE community from challenge admin', async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.spaceCommunityId,
      [users.qaUserId],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${ecoName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });

  test('non space user receive invitation for CHALLENGE community from challenge admin', async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.challengeCommunityId,
      [users.qaUserId],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${challengeName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });

  test("non space user don't receive invitation for CHALLENGE community from opportunity admin", async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.challengeCommunityId,
      [users.qaUserId],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
    expect(invitationData.error?.errors[0].message).toEqual(
      `User is not a member of the parent community (${entitiesId.spaceCommunityId}) and the current user does not have the privilege to invite to the parent community`
    );
  });

  test('space member receive invitation for CHALLENGE community from opportunity admin', async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.challengeCommunityId,
      [users.spaceMemberId],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${challengeName}`,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
  });

  test('non space user receive invitation for OPPORTUNITY community from opportunity admin', async () => {
    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.opportunityCommunityId,
      [users.qaUserId],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${opportunityName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });
  test("non space user doesn't receive invitation for SPACE community from space admin", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.nonSpaceMemberId,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );

    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.spaceCommunityId,
      [users.nonSpaceMemberId],
      TestUser.HUB_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test("non space user doesn't receive invitation for CHALLENGE community from challenge admin, flag disabled", async () => {
    // Arrange
    await updateSpaceSettingsCodegen(entitiesId.challengeId, {
      membership: {
        allowSubspaceAdminsToInviteMembers: false,
      },
    });

    // Act
    const invitationData = await inviteContributorsCodegen(
      entitiesId.challengeCommunityId,
      [users.qaUserDisplayName],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationInfo =
      invitationData?.data?.inviteContributorsForCommunityMembership[0];
    invitationId = invitationInfo?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
