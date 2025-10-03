/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { notif } from '../../notification.helpers';

// Helper functions for community update notification settings
const communityUpdatesNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(true),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(true),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
  },
};

const disabledCommunityUpdatesNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
  },
};

const enableCommunityUpdatesNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, communityUpdatesNotificationSettings)
    )
  );
};

const disableCommunityUpdatesNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledCommunityUpdatesNotificationSettings)
    )
  );
};

const templatedAsMemberResult = async (
  entityName: string,
  userEmail: string
) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${entityName} - New update, have a look!`,
      toAddresses: [userEmail],
    }),
  ]);
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-updates',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
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
    subspace: {
      collaboration: {
        addPostCallout: false,
        addPostCollectionCallout: false,
        addWhiteboardCallout: false,
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: {
          addPostCallout: false,
          addPostCollectionCallout: false,
          addWhiteboardCallout: false,
          addTutorialCallouts: false,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// Skip tests due to bug: #193
describe('Notifications - updates', () => {
  beforeAll(async () => {
    // Disable community updates notifications for global support admin
    await disableCommunityUpdatesNotifications([
      TestUserManager.users.globalSupportAdmin.id,
    ]);

    // Enable community updates notifications for all relevant users
    await enableCommunityUpdatesNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.space.communication.updatesId,
      'GA space update '
    );

    await delay(1000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(6);
    // expect(mails[0]).toEqual(
    //   await templatedAsMemberResult(
    //     baseScenario.space.about.profile.displayName,
    //     TestUserManager.users.globalAdmin.email
    //   )
    // );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.space.communication.updatesId,
      'EA space update ',
      TestUser.SPACE_ADMIN
    );

    // Assert
    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(6);

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.globalAdmin.email
      )
    );
    // expect(mails[0]).toEqual(
    //   await templatedAsMemberResult(
    //     baseScenario.space.about.profile.displayName,
    //     TestUserManager.users.spaceAdmin.email
    //   )
    // );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.space.about.profile.displayName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('CA create subspace update - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subspace.communication.updatesId,
      'CA subspace update ',
      TestUser.SUBSPACE_ADMIN
    );

    // Assert
    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(4);
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.spaceMember.email
      )
    );

    // expect(mails[0]).toEqual(
    //   await templatedAsMemberResult(
    //     baseScenario.subspace.about.profile.displayName,
    //     TestUserManager.users.subspaceAdmin.email
    //   )
    // );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subspace.about.profile.displayName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.communication.updatesId,
      'OA subsubspace update ',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(2);

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.subspaceMember.email
      )
    );

    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        baseScenario.subsubspace.about.profile.displayName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace update - 0 notifications - all roles with notifications disabled', async () => {
    // Disable community updates notifications for all users
    await disableCommunityUpdatesNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
    ]);

    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.communication.updatesId,
      'OA subsubspace update 2',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
