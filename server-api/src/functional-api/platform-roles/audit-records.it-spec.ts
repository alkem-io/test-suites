import { describe, expect, inject } from 'vitest';
import { mcpTest, countFor, recordsFor } from './_support/mcp-client';
import type { AuditRecord } from './_support/mcp-client';
import {
  createDisposableUser,
  deleteDisposableUser,
} from './_support/disposable-user';
import { rawRead, rawRequest } from './_support/raw-request';

/**
 * What the platform WRITES to its audit trail, read back without a database:
 * through the MCP tool, as Platform Audit Reader. The tool filters by SUBJECT
 * user only, so every assertion is about a fresh, disposable subject whose
 * record count starts at a known number — never about "the newest row".
 */
const platformRole = (verb: 'assign' | 'remove', role: string) =>
  `mutation($id: UUID!) { ${verb}PlatformRole${verb === 'assign' ? 'To' : 'From'}User(roleData: { actorID: $id, role: ${role} }) { id } }`;

const ctx = inject('platformRoles');
const auditReader = ctx.tokens.PLATFORM_AUDIT_READER;

describe('AR1.grant-revoke-recorded', () => {
  mcpTest(
    'positive: a grant and a revoke each leave one record naming operator, authorizing role and outcome',
    async () => {
      const subject = await createDisposableUser(ctx, 'ar1');
      try {
        const before = await countFor(auditReader, subject.id);
        const rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;
        await rawRead(rolesAdmin, platformRole('assign', 'PLATFORM_SUPPORT'), {
          id: subject.id,
        });
        await rawRead(rolesAdmin, platformRole('remove', 'PLATFORM_SUPPORT'), {
          id: subject.id,
        });

        const records = await recordsFor(auditReader, subject.id);
        expect(records.length - before).toBe(2);
        const recorded = (outcome: string) => ({
          category: 'platform_role_assignment',
          outcome,
          initiatorRole: 'platform_roles_admin',
          initiatorUserId: ctx.userIds.PLATFORM_ROLES_ADMIN,
          details: { targetKind: 'user' },
        });
        // Newest first.
        expect(records[0]).toMatchObject(recorded('role_revoked'));
        expect(records[1]).toMatchObject(recorded('role_granted'));
        expect(String(records[0].details?.role)).toMatch(/platform.support/i);
      } finally {
        await deleteDisposableUser(ctx, subject);
      }
    }
  );
});

describe('AR2.self-affecting-predicate', () => {
  /** "Self-affecting" = the initiator is the subject. */
  const selfAffecting = (records: AuditRecord[], userId: string) =>
    records.filter(r => r.initiatorUserId === userId);

  // The actor is a DISPOSABLE second Roles Admin, granted by the break-glass
  // account: a rejected self-grant attempted by the shared Roles Admin user
  // would sit on that user's trail for every later run.
  const withSecondRolesAdmin = async (
    body: (
      operator: Awaited<ReturnType<typeof createDisposableUser>>
    ) => Promise<void>
  ): Promise<void> => {
    const operator = await createDisposableUser(ctx, 'ar2op');
    const roles = ['PLATFORM_ROLES_ADMIN'];
    try {
      for (const role of roles) {
        await rawRead(ctx.bootstrapToken, platformRole('assign', role), {
          id: operator.id,
        });
      }
      const selfGrant = await rawRequest(
        operator.token,
        platformRole('assign', 'PLATFORM_SUPPORT'),
        { id: operator.id }
      );
      expect(selfGrant.errors[0]?.message).toMatch(
        /Rejected: self-assignment of role .* is blocked/
      );
      await body(operator);
    } finally {
      for (const role of roles) {
        await rawRequest(ctx.bootstrapToken, platformRole('remove', role), {
          id: operator.id,
        });
      }
      await deleteDisposableUser(ctx, operator);
    }
  };

  mcpTest(
    'positive: a rejected self-grant is returned by initiator = subject',
    () =>
      withSecondRolesAdmin(async operator => {
        const own = selfAffecting(
          await recordsFor(auditReader, operator.id),
          operator.id
        );
        expect(own).toHaveLength(1);
        expect(own[0]).toMatchObject({
          category: 'platform_role_assignment',
          outcome: 'role_grant_rejected',
          // The server records the rejection MESSAGE here, not the rule id —
          // the message names the rule, which is what the requirement asks.
          details: { rejectedRule: expect.stringContaining('self-assignment') },
        });
      })
  );

  mcpTest('negative: a grant to another user is not returned', () =>
    withSecondRolesAdmin(async operator => {
      const other = await createDisposableUser(ctx, 'ar2sub');
      try {
        await rawRead(
          operator.token,
          platformRole('assign', 'FEATURE_BETA_TESTER'),
          { id: other.id }
        );

        // The operator's own trail: the grant it RECEIVED is there and is not
        // self-affecting. (The platform-wide half of this scenario — a reset
        // with no subject — lives in `exclusive/`: a platform reset must never
        // run beside other tests.)
        const operatorRecords = await recordsFor(auditReader, operator.id);
        expect(operatorRecords.map(r => r.outcome).sort()).toEqual([
          'role_grant_rejected',
          'role_granted',
        ]);
        expect(
          selfAffecting(operatorRecords, operator.id).map(r => r.outcome)
        ).toEqual(['role_grant_rejected']);

        // The other user's trail: granted BY the operator, so not self-affecting.
        const otherRecords = await recordsFor(auditReader, other.id);
        expect(otherRecords.map(r => [r.outcome, r.initiatorUserId])).toEqual([
          ['role_granted', operator.id],
        ]);
        expect(selfAffecting(otherRecords, other.id)).toEqual([]);
      } finally {
        await deleteDisposableUser(ctx, other);
      }
    })
  );
});
