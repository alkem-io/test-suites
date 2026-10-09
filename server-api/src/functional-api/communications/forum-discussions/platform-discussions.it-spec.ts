import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  localStack,
  registerTestUser,
  getUserToken,
  postGraphqlRaw,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
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
  getDiscussionIdentity,
} from '../communication.params';
import { delay } from '@alkemio/tests-lib';
import { ForumDiscussionCategory } from '@alkemio/client-lib/dist/types/alkemio-schema';
import {
  harnessPostgresConfigured,
  queryHarnessDb,
} from '@alkemio/tests-lib';

/** Narrow a raw GraphQL error's `extensions.code` without an `unknown`
 * member-access error — `postGraphqlRaw`'s `errors` are typed as
 * `Record<string, unknown>`, matching the convention in
 * `account-deletion-portable.it-spec.ts`. */
const errorCode = (
  errors: Array<Record<string, unknown>> | undefined
): string | undefined =>
  (errors?.[0]?.extensions as { code?: string } | undefined)?.code;

type AuditRow = {
  initiatorUserId: string | null;
  outcome: string;
  details: {
    action?: string;
    target?: Record<string, unknown>;
    error?: string;
  } | null;
};

const auditRowsSince = async (
  action: string,
  t0: Date,
  initiatorUserId?: string
): Promise<AuditRow[]> => {
  const params: unknown[] = [action, t0.toISOString()];
  let sql = `SELECT "initiatorUserId", outcome, details
             FROM platform_audit_entry
             WHERE category = 'platform_operations'
               AND details->>'action' = $1
               AND "createdDate" >= $2`;
  if (initiatorUserId) {
    params.push(initiatorUserId);
    sql += ' AND "initiatorUserId" = $3';
  }
  return queryHarnessDb<AuditRow>(sql, params);
};

let platformDiscussionId = '';
let discussionId = '';
let discussionCommentsId = '';
let messageId = '';
// 027-platform-role-redesign (A15, T049): forum discussion update/delete are
// gated on PLATFORM_FORUM_MANAGE, not on ordinary UPDATE/DELETE. The privilege
// has to be its own non-CRUD one, otherwise the root content cascade would let
// `platform-content-full-access` reach the forum — a role the spec explicitly
// denies it to. The DENIAL these cases assert is unchanged; only the privilege
// named in the message moved.
const errorAuthDiscussionUpdate =
  "Authorization: unable to grant 'platform-forum-manage' privilege: Update discussion: ";
const errorAuthDiscussionDelete =
  "Authorization: unable to grant 'platform-forum-manage' privilege: delete discussion: ";
const errorAuthDiscussionMessageDelete =
  "Authorization: unable to grant 'delete' privilege: room remove message: ";

// The two categories below are not yet in the checked-in generated SDK enum
// (it predates this delivery's server change), but GraphQL enums travel by
// wire name, so a plain string cast round-trips correctly against a server
// that has them. See the note beside the helpers in communication.params.ts.
// Declared at file scope (moved from the bottom, U-4) so every describe
// block below — including the canonical-order and forum-manage-gate cases —
// can reference the full vocabulary.
const NEWSLETTER = 'NEWSLETTER' as ForumDiscussionCategory;
const TIPS_AND_TRICKS = 'TIPS_AND_TRICKS' as ForumDiscussionCategory;
// Declaration order (D-09) is the platform's canonical display order — see
// server `common/enums/forum.discussion.category.ts`. Do not alphabetise.
const CANONICAL: ForumDiscussionCategory[] = [
  ForumDiscussionCategory.Releases,
  NEWSLETTER,
  TIPS_AND_TRICKS,
  ForumDiscussionCategory.Help,
  ForumDiscussionCategory.PlatformFunctionalities,
  ForumDiscussionCategory.CommunityBuilding,
  ForumDiscussionCategory.ChallengeCentric,
  ForumDiscussionCategory.Other,
];

// U-3: this file's beforeAll used to delete EVERY platform discussion,
// including other files' fixtures (e.g. the 061 reconcile file's persistent
// `qa-forum-reconcile-fixture`) and, on a shared/ACC environment, real
// curated posts (R2, H-1, H-6, H-9). Scope cleanup to titles this file
// itself ever creates.
const OWNED_TITLE_PATTERNS: RegExp[] = [
  /^test$/,
  /^Updated$/,
  /^Updated\d$/,
  /^category-reorg-/,
];
const isOwnedTitle = (title: string): boolean =>
  OWNED_TITLE_PATTERNS.some(pattern => pattern.test(title));

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'platform-discussions',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await getPlatformForumData();
  platformDiscussionId = res?.data?.platform.forum.id ?? '';

  // Clean up any leftover discussions this file itself may have left behind
  // from a previous run, to avoid "displayName is already taken" conflicts.
  // Scoped to this file's own titles only (U-3) — never a blanket sweep.
  const existingDiscs = await getPlatformDiscussionsData();
  const discussions = existingDiscs?.data?.platform.forum.discussions ?? [];
  for (const disc of discussions) {
    if (isOwnedTitle(disc.profile?.displayName ?? '')) {
      await deleteDiscussion(disc.id);
    }
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
            ForumDiscussionCategory.Help,
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
    expect(res?.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
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
    expect(res?.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
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

  // U-1 (FR-019/D-09, R1/R10): the pre-existing assertion
  // (`toHaveLength(8)`) would go red on the very first retirement. The
  // active list is instead pinned as a canonical-order SUBSEQUENCE led by
  // the four permanent target categories — true today (all 8 active) and
  // true after any legacy category (PLATFORM_FUNCTIONALITIES,
  // COMMUNITY_BUILDING, CHALLENGE_CENTRIC, OTHER) is retired. The order is
  // NOT derived from the generated TS enum, which is alphabetical.
  test('The active category list is a canonical-order subsequence led by the four target categories', async () => {
    // Act
    const categories = await getPlatformForumDiscussionCategories();

    // Assert
    expect(categories).toBeDefined();
    const list = categories ?? [];
    for (const value of list) {
      expect(CANONICAL).toContain(value);
    }
    expect(list).toEqual(CANONICAL.filter(category => list.includes(category)));
    expect(list.slice(0, 4)).toEqual([
      'RELEASES',
      'NEWSLETTER',
      'TIPS_AND_TRICKS',
      'HELP',
    ]);
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.length).toBeLessThanOrEqual(8);
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

  test('Platform Support (holder of PLATFORM_FORUM_MANAGE) moves a post into Newsletter', async () => {
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

  // N-1 (US2-AS7, R9): recategorising must not disturb the post's identity —
  // nameID, permalink and its comment thread all survive the move.
  test('Recategorising a post keeps its comments and permalink (US2-AS7)', async () => {
    // Arrange
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-keeps-comments',
      ForumDiscussionCategory.Help,
      TestUser.GLOBAL_ADMIN
    );
    discId = created?.data?.createDiscussion?.id ?? '';
    const commentsId = created?.data?.createDiscussion?.comments?.id ?? '';
    await sendMessageToRoom(commentsId, 'kept message');

    const before = await getDiscussionIdentity(discId);
    const beforeDiscussion =
      before?.body?.data?.platform?.forum?.discussion;
    expect(beforeDiscussion?.comments?.messagesCount).toEqual(1);

    // Act
    await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
      category: TIPS_AND_TRICKS,
    });
    const after = await getDiscussionIdentity(discId);
    const afterDiscussion = after?.body?.data?.platform?.forum?.discussion;

    // Assert
    expect(afterDiscussion?.category).toEqual('TIPS_AND_TRICKS');
    expect(afterDiscussion?.nameID).toEqual(beforeDiscussion?.nameID);
    expect(afterDiscussion?.profile?.url).toEqual(beforeDiscussion?.profile?.url);
    expect(afterDiscussion?.comments?.id).toEqual(beforeDiscussion?.comments?.id);
    expect(afterDiscussion?.comments?.messagesCount).toEqual(1);
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
    // Arrange - guarantee HELP is non-empty via an owned fixture, so that
    // even a total authorization-gate bypass still cannot commit the
    // removal (the NOT_EMPTY guard is the second line of defence here).
    // HELP (not OTHER, U-4): a permanent target category, so this fixture's
    // precondition survives any future retirement of a legacy category.
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-remove-non-admin-negative',
      ForumDiscussionCategory.Help,
      TestUser.GLOBAL_ADMIN
    );
    fixtureDiscId = created?.data?.createDiscussion?.id ?? '';
    expect(fixtureDiscId).not.toEqual('');

    // Pin the baseline to a successful read: `getPlatformForumDiscussionCategories`
    // resolves to `undefined` when the query fails, and `undefined === undefined`
    // would make the unchanged-list assertion below pass vacuously.
    const before = await getPlatformForumDiscussionCategories();
    expect(before).toContain('HELP');

    // Act
    const res = await adminRemoveForumDiscussionCategory(
      'HELP',
      TestUser.QA_USER
    );
    const after = await getPlatformForumDiscussionCategories();

    // Assert
    expect(res?.body?.data?.adminForumRemoveDiscussionCategory).toBeFalsy();
    expect(res?.body?.errors?.[0]?.extensions?.code).toEqual(
      'FORBIDDEN_POLICY'
    );
    expect(after).toEqual(before);
  });

  test('Admin cannot remove a category that still holds a post; the count is in the error and the category stays active', async () => {
    // Arrange - guarantee HELP is non-empty via an owned fixture (U-4)
    const created = await createDiscussion(
      platformDiscussionId,
      'category-reorg-remove-non-empty',
      ForumDiscussionCategory.Help,
      TestUser.GLOBAL_ADMIN
    );
    fixtureDiscId = created?.data?.createDiscussion?.id ?? '';
    expect(fixtureDiscId).not.toEqual('');

    // Act
    const res = await adminRemoveForumDiscussionCategory(
      'HELP',
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
    expect(categories).toContain('HELP');
  });
});

// N-3 (FR-006/FR-012, R4/R2): after 027 moved every forum gate onto
// PLATFORM_FORUM_MANAGE, GLOBAL_SUPPORT_ADMIN keeps it (legacy reach
// preserved) but GLOBAL_LICENSE_ADMIN lost it. TIPS_AND_TRICKS is a public
// category for both personas (only RELEASES/NEWSLETTER are admin-only).
describe('Forum-manage gate for legacy personas after 027 (N-3)', () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteDiscussion(id);
    }
  });

  test.each`
    persona                          | releasesExpected      | newsletterExpected    | removeExpected
    ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${'allowed'}          | ${'allowed'}          | ${'FORUM_DISCUSSION_CATEGORY_NOT_EMPTY'}
    ${TestUser.GLOBAL_LICENSE_ADMIN} | ${'FORBIDDEN_POLICY'} | ${'FORBIDDEN_POLICY'} | ${'FORBIDDEN_POLICY'}
  `(
    '$persona — create RELEASES=$releasesExpected, NEWSLETTER=$newsletterExpected, TIPS_AND_TRICKS=allowed, remove HELP=$removeExpected',
    async ({ persona, releasesExpected, newsletterExpected, removeExpected }) => {
      // create RELEASES
      const releasesRes = await createDiscussion(
        platformDiscussionId,
        `category-reorg-n3-releases-${persona}`,
        ForumDiscussionCategory.Releases,
        persona
      );
      if (releasesExpected === 'allowed') {
        expect(releasesRes?.data?.createDiscussion?.category).toEqual('RELEASES');
        if (releasesRes?.data?.createDiscussion?.id) {
          createdIds.push(releasesRes.data.createDiscussion.id);
        }
      } else {
        expect(releasesRes?.data?.createDiscussion).toBeUndefined();
        expect(releasesRes?.error?.errors?.[0]?.code).toEqual(releasesExpected);
      }

      // create NEWSLETTER
      const newsletterRes = await createDiscussion(
        platformDiscussionId,
        `category-reorg-n3-newsletter-${persona}`,
        NEWSLETTER,
        persona
      );
      if (newsletterExpected === 'allowed') {
        expect(newsletterRes?.data?.createDiscussion?.category).toEqual(
          'NEWSLETTER'
        );
        if (newsletterRes?.data?.createDiscussion?.id) {
          createdIds.push(newsletterRes.data.createDiscussion.id);
        }
      } else {
        expect(newsletterRes?.data?.createDiscussion).toBeUndefined();
        expect(newsletterRes?.error?.errors?.[0]?.code).toEqual(
          newsletterExpected
        );
      }

      // create TIPS_AND_TRICKS — always allowed (public category)
      const tipsRes = await createDiscussion(
        platformDiscussionId,
        `category-reorg-n3-tips-${persona}`,
        TIPS_AND_TRICKS,
        persona
      );
      expect(tipsRes?.data?.createDiscussion?.category).toEqual(
        'TIPS_AND_TRICKS'
      );
      if (tipsRes?.data?.createDiscussion?.id) {
        createdIds.push(tipsRes.data.createDiscussion.id);
      }

      // remove HELP — owned non-empty fixture (H-1): read back non-null
      // immediately before the call, and confirm HELP is in the live list.
      const fixture = await createDiscussion(
        platformDiscussionId,
        `category-reorg-n3-help-fixture-${persona}`,
        ForumDiscussionCategory.Help,
        TestUser.GLOBAL_ADMIN
      );
      const fixtureId = fixture?.data?.createDiscussion?.id ?? '';
      createdIds.push(fixtureId);
      const readBack = await getPlatformDiscussionsDataById(fixtureId);
      expect(readBack?.data?.platform?.forum?.discussion?.id).toEqual(
        fixtureId
      );
      const before = await getPlatformForumDiscussionCategories();
      expect(before).toContain('HELP');

      const removeRes = await adminRemoveForumDiscussionCategory(
        'HELP',
        persona
      );
      const after = await getPlatformForumDiscussionCategories();

      expect(removeRes?.body?.data?.adminForumRemoveDiscussionCategory).toBeFalsy();
      expect(removeRes?.body?.errors?.[0]?.extensions?.code).toEqual(
        removeExpected
      );
      expect(after).toEqual(before);
    }
  );
});

// N-4 (US2-AS4/US3-AS2, conditional EP): only meaningful once a category has
// actually been retired from the active list. Locally (all 8 active) this
// self-skips — see forum-discussions-test-plan.md's build sheet, "locally it
// skips today".
describe('Inactive category is refused on create and move (N-4)', () => {
  let fixtureDiscId = '';

  afterEach(async () => {
    if (fixtureDiscId) {
      await deleteDiscussion(fixtureDiscId);
      fixtureDiscId = '';
    }
  });

  test('create and move into a retired category are refused; a live category still accepts', async ctx => {
    const active = (await getPlatformForumDiscussionCategories()) ?? [];
    const inactive = CANONICAL.filter(
      category => !active.includes(category)
    );
    if (inactive.length === 0) {
      ctx.skip();
      return;
    }
    const retired = inactive[0];

    // Step 1: create refused
    const createRes = await createDiscussion(
      platformDiscussionId,
      'category-reorg-n4-inactive-create',
      retired,
      TestUser.GLOBAL_ADMIN
    );
    expect(createRes?.data?.createDiscussion).toBeUndefined();
    expect(createRes?.error?.errors?.[0]?.code).toEqual(
      'FORUM_DISCUSSION_CATEGORY'
    );

    // Step 2: move a HELP fixture into it, refused, fixture stays HELP
    const fixture = await createDiscussion(
      platformDiscussionId,
      'category-reorg-n4-fixture',
      ForumDiscussionCategory.Help,
      TestUser.GLOBAL_ADMIN
    );
    fixtureDiscId = fixture?.data?.createDiscussion?.id ?? '';

    const moveRes = await updateDiscussion(fixtureDiscId, TestUser.GLOBAL_ADMIN, {
      category: retired,
    });
    expect(moveRes?.error?.errors?.[0]?.code).toEqual(
      'FORUM_DISCUSSION_CATEGORY'
    );
    const stillHelp = await getPlatformDiscussionsDataById(fixtureDiscId);
    expect(stillHelp?.data?.platform?.forum?.discussion?.category).toEqual(
      'HELP'
    );

    // Step 3: positive control — the same fixture CAN move to a live category
    const movedRes = await updateDiscussion(fixtureDiscId, TestUser.GLOBAL_ADMIN, {
      category: TIPS_AND_TRICKS,
    });
    expect(movedRes?.data?.updateDiscussion?.category).toEqual(
      'TIPS_AND_TRICKS'
    );
  });
});

// N-5, N-6 (FR-007/FR-007a, R3, local Postgres only): the read-side drift
// filter. An unrecognised value planted directly on the forum's active-list
// column, or on a discussion row's category column, must never break the
// forum query — it is filtered from the active list, and a discussion
// carrying it reads as OTHER.
describe('Forum category drift — unknown stored values (N-5, N-6, local Postgres)', () => {
  test.skipIf(!harnessPostgresConfigured())(
    'N-5: an unknown value appended to the active-list column is filtered from every read',
    async () => {
      const rows = await queryHarnessDb<{
        id: string;
        discussionCategories: string | null;
      }>(
        `SELECT f.id, f."discussionCategories" FROM forum f
         INNER JOIN platform p ON p."forumId" = f.id`
      );
      const forumRow = rows[0];
      expect(forumRow).toBeDefined();
      const original = forumRow.discussionCategories ?? '';
      // Logged so the column can be restored by hand if this run dies
      // between the plant and the restore (build sheet N-5 hazard note).
       
      console.log(
        `[N-5] logging original forum.discussionCategories for restore: ${JSON.stringify(original)} (forum id ${forumRow.id})`
      );

      // Pin the pre-plant baseline via the same GraphQL read the assertions
      // below compare against (H-2: never assert an absolute list, only
      // "unchanged").
      const beforeList = await getPlatformForumDiscussionCategories();
      expect(beforeList).toBeDefined();

      try {
        await queryHarnessDb(
          'UPDATE forum SET "discussionCategories" = $1 WHERE id = $2',
          [`${original},qa-drift-unknown`, forumRow.id]
        );

        const asGa = await getPlatformForumDiscussionCategories(
          TestUser.GLOBAL_ADMIN
        );
        const asQa = await getPlatformForumDiscussionCategories(
          TestUser.QA_USER
        );
        const discussions = await getPlatformDiscussionsData();

        // The planted value must never surface — the read-side list stays
        // exactly what it was before the plant, for every reader.
        expect(asGa).toEqual(beforeList);
        expect(asQa).toEqual(beforeList);
        expect(discussions?.data?.platform.forum.discussions).toBeDefined();
      } finally {
        await queryHarnessDb(
          'UPDATE forum SET "discussionCategories" = $1 WHERE id = $2',
          [original, forumRow.id]
        );
        const restored = await queryHarnessDb<{
          discussionCategories: string | null;
        }>('SELECT "discussionCategories" FROM forum WHERE id = $1', [
          forumRow.id,
        ]);
        expect(restored[0]?.discussionCategories).toEqual(original);
      }
    }
  );

  test.skipIf(!harnessPostgresConfigured())(
    'N-6: a discussion row with an unrecognised stored category reads as OTHER, and can still be recategorised',
    async () => {
      const created = await createDiscussion(
        platformDiscussionId,
        'category-reorg-drift',
        ForumDiscussionCategory.Help,
        TestUser.GLOBAL_ADMIN
      );
      const discId = created?.data?.createDiscussion?.id ?? '';
      expect(discId).not.toEqual('');

      try {
        await queryHarnessDb(
          'UPDATE discussion SET category = $1 WHERE id = $2',
          ['qa-drift-unknown', discId]
        );

        const readBack = await getPlatformDiscussionsDataById(discId);
        expect(readBack?.data?.platform?.forum?.discussion?.category).toEqual(
          'OTHER'
        );
        const list = await getPlatformDiscussionsData();
        const ids =
          list?.data?.platform.forum.discussions?.map(d => d.id) ?? [];
        expect(ids).toContain(discId);

        const moved = await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
          category: TIPS_AND_TRICKS,
        });
        expect(moved?.data?.updateDiscussion?.category).toEqual(
          'TIPS_AND_TRICKS'
        );
      } finally {
        await deleteDiscussion(discId);
      }
    }
  );
});

// N-9 (remove-category half only, local Postgres): the recategorise-audit
// and reconcile-audit sub-cases live in `forum-audit.it-spec.ts`. These two
// stay here because H-1 rule 2 confines every call to
// `adminForumRemoveDiscussionCategory` to this one file.
describe('Audit rows for the remove-category mutation (N-9, local Postgres)', () => {
  test.skipIf(!harnessPostgresConfigured())(
    'GA removing a non-empty category writes one operation_failed row naming the category',
    async () => {
      const fixture = await createDiscussion(
        platformDiscussionId,
        'category-reorg-n9-remove-failed',
        ForumDiscussionCategory.Help,
        TestUser.GLOBAL_ADMIN
      );
      const fixtureId = fixture?.data?.createDiscussion?.id ?? '';
      try {
        const readBack = await getPlatformDiscussionsDataById(fixtureId);
        expect(readBack?.data?.platform?.forum?.discussion?.id).toEqual(
          fixtureId
        );

        const t0 = new Date();
        await adminRemoveForumDiscussionCategory('HELP', TestUser.GLOBAL_ADMIN);
        const rows = await auditRowsSince(
          'adminForumRemoveDiscussionCategory',
          t0
        );
        const helpRows = rows.filter(
          // GraphQL coerces the wire enum ('HELP') to its stored kebab-case
          // value ('help') before this resolver ever sees it — see server
          // `common/enums/forum.discussion.category.ts`.
          row => row.details?.target?.category === 'help'
        );
        expect(helpRows).toHaveLength(1);
        expect(helpRows[0].outcome).toEqual('operation_failed');
        expect(helpRows[0].details?.error).toContain('post(s) still carry it');
      } finally {
        await deleteDiscussion(fixtureId);
      }
    }
  );

  test.skipIf(!harnessPostgresConfigured())(
    'QA denied remove-category writes zero audit rows',
    async () => {
      const t0 = new Date();
      await adminRemoveForumDiscussionCategory('HELP', TestUser.QA_USER);
      const rows = await auditRowsSince(
        'adminForumRemoveDiscussionCategory',
        t0,
        TestUserManager.users.qaUser.id
      );
      expect(rows).toHaveLength(0);
    }
  );
});

// N-13 (061 US1-AS5, FR-012, R5, local): PLATFORM_OPERATIONS_ADMIN is granted
// the reconcile mutation on its own synthetic policy, but is explicitly NOT a
// forum manager — it must be refused on both the remove mutation (hence
// living in this file, H-1 rule 2) and on an admin-only create. `postGraphqlRaw`
// is used (not `communication.params.ts`'s TestUser-only helpers) because
// `forum.opsadmin` is a freshly registered, non-enum persona — same rationale
// as `graphql.raw.client.ts`'s own doc comment.
describe('PLATFORM_OPERATIONS_ADMIN persona (N-13, local)', () => {
  test.skipIf(!localStack())(
    'POA can reconcile but is not a forum manager (FR-012)',
    async () => {
      await registerTestUser('forum.opsadmin');
      const email = 'forum.opsadmin@alkem.io';
      const token = await getUserToken(email);
      const me = await postGraphqlRaw<{ me: { user: { id: string } } }>(
        'query { me { user { id } } }',
        { bearerToken: token }
      );
      const userId = me.body.data?.me.user.id;
      expect(userId).toBeDefined();

      try {
        await assignPlatformRole(
          userId!,
          RoleName.PlatformOperationsAdmin,
          TestUser.GLOBAL_ADMIN
        );

        // reconcile dry run — allowed
        const reconcileRes = await postGraphqlRaw<{
          adminCommunicationReconcileForumHierarchy: string;
        }>(
          'mutation { adminCommunicationReconcileForumHierarchy(reconcileData: { dryRun: true }) }',
          { bearerToken: token }
        );
        expect(
          reconcileRes.body.data?.adminCommunicationReconcileForumHierarchy
        ).toMatch(/^[0-9a-f-]{36}$/i);

        // remove HELP — owned non-empty fixture (H-1), refused
        const fixture = await createDiscussion(
          platformDiscussionId,
          'category-reorg-n13-help-fixture',
          ForumDiscussionCategory.Help,
          TestUser.GLOBAL_ADMIN
        );
        const fixtureId = fixture?.data?.createDiscussion?.id ?? '';
        try {
          const readBack = await getPlatformDiscussionsDataById(fixtureId);
          expect(readBack?.data?.platform?.forum?.discussion?.id).toEqual(
            fixtureId
          );

          const removeRes = await postGraphqlRaw<{
            adminForumRemoveDiscussionCategory: unknown;
          }>(
            'mutation { adminForumRemoveDiscussionCategory(removeData: { category: HELP }) { id } }',
            { bearerToken: token }
          );
          expect(
            removeRes.body.data?.adminForumRemoveDiscussionCategory
          ).toBeFalsy();
          expect(errorCode(removeRes.body.errors)).toEqual('FORBIDDEN_POLICY');

          // create in NEWSLETTER — refused
          const createRes = await postGraphqlRaw<{ createDiscussion: unknown }>(
            `mutation { createDiscussion(createData: { forumID: "${platformDiscussionId}", profile: { displayName: "category-reorg-n13-newsletter" }, category: NEWSLETTER }) { id } }`,
            { bearerToken: token }
          );
          expect(createRes.body.data?.createDiscussion).toBeFalsy();
          expect(errorCode(createRes.body.errors)).toEqual('FORBIDDEN_POLICY');
        } finally {
          if (fixtureId) await deleteDiscussion(fixtureId);
        }
      } finally {
        await removePlatformRole(
          userId!,
          RoleName.PlatformOperationsAdmin,
          TestUser.GLOBAL_ADMIN
        );
      }
    }
  );
});
