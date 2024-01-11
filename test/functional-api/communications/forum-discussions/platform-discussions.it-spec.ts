/* eslint-disable quotes */
import { TestUser, delay } from '@test/utils';
import {
  getPlatformDiscussionsDataByIdCodegen,
  deleteDiscussionCodegen,
  getPlatformDiscussionsDataByTitle,
  getPlatformDiscussionsDataCodegen,
  getPlatformForumDataCodegen,
  createDiscussionCodegen,
  updateDiscussionCodegen,
  sendMessageToRoomCodegen,
  removeMessageOnRoomCodegen,
} from '../communication.params';
import { DiscussionCategory } from '@alkemio/client-lib';

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';
const errorAuthDiscussionUpdate =
  "Authorization: unable to grant 'update' privilege: Update discussion: ";
const errorAuthDiscussionDelete =
  "Authorization: unable to grant 'delete' privilege: delete discussion: ";
const errorAuthDiscussionMessageDelete =
  "Authorization: unable to grant 'delete' privilege: room remove message: ";

beforeAll(async () => {
  const res = await getPlatformForumDataCodegen();
  platformDiscussionId = res?.data?.platform.communication.id ?? '';
});

describe('Platform discussions - CRUD operations', () => {
  afterEach(async () => {
    await deleteDiscussionCodegen(discussionId);
  });

  test('Create discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsDataCodegen();
    const countDiscsBefore =
      discB?.data?.platform.communication.discussions ?? '';
    const res = await createDiscussionCodegen(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    const discA = await getPlatformDiscussionsDataCodegen();
    const countDiscsAfter =
      discA?.data?.platform.communication.discussions ?? '';

    // Assert
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length - 1);
  });

  test('Delete discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsDataCodegen();
    const countDiscsBefore =
      discB?.data?.platform.communication.discussions ?? '';
    const res = await createDiscussionCodegen(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    const resDel = await deleteDiscussionCodegen(discussionId);
    const deletedDiscussionId = resDel?.data?.deleteDiscussion.id;
    const discA = await getPlatformDiscussionsDataCodegen();
    const countDiscsAfter =
      discA?.data?.platform.communication.discussions ?? '';

    // Assert
    expect(discussionId).toEqual(deletedDiscussionId);
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length);
  });

  test('Update discussion', async () => {
    // Arrange
    const res = await createDiscussionCodegen(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;

    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    // Act
    const update = await updateDiscussionCodegen(
      discussionId,
      TestUser.GLOBAL_ADMIN,
      {
        profileData: {
          displayName: 'Updated',
          description: 'Test',
        },
        category: DiscussionCategory.Sharing,
      }
    );

    const discA = await getPlatformDiscussionsDataByTitle('Updated');

    // Assert
    expect(discA).toEqual([update?.data?.updateDiscussion]);
  });
});

describe('Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussionCodegen(platformDiscussionId, 'test');
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

  test('Send message to discussion', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    const discussionRes = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );
    const getDiscussionData =
      discussionRes?.data?.platform?.communication?.discussion?.comments
        .messages[0];

    // Assert
    expect(res?.data?.sendMessageToRoom).toEqual(getDiscussionData);
  });

  test('Create multiple messages in one discussion', async () => {
    // Act
    const firstMessageRes = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'message1'
    );

    messageId = firstMessageRes?.data?.sendMessageToRoom.id;

    const secondMessageRes = await sendMessageToRoomCodegen(
      discussionCommentsId,
      'message2'
    );
    const secondmessageId = secondMessageRes?.data?.sendMessageToRoom.id;

    const discussionRes = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );

    const getDiscussions =
      discussionRes?.data?.platform?.communication?.discussion?.comments
        .messages;

    // Assert
    expect(getDiscussions).toHaveLength(2);

    await removeMessageOnRoomCodegen(discussionCommentsId, secondmessageId);
  });

  test('Delete message from discussion', async () => {
    // Act
    const res = await sendMessageToRoomCodegen(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    let discussionRes = await getPlatformDiscussionsDataByIdCodegen(
      discussionId
    );
    const messagesBefore =
      discussionRes?.data?.platform?.communication?.discussion?.comments
        .messages;

    await removeMessageOnRoomCodegen(discussionCommentsId, messageId);

    discussionRes = await getPlatformDiscussionsDataByIdCodegen(discussionId);
    const messagesAfter =
      discussionRes?.data?.platform?.communication?.discussion?.comments
        .messages;

    // Assert
    expect(messagesBefore).toHaveLength(1);
    expect(messagesAfter).toHaveLength(0);
  });
});

describe('Authorization - Discussion / Messages', () => {
  describe('Discussions', () => {
    describe('DDT user privileges to create / update platform discussions', () => {
      afterEach(async () => {
        await deleteDiscussionCodegen(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleUpdate           | messageUpdate
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'Updated1'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'Updated2'}
      `(
        'User: "$userRoleUpdate" get message: "$messageUpdate", who intend to update discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleUpdate, messageUpdate }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const update = await updateDiscussionCodegen(
            discussionId,
            userRoleUpdate,
            {
              profileData: { displayName: messageUpdate },
            }
          );

          // Assert
          expect(update.data?.updateDiscussion.profile.displayName).toContain(
            messageUpdate
          );
        }
      );

      test.each`
        userRoleCreate           | userRoleUpdate      | messageUpdate
        ${TestUser.QA_USER}      | ${TestUser.QA_USER} | ${errorAuthDiscussionUpdate}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER} | ${errorAuthDiscussionUpdate}
      `(
        'User: "$userRoleUpdate" get ERROR message: "$messageUpdate", who intend to update discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleUpdate, messageUpdate }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const update = await updateDiscussionCodegen(
            discussionId,
            userRoleUpdate,
            {
              profileData: { displayName: 'Updated' },
            }
          );

          // Assert
          expect(update.error?.errors[0].message).toContain(messageUpdate);
        }
      );
    });

    describe('DDT user privileges to create / delete platform discussions', () => {
      afterEach(async () => {
        await deleteDiscussionCodegen(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN}
      `(
        'User: "$userRoleUpdate" get message: "$messageDelete", who intend to delete discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';
          const del = await deleteDiscussionCodegen(
            discussionId,
            userRoleDelete
          );

          // Assert
          expect(del.data?.deleteDiscussion?.id).toContain(discussionId);
        }
      );

      test.each`
        userRoleCreate           | userRoleDelete      | messageDelete
        ${TestUser.QA_USER}      | ${TestUser.QA_USER} | ${errorAuthDiscussionDelete}
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER} | ${errorAuthDiscussionDelete}
      `(
        'User: "$userRoleUpdate" get message: "$messageDelete", who intend to delete discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';
          const del = await deleteDiscussionCodegen(
            discussionId,
            userRoleDelete
          );

          // Assert
          expect(del.error?.errors[0].message).toContain(messageDelete);
        }
      );
    });
  });

  describe('Comments', () => {
    describe('DDT user privileges to create / delete comments on discussion created from GA', () => {
      afterEach(async () => {
        await deleteDiscussionCodegen(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}
      `(
        'User: "$userRoleDelete" get message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            TestUser.GLOBAL_ADMIN
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoomCodegen(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );
          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoomCodegen(
            discussionCommentsId,
            messageId,
            userRoleDelete
          );

          // Assert
          expect(delMessage.data?.removeMessageOnRoom).toEqual(messageId);
        }
      );

      test.each`
        userRoleCreate           | userRoleDelete      | messageDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER} | ${errorAuthDiscussionMessageDelete}
      `(
        'User: "$userRoleDelete" get ERROR message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            TestUser.GLOBAL_ADMIN
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoomCodegen(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );

          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoomCodegen(
            discussionCommentsId,
            messageId,
            userRoleDelete
          );

          // Assert
          expect(delMessage.error?.errors[0].message).toContain(messageDelete);
        }
      );
    });

    describe('DDT user privileges to create / delete comments on discussion created from registered user', () => {
      afterEach(async () => {
        await deleteDiscussionCodegen(discussionId);
      });
      // Arrange
      test.each`
        userRoleCreate           | userRoleDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}
      `(
        'User: "$userRoleDelete" get message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            TestUser.QA_USER
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoomCodegen(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );

          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoomCodegen(
            discussionCommentsId,
            messageId,
            userRoleDelete
          );
          // Assert
          expect(delMessage.data?.removeMessageOnRoom).toEqual(messageId);
        }
      );

      test.each`
        userRoleCreate           | userRoleDelete      | messageDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.QA_USER} | ${errorAuthDiscussionMessageDelete}
      `(
        'User: "$userRoleDelete" get ERROR message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete, messageDelete }) => {
          // Act
          const res = await createDiscussionCodegen(
            platformDiscussionId,
            'test',
            DiscussionCategory.PlatformFunctionalities,
            TestUser.QA_USER
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoomCodegen(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );
          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoomCodegen(
            discussionCommentsId,
            messageId,
            userRoleDelete
          );

          // Assert
          expect(delMessage.error?.errors[0].message).toContain(messageDelete);
        }
      );
    });
  });
});
