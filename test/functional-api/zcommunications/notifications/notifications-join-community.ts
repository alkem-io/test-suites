import { mutation } from '@test/utils/graphql.request';
import {
  deleteUserApplication,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import {
  UserPreferenceType,
  changePreferenceUser,
  changePreferenceHub,
  HubPreferenceType,
  changePreferenceChallenge,
  ChallengePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import {
  createApplication,
  joinCommunity,
} from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import {
  removeUserFromCommunity,
  removeUserFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';

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
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );

  await createChallengeWithUsers(challengeName);
  const updateOrganizationPref = await changePreferenceChallenge(
    entitiesId.challengeId,
    ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
    'false'
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
  ];
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe.skip('Notifications - member join community', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('Non-hub member join a Hub - GA, HA and Joiner', async () => {
    // Act
    await joinCommunity(entitiesId.hubCommunityId, TestUser.NON_HUB_MEMBER);

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Join from non hub to ${ecoName} received!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `Join from non hub to ${ecoName} received!`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `You joined ${ecoName} hub!`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('Non-hub member join a Challenge - GA, EA, CA and Joiner', async () => {
    // Act
    await joinCommunity(entitiesId.hubCommunityId, TestUser.NON_HUB_MEMBER);

    await delay(5000);
    const getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Join from non hub to ${challengeName} received!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `Join from non hub to ${challengeName} received!`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `Join from non hub to ${challengeName} received!`,
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: `You joined ${challengeName} community!`,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(4);
  });

  test('no notification when Non-hub member cannot join a Hub - GA, EA and Joiner', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    await mutation(
      removeUserFromCommunity,
      removeUserFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.nonHubMemberId
      )
    );

    await mutation(
      removeUserFromCommunity,
      removeUserFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );

    // Act
    await joinCommunity(entitiesId.hubCommunityId, TestUser.NON_HUB_MEMBER);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
