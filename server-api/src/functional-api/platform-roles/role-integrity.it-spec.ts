import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from './capabilities.data';
import {
  createDisposableUser,
  deleteDisposableUser,
} from './_support/disposable-user';
import type { DisposableUser } from './_support/disposable-user';
import { describeOutcome } from './_support/outcome';
import { readPrivileges } from './_support/privileges';
import { rawOutcome } from './_support/raw-outcome';
import { rawRead } from './_support/raw-request';
import { emailOf } from './_support/role-users';

const ctx = inject('platformRoles');

/**
 * The premise of every "this role is refused" in the suite: each of the 14 test
 * users holds exactly its one role and nothing inherited from the old model.
 * globalSetup already refuses to start on a contaminated user; this is the same
 * check as a reported result, so a plan reader sees it was made.
 */
describe('X1.single-role-fixtures', () => {
  // The ten credentials of the legacy global-role model.
  const LEGACY_CREDENTIALS = [
    'GLOBAL_ADMIN',
    'GLOBAL_SUPPORT',
    'GLOBAL_LICENSE_MANAGER',
    'GLOBAL_SPACES_READER',
    'GLOBAL_COMMUNITY_READ',
    'GLOBAL_PLATFORM_MANAGER',
    'GLOBAL_SUPPORT_MANAGER',
    'BETA_TESTER',
    'VC_CAMPAIGN',
    'ASSISTANT_ACCESS',
  ];
  const HOLDERS =
    'query($type: AuthorizationCredential!) { usersWithAuthorizationCredential(credentialsCriteriaData: { type: $type }) { id } }';

  test('positive: every role user’s myRoles is exactly [its role, REGISTERED]', async () => {
    const held: Record<string, string[]> = {};
    const expected: Record<string, string[]> = {};
    for (const role of PLATFORM_ROLES) {
      held[emailOf(role)] = (
        await readPrivileges(ctx.tokens[role])
      ).myRoles.sort();
      expected[emailOf(role)] = [role, 'REGISTERED'].sort();
    }
    expect(held).toEqual(expected);
  });

  test('negative: no role user holds PLATFORM_ADMIN or a legacy global credential', async () => {
    const offenders: string[] = [];
    const emailById = new Map(
      PLATFORM_ROLES.map(r => [ctx.userIds[r], emailOf(r)])
    );

    for (const role of PLATFORM_ROLES) {
      const { platform } = await readPrivileges(ctx.tokens[role]);
      if (platform.includes('PLATFORM_ADMIN'))
        offenders.push(`${emailOf(role)} holds the PLATFORM_ADMIN privilege`);
    }
    for (const type of LEGACY_CREDENTIALS) {
      const { usersWithAuthorizationCredential: holders } = await rawRead<{
        usersWithAuthorizationCredential: { id: string }[];
      }>(ctx.tokens.PLATFORM_ROLES_ADMIN, HOLDERS, { type });
      for (const { id } of holders) {
        if (emailById.has(id))
          offenders.push(`${emailById.get(id)} holds the ${type} credential`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * Platform Content Full Access reaches every piece of content through one rule
 * at the root of the authorization tree. That cascade must stop at content:
 * each negative below first PROVES the cascaded privilege is held on the very
 * entity, then shows the administrative action on it is still refused.
 */
describe('X2.root-cascade-limits', () => {
  const contentFullAccess = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;
  let host: DisposableUser;
  let spaceId: string | undefined;
  let discussionId: string | undefined;

  const HOST_ROLE = (verb: 'assign' | 'remove') =>
    `mutation($id: UUID!) { ${verb}PlatformRole${verb === 'assign' ? 'To' : 'From'}User(roleData: { actorID: $id, role: FEATURE_BETA_TESTER }) { id } }`;
  const SPACE =
    'query($id: UUID!) { lookup { space(ID: $id) { visibility authorization { myPrivileges } community { roleSet { myRoles } } } } }';
  const DISCUSSION =
    'query { platform { forum { discussions { id authorization { myPrivileges } } } } }';

  const spaceAsSeenBy = async (token: string) =>
    (
      await rawRead<{
        lookup: {
          space: {
            visibility: string;
            authorization: { myPrivileges: string[] };
            community: { roleSet: { myRoles: string[] } };
          };
        };
      }>(token, SPACE, { id: spaceId })
    ).lookup.space;

  const discussionAsSeenBy = async (token: string) =>
    (
      await rawRead<{
        platform: {
          forum: {
            discussions: {
              id: string;
              authorization: { myPrivileges: string[] };
            }[];
          };
        };
      }>(token, DISCUSSION)
    ).platform.forum.discussions.find(d => d.id === discussionId);

  beforeAll(async () => {
    // A registered user hosts a space and opens a forum discussion; Content
    // Full Access is a stranger to both. Feature Beta Tester is what entitles
    // the host's account to a space — granted by Users Admin, whose job it is.
    host = await createDisposableUser(ctx, 'x2');
    await rawRead(ctx.tokens.PLATFORM_USERS_ADMIN, HOST_ROLE('assign'), {
      id: host.id,
    });
    const { me, platform } = await rawRead<{
      me: { user: { account: { id: string } } };
      platform: { forum: { id: string } };
    }>(
      host.token,
      'query { me { user { account { id } } } platform { forum { id } } }'
    );

    const space = await rawRead<{ createSpace: { id: string } }>(
      host.token,
      'mutation($data: CreateSpaceOnAccountInput!) { createSpace(spaceData: $data) { id } }',
      {
        data: {
          accountID: me.user.account.id,
          nameID: `pr-x2-${ctx.runId}`.slice(0, 25),
          about: {
            profileData: { displayName: `platform-roles X2 ${ctx.runId}` },
          },
          collaborationData: {
            addTutorialCallouts: false,
            calloutsSetData: {},
          },
        },
      }
    );
    spaceId = space.createSpace.id;

    const discussion = await rawRead<{ createDiscussion: { id: string } }>(
      host.token,
      'mutation($data: ForumCreateDiscussionInput!) { createDiscussion(createData: $data) { id } }',
      {
        data: {
          forumID: platform.forum.id,
          category: 'HELP',
          profile: {
            displayName: `platform-roles X2 ${ctx.runId}`,
            description: 'fixture',
          },
        },
      }
    );
    discussionId = discussion.createDiscussion.id;
    // Creating a space alone takes 20–30 s on a busy stack.
  }, 300_000);

  // Removes whatever beforeAll got as far as creating.
  afterAll(async () => {
    if (discussionId) {
      await rawRead(
        ctx.tokens.PLATFORM_SUPPORT,
        'mutation($id: UUID!) { deleteDiscussion(deleteData: { ID: $id }) { id } }',
        { id: discussionId }
      );
    }
    if (spaceId) {
      await rawRead(
        contentFullAccess,
        'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }',
        { id: spaceId }
      );
    }
    await rawRead(ctx.tokens.PLATFORM_USERS_ADMIN, HOST_ROLE('remove'), {
      id: host.id,
    });
    await deleteDisposableUser(ctx, host);
  });

  test('positive: holds DELETE on a space it has no membership in', async () => {
    const space = await spaceAsSeenBy(contentFullAccess);
    expect(space.community.roleSet.myRoles).toEqual([]);
    expect(space.authorization.myPrivileges).toEqual(
      expect.arrayContaining(['CREATE', 'READ', 'UPDATE', 'DELETE'])
    );
  });

  test('negative: cannot assign a role — neither a platform role nor a role in that space', async () => {
    const platformGrant = await rawOutcome(
      ['assignPlatformRoleToUser'],
      contentFullAccess,
      'mutation($id: UUID!) { assignPlatformRoleToUser(roleData: { actorID: $id, role: FEATURE_VC_CAMPAIGN }) { id } }',
      { id: host.id }
    );
    expect(platformGrant.kind, describeOutcome(platformGrant)).toBe('denied');
    expect((await readPrivileges(host.token)).myRoles).not.toContain(
      'FEATURE_VC_CAMPAIGN'
    );

    const { lookup } = await rawRead<{
      lookup: { space: { community: { roleSet: { id: string } } } };
    }>(
      contentFullAccess,
      'query($id: UUID!) { lookup { space(ID: $id) { community { roleSet { id } } } } }',
      { id: spaceId }
    );
    const spaceGrant = await rawOutcome(
      ['assignRoleToUser'],
      contentFullAccess,
      'mutation($roleSetID: UUID!, $actorID: UUID!) { assignRoleToUser(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: ADMIN }) { id } }',
      {
        roleSetID: lookup.space.community.roleSet.id,
        actorID: ctx.userIds.PLATFORM_CONTENT_FULL_ACCESS,
      }
    );
    expect(spaceGrant.kind, describeOutcome(spaceGrant)).toBe('denied');
    expect(
      (await spaceAsSeenBy(contentFullAccess)).community.roleSet.myRoles
    ).toEqual([]);
  });

  test('negative: cannot manage the forum — holds DELETE on the discussion, deleteDiscussion is refused, the discussion stays', async () => {
    expect(
      (await discussionAsSeenBy(contentFullAccess))?.authorization.myPrivileges
    ).toContain('DELETE');
    const outcome = await rawOutcome(
      ['deleteDiscussion'],
      contentFullAccess,
      'mutation($id: UUID!) { deleteDiscussion(deleteData: { ID: $id }) { id } }',
      { id: discussionId }
    );
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    expect((await discussionAsSeenBy(host.token))?.id).toBe(discussionId);
  });

  test('negative: cannot change visibility — holds UPDATE on the space, updateSpacePlatformSettings is refused, visibility stays ACTIVE', async () => {
    expect(
      (await spaceAsSeenBy(contentFullAccess)).authorization.myPrivileges
    ).toContain('UPDATE');
    const outcome = await rawOutcome(
      ['updateSpacePlatformSettings'],
      contentFullAccess,
      'mutation($id: UUID!) { updateSpacePlatformSettings(updateData: { spaceID: $id, visibility: ARCHIVED }) { id } }',
      { id: spaceId }
    );
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    expect((await spaceAsSeenBy(host.token)).visibility).toBe('ACTIVE');
  });
});
