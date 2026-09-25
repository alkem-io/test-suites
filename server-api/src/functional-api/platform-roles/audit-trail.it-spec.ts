import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from './capabilities.data';
import { mcpTest, callAuditTool } from './_support/mcp-client';
import {
  createDisposableUser,
  deleteDisposableUser,
} from './_support/disposable-user';
import type { DisposableUser } from './_support/disposable-user';
import { describeOutcome } from './_support/outcome';
import { rawOutcome } from './_support/raw-outcome';
import { rawRead } from './_support/raw-request';

/**
 * The audit trail has three read surfaces — two GraphQL fields and the MCP tool
 * `analyze_audit_log` — and ONE reader: Platform Audit Reader. The roles that
 * perform audited actions (Roles Admin, Users Admin) must not read their own
 * trail. Nobody writes to it through the API at all.
 *
 * Fixture: a disposable user whose login email Platform Users Admin changes
 * once, so every surface has a KNOWN record to return.
 */
const READER = 'PLATFORM_AUDIT_READER';
const OTHERS = PLATFORM_ROLES.filter(r => r !== READER);

const CHANGE_EMAIL =
  'mutation($data: AdminUserEmailChangeInput!) { adminUserEmailChange(adminUserEmailChangeData: $data) { success } }';
const LATEST =
  'query($id: UUID!) { platformAdmin { latestUserEmailChangeAuditEntry(userID: $id) { outcome subject { id } initiator { id } } } }';
const ENTRIES =
  'query($id: UUID!) { platformAdmin { userEmailChangeAuditEntries(userID: $id) { total auditEntries { outcome subject { id } } } } }';
const FIELDS = [
  { name: 'latestUserEmailChangeAuditEntry', query: LATEST },
  { name: 'userEmailChangeAuditEntries', query: ENTRIES },
] as const;

const ctx = inject('platformRoles');
let subject: DisposableUser;
const oldLocalPart = `prt1.${ctx.runId}`;

beforeAll(async () => {
  subject = await createDisposableUser(ctx, 't1');
  await rawRead(ctx.tokens.PLATFORM_USERS_ADMIN, CHANGE_EMAIL, {
    data: {
      userID: subject.id,
      newEmail: `prt1changed.${ctx.runId}@alkem.io`,
      reason: 'platform-roles audit-trail fixture',
      approver: {
        name: 'Fixture Approver',
        role: 'Organization Administrator',
      },
    },
  });
});

afterAll(async () => {
  await deleteDisposableUser(ctx, subject);
});

describe('T1.audit-reader-alone', () => {
  const history = () => ({
    action: 'user_history',
    subjectUserId: subject.id,
    includeDetails: true,
  });

  test('positive: Audit Reader reads latestUserEmailChangeAuditEntry and gets the known record', async () => {
    const data = await rawRead<{
      platformAdmin: {
        latestUserEmailChangeAuditEntry: {
          outcome: string;
          subject: { id: string };
          initiator: { id: string };
        };
      };
    }>(ctx.tokens[READER], LATEST, { id: subject.id });
    expect(data.platformAdmin.latestUserEmailChangeAuditEntry).toEqual({
      outcome: 'COMMITTED',
      subject: { id: subject.id },
      initiator: { id: ctx.userIds.PLATFORM_USERS_ADMIN },
    });
  });

  test('positive: Audit Reader reads userEmailChangeAuditEntries and gets the known record', async () => {
    const data = await rawRead(ctx.tokens[READER], ENTRIES, { id: subject.id });
    expect(data).toEqual({
      platformAdmin: {
        userEmailChangeAuditEntries: {
          total: 1,
          auditEntries: [{ outcome: 'COMMITTED', subject: { id: subject.id } }],
        },
      },
    });
  });

  mcpTest(
    'positive: Audit Reader reads the MCP tool analyze_audit_log, with email addresses masked',
    async () => {
      const { isError, text } = await callAuditTool(
        ctx.tokens[READER],
        history()
      );
      expect(isError).toBe(false);
      const { total, entries } = JSON.parse(text) as {
        total: number;
        entries: {
          category: string;
          outcome: string;
          details: { oldEmail: string; newEmail: string };
        }[];
      };
      // One email change is TWO records: the commit starting, then committed.
      expect(total).toBe(2);
      expect(entries.map(entry => entry.outcome).sort()).toEqual([
        'commit_started',
        'committed',
      ]);
      for (const entry of entries) {
        expect(entry).toMatchObject({
          category: 'email_change',
          details: { oldEmail: '***@alkem.io', newEmail: '***@alkem.io' },
        });
      }
      expect(text).not.toContain(oldLocalPart);
    }
  );

  for (const role of OTHERS) {
    for (const field of FIELDS) {
      test(`negative: ${role} is denied ${field.name}`, async () => {
        const outcome = await rawOutcome(
          ['platformAdmin', field.name],
          ctx.tokens[role],
          field.query,
          { id: subject.id }
        );
        expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
      });
    }

    mcpTest(
      `negative: ${role} is refused by the MCP tool analyze_audit_log and gets no records`,
      async () => {
        expect(await callAuditTool(ctx.tokens[role], history())).toEqual({
          isError: true,
          text: 'Access denied: analyze_audit_log requires platform-admin privileges.',
        });
      }
    );
  }
});

describe('T2.trail-is-unwritable', () => {
  type TypeRef = { kind: string; name: string | null; ofType: TypeRef | null };
  type Schema = {
    __schema: {
      types: {
        name: string;
        kind: string;
        inputFields: { type: TypeRef }[] | null;
      }[];
      mutationType: {
        fields: { name: string; type: TypeRef; args: { type: TypeRef }[] }[];
      };
    };
  };
  const REF =
    'kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
  const INTROSPECTION = `query {
    __schema {
      types { name kind inputFields { type { ${REF} } } }
      mutationType { fields { name type { ${REF} } args { type { ${REF} } } } }
    }
  }`;
  const named = (ref: TypeRef): string =>
    ref.ofType ? named(ref.ofType) : (ref.name as string);

  test('negative: no mutation accepts or returns a platform audit entry', async () => {
    const { __schema: schema } = await rawRead<Schema>(
      ctx.tokens[READER],
      INTROSPECTION
    );

    // Every GraphQL type that projects the audit table. Exact on purpose: a new
    // audit type must be looked at here before this test can pass again.
    const auditTypes = schema.types
      .map(t => t.name)
      .filter(n => /audit/i.test(n))
      .sort();
    expect(auditTypes).toEqual([
      'UserEmailChangeAuditEntries',
      'UserEmailChangeAuditEntriesPageInfo',
      'UserEmailChangeAuditEntry',
      'UserEmailChangeAuditOutcome',
    ]);

    // An input type "accepts" an audit entry if it, or any input nested in it, is one.
    const inputs = new Map(
      schema.types.map(t => [t.name, t.inputFields ?? []])
    );
    const reaches = (type: string, seen = new Set<string>()): string[] => {
      if (seen.has(type)) return [];
      seen.add(type);
      return [
        type,
        ...(inputs.get(type) ?? []).flatMap(f => reaches(named(f.type), seen)),
      ];
    };

    const offenders = schema.mutationType.fields
      .filter(
        m =>
          /audit/i.test(m.name) ||
          auditTypes.includes(named(m.type)) ||
          m.args.some(a =>
            reaches(named(a.type)).some(t => auditTypes.includes(t))
          )
      )
      .map(m => m.name);
    expect(schema.mutationType.fields.length).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });
});
