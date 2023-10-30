import { mutation } from '@test/utils/graphql.request';
import {
  UserPreferenceType,
  changePreferenceUser,
  changePreferenceSpaceCodegen,
  changePreferenceChallengeCodegen,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import {
  ChallengePreferenceType,
  SpacePreferenceType,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

const subjectAdminSpace = `non space joined ${ecoName}`;
const subjectAdminChallenge = `non space joined ${challengeName}`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromAnyone,
    'true'
  );

  await createChallengeWithUsersCodegen(challengeName);
  await changePreferenceChallengeCodegen(
    entitiesId.challengeId,
    ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    'true'
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.USER_JOIN_COMMUNITY,
    },
  ];
});

afterAll(async () => {
  await removeChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

// Skip until clear the behavior
describe('Notifications - member join community', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.USER_JOIN_COMMUNITY_ADMIN,
      'false'
    );
    for (const config of preferencesConfig) {
      await changePreferenceUser(config.userID, config.type, 'true');
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('Non-space member join a Space - GA, HA and Joiner receive notifications', async () => {
    // Act
    await joinCommunity(entitiesId.spaceCommunityId, TestUser.NON_HUB_MEMBER);

    await delay(10000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Welcome to the Community!`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('Non-space member join a Challenge - GA, HA, CA and Joiner receive notifications', async () => {
    // Act
    await joinCommunity(
      entitiesId.challengeCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    await delay(10000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminChallenge,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: subjectAdminChallenge,
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Welcome to the Community!`,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('no notification when Non-space member cannot join a Space - GA, EA and Joiner', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.nonSpaceMemberId
      )
    );

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberId
      )
    );

    // Act
    await joinCommunity(entitiesId.spaceCommunityId, TestUser.QA_USER);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
