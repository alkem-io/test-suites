/* eslint-disable @typescript-eslint/no-explicit-any */

import { ForumDiscussionCategory } from '@alkemio/client-lib';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import {
  createDiscussion,
  deleteDiscussion,
  getPlatformForumData,
  sendMessageToRoom,
} from '@functional-api/communications/communication.params';
import { sendMessageReplyToRoom } from '@functional-api/communications/replies/reply.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { notif } from '../notification.helpers';
const uniqueId = UniqueIDGenerator.getID();

// Notification settings objects using proper NotificationSettingInput shape
const forumDiscussionCreatedNotificationSettings = {
  notification: {
    platform: {
      forumDiscussionComment: notif(true),
      forumDiscussionCreated: notif(true),
      admin: {
        userProfileCreated: notif(false),
        userProfileRemoved: notif(false),
        spaceCreated: notif(false),
        userGlobalRoleChanged: notif(false),
      },
    },
    user: {
      commentReply: notif(true),
      mentioned: notif(false),
      messageReceived: notif(false),
      // copyOfMessageSent: notif(false), // not part of current schema; keep commented
      membership: {
        // spaceCommunityApplicationSubmitted: notif(false), // not in schema; removed
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const disabledForumDiscussionCreatedNotificationSettings = {
  notification: {
    platform: {
      forumDiscussionComment: notif(false),
      forumDiscussionCreated: notif(false),
      admin: {
        userProfileCreated: notif(false),
        userProfileRemoved: notif(false),
        spaceCreated: notif(false),
        userGlobalRoleChanged: notif(false),
      },
    },
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      // copyOfMessageSent: notif(false),
      membership: {
        // spaceCommunityApplicationSubmitted: notif(false),
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const forumDiscussionCommentNotificationSettings = {
  notification: {
    platform: {
      forumDiscussionComment: notif(true),
      forumDiscussionCreated: notif(false),
      admin: {
        userProfileCreated: notif(false),
        userProfileRemoved: notif(false),
        spaceCreated: notif(false),
        userGlobalRoleChanged: notif(false),
      },
    },
  },
};

const disabledForumDiscussionCommentNotificationSettings = {
  notification: {
    platform: {
      forumDiscussionComment: notif(false),
      forumDiscussionCreated: notif(false),
      admin: {
        userProfileCreated: notif(false),
        userProfileRemoved: notif(false),
        spaceCreated: notif(false),
        userGlobalRoleChanged: notif(false),
      },
    },
  },
};

const commentReplyNotificationSettings = {
  notification: {
    user: {
      commentReply: notif(true),
      mentioned: notif(false),
    },
  },
};

const disabledCommentReplyNotificationSettings = {
  notification: {
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
    },
  },
};

const enableForumDiscussionCreatedNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, forumDiscussionCreatedNotificationSettings)
    )
  );
};

const disableForumDiscussionCreatedNotifications = async (
  userIds: string[]
) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(
        userId,
        disabledForumDiscussionCreatedNotificationSettings
      )
    )
  );
};

const enableForumDiscussionCommentNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, forumDiscussionCommentNotificationSettings)
    )
  );
};

const disableForumDiscussionCommentNotifications = async (
  userIds: string[]
) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(
        userId,
        disabledForumDiscussionCommentNotificationSettings
      )
    )
  );
};

const enableCommentReplyNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, commentReplyNotificationSettings)
    )
  );
};

const disableCommentReplyNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledCommentReplyNotificationSettings)
    )
  );
};

const discussionName = 'test discussion' + uniqueId;

const forumDiscussionSubjectText = 'New discussion created: ' + discussionName;
const forumDiscussionCommentSubjectText =
  'New comment on discussion: ' + discussionName;
const forumDiscussionCommentReplySubjectText =
  'You have a new reply on your comment, have a look!';

let platformCommunicationId = '';
let discussionId = '';
let discussionCommentId = '';
let messageId = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'notifications-forum-discussion',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

  await deleteMailSlurperMails();
  const res = await getPlatformForumData();
  platformCommunicationId = res?.data?.platform.forum.id ?? '';
});

afterAll(async () => {
  // All cleanup is handled by helper functions in each test
});

describe('Notifications - forum discussions', () => {
  beforeAll(async () => {
    // Enable forum discussion created notifications for all relevant users
    await enableForumDiscussionCreatedNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);

    await disableForumDiscussionCreatedNotifications([
      TestUserManager.users.betaTester.id,
      TestUserManager.users.globalSupportAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.subsubspaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });

  test('GA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussion(platformCommunicationId, discussionName);
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.globalLicenseAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
  });

  test('QA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      discussionName,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.globalLicenseAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
  });
});

describe('Notifications - forum discussions comment', () => {
  beforeAll(async () => {
    // Disable forum discussion created notifications and enable comment notifications
    await disableForumDiscussionCreatedNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
    await enableForumDiscussionCommentNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });
  test('GA send comment to own forum discussion - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test('GA send comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });

  test('QA send comment to own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId, undefined, TestUser.QA_USER);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });

  test('QA send comment to forum discussion created by GA - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId, undefined, TestUser.QA_USER);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - forum discussions comments reply', () => {
  beforeAll(async () => {
    // Disable forum discussion created and comment notifications, enable reply notifications
    await disableForumDiscussionCreatedNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
    await disableForumDiscussionCommentNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
    await enableCommentReplyNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });
  test('GA reply to own comment of own forum discussion - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(discussionCommentId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await deleteMailSlurperMails();

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.GLOBAL_ADMIN
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentReplySubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test('GA reply to other comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;
    await deleteMailSlurperMails();

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.GLOBAL_ADMIN
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentReplySubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });

  test('QA reply to own comment of own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;
    await deleteMailSlurperMails();

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.QA_USER
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentReplySubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });

  test('QA reply to other comment to forum discussion created by GA - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(
      discussionCommentId,
      'test',
      TestUser.GLOBAL_ADMIN
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;
    await deleteMailSlurperMails();

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.QA_USER
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentReplySubjectText,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - no notifications triggered', () => {
  beforeAll(async () => {
    // Disable all forum-related notifications
    await disableForumDiscussionCreatedNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
    await disableForumDiscussionCommentNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
    await disableCommentReplyNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.qaUser.id,
      TestUserManager.users.globalLicenseAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });

  test('GA create forum discussion - no one get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('QA create forum discussion - no one get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      discussionName,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA send comment to own forum discussion - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA reply to won comment of forum discussion created by QA - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA send comment to own forum discussion - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(discussionCommentId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.GLOBAL_ADMIN
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA reply to comment of forum discussion created by QA - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      discussionName + uniqueId,
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoom(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.GLOBAL_ADMIN
    );

    await delay(1000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
