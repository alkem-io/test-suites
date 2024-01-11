/* eslint-disable quotes */
import { TestUser } from '@test/utils';
import {
  addReactionCodegen,
  removeReactionCodegen,
} from './reactions.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  getPlatformDiscussionsDataByIdCodegen,
  createDiscussionCodegen,
  deleteDiscussionCodegen,
  getPlatformForumDataCodegen,
  removeMessageOnRoomCodegen,
  sendMessageToRoomCodegen,
} from '../communication.params';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';

beforeAll(async () => {
  const res = await getPlatformForumDataCodegen();
  platformDiscussionId = res?.data?.platform.communication.id ?? '';
});

describe('Reaction - Discussion messages', () => {
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
  });

  test('React on own message', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionData = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(reactionData?.data?.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0].reactions?.[0].emoji
    );
  });

  test('React on other user message', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionData = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(reactionData?.data?.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0].reactions[0].emoji
    );
  });

  test('Add multiple reaction to a message', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionDataOne = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const reactionDataTwo = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '😁'
    );

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );
    const discussionData =
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0];

    // Assert
    expect(reactionDataOne?.data?.addReactionToMessageInRoom.emoji).toEqual(
      discussionData?.reactions[0].emoji
    );
    expect(reactionDataTwo?.data?.addReactionToMessageInRoom.emoji).toEqual(
      discussionData?.reactions[1].emoji
    );
  });

  test('Should fail to add same reaction twice to a message', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionDataOne = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionDataTwo = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(reactionDataOne?.data?.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0].reactions[0].emoji
    );
    expect(reactionDataTwo.error?.errors[0].message).toContain(
      `Can't send same reaction twice`
    );
  });

  test('Remove reaction on own message', async () => {
    // Arrange
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionData = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionId = reactionData?.data?.addReactionToMessageInRoom.id;

    // Act

    const resRemove = await removeReactionCodegen(
      reactionId,
      discussionCommentsId
    );
    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(resRemove?.data?.removeReactionToMessageInRoom).toEqual(true);
    expect(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0].reactions
    ).toHaveLength(0);
  });

  test('Remove reaction added by other user on own message', async () => {
    // Arrange
    const res = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    messageId = res?.data?.sendMessageToRoom.id;

    const reactionData = await addReactionCodegen(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionId = reactionData?.data?.addReactionToMessageInRoom.id;

    // Act

    const resRemove = await removeReactionCodegen(
      reactionId,
      discussionCommentsId,
      TestUser.HUB_ADMIN
    );

    const discussionMessageData = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    // Assert
    expect(resRemove.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'delete' privilege: room remove reaction`
    );
    expect(
      discussionMessageData?.data?.platform?.communication?.discussion?.comments
        .messages[0].reactions
    ).toHaveLength(1);
  });
});
