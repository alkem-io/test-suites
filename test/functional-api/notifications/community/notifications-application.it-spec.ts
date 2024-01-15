import { mutation } from '@test/utils/graphql.request';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/zcommunications/communications-helper';
import { deleteChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/integration/community/community.request.params';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { CommunityRole, UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
  ];
});

afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non space user application to space- GA, EA and Applicant', async () => {
    // Act
    const applicatioData = await createApplicationCodegen(
      entitiesId.spaceCommunityId
    );

    entitiesId.spaceApplicationId =
      applicatioData?.data?.applyForCommunityMembership?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `${ecoName}: Application from non`,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: `${ecoName}: Application from non`,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Your Application to join was received!`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('receive notification for non space user application to challenge- GA, EA, CA and Applicant', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.nonSpaceMemberEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    // Act
    await createApplicationCodegen(entitiesId.challengeCommunityId);

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `${challengeName}: Application from non`,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: `${challengeName}: Application from non`,
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Your Application to join was received!`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(3);
  });

  test('no notification for non space user application to space- GA, EA and Applicant', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    await mutation(
      deleteUserApplication,
      deleteVariablesData(entitiesId.spaceApplicationId)
    );

    // Act
    await createApplicationCodegen(entitiesId.challengeCommunityId);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
