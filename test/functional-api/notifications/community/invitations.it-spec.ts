import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  deleteSpace,
  updateSpaceSettings,
} from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  deleteInvitation,
  inviteContributors,
} from '@test/functional-api/roleset/invitations/invitation.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { changePreferenceUser } from '@test/utils/mutations/preferences-mutation';

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

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateSpaceSettings(entitiesId.spaceId, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });

  await createChallengeWithUsers(challengeName);

  await updateSpaceSettings(entitiesId.challenge.id, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });
  await createOpportunityWithUsers(opportunityName);

  preferencesConfig = [
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationCommunityInvitationUser,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Notifications - invitations', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    await changePreferenceUser(
      users.globalAdmin.id,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  afterEach(async () => {
    await deleteInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('non space user receive invitation for SPACE community from space admin', async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.space.roleSetId,
      [users.nonSpaceMember.id],
      TestUser.HUB_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${ecoName}`,
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for SPACE community from challenge admin', async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.space.roleSetId,
      [users.qaUser.id],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${ecoName}`,
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for CHALLENGE community from challenge admin', async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.challenge.roleSetId,
      [users.qaUser.id],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${challengeName}`,
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test("non space user don't receive invitation for CHALLENGE community from opportunity admin", async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.challenge.roleSetId,
      [users.qaUser.id],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
    expect(invitationData.error?.errors[0].message).toEqual(
      `Contributor is not a member of the parent community (${entitiesId.space.roleSetId}) and the current user does not have the privilege to invite to the parent community`
    );
  });

  test('space member receive invitation for CHALLENGE community from opportunity admin', async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.challenge.roleSetId,
      [users.spaceMember.id],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${challengeName}`,
          toAddresses: [users.spaceMember.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for OPPORTUNITY community from opportunity admin', async () => {
    // Act
    const invitationData = await inviteContributors(
      entitiesId.opportunity.roleSetId,
      [users.qaUser.id],
      TestUser.OPPORTUNITY_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${opportunityName}`,
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });
  test("non space user doesn't receive invitation for SPACE community from space admin", async () => {
    // Arrange
    await changePreferenceUser(
      users.nonSpaceMember.id,
      UserPreferenceType.NotificationCommunityInvitationUser,
      'false'
    );

    // Act
    const invitationData = await inviteContributors(
      entitiesId.space.roleSetId,
      [users.nonSpaceMember.id],
      TestUser.HUB_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test("non space user doesn't receive invitation for CHALLENGE community from challenge admin, flag disabled", async () => {
    // Arrange
    await updateSpaceSettings(entitiesId.challenge.id, {
      membership: {
        allowSubspaceAdminsToInviteMembers: false,
      },
    });

    // Act
    const invitationData = await inviteContributors(
      entitiesId.challenge.roleSetId,
      [users.qaUser.displayName],
      TestUser.CHALLENGE_ADMIN
    );
    const invitationsInfo =
      invitationData?.data?.inviteContributorsForRoleSetMembership;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsInfo && invitationsInfo.length > 0) {
      invitationId = invitationsInfo[0].id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
