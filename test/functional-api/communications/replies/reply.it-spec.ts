/* eslint-disable quotes */
import { TestUser } from '@test/utils';
import { sendMessageReplyToRoom } from './reply.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { addReaction } from '../reactions/reactions.request.params';
import {
  createDiscussion,
  deleteDiscussion,
  getPlatformDiscussionsDataById,
  getPlatformForumData,
  sendMessageToRoom,
  removeMessageOnRoom,
} from '../communication.params';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';
let replyId = '';
let threadId = '';

beforeAll(async () => {
  const res = await getPlatformForumData();
  platformDiscussionId = res?.data?.platform.forum.id ?? '';
});

describe('Reply - Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussion(
      platformDiscussionId,
      `test-${uniqueId}`
    );
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';
  });

  afterAll(async () => {
    await deleteDiscussion(discussionId);
  });

  afterEach(async () => {
    await removeMessageOnRoom(discussionCommentsId, messageId);
    await removeMessageOnRoom(discussionCommentsId, replyId);
  });

  test('Reply to own message', async () => {
    // Act
    const res = await sendMessageToRoom(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply'
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const discussionMessageData = await getPlatformDiscussionsDataById(
      discussionId
    );

    // Assert
    expect(threadId).toEqual(messageId);
    expect(replyInfo).toEqual(
      discussionMessageData?.data?.platform?.forum?.discussion?.comments
        .messages[1]
    );
  });

  test('Reply to message created by other user', async () => {
    // Act
    const res = await sendMessageToRoom(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.QA_USER
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const discussionMessageData = await getPlatformDiscussionsDataById(
      discussionId
    );

    // Assert
    expect(threadId).toEqual(messageId);
    expect(replyInfo).toEqual(
      discussionMessageData?.data?.platform?.forum?.discussion?.comments
        .messages[1]
    );
  });

  test('Should fail to delete message, when user raplied to a thread has been removed', async () => {
    // Arrange
    const res1 = await sendMessageToRoom(discussionCommentsId);
    const resComment1 = res1?.data?.sendMessageToRoom;
    messageId = resComment1?.id;

    const replyData1 = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo1 = replyData1?.data?.sendMessageReplyToRoom;
    replyId = replyInfo1?.id;

    await removeMessageOnRoom(discussionCommentsId, messageId);
    await removeMessageOnRoom(discussionCommentsId, replyId);

    // Act
    const res2 = await sendMessageToRoom(discussionCommentsId);
    const resComment2 = res2?.data?.sendMessageToRoom;
    messageId = resComment2?.id;

    const replyData = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo2 = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo2?.id;
    threadId = replyInfo2?.threadID ?? '';

    const resDelete = await removeMessageOnRoom(
      discussionCommentsId,
      messageId,
      TestUser.HUB_ADMIN
    );

    // Assert
    expect(resDelete.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'delete' privilege: room remove message: ${discussionCommentsId}`
    );
  });

  test('User replaying to other user message fail to delete the other user message', async () => {
    // Arrange
    const res = await sendMessageToRoom(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    // Act
    const replyData = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.NON_HUB_MEMBER
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const resDelete = await removeMessageOnRoom(
      discussionCommentsId,
      messageId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(resDelete.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'delete' privilege: room remove message: ${discussionCommentsId}`
    );
  });

  test('Replies should not be deleted, when main message is removed', async () => {
    // Arrange
    const res = await sendMessageToRoom(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData1 = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_ADMIN
    );
    const replyInfo1 = replyData1?.data?.sendMessageReplyToRoom;
    const replyId1 = replyInfo1?.id;

    const replyData2 = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_MEMBER
    );
    const replyInfo2 = replyData2?.data?.sendMessageReplyToRoom;
    replyId = replyInfo2?.id;

    // Act
    const resDelete = await removeMessageOnRoom(
      discussionCommentsId,
      messageId
    );
    const discussionMessageData = await getPlatformDiscussionsDataById(
      discussionId
    );

    // Assert
    expect(resDelete?.data?.removeMessageOnRoom).toEqual(messageId);
    expect(
      discussionMessageData?.data?.platform?.forum?.discussion?.comments
        .messages
    ).toHaveLength(2);

    await removeMessageOnRoom(discussionCommentsId, replyId1);
    await removeMessageOnRoom(discussionCommentsId, replyId);
  });

  test('Removing reply, removes reaction related to it', async () => {
    // Arrange
    const res = await sendMessageToRoom(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoom(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.CHALLENGE_ADMIN
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    const replyId = replyInfo?.id;

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
    await removeMessageOnRoom(
      discussionCommentsId,
      replyId,
      TestUser.CHALLENGE_ADMIN
    );

    const discussionMessageData = await getPlatformDiscussionsDataById(
      discussionId
    );
    const discussionMessages =
      discussionMessageData?.data?.platform?.forum?.discussion?.comments
        .messages;

    // Assert
    expect(discussionMessages).toHaveLength(1);
    expect(discussionMessages?.[0].id).toEqual(messageId);
  });
});
