/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { notif } from '../../notification.helpers';

// Notification settings for discussion comment events
const discussionCommentNotificationSettings = {
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
      collaborationCalloutComment: notif(true),
    },
    user: {
      commentReply: notif(true),
      mentioned: notif(false),
      messageReceived: notif(true),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const disabledDiscussionCommentNotificationSettings = {
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
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

// Helper function to enable discussion comment notifications for specific users
const enableDiscussionCommentNotifications = async (userIds: string[]) => {
  const a = await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, discussionCommentNotificationSettings)
    )
  );
  console.log(a);
};

// Helper function to disable discussion comment notifications for specific users
const disableDiscussionCommentNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledDiscussionCommentNotificationSettings)
    )
  );
};

let discussionCommentUsersConfig: string[] = [];

const expectedDataSpace = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${baseScenario.space.about.profile.displayName} - New comment received on your Post \u0026#34;discussion-comments-notification - post\u0026#34; by admin, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataSpace2 = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${baseScenario.space.about.profile.displayName} - New comment received on your Post \u0026#34;discussion-comments-notification - post\u0026#34; by space, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataChal = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${baseScenario.subspace.about.profile.displayName} - New comment received on your Post &#34;l1-discussion-comments-notification - post&#34; by space, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataOpp = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${baseScenario.subsubspace.about.profile.displayName} - New comment received on your Post &#34;l2-discussion-comments-notification - post&#34; by subsubspace, have a look!`,
      toAddresses,
    }),
  ]);
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'discussion-comments-notification',
  space: {
    collaboration: {
      addPostCallout: true,
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
        addPostCallout: true,
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
          addPostCallout: true,
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

  discussionCommentUsersConfig = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.spaceAdmin.id,
    TestUserManager.users.spaceMember.id,
    TestUserManager.users.subspaceMember.id,
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.subsubspaceMember.id,
    TestUserManager.users.subsubspaceAdmin.id,
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-0600 */
describe('Notifications - callout comments', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await enableDiscussionCommentNotifications(discussionCommentUsersConfig);
  });

  test('GA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'comment on discussion callout',
      TestUser.GLOBAL_ADMIN
    );
    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(6);

    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.spaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.subspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.subspaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.subsubspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([TestUserManager.users.subsubspaceMember.email])
    );
  });

  test('HA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'comment on discussion callout',
      TestUser.SPACE_ADMIN
    );

    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(6);
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.globalAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.subspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.subspaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.subsubspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace2([TestUserManager.users.subsubspaceMember.email])
    );
  });

  test('HA create subspace callout comment - HM(5),  get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subspace.collaboration.calloutPostCommentsId,
      'comment on discussion callout',
      TestUser.SPACE_ADMIN
    );

    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await expectedDataChal([TestUserManager.users.globalAdmin.email])
    );
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataChal([TestUserManager.users.spaceAdmin.email])
    );
    // Space member does not reacive email

    expect(mails[0]).not.toEqual(
      await expectedDataChal([TestUserManager.users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([TestUserManager.users.subspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([TestUserManager.users.subspaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([TestUserManager.users.subsubspaceAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([TestUserManager.users.subsubspaceMember.email])
    );
  });

  test('OM create subsubspace callout comment - HM(3), get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.collaboration.calloutPostCommentsId,
      'comment on discussion callout',
      TestUser.SUBSUBSPACE_MEMBER
    );

    await delay(1000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(2);
    expect(mails[0]).toEqual(
      await expectedDataOpp([TestUserManager.users.globalAdmin.email])
    );
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([TestUserManager.users.spaceAdmin.email])
    );
    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([TestUserManager.users.spaceMember.email])
    );
    // Subspace admin does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([TestUserManager.users.subspaceAdmin.email])
    );
    // Subspace member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([TestUserManager.users.subspaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataOpp([TestUserManager.users.subsubspaceAdmin.email])
    );
  });

  test('OA create subsubspace callout comment - 0 notifications - all roles with notifications disabled', async () => {
    await disableDiscussionCommentNotifications(discussionCommentUsersConfig);

    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.collaboration.calloutPostCommentsId,
      'comment on discussion callout',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
