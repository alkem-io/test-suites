import '../../utils/array.matcher';
import {
  createTestHub,
  removeHub,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { createApplication } from '../user-management/application/application.request.params';

import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import {
  assignChallengeAdmin,
  assignHubAdmin,
  userAsChallengeAdminVariablesData,
  userAsHubAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
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

let organizationName = 'not-app-org-name' + uniqueId;
let hostNameId = 'not-app-org-nameid' + uniqueId;
let hubName = 'not-app-eco-name' + uniqueId;
let hubNameId = 'not-app-eco-nameid' + uniqueId;

let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestHub(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createHub.id;
  entitiesId.hubCommunityId = responseEco.body.data.createHub.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createHub.community.communication.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.hubId
    )
  );
  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignHubAdmin,
    userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(users.hubMemberId, entitiesId.challengeId)
  );

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
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
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
