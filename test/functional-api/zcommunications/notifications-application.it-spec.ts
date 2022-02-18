import '../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  removeEcoverse,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { createApplication } from '../user-management/application/application.request.params';

import {
  PreferenceType,
  changePreference,
} from '@test/utils/mutations/user-preferences-mutation';
import {
  assignChallengeAdmin,
  assignEcoverseAdmin,
  userAsChallengeAdminVariablesData,
  userAsEcoverseAdminVariablesData,
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

let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createEcoverse.id;
  entitiesId.hubCommunityId = responseEco.body.data.createEcoverse.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createEcoverse.community.communication.id;

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

  const reqNonEco = await getUser(users.nonEcoverseMemberEmail);
  users.nonEcoverseMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(users.hubAdminId, entitiesId.hubId)
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
      type: PreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubAdminId,
      type: PreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubAdminId,
      type: PreferenceType.APPLICATION_RECEIVED,
    },
    {
      userID: users.hubMemberId,
      type: PreferenceType.APPLICATION_SUBMITTED,
    },
    {
      userID: users.hubMemberId,
      type: PreferenceType.APPLICATION_RECEIVED,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeEcoverse(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    preferencesConfig.forEach(
      async config => await changePreference(config.userID, config.type, 'true')
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non hub user application to hub- GA, EA and Applicant', async () => {
    // Act
    let applicatioData = await createApplication(
      entitiesId.hubCommunityId,
      users.nonEcoverseMemberId
    );
    entitiesId.hubApplicationId = applicatioData.body.data.createApplication.id;

    await delay(3000);
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
          toAddresses: [users.nonEcoverseMemberEmail],
        }),
      ])
    );
  });

  test('receive notification for non hub user application to challenge- GA, EA, CA and Applicant', async () => {
    // Act
    await createApplication(
      entitiesId.challengeCommunityId,
      users.nonEcoverseMemberId
    );

    await delay(3000);
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
          toAddresses: [users.nonEcoverseMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(4);
  });

  test('no notification for non hub user application to hub- GA, EA and Applicant', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreference(config.userID, config.type, 'false')
    );

    await mutation(
      deleteUserApplication,
      deleteVariablesData(entitiesId.hubApplicationId)
    );

    // Act
    await createApplication(
      entitiesId.challengeCommunityId,
      users.nonEcoverseMemberId
    );

    await delay(1500);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
