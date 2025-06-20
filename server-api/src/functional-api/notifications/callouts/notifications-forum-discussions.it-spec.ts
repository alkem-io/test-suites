/* eslint-disable @typescript-eslint/no-explicit-any */

import { PreferenceType, ForumDiscussionCategory } from '@alkemio/client-lib';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import {
  createDiscussion,
  deleteDiscussion,
  getPlatformForumData,
  sendMessageToRoom,
} from '@functional-api/communications/communication.params';
import { sendMessageReplyToRoom } from '@functional-api/communications/replies/reply.request.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';

let preferencesConfigDiscussions: any[] = [];
let preferencesConfigComments: any[] = [];
let preferencesConfigCommentsReply: any[] = [];

const forumDiscussionSubjectText = 'New discussion created: test discussion';
const forumDiscussionCommentSubjectText =
  'New comment on discussion: test discussion';
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

  preferencesConfigDiscussions = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.globalLicenseAdmin.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
  ];

  preferencesConfigComments = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: TestUserManager.users.globalLicenseAdmin.id,
      type: PreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationForumDiscussionComment,
    },
  ];

  preferencesConfigCommentsReply = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommentReply,
    },
    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationCommentReply,
    },
    {
      userID: TestUserManager.users.globalLicenseAdmin.id,
      type: PreferenceType.NotificationCommentReply,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCommentReply,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfigDiscussions)
    await changePreferenceUser(config.userID, config.type, 'false');
  for (const config of preferencesConfigComments)
    await changePreferenceUser(config.userID, config.type, 'false');
});

describe('Notifications - forum discussions', () => {
  beforeAll(async () => {
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });

  test('GA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(3000);
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
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(3000);
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
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUser(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUser(config.userID, config.type, 'true');
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
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(3000);
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
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(3000);
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
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId, undefined, TestUser.QA_USER);

    await delay(3000);
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
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId, undefined, TestUser.QA_USER);

    await delay(3000);
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
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUser(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUser(config.userID, config.type, 'false');
    for (const config of preferencesConfigCommentsReply)
      await changePreferenceUser(config.userID, config.type, 'true');
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
      'test discussion'
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

    await delay(3000);
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
      'test discussion',
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

    await delay(3000);
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
      'test discussion',
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
      TestUser.QA_USER
    );

    await delay(3000);
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
      'test discussion'
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

    await sendMessageReplyToRoom(
      messageId,
      discussionCommentId,
      'test reply',
      TestUser.QA_USER
    );

    await delay(3000);
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
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUser(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUser(config.userID, config.type, 'false');
    for (const config of preferencesConfigCommentsReply)
      await changePreferenceUser(config.userID, config.type, 'false');
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
      'test discussion'
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('QA create forum discussion - no one get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = res?.data?.createDiscussion.id ?? '';

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA send comment to own forum discussion - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA reply to won comment of forum discussion created by QA - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoom(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA send comment to own forum discussion - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion'
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

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA reply to comment of forum discussion created by QA - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
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

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
