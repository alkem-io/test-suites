import {
  changePreferenceSpaceCodegen,
  changePreferenceChallengeCodegen,
  changePreferenceUserCodegen,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/zcommunications/communications-helper';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import {
  ChallengePreferenceType,
  CommunityRole,
  SpacePreferenceType,
  UserPreferenceType,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  assignCommunityRoleToUserCodegen,
  joinCommunityCodegen,
  removeCommunityRoleFromUserCodegen,
} from '@test/functional-api/integration/community/community.request.params';

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
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
  ];
});

afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

// Skip until clear the behavior
describe('Notifications - member join community', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCommunityNewMemberAdmin,
      'false'
    );
    for (const config of preferencesConfig) {
      console.log(
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
      );
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('Non-space member join a Space - GA, HA and Joiner receive notifications', async () => {
    // Act
    const a = await joinCommunityCodegen(
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );
    console.log(a.data);
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
    await joinCommunityCodegen(
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

  test.only('Admin adds user to Space community - GA, HA and Joiner receive notifications', async () => {
    // Act

    const a = await assignCommunityRoleToUserCodegen(
      users.qaUserId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member,
      TestUser.GLOBAL_ADMIN
    );
    console.log(a.error);
    console.log(a.data);

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
          toAddresses: [users.qaUserId],
        }),
      ])
    );
  });

  test('no notification when Non-space member cannot join a Space - GA, EA and Joiner', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );

    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    // Act
    await joinCommunityCodegen(entitiesId.spaceCommunityId, TestUser.QA_USER);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
