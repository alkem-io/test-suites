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

  test('negative: no role user holds a privilege of another family at platform level', async () => {
    // Slice B: the catch-all `PLATFORM_ADMIN` no longer exists (L2 proves it),
    // so contamination can only show as a family privilege the role does not
    // own. The precise per-family grant sets are asserted by
    // rules/grantability.it-spec.ts; this is the cheap tripwire that runs first.
    const offenders: string[] = [];
    for (const role of PLATFORM_ROLES) {
      const { platform } = await readPrivileges(ctx.tokens[role]);
      if (platform.includes('PLATFORM_ADMIN'))
        offenders.push(`${emailOf(role)} holds the PLATFORM_ADMIN privilege`);
      if (
        role !== 'PLATFORM_CONTENT_FULL_ACCESS' &&
        platform.includes('PLATFORM_CONTENT_FULL_ACCESS')
      )
        offenders.push(`${emailOf(role)} holds PLATFORM_CONTENT_FULL_ACCESS`);
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * SC-005 / FR-012 — after Slice B the legacy global-role model is gone from the
 * schema itself: no enum value, no privilege, no role-set entry. Asserted by
 * introspection because this repo has no database access; a retired value that
 * survived in the schema would be a live legacy grant path (FR-007(d)).
 */
describe('L2.legacy-roles-gone', () => {
  const LEGACY_ROLE_NAMES = [
    'GLOBAL_ADMIN',
    'GLOBAL_SUPPORT',
    'GLOBAL_LICENSE_MANAGER',
    'GLOBAL_COMMUNITY_READER',
    'GLOBAL_SPACES_READER',
    'GLOBAL_PLATFORM_MANAGER',
    'GLOBAL_SUPPORT_MANAGER',
    'PLATFORM_BETA_TESTER',
    'PLATFORM_VC_CAMPAIGN',
    'PLATFORM_ASSISTANT_ACCESS',
  ];
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
  const ENUM =
    'query($name: String!) { __type(name: $name) { enumValues { name } } }';
  const valuesOf = async (name: string): Promise<string[]> =>
    (
      await rawRead<{ __type: { enumValues: { name: string }[] } }>(
        ctx.tokens.PLATFORM_AUDIT_READER,
        ENUM,
        { name }
      )
    ).__type.enumValues.map(v => v.name);

  test('negative: RoleName lists none of the 10 legacy role names', async () => {
    const values = await valuesOf('RoleName');
    expect(values.filter(v => LEGACY_ROLE_NAMES.includes(v))).toEqual([]);
    expect(values).toEqual(expect.arrayContaining([...PLATFORM_ROLES]));
  });

  test('negative: AuthorizationCredential and CredentialType list none of the 10 legacy credentials', async () => {
    const credentials = await valuesOf('AuthorizationCredential');
    expect(
      credentials.filter(v => LEGACY_CREDENTIALS.includes(v))
    ).toEqual([]);
    const types = await valuesOf('CredentialType');
    expect(
      types.filter(v => LEGACY_ROLE_NAMES.includes(v) || v === 'GLOBAL_COMMUNITY_READER')
    ).toEqual([]);
  });

  test('negative: the god-mode privileges are gone and the assigner privilege is PLATFORM_ROLES_ASSIGN', async () => {
    const privileges = await valuesOf('AuthorizationPrivilege');
    expect(privileges).not.toContain('PLATFORM_ADMIN');
    expect(privileges).not.toContain('GRANT_GLOBAL_ADMINS');
    expect(privileges).toContain('PLATFORM_ROLES_ASSIGN');
  });

  test('negative: the platform role-set offers only the 14 target roles and REGISTERED', async () => {
    const { platform } = await rawRead<{
      platform: { roleSet: { roleNames: string[] } };
    }>(
      ctx.tokens.PLATFORM_ROLES_ADMIN,
      'query { platform { roleSet { roleNames } } }'
    );
    expect([...platform.roleSet.roleNames].sort()).toEqual(
      [...PLATFORM_ROLES, 'REGISTERED'].sort()
    );
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

  test('negative: cannot change visibility — holds UPDATE on the space, adminUpdateSpaceVisibility is refused, visibility stays ACTIVE', async () => {
    expect(
      (await spaceAsSeenBy(contentFullAccess)).authorization.myPrivileges
    ).toContain('UPDATE');
    const outcome = await rawOutcome(
      ['adminUpdateSpaceVisibility'],
      contentFullAccess,
      'mutation($id: UUID!) { adminUpdateSpaceVisibility(updateData: { spaceID: $id, visibility: ARCHIVED }) { id } }',
      { id: spaceId }
    );
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    expect((await spaceAsSeenBy(host.token)).visibility).toBe('ACTIVE');
  });
});
