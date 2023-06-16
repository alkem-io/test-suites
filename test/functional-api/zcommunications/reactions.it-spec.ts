/* eslint-disable quotes */
import '../../utils/array.matcher';
import {
  createDiscussion,
  deleteDiscussion,
  getDiscussionById,
  getPlatformCommunicationId,
  postDiscussionComment,
  removeMessageFromDiscussion,
} from './communications.request.params';
import { TestUser } from '@test/utils';
import { addReaction, removeReaction } from './reactions.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';

beforeAll(async () => {
  const res = await getPlatformCommunicationId();
  platformDiscussionId = res.body.data.platform.communication.id;
});

describe('Reaction - Discussion messages', () => {
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
  });

  test('React on own message', async () => {
    // Act
    const res = await postDiscussionComment(discussionCommentsId);
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionData = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(res.statusCode).toEqual(200);
    expect(reactionData.body.data.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions[0].emoji
    );
  });

  test('React on other user message', async () => {
    // Act
    const res = await postDiscussionComment(
      discussionCommentsId,
      'test',
      TestUser.HUB_ADMIN
    );
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionData = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(reactionData.body.data.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions[0].emoji
    );
  });

  test('Add multiple reaction to a message', async () => {
    // Act
    const res = await postDiscussionComment(
      discussionCommentsId,
      'test',
      TestUser.HUB_ADMIN
    );
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionDataOne = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const reactionDataTwo = await addReaction(
      discussionCommentsId,
      messageId,
      '😁'
    );

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(reactionDataOne.body.data.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions[0].emoji
    );
    expect(reactionDataTwo.body.data.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions[1].emoji
    );
  });

  test('Should fail to add same reaction twice to a message', async () => {
    // Act
    const res = await postDiscussionComment(
      discussionCommentsId,
      'test',
      TestUser.HUB_ADMIN
    );
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionDataOne = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionDataTwo = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );

    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(reactionDataOne.body.data.addReactionToMessageInRoom.emoji).toEqual(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions[0].emoji
    );
    expect(reactionDataTwo.text).toContain('errors');
  });

  test('Remove reaction on own message', async () => {
    // Arrange
    const res = await postDiscussionComment(discussionCommentsId);
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionData = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionId = reactionData.body.data.addReactionToMessageInRoom.id;

    // Act

    const resRemove = await removeReaction(reactionId, discussionCommentsId);
    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(resRemove.body.data.removeReactionToMessageInRoom).toEqual(true);
    expect(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions
    ).toHaveLength(0);
  });

  test('Remove reaction added by other user on own message', async () => {
    // Arrange
    const res = await postDiscussionComment(
      discussionCommentsId,
      'test',
      TestUser.HUB_ADMIN
    );
    messageId = res.body.data.sendMessageToRoom.id;

    const reactionData = await addReaction(
      discussionCommentsId,
      messageId,
      '👏'
    );
    const reactionId = reactionData.body.data.addReactionToMessageInRoom.id;

    // Act

    await removeReaction(reactionId, discussionCommentsId, TestUser.HUB_ADMIN);
    const discussionMessageData = await getDiscussionById(discussionId);

    // Assert
    expect(
      discussionMessageData.body.data.platform.communication.discussion.comments
        .messages[0].reactions
    ).toHaveLength(1);
  });
});
