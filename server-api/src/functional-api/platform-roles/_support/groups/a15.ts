import { expect } from 'vitest';
import {
  AuthorizationPrivilege,
  ForumDiscussionCategory,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import {
  createHostedSpace,
  spaceHost,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead, rawRequest } from '../raw-request';
import { bearer } from '../types';
import type { GroupModule, PerRole } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A15 — support inside a flag-enabled space; manage the forum.
 * Owner: Platform Support.
 *
 * In-space support is a runtime CONDITION, not a mutation: on a space whose
 * host set `allowPlatformSupportAsAdmin`, Platform Support holds the space
 * admin privileges; on any other space it holds none. A privilege list cannot
 * be "denied" — it is only shorter — so the call under test is a read that the
 * server itself guards with one of those privileges: the pending applications
 * of the space's community (GRANT). Platform Support gets the list; every other
 * role gets the server's own authorization error. The positive then reads the
 * privilege list on BOTH spaces.
 *
 * Both spaces are PRIVATE and hosted by a disposable user, so no role reaches
 * them through membership, hosting or public visibility.
 */
type A15 = {
  host: DisposableUser;
  flaggedSpaceId: string;
  plainSpaceId: string;
  /** Never deleted: the update target, and where every negative aims. */
  discussionToUpdate: string;
  discussionsToDelete: PerRole;
  updatedTitle: string;
};

const ADMIN_PRIVILEGES = [
  AuthorizationPrivilege.Create,
  AuthorizationPrivilege.Update,
  AuthorizationPrivilege.Delete,
  AuthorizationPrivilege.Grant,
];

// Negatives aim at the category of the discussion that outlives the run: the
// server refuses to remove a category that still holds a discussion, so even a
// broken gate could not make this permanent removal happen.
const CATEGORY = ForumDiscussionCategory.Other;

const DELETE = CAPABILITIES.find(c => c.id === 'A15.deleteDiscussion')!;

const FORUM = 'query { platform { forum { id } } }';
const CREATE_DISCUSSION =
  'mutation($createData: ForumCreateDiscussionInput!) { createDiscussion(createData: $createData) { id } }';
const DISCUSSION =
  'query($id: UUID!) { platform { forum { discussion(ID: $id) { profile { displayName } } } } }';
const DELETE_DISCUSSION =
  'mutation($id: UUID!) { deleteDiscussion(deleteData: { ID: $id }) { id } }';

type DiscussionRead = {
  platform: {
    forum: { discussion: { profile: { displayName: string } } | null };
  };
};

const discussion = (token: string, id: string) =>
  rawRequest<DiscussionRead>(token, DISCUSSION, { id });

const removeDiscussion = async (token: string, id: string) => {
  if ((await discussion(token, id)).data?.platform.forum.discussion) {
    await rawRead(token, DELETE_DISCUSSION, { id });
  }
};

export const A15_GROUP: GroupModule<A15> = {
  group: 'A15',

  build: ctx =>
    undoOnFailure(async undo => {
      const host = await spaceHost(ctx);
      undo(() => removeDisposableUser(ctx, host));
      const flaggedSpaceId = await createHostedSpace(ctx, host, 'support-on', {
        mode: 'PRIVATE',
        allowPlatformSupportAsAdmin: true,
      });
      const plainSpaceId = await createHostedSpace(ctx, host, 'support-off', {
        mode: 'PRIVATE',
        allowPlatformSupportAsAdmin: false,
      });

      // Any registered user may open a forum discussion; an author holds no
      // forum-management right over it, so authorship does not bend a negative.
      const author = ctx.tokens.FEATURE_BETA_TESTER;
      const { platform } = await rawRead<{
        platform: { forum: { id: string } };
      }>(author, FORUM);
      const open = async (tag: string) => {
        const { createDiscussion } = await rawRead<{
          createDiscussion: { id: string };
        }>(author, CREATE_DISCUSSION, {
          createData: {
            forumID: platform.forum.id,
            category: CATEGORY,
            profile: {
              displayName: `platform-roles ${tag} ${ctx.runId}`,
              description: 'platform-roles fixture',
            },
          },
        });
        undo(() =>
          removeDiscussion(ctx.tokens.PLATFORM_SUPPORT, createDiscussion.id)
        );
        return createDiscussion.id;
      };

      const discussionsToDelete: PerRole = {};
      for (const role of allowedRoles(DELETE)) {
        discussionsToDelete[role] = await open(`delete ${role.slice(-7)}`);
      }

      return {
        host,
        flaggedSpaceId,
        plainSpaceId,
        discussionToUpdate: await open('update'),
        discussionsToDelete,
        updatedTitle: `platform-roles updated ${ctx.runId}`,
      };
    }),

  teardown: async (ctx, _sdk, fx) => {
    for (const id of [
      fx.discussionToUpdate,
      ...Object.values(fx.discussionsToDelete),
    ]) {
      await removeDiscussion(ctx.tokens.PLATFORM_SUPPORT, id);
    }
    await removeDisposableUser(ctx, fx.host);
  },

  invocations: {
    'A15.getAccessPrivilegesForPlatformSupport': {
      gate: ['lookup', 'space', 'community', 'roleSet', 'applications'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesSpaceApplicationsProbe(
          { spaceId: fx.flaggedSpaceId },
          headers
        ),
      verify: async ({ ctx, fx, role, sdk }) => {
        const privilegesOn = async (spaceId: string) =>
          (
            await sdk.spaceSupportAdminPrivilegeProbe(
              { spaceId },
              bearer(ctx.tokens[role])
            )
          ).data.lookup.space?.authorization?.myPrivileges ?? [];

        expect(await privilegesOn(fx.flaggedSpaceId)).toEqual(
          expect.arrayContaining(ADMIN_PRIVILEGES)
        );
        const withoutFlag = await privilegesOn(fx.plainSpaceId);
        expect(withoutFlag.filter(p => ADMIN_PRIVILEGES.includes(p))).toEqual(
          []
        );
      },
    },
    'A15.updateDiscussion': {
      gate: ['updateDiscussion'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesUpdateDiscussion(
          {
            updateData: {
              ID: fx.discussionToUpdate,
              profileData: { displayName: fx.updatedTitle },
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (await discussion(ctx.tokens.PLATFORM_SUPPORT, fx.discussionToUpdate))
            .data?.platform.forum.discussion?.profile.displayName
        ).toBe(fx.updatedTitle),
    },
    'A15.deleteDiscussion': {
      gate: ['deleteDiscussion'],
      // `deleteDiscussion` looks the discussion up before it authorizes, so the
      // negatives aim at the one no positive ever deletes.
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesDeleteDiscussion(
          { deleteData: { ID: deleteTargetFor(fx, role) } },
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(
          (
            await discussion(
              ctx.tokens.PLATFORM_SUPPORT,
              deleteTargetFor(fx, role)
            )
          ).errors[0]?.extensions?.code
        ).toBe('ENTITY_NOT_FOUND'),
    },
    'A15.adminForumRemoveDiscussionCategory': {
      gate: ['adminForumRemoveDiscussionCategory'],
      call: (sdk, headers) =>
        sdk.adminForumRemoveDiscussionCategory(
          { removeData: { category: CATEGORY } },
          headers
        ),
    },
  },
};

const deleteTargetFor = (fx: A15, role: PlatformRole): string =>
  fx.discussionsToDelete[role] ?? fx.discussionToUpdate;
