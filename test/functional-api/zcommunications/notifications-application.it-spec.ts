import '../../utils/array.matcher';
import { removeHub } from '../integration/hub/hub.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { createApplication } from '../user-management/application/application.request.params';

import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import {
  delay,
  entitiesId,
  getMailsData,
  users,
} from './communications-helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from './create-entities-with-users-helper';

let organizationName = 'not-app-org-name' + uniqueId;
let hostNameId = 'not-app-org-nameid' + uniqueId;
let hubName = 'not-app-eco-name' + uniqueId;
let hubNameId = 'not-app-eco-nameid' + uniqueId;

let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
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
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non hub user application to hub- GA, EA and Applicant', async () => {
    // Act
    let applicatioData = await createApplication(entitiesId.hubCommunityId);

    entitiesId.hubApplicationId =
      applicatioData.body.data.applyForCommunityMembership.id;

    await delay(6000);

    let getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Application from non hub to ${ecoName} received!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `Application from non hub to ${ecoName} received!`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `Your application to ${ecoName} was received!`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('receive notification for non hub user application to challenge- GA, EA, CA and Applicant', async () => {
    // Arrange
    await mutation(
      assignUserToCommunity,
      assignUserToCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      )
    );

    // Act
    await createApplication(entitiesId.challengeCommunityId);

    await delay(5000);
    let getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Application from non hub to ${challengeName} received!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `Application from non hub to ${challengeName} received!`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `Application from non hub to ${challengeName} received!`,
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: `Your application to ${challengeName} was received!`,
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
