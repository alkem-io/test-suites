import { describe, expect, inject } from 'vitest';
import {
  createDisposableUser,
  deleteDisposableUser,
} from '../_support/disposable-user';
import { countFor, mcpTest, recordsFor } from '../_support/mcp-client';
import { rawRead, rawRequest } from '../_support/raw-request';

/**
 * AR2, the platform-wide half: an operational action with NO subject (a
 * platform authorization reset) must not show up as self-affecting on the
 * operator who ran it.
 *
 * ON DEMAND ONLY. The reset recomputes every platform policy in place: tests
 * reading a policy meanwhile see it empty, and the reset itself failed with a
 * NOT NULL violation on `authorization_policy.type` when entities were created
 * and deleted beside it. Written and type-checked; NEVER executed as of
 * 2026-09-18.
 */
const platformRole = (verb: 'assign' | 'remove', role: string) =>
  `mutation($id: UUID!) { ${verb}PlatformRole${verb === 'assign' ? 'To' : 'From'}User(roleData: { actorID: $id, role: ${role} }) { id } }`;
const RESET_PLATFORM = 'mutation { authorizationPolicyResetOnPlatform { id } }';
const ROLES = ['PLATFORM_ROLES_ADMIN', 'PLATFORM_OPERATIONS_ADMIN'];

describe('AR2.self-affecting-predicate — platform-wide action', () => {
  mcpTest(
    'negative: a platform-wide reset writes nothing onto the trail of the operator who ran it',
    async () => {
      const ctx = inject('platformRoles');
      const auditReader = ctx.tokens.PLATFORM_AUDIT_READER;
      const operator = await createDisposableUser(ctx, 'ar2reset');
      try {
        for (const role of ROLES) {
          await rawRead(ctx.bootstrapToken, platformRole('assign', role), {
            id: operator.id,
          });
        }
        const before = await countFor(auditReader, operator.id);

        await rawRead(operator.token, RESET_PLATFORM);

        expect(await countFor(auditReader, operator.id)).toBe(before);
        expect(
          (await recordsFor(auditReader, operator.id)).filter(
            record => record.initiatorUserId === operator.id
          )
        ).toEqual([]);
      } finally {
        for (const role of ROLES) {
          await rawRequest(ctx.bootstrapToken, platformRole('remove', role), {
            id: operator.id,
          });
        }
        await deleteDisposableUser(ctx, operator);
      }
    }
  );
});
