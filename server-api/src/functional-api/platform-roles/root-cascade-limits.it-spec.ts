import { describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { getUserData } from '@functional-api/contributor-management/user/user.request.params';
import { reportedForUser } from './helpers/privileges';
import { assertSingleRoleActor } from './helpers/single-role';
import {
  createDisposableSubject,
  destroyDisposableSubject,
} from './helpers/disposable-subject';
import { isAuthorizationDenial } from './surface-invocations';

/**
 * workspace#027-platform-role-redesign — handover case E5: the FR-004 root
 * cascade does NOT reach `deleteUser`.
 *
 * WHY THIS IS SOUND AT SLICE A, when almost no "role X cannot do Y" case is.
 * Slice A is additive — the legacy `GLOBAL_*` credentials still reach
 * everything — so a denial normally proves only that the actor lacked a
 * credential the test never named. This one is different, structurally:
 *
 *  * `deleteUser`'s legacy-admin branch checks `DELETE` against a
 *    RESOLVER-LOCAL, hardcoded `[GLOBAL_ADMIN]` policy
 *    (`registration.resolver.mutations.ts`, `legacyGlobalAdminDeleteUserPolicy`)
 *    — never against `user.authorization`.
 *  * Its second branch checks a resolver-local `[PLATFORM_USERS_ADMIN]` policy
 *    (`platformUsersAdminDeleteUserPolicy`).
 *  * A cascaded ROOT `DELETE` — which `platform-content-full-access` genuinely
 *    holds, and which this test PROVES it holds before asserting the denial —
 *    can therefore satisfy neither branch, and the fallback
 *    `grantAccessOrFail` throws `ForbiddenException` → `FORBIDDEN`.
 *
 * The denial comes from a resolver-local CREDENTIAL PIN, not from credential
 * absence. That is why this case belongs with the group-D rule-engine
 * negatives rather than the stage-B credential-absence negatives, and why it
 * gets its own file: the ~962-cell `role-action-matrix` puts a blanket
 * `it.skipIf(!isStageB())` on every DENY cell, so adding it there would mean
 * adding a case that does not run at Slice A. Do NOT move it there.
 */

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

describe('root-cascade limits (E5, A5/FR-004/SC-004)', () => {
  it('a single-role Platform Content Full Access holder cannot deleteUser despite holding a cascaded root DELETE', async () => {
    const reported = await reportedForUser(
      TestUser.PLATFORM_CONTENT_FULL_ACCESS
    );
    // INSIDE the test, not in setup: the read that proves the actor's shape
    // must be the same read the assertion below is reasoning about.
    assertSingleRoleActor(reported, RoleName.PlatformContentFullAccess);
    expect(
      reported.platform,
      'the root DELETE cascade does not reach this actor at all — the denial below would then be about a missing privilege rather than about the resolver-local credential pin, and would prove nothing'
    ).toContain('DELETE');

    const victim = await createDisposableSubject('root-cascade-victim');
    try {
      // Every expected-denial call goes through `asUser`: the raw generated
      // SDK throws a `ClientError` on any GraphQL error response instead of
      // returning `{ data, errors }`, so an unwrapped call dies before the
      // assertion runs.
      const result = await asUser(
        token =>
          getGraphqlClient().deleteUser(
            { deleteData: { ID: victim.id, deleteIdentity: true } },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(
        isAuthorizationDenial(result.error?.errors),
        'deleteUser was not refused as an authorization denial for a Content Full Access holder'
      ).toBe(true);

      // ...and it took no effect. Read back as GLOBAL_ADMIN, never as the
      // Content Full Access actor: that actor's own root READ would make this
      // read succeed for a reason unrelated to the delete.
      const readBack = await getUserData(victim.id, TestUser.GLOBAL_ADMIN);
      expect(
        readBack.data?.user?.id,
        'the refused deleteUser still removed the user'
      ).toBe(victim.id);
    } finally {
      await destroyDisposableSubject(victim.id);
    }
  });
});
