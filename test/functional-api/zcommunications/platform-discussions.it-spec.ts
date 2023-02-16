/* eslint-disable quotes */
import '../../utils/array.matcher';
import {
  createDiscussion,
  deleteDiscussion,
  getPlatformCommunicationId,
  getPlatformDiscussionsData,
  getPlatformDiscussionsDataById,
  getPlatformDiscussionsDataByTitle,
  postDiscussionComment,
  removeMessageFromDiscussion,
  updateDiscussion,
} from './communications.request.params';
import { DiscussionCategory } from '@test/utils/mutations/communications-mutation';
import { TestUser } from '@test/utils';

let platformDiscussionId = '';
let discussionId = '';
let messageId = '';
const errorAuthDiscussionUpdate =
  "Authorization: unable to grant 'update' privilege: Update discussion: ";
const errorAuthDiscussionDelete =
  "Authorization: unable to grant 'delete' privilege: delete discussion: ";
const errorAuthDiscussionMessageDelete =
  "Authorization: unable to grant 'delete' privilege: communication delete message: ";

beforeAll(async () => {
  const res = await getPlatformCommunicationId();
  platformDiscussionId = res.body.data.platform.communication.id;
});

describe('Platform discussions - CRUD operations', () => {
  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });

  test('Create discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsData();
    const countDiscsBefore = discB.body.data.platform.communication.discussions;
    const res = await createDiscussion(platformDiscussionId, 'test');
    discussionId = res.body.data.createDiscussion.id;

    const discA = await getPlatformDiscussionsData();
    const countDiscsAfter = discA.body.data.platform.communication.discussions;

    // Assert
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length - 1);
  });

  test('Delete discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsData();
    const countDiscsBefore = discB.body.data.platform.communication.discussions;
    const res = await createDiscussion(platformDiscussionId, 'test');
    discussionId = res.body.data.createDiscussion.id;

    const resDel = await deleteDiscussion(discussionId);
    const deletedDiscussionId = resDel.body.data.deleteDiscussion.id;
    const discA = await getPlatformDiscussionsData();
    const countDiscsAfter = discA.body.data.platform.communication.discussions;

    // Assert
    expect(discussionId).toEqual(deletedDiscussionId);
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length);
  });

  test('Update discussion', async () => {
    // Arrange
    const res = await createDiscussion(platformDiscussionId, 'test');
    discussionId = res.body.data.createDiscussion.id;

    // Act
    const update = await updateDiscussion(discussionId, TestUser.GLOBAL_ADMIN, {
      title: 'Updated',
      description: 'Test',
      category: DiscussionCategory.SHARING,
    });

    const discA = await getPlatformDiscussionsDataByTitle('Updated');

    // Assert
    expect(discA).toEqual([update.body.data.updateDiscussion]);
  });
});

describe('Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussion(platformDiscussionId, 'test');
    discussionId = res.body.data.createDiscussion.id;
  });

  afterAll(async () => {
    await deleteDiscussion(discussionId);
  });

  afterEach(async () => {
    await removeMessageFromDiscussion(discussionId, messageId);
  });

  test('Send message to discussion', async () => {
    // Act
    const res = await postDiscussionComment(discussionId);
    messageId = res.body.data.sendMessageToDiscussion.id;

    const discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const getDiscussionData =
      discussionRes.body.data.platform.communication.discussion.messages[0];

    // Assert
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.sendMessageToDiscussion).toEqual(getDiscussionData);
  });

  test('Create multiple messages in one discussion', async () => {
    // Act
    const firstMessageRes = await postDiscussionComment(
      discussionId,
      'message1'
    );
    messageId = firstMessageRes.body.data.sendMessageToDiscussion.id;

    const secondMessageRes = await postDiscussionComment(
      discussionId,
      'message2'
    );
    const secondmessageId =
      secondMessageRes.body.data.sendMessageToDiscussion.id;

    const discussionRes = await getPlatformDiscussionsDataById(discussionId);

    const getDiscussions =
      discussionRes.body.data.platform.communication.discussion.messages;

    // Assert
    expect(getDiscussions).toHaveLength(2);

    await removeMessageFromDiscussion(discussionId, secondmessageId);
  });

  test('Delete message from discussion', async () => {
    // Act
    const res = await postDiscussionComment(discussionId);
    messageId = res.body.data.sendMessageToDiscussion.id;

    let discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const messagesBefore =
      discussionRes.body.data.platform.communication.discussion.messages;

    await removeMessageFromDiscussion(discussionId, messageId);

    discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const messagesAfter =
      discussionRes.body.data.platform.communication.discussion.messages;

    // Assert
    expect(messagesBefore).toHaveLength(1);
    expect(messagesAfter).toHaveLength(0);
  });
});

describe('Authorization - Discussion / Messages', () => {
  describe('Discussions', () => {
    describe('DDT user privileges to create / update platform discussions', () => {
      afterEach(async () => {
        await deleteDiscussion(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleUpdate           | messageUpdate
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"updateDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"updateDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}      | ${errorAuthDiscussionUpdate}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER}      | ${errorAuthDiscussionUpdate}
      `(
        'User: "$userRoleUpdate" get message: "$messageUpdate", who intend to update discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleUpdate, messageUpdate }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            DiscussionCategory.PLATFORM_FUNCTIONALITIES,
            userRoleCreate
          );
          discussionId = res.body.data.createDiscussion.id;

          const update = await updateDiscussion(discussionId, userRoleUpdate, {
            title: 'Updated',
          });

          // Assert
          expect(update.text).toContain(messageUpdate);
        }
      );
    });

    describe('DDT user privileges to create / delete platform discussions', () => {
      afterEach(async () => {
        await deleteDiscussion(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete           | messageDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"deleteDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"deleteDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}      | ${errorAuthDiscussionDelete}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER}      | ${errorAuthDiscussionDelete}
      `(
        'User: "$userRoleUpdate" get message: "$messageDelete", who intend to delete discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            DiscussionCategory.PLATFORM_FUNCTIONALITIES,
            userRoleCreate
          );
          discussionId = res.body.data.createDiscussion.id;
          const del = await deleteDiscussion(discussionId, userRoleDelete);

          // Assert
          expect(del.text).toContain(messageDelete);
        }
      );
    });
  });

  describe('Comments', () => {
    describe('DDT user privileges to create / delete comments on discussion created from GA', () => {
      afterEach(async () => {
        await deleteDiscussion(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete           | messageDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}      | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER}      | ${errorAuthDiscussionMessageDelete}
      `(
        'User: "$userRoleUpdate" get message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            DiscussionCategory.PLATFORM_FUNCTIONALITIES,
            TestUser.GLOBAL_ADMIN
          );

          discussionId = res.body.data.createDiscussion.id;

          const data = await postDiscussionComment(
            discussionId,
            'Test message',
            userRoleCreate
          );
          messageId = data.body.data.sendMessageToDiscussion.id;
          const delMessage = await removeMessageFromDiscussion(
            discussionId,
            messageId,
            userRoleDelete
          );

          // Assert
          expect(delMessage.text).toContain(messageDelete);
        }
      );
    });

    describe('DDT user privileges to create / delete comments on discussion created from registered user', () => {
      afterEach(async () => {
        await deleteDiscussion(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete           | messageDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}      | ${'"data":{"removeMessageFromDiscussion'}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER}      | ${errorAuthDiscussionMessageDelete}
      `(
        'User: "$userRoleDelete" get message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            DiscussionCategory.PLATFORM_FUNCTIONALITIES,
            TestUser.QA_USER
          );

          discussionId = res.body.data.createDiscussion.id;

          const data = await postDiscussionComment(
            discussionId,
            'Test message',
            userRoleCreate
          );
          messageId = data.body.data.sendMessageToDiscussion.id;
          const delMessage = await removeMessageFromDiscussion(
            discussionId,
            messageId,
            userRoleDelete
          );

          // Assert
          expect(delMessage.text).toContain(messageDelete);
        }
      );
    });
  });
});
