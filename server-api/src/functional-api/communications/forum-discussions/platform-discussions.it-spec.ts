import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
} from '@alkemio/tests-lib';
import {
  getPlatformDiscussionsDataById,
  deleteDiscussion,
  getPlatformDiscussionsDataByTitle,
  getPlatformDiscussionsData,
  getPlatformForumData,
  createDiscussion,
  updateDiscussion,
  sendMessageToRoom,
  removeMessageOnRoom,
  getPlatformForumDiscussionCategories,
  adminRemoveForumDiscussionCategory,
} from '../communication.params';
import { delay } from '@alkemio/tests-lib';
import { ForumDiscussionCategory } from '@alkemio/client-lib/dist/types/alkemio-schema';

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

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'platform-discussions',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await getPlatformForumData();
  platformDiscussionId = res?.data?.platform.forum.id ?? '';

  // Clean up any leftover discussions from previous test runs
  // to avoid "displayName is already taken" conflicts
  const existingDiscs = await getPlatformDiscussionsData();
  const discussions = existingDiscs?.data?.platform.forum.discussions ?? [];
  for (const disc of discussions) {
    await deleteDiscussion(disc.id);
  }
});

describe('Platform discussions - CRUD operations', () => {
  afterEach(async () => {
    await deleteDiscussion(discussionId);
  });

  test('Create discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsData();
    const countDiscsBefore = discB?.data?.platform.forum.discussions ?? '';
    const res = await createDiscussion(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    const discA = await getPlatformDiscussionsData();
    const countDiscsAfter = discA?.data?.platform.forum.discussions ?? [];

    // Assert
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length - 1);
  });

  test('Delete discussion', async () => {
    // Act
    const discB = await getPlatformDiscussionsData();
    const countDiscsBefore = discB?.data?.platform.forum.discussions ?? '';
    const res = await createDiscussion(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;
    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    const resDel = await deleteDiscussion(discussionId);
    const deletedDiscussionId = resDel?.data?.deleteDiscussion.id;
    const discA = await getPlatformDiscussionsData();
    const countDiscsAfter = discA?.data?.platform.forum.discussions ?? [];

    // Assert
    expect(discussionId).toEqual(deletedDiscussionId);
    expect(countDiscsBefore.length).toEqual(countDiscsAfter.length);
  });

  test('Update discussion', async () => {
    // Arrange
    const res = await createDiscussion(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;

    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';

    // Act
    const update = await updateDiscussion(discussionId, TestUser.GLOBAL_ADMIN, {
      profileData: {
        displayName: 'Updated',
        description: 'Test',
      },
      category: ForumDiscussionCategory.Help,
    });

    const discA = await getPlatformDiscussionsDataByTitle('Updated');

    // Assert
    expect(discA).toEqual([update?.data?.updateDiscussion]);
  });
});

describe('Discussion messages', () => {
  beforeAll(async () => {
    const res = await createDiscussion(platformDiscussionId, 'test');
    const discussionData = res?.data?.createDiscussion;

    discussionId = discussionData?.id ?? '';
    discussionCommentsId = discussionData?.comments.id ?? '';
  });

  afterAll(async () => {
    await deleteDiscussion(discussionId);
  });

  afterEach(async () => {
    await removeMessageOnRoom(discussionCommentsId, messageId);
  });

  test('Send message to discussion', async () => {
    // Act
    const res = await sendMessageToRoom(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    const discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const getDiscussionData =
      discussionRes?.data?.platform?.forum?.discussion?.comments.messages[0];

    // Assert
    expect(res?.data?.sendMessageToRoom).toEqual(getDiscussionData);
  });

  test('Create multiple messages in one discussion', async () => {
    // Act
    const firstMessageRes = await sendMessageToRoom(
      discussionCommentsId,
      'message1'
    );

    messageId = firstMessageRes?.data?.sendMessageToRoom.id;

    const secondMessageRes = await sendMessageToRoom(
      discussionCommentsId,
      'message2'
    );
    const secondmessageId = secondMessageRes?.data?.sendMessageToRoom.id;

    const discussionRes = await getPlatformDiscussionsDataById(discussionId);

    const getDiscussions =
      discussionRes?.data?.platform?.forum?.discussion?.comments.messages;

    // Assert
    expect(getDiscussions).toHaveLength(2);

    await removeMessageOnRoom(discussionCommentsId, secondmessageId);
  });

  test('Delete message from discussion', async () => {
    // Act
    const res = await sendMessageToRoom(discussionCommentsId);
    messageId = res?.data?.sendMessageToRoom.id;

    let discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const messagesBefore =
      discussionRes?.data?.platform?.forum?.discussion?.comments.messages;

    await removeMessageOnRoom(discussionCommentsId, messageId);

    discussionRes = await getPlatformDiscussionsDataById(discussionId);
    const messagesAfter =
      discussionRes?.data?.platform?.forum?.discussion?.comments.messages;

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
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN} | ${'Updated1'}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN} | ${'Updated2'}
      `(
        'User: "$userRoleUpdate" get message: "$messageUpdate", who intend to update discussion created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleUpdate, messageUpdate }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const update = await updateDiscussion(discussionId, userRoleUpdate, {
            profileData: { displayName: messageUpdate },
          });

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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const update = await updateDiscussion(discussionId, userRoleUpdate, {
            profileData: { displayName: 'Updated' },
          });

          // Assert
          expect(update.error?.errors[0].message).toContain(messageUpdate);
        }
      );
    });

    describe('DDT user privileges to create / delete platform discussions', () => {
      afterEach(async () => {
        await deleteDiscussion(discussionId);
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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';
          const del = await deleteDiscussion(discussionId, userRoleDelete);

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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            userRoleCreate
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';
          const del = await deleteDiscussion(discussionId, userRoleDelete);

          // Assert
          expect(del.error?.errors[0].message).toContain(messageDelete);
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
        userRoleCreate           | userRoleDelete
        ${TestUser.GLOBAL_ADMIN} | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.GLOBAL_ADMIN}
        ${TestUser.QA_USER}      | ${TestUser.QA_USER}
      `(
        'User: "$userRoleDelete" get message: "$messageDelete", who intend to delete message created from "$userRoleCreate',
        async ({ userRoleCreate, userRoleDelete }) => {
          // Act
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            TestUser.GLOBAL_ADMIN
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoom(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );
          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoom(
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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            TestUser.GLOBAL_ADMIN
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoom(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );

          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoom(
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
        await deleteDiscussion(discussionId);
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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            TestUser.QA_USER
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoom(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );

          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoom(
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
          const res = await createDiscussion(
            platformDiscussionId,
            'test',
            ForumDiscussionCategory.PlatformFunctionalities,
            TestUser.QA_USER
          );
          const discussionData = res?.data?.createDiscussion;
          discussionId = discussionData?.id ?? '';
          discussionCommentsId = discussionData?.comments.id ?? '';

          const data = await sendMessageToRoom(
            discussionCommentsId,
            'Test message',
            userRoleCreate
          );
          messageId = data?.data?.sendMessageToRoom.id;

          // TODO: needs to be removed, possible matrix-adapter related bug
          await delay(1000);

          const delMessage = await removeMessageOnRoom(
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

// The two categories below are not yet in the checked-in generated SDK enum
// (it predates this delivery's server change), but GraphQL enums travel by
// wire name, so a plain string cast round-trips correctly against a server
// that has them. See the note beside the helpers in communication.params.ts.
const NEWSLETTER = 'NEWSLETTER' as ForumDiscussionCategory;
const TIPS_AND_TRICKS = 'TIPS_AND_TRICKS' as ForumDiscussionCategory;
const ALL_EIGHT_CATEGORIES = [
  'CHALLENGE_CENTRIC',
  'COMMUNITY_BUILDING',
  'HELP',
  'OTHER',
  'PLATFORM_FUNCTIONALITIES',
  'RELEASES',
  'NEWSLETTER',
  'TIPS_AND_TRICKS',
];

describe('Forum category reorganisation - new categories + admin-only gate', () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteDiscussion(id);
    }
  });

  test('Admin creates a discussion in the Newsletter category', async () => {
    // Act
    const res = await createDiscussion(
      platformDiscussionId,
      'category-reorg-newsletter',
      NEWSLETTER,
      TestUser.GLOBAL_ADMIN
    );
    const discussion = res?.data?.createDiscussion;
    if (discussion?.id) createdIds.push(discussion.id);

    // Assert
    expect(discussion?.category).toEqual('NEWSLETTER');
  });

  test('Admin creates a discussion in the Tips & Tricks category', async () => {
    // Act
    const res = await createDiscussion(
      platformDiscussionId,
      'category-reorg-tips-and-tricks-admin',
      TIPS_AND_TRICKS,
      TestUser.GLOBAL_ADMIN
    );
    const discussion = res?.data?.createDiscussion;
    if (discussion?.id) createdIds.push(discussion.id);

    // Assert
    expect(discussion?.category).toEqual('TIPS_AND_TRICKS');
  });

  test('Non-admin creating into Newsletter is refused', async () => {
    // Act
    const res = await createDiscussion(
      platformDiscussionId,
      'category-reorg-newsletter-denied',
      NEWSLETTER,
      TestUser.QA_USER
    );

    // Assert
    expect(res?.data?.createDiscussion).toBeUndefined();
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Non-admin creating into Releases is refused (gate is now set-driven, not a single literal)', async () => {
    // Act
    const res = await createDiscussion(
      platformDiscussionId,
      'category-reorg-releases-denied',
      ForumDiscussionCategory.Releases,
      TestUser.QA_USER
    );

    // Assert
    expect(res?.data?.createDiscussion).toBeUndefined();
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Non-admin creates a discussion in the Tips & Tricks category (public category)', async () => {
    // Act
    const res = await createDiscussion(
      platformDiscussionId,
      'category-reorg-tips-and-tricks-public',
      TIPS_AND_TRICKS,
      TestUser.QA_USER
    );
    const discussion = res?.data?.createDiscussion;
    if (discussion?.id) createdIds.push(discussion.id);

    // Assert
    expect(discussion?.category).toEqual('TIPS_AND_TRICKS');
  });

  test('The active category list carries all 8 categories', async () => {
    // Act
    const categories = await getPlatformForumDiscussionCategories();

    // Assert
    expect(categories).toEqual(expect.arrayContaining(ALL_EIGHT_CATEGORIES));
    expect(categories).toHaveLength(ALL_EIGHT_CATEGORIES.length);
  });
});

describe('Forum category reorganisation - recategorise an existing post', () => {
  let discId = '';

  afterEach(async () => {
    if (discId) {
      await deleteDiscussion(discId);
      discId = '';
    }
  });

  test('Admin moves a post from Other to Tips & Tricks and the move round-trips', async () => {
    // Arrange
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-recategorise',
      ForumDiscussionCategory.Other,
      TestUser.GLOBAL_ADMIN
    );
    discId = created?.data?.createDiscussion?.id ?? '';

    // Act
    const updated = await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
      category: TIPS_AND_TRICKS,
    });
    const readBack = await getPlatformDiscussionsDataById(discId);

    // Assert
    expect(updated?.data?.updateDiscussion.category).toEqual(
      'TIPS_AND_TRICKS'
    );
    expect(readBack?.data?.platform?.forum?.discussion?.category).toEqual(
      'TIPS_AND_TRICKS'
    );
  });

  test('Non-admin cannot recategorise a post (unchanged UPDATE privilege)', async () => {
    // Arrange
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-recategorise-denied',
      ForumDiscussionCategory.Other,
      TestUser.GLOBAL_ADMIN
    );
    discId = created?.data?.createDiscussion?.id ?? '';

    // Act
    const updated = await updateDiscussion(discId, TestUser.QA_USER, {
      category: TIPS_AND_TRICKS,
    });

    // Assert
    expect(updated?.error?.errors[0].message).toContain(
      errorAuthDiscussionUpdate
    );
  });

  test('Global admin (holder of PLATFORM_ADMIN) moves a post into Newsletter', async () => {
    // Arrange
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-recategorise-newsletter',
      ForumDiscussionCategory.Other,
      TestUser.GLOBAL_ADMIN
    );
    discId = created?.data?.createDiscussion?.id ?? '';

    // Act
    const updated = await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
      category: NEWSLETTER,
    });

    // Assert
    expect(updated?.data?.updateDiscussion.category).toEqual('NEWSLETTER');
  });
});

describe('Forum category reorganisation - remove-mutation safe negatives only', () => {
  // Deliberately never exercises a removal that could succeed: this suite
  // also runs against shared/acceptance environments and there is no
  // add-category API to restore a category removed here by accident.

  let fixtureDiscId = '';

  afterEach(async () => {
    if (fixtureDiscId) {
      await deleteDiscussion(fixtureDiscId);
      fixtureDiscId = '';
    }
  });

  test('Non-admin cannot call the remove-category mutation, and the active list is unchanged', async () => {
    // Arrange
    const before = await getPlatformForumDiscussionCategories();

    // Act
    const res = await adminRemoveForumDiscussionCategory(
      'OTHER',
      TestUser.QA_USER
    );
    const after = await getPlatformForumDiscussionCategories();

    // Assert
    expect(res?.body?.data?.adminForumRemoveDiscussionCategory).toBeFalsy();
    expect(res?.body?.errors?.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });

  test('Admin cannot remove a category that still holds a post; the count is in the error and the category stays active', async () => {
    // Arrange - guarantee OTHER is non-empty via an owned fixture
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-remove-non-empty',
      ForumDiscussionCategory.Other,
      TestUser.GLOBAL_ADMIN
    );
    fixtureDiscId = created?.data?.createDiscussion?.id ?? '';
    expect(fixtureDiscId).not.toEqual('');

    // Act
    const res = await adminRemoveForumDiscussionCategory(
      'OTHER',
      TestUser.GLOBAL_ADMIN
    );
    const categories = await getPlatformForumDiscussionCategories();

    // Assert
    expect(res?.body?.data?.adminForumRemoveDiscussionCategory).toBeFalsy();
    expect(res?.body?.errors?.[0]?.extensions?.code).toEqual(
      'FORUM_DISCUSSION_CATEGORY_NOT_EMPTY'
    );
    const message = String(res?.body?.errors?.[0]?.message ?? '');
    const countMatch = message.match(/\d+/);
    expect(countMatch).not.toBeNull();
    expect(Number(countMatch?.[0])).toBeGreaterThanOrEqual(1);
    expect(categories).toContain('OTHER');
  });
});
