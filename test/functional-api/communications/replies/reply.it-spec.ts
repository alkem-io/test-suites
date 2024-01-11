/* eslint-disable quotes */
import { TestUser } from '@test/utils';
import { sendMessageReplyToRoomCodegen } from './reply.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { addReactionCodegen } from '../reactions/reactions.request.params';
import {
  createDiscussionCodegen,
  deleteDiscussionCodegen,
  getPlatformDiscussionsDataByIdCodegen,
  getPlatformForumDataCodegen,
  sendMessageToRoomCodegen,
  removeMessageOnRoomCodegen,
} from '../communication.params';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';
let replyId = '';
let threadId = '';

beforeAll(async () => {
  const res = await getPlatformForumDataCodegen();
  platformDiscussionId = res?.data?.platform.communication.id ?? '';
});

describe('Reply - Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussionCodegen(
      platformDiscussionId,
      `test-${uniqueId}`
    );
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';
  });

  afterAll(async () => {
    await deleteDiscussionCodegen(discussionId);
  });

  afterEach(async () => {
    await removeMessageOnRoomCodegen(discussionCommentsId, messageId);
    await removeMessageOnRoomCodegen(discussionCommentsId, replyId);
  });

  test('Reply to own message', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply'
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(threadId).toEqual(messageId);
    expect(replyInfo).toEqual(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[1]
    );
  });

  test('Reply to message created by other user', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.QA_USER
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(threadId).toEqual(messageId);
    expect(replyInfo).toEqual(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[1]
    );
  });

  test('Should fail to delete message, when user raplied to a thread has been removed', async () => {
    // Arrange
    const res1 = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment1 = res1?.data?.sendMessageToRoom;
    messageId = resComment1?.id;

    const replyData1 = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo1 = replyData1?.data?.sendMessageReplyToRoom;
    replyId = replyInfo1?.id;

    await removeMessageOnRoomCodegen(discussionCommentsId, messageId);
    await removeMessageOnRoomCodegen(discussionCommentsId, replyId);

    // Act
    const res2 = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment2 = res2?.data?.sendMessageToRoom;
    messageId = resComment2?.id;

    const replyData = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.HUB_ADMIN
    );
    const replyInfo2 = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo2?.id;
    threadId = replyInfo2?.threadID ?? '';

    const resDelete = await removeMessageOnRoomCodegen(
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
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    // Act
    const replyData = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.NON_HUB_MEMBER
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    replyId = replyInfo?.id;
    threadId = replyInfo?.threadID ?? '';

    const resDelete = await removeMessageOnRoomCodegen(
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
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData1 = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_ADMIN
    );
    const replyInfo1 = replyData1?.data?.sendMessageReplyToRoom;
    const replyId1 = replyInfo1?.id;

    const replyData2 = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.OPPORTUNITY_MEMBER
    );
    const replyInfo2 = replyData2?.data?.sendMessageReplyToRoom;
    replyId = replyInfo2?.id;

    // Act
    const resDelete = await removeMessageOnRoomCodegen(
      discussionCommentsId,
      messageId
    );
    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(resDelete?.data?.removeMessageOnRoom).toEqual(messageId);
    expect(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages
    ).toHaveLength(2);

    await removeMessageOnRoomCodegen(discussionCommentsId, replyId1);
    await removeMessageOnRoomCodegen(discussionCommentsId, replyId);
  });

  test('Removing reply, removes reaction related to it', async () => {
    // Arrange
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    const resComment = res?.data?.sendMessageToRoom;
    messageId = resComment?.id;

    const replyData = await sendMessageReplyToRoomCodegen(
      messageId,
      discussionCommentsId,
      'test reply',
      TestUser.CHALLENGE_ADMIN
    );
    const replyInfo = replyData?.data?.sendMessageReplyToRoom;
    const replyId = replyInfo?.id;

    await addReactionCodegen(
      discussionCommentsId,
      replyId,
      '👏',
      TestUser.CHALLENGE_ADMIN
    );

    await addReactionCodegen(
      discussionCommentsId,
      replyId,
      '👏',
      TestUser.CHALLENGE_MEMBER
    );

    // Act
    await removeMessageOnRoomCodegen(
      discussionCommentsId,
      replyId,
      TestUser.CHALLENGE_ADMIN
    );

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );
    const discussionMessages =
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages;

    // Assert
    expect(discussionMessages).toHaveLength(1);
    expect(discussionMessages?.[0].id).toEqual(messageId);
  });
});
