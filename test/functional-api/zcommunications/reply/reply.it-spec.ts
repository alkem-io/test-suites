/* eslint-disable quotes */
import {
  createDiscussion,
  deleteDiscussion,
  getDiscussionById,
  getPlatformCommunicationId,
  postDiscussionComment,
  removeMessageFromDiscussion,
} from '../communications.request.params';
import { TestUser } from '@test/utils';
import { replyMessage } from './reply.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';
let messageThreadId = '';
let replyId = '';
let threadId = '';

beforeAll(async () => {
  const res = await getPlatformCommunicationId();
  platformDiscussionId = res.body.data.platform.communication.id;
});

describe('Reply - Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussion(
      platformDiscussionId,
      `test-${uniqueId}`
    );
    discussionId = res.body.data.createDiscussion.id;
    discussionCommentsId = res.body.data.createDiscussion.comments.id;
  });

  afterAll(async () => {
    await deleteDiscussion(discussionId);
  });

  afterEach(async () => {
    await removeMessageFromDiscussion(discussionCommentsId, messageId);
    await removeMessageFromDiscussion(discussionCommentsId, replyId);
  });

  test('Reply to own message', async () => {
    // Act
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply'
    );
    const replyInfo = replyData.body.data.sendMessageReplyToRoom;
    replyId = replyInfo.id;
    threadId = replyInfo.threadId;

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(threadId).toEqual(messageThreadId);
    expect(replyInfo).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[1]
    );
  });

  test('Reply to message created by other user', async () => {
    // Act
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.QA_USER
    );
    const replyInfo = replyData.body.data.sendMessageReplyToRoom;
    replyId = replyInfo.id;
    threadId = replyInfo.threadId;

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(threadId).toEqual(messageThreadId);
    expect(replyInfo).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[1]
    );
  });

  test.only('Should fail to delete message, when user raplied to a thread that has been removed', async () => {
    // Arrange
    const res1 = await postDiscussionComment(discussionCommentsId);
    const resComment1 = res1.body.data.sendMessageToRoom;
    messageId = resComment1.id;
    console.log(messageId);
    console.log(discussionCommentsId);
    messageThreadId = resComment1.threadID;

    const replyData1 = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo1 = replyData1.body.data.sendMessageReplyToRoom;
    replyId = replyInfo1.id;

    await removeMessageFromDiscussion(discussionCommentsId, messageId);
    await removeMessageFromDiscussion(discussionCommentsId, replyId);

    // Act
    const res2 = await postDiscussionComment(discussionCommentsId);
    const resComment2 = res2.body.data.sendMessageToRoom;
    messageId = resComment2.id;
    console.log(messageId);
    console.log(discussionCommentsId);
    messageThreadId = resComment2.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo2 = replyData.body.data.sendMessageReplyToRoom;
    replyId = replyInfo2.id;
    threadId = replyInfo2.threadId;
    console.log(replyData.body);

    const resDelete = await removeMessageFromDiscussion(
      discussionCommentsId,
      messageId,
      TestUser.HUB_ADMIN
    );
    console.log(resDelete.body);

    // Assert
    expect(resDelete.text).toContain(
      `Authorization: unable to grant 'delete' privilege: room remove message: ${discussionCommentsId}`
    );
  });

  test('User replaying to other user message fail to delete the other user message', async () => {
    // Act
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.NON_HUB_MEMBER
    );
    const replyInfo = replyData.body.data.sendMessageReplyToRoom;
    replyId = replyInfo.id;
    threadId = replyInfo.threadId;

    const resDelete = await removeMessageFromDiscussion(
      discussionCommentsId,
      messageId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(resDelete.text).toContain(
      `Authorization: unable to grant 'delete' privilege: room remove message: ${discussionCommentsId}`
    );
  });
});
