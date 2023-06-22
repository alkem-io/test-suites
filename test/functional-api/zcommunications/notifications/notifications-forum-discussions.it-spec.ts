import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { getMailsData } from '../communications-helper';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  getPlatformCommunicationId,
  createDiscussion,
  deleteDiscussion,
  postDiscussionComment,
} from '../communications.request.params';
import { DiscussionCategory } from '@test/utils/mutations/communications-mutation';
import { TestUser } from '@test/utils';
import { replyMessage } from '../reply/reply.request.params';

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

beforeAll(async () => {
  await deleteMailSlurperMails();
  const res = await getPlatformCommunicationId();
  platformCommunicationId = res.body.data.platform.communication.id;

  preferencesConfigDiscussions = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.FORUM_DISCUSSION_CREATED,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.FORUM_DISCUSSION_CREATED,
    },
    {
      userID: users.globalSpacesAdminId,
      type: UserPreferenceType.FORUM_DISCUSSION_CREATED,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.FORUM_DISCUSSION_CREATED,
    },
  ];

  preferencesConfigComments = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.FORUM_DISCUSSION_COMMENT,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.FORUM_DISCUSSION_COMMENT,
    },
    {
      userID: users.globalSpacesAdminId,
      type: UserPreferenceType.FORUM_DISCUSSION_COMMENT,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.FORUM_DISCUSSION_COMMENT,
    },
  ];

  preferencesConfigCommentsReply = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.COMMENT_REPLY,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.COMMENT_REPLY,
    },
    {
      userID: users.globalSpacesAdminId,
      type: UserPreferenceType.COMMENT_REPLY,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.COMMENT_REPLY,
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
    discussionId = res.body.data.createDiscussion.id;

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalSpacesAdminEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
  });

  test('QA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = res.body.data.createDiscussion.id;

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalSpacesAdminEmail],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.globalAdminEmail],
        }),
      ])
    );
  });

  test('GA send comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });

  test('QA send comment to own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(
      discussionCommentId,
      undefined,
      TestUser.QA_USER
    );

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.qaUserEmail],
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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(
      discussionCommentId,
      undefined,
      TestUser.QA_USER
    );

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.globalAdminEmail],
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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(discussionCommentId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
          toAddresses: [users.globalAdminEmail],
        }),
      ])
    );
  });

  test('GA reply to other comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });

  test('QA reply to own comment of own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussion(
      platformCommunicationId,
      'test discussion',
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
          toAddresses: [users.qaUserEmail],
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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(
      discussionCommentId,
      'test',
      TestUser.GLOBAL_ADMIN
    );
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
          toAddresses: [users.globalAdminEmail],
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
    discussionId = res.body.data.createDiscussion.id;

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
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = res.body.data.createDiscussion.id;

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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(discussionCommentId);

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
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    await postDiscussionComment(discussionCommentId);

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
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(discussionCommentId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
      DiscussionCategory.PLATFORM_FUNCTIONALITIES,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes.body.data.createDiscussion.id;
    discussionCommentId =
      createDiscussionRes.body.data.createDiscussion.comments.id;

    const res = await postDiscussionComment(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;

    await replyMessage(
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
