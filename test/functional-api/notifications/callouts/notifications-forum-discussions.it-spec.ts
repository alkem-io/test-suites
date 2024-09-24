import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import { TestUser } from '@test/utils';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createDiscussionCodegen,
  deleteDiscussionCodegen,
  getPlatformForumDataCodegen,
  sendMessageToRoomCodegen,
} from '@test/functional-api/communications/communication.params';
import { sendMessageReplyToRoomCodegen } from '@test/functional-api/communications/replies/reply.request.params';
import { ForumDiscussionCategory } from '@test/generated/alkemio-schema';
import { getMailsData } from '@test/types/entities-helper';

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
  const res = await getPlatformForumDataCodegen();
  platformCommunicationId = res?.data?.platform.forum.id ?? '';

  preferencesConfigDiscussions = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.globalSpacesAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
  ];

  preferencesConfigComments = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: users.globalSpacesAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionComment,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationForumDiscussionComment,
    },
  ];

  preferencesConfigCommentsReply = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommentReply,
    },
    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationCommentReply,
    },
    {
      userID: users.globalSpacesAdmin.id,
      type: UserPreferenceType.NotificationCommentReply,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCommentReply,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfigDiscussions)
    await changePreferenceUserCodegen(config.userID, config.type, 'false');
  for (const config of preferencesConfigComments)
    await changePreferenceUserCodegen(config.userID, config.type, 'false');
});

describe('Notifications - forum discussions', () => {
  beforeAll(async () => {
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussionCodegen(discussionId);
  });

  test('GA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
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
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalSpacesAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
        }),
      ])
    );
  });

  test('QA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
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
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.globalSpacesAdmin.email],
        }),
        expect.objectContaining({
          subject: forumDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
        }),
      ])
    );
  });
});

describe('Notifications - forum discussions comment', () => {
  beforeAll(async () => {
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussionCodegen(discussionId);
  });
  test('GA send comment to own forum discussion - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.globalAdmin.email],
        }),
      ])
    );
  });

  test('GA send comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: forumDiscussionCommentSubjectText,
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('QA send comment to own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(
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
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('QA send comment to forum discussion created by GA - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(
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
          toAddresses: [users.globalAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - forum discussions comments reply', () => {
  beforeAll(async () => {
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    for (const config of preferencesConfigCommentsReply)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussionCodegen(discussionId);
  });
  test('GA reply to own comment of own forum discussion - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(discussionCommentId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
          toAddresses: [users.globalAdmin.email],
        }),
      ])
    );
  });

  test('GA reply to other comment to forum discussion created by QA - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('QA reply to own comment of own forum discussion - QA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('QA reply to other comment to forum discussion created by GA - GA(1) get notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(
      discussionCommentId,
      'test',
      TestUser.GLOBAL_ADMIN
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
          toAddresses: [users.globalAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - no notifications triggered', () => {
  beforeAll(async () => {
    for (const config of preferencesConfigDiscussions)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    for (const config of preferencesConfigComments)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
    for (const config of preferencesConfigCommentsReply)
      await changePreferenceUserCodegen(config.userID, config.type, 'false');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteDiscussionCodegen(discussionId);
  });

  test('GA create forum discussion - no one get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
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
    const res = await createDiscussionCodegen(
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
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA reply to won comment of forum discussion created by QA - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    await sendMessageToRoomCodegen(discussionCommentId);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test('GA send comment to own forum discussion - no notifications', async () => {
    // Act
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion'
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(discussionCommentId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
    const createDiscussionRes = await createDiscussionCodegen(
      platformCommunicationId,
      'test discussion',
      ForumDiscussionCategory.PlatformFunctionalities,
      TestUser.QA_USER
    );
    discussionId = createDiscussionRes?.data?.createDiscussion.id ?? '';
    discussionCommentId =
      createDiscussionRes?.data?.createDiscussion.comments.id ?? '';

    const res = await sendMessageToRoomCodegen(
      discussionCommentId,
      'test',
      TestUser.QA_USER
    );
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    await sendMessageReplyToRoomCodegen(
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
