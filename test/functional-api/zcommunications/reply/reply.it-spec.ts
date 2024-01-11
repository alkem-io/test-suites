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
import { addReaction } from '../reactions.request.params';

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

  test.only('Reply to own message', async () => {
    // Act
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    console.log(resComment);
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply'
    );
    const replyInfo = replyData.body.data.sendMessageReplyToRoom;
    console.log(replyInfo);
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

  test('Should fail to delete message, when user raplied to a thread has been removed', async () => {
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
    // Arrange
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    // Act
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

  test('Replies should not be deleted, when main message is removed', async () => {
    // Arrange
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData1 = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_ADMIN
    );
    const replyInfo1 = replyData1.body.data.sendMessageReplyToRoom;
    const replyId1 = replyInfo1.id;

    const replyData2 = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_MEMBER
    );
    const replyInfo2 = replyData2.body.data.sendMessageReplyToRoom;
    replyId = replyInfo2.id;

    // Act
    const resDelete = await removeMessageFromDiscussion(
      discussionCommentsId,
      messageId
    );
    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(resDelete.body.data.removeMessageOnRoom).toEqual(messageId);
    expect(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages
    ).toHaveLength(2);

    await removeMessageFromDiscussion(discussionCommentsId, replyId1);
    await removeMessageFromDiscussion(discussionCommentsId, replyId);
  });

  test('Removing reply, removes reaction related to it', async () => {
    // Arrange
    const res = await postDiscussionComment(discussionCommentsId);
    const resComment = res.body.data.sendMessageToRoom;
    messageId = resComment.id;
    messageThreadId = resComment.threadID;

    const replyData = await replyMessage(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.CHALLENGE_ADMIN
    );
    const replyInfo = replyData.body.data.sendMessageReplyToRoom;
    const replyId = replyInfo.id;

    await addReaction(
      discussionCommentsId,
      replyId,
      '👏',
      TestUser.CHALLENGE_ADMIN
    );

    await addReaction(
      discussionCommentsId,
      replyId,
      '👏',
      TestUser.CHALLENGE_MEMBER
    );

    // Act
    await removeMessageFromDiscussion(
      discussionCommentsId,
      replyId,
      TestUser.CHALLENGE_ADMIN
    );

    const discussionMessageData = await getDiscussionById(discussionId);
    const discussionMessages =
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages;

    // Assert
    expect(discussionMessages).toHaveLength(1);
    expect(discussionMessages[0].id).toEqual(messageId);
  });
});
