/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import {
  joinRoleSet,
  assignRoleToUser,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { getUserData } from '@functional-api/contributor-management/user/user.request.params';
import {
  CommunityMembershipPolicy,
  PreferenceType,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let preferencesConfig: any[] = [];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-join-community',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
      membership: {
        policy: CommunityMembershipPolicy.Open,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        membership: {
          policy: CommunityMembershipPolicy.Open,
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  preferencesConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationCommunityNewMember,
    },
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - member join community', () => {
  beforeAll(async () => {
    const notificationsUserId = await getUserData('notifications@alkem.io');
    const notificationsAdminUserId = notificationsUserId?.data?.user?.id ?? '';
    await changePreferenceUser(
      notificationsAdminUserId,
      PreferenceType.NotificationCommunityNewMemberAdmin,
      'false'
    );
    for (const config of preferencesConfig) {
      await changePreferenceUser(config.userID, config.type, 'true');
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  //ToBeReviewd
  test.skip('Non-space member join a Space - GA, HA and Joiner receive notifications', async () => {
    // Act
    await joinRoleSet(
      baseScenario.space.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    await delay(10000);

    const getEmailsData = await getMailsData();
    const subjectAdminSpaceNon = `user &#34;non space&#34; joined ${baseScenario.space.about.profile.displayName}`;
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSpaceNon,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminSpaceNon,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${baseScenario.space.about.profile.displayName} - Welcome to the Community!`,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Non-space member join a Subspace - GA, HA, CA and Joiner receive notifications', async () => {
    // Act
    await joinRoleSet(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );

    await delay(10000);
    const getEmailsData = await getMailsData();

    const subjectAdminSubspace = `user &#34;non space&#34; joined ${baseScenario.subspace.about.profile.displayName}`;

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSubspace,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminSubspace,
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${baseScenario.subspace.about.profile.displayName} - Welcome to the Community!`,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Admin adds user to Space community - GA, HA and Joiner receive notifications', async () => {
    // Act
    await assignRoleToUser(
      TestUserManager.users.qaUser.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member,
      TestUser.GLOBAL_ADMIN
    );

    await delay(10000);

    const subjectAdminSpace = `user &#34;qa user&#34; joined ${baseScenario.space.about.profile.displayName}`;

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${baseScenario.space.about.profile.displayName} - Welcome to the Community!`,
          toAddresses: [TestUserManager.users.qaUser.email],
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

    await removeRoleFromUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    );

    await removeRoleFromUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    // Act
    await joinRoleSet(baseScenario.space.community.roleSetId, TestUser.QA_USER);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
