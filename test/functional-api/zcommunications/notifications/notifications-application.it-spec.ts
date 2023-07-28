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
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  assignCommunityRoleToUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.spaceMemberId,
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
  await removeSpace(entitiesId.spaceId);
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

  test('receive notification for non space user application to space- GA, EA and Applicant', async () => {
    // Act
    const applicatioData = await createApplication(entitiesId.spaceCommunityId);

    entitiesId.spaceApplicationId =
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
    await assignCommunityRoleToUser(
      users.nonSpaceMemberEmail,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
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
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: `[${challengeName}] Application from non`,
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Your Application to join was received!`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(4);
  });

  test('no notification for non space user application to space- GA, EA and Applicant', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    await mutation(
      deleteUserApplication,
      deleteVariablesData(entitiesId.spaceApplicationId)
    );

    // Act
    await createApplication(entitiesId.challengeCommunityId);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
