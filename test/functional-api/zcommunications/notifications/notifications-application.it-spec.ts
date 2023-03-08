import { mutation } from '@test/utils/graphql.request';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const hubName = 'not-app-eco-name' + uniqueId;
const hubNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = hubName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.APPLICATION_SUBMITTED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.APPLICATION_RECEIVED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.APPLICATION_SUBMITTED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.APPLICATION_RECEIVED,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non hub user application to hub- GA, EA and Applicant', async () => {
    // Act
    const applicatioData = await createApplication(entitiesId.hubCommunityId);

    entitiesId.hubApplicationId =
      applicatioData.body.data.applyForCommunityMembership.id;

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[${ecoName}] Application from non`,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: `[${ecoName}] Application from non`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Your Application to join was received!`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('receive notification for non hub user application to challenge- GA, EA, CA and Applicant', async () => {
    // Arrange
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      )
    );

    // Act
    await createApplication(entitiesId.challengeCommunityId);

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[${challengeName}] Application from non`,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: `[${challengeName}] Application from non`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `[${challengeName}] Application from non`,
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Your Application to join was received!`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(4);
  });

  test('no notification for non hub user application to hub- GA, EA and Applicant', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    await mutation(
      deleteUserApplication,
      deleteVariablesData(entitiesId.hubApplicationId)
    );

    // Act
    await createApplication(entitiesId.challengeCommunityId);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
