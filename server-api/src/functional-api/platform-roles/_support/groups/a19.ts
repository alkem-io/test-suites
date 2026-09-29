import { expect } from 'vitest';
import {
  registerDisposableUser,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { AUDIT_TOOL, callMcpTool, MCP_AVAILABLE } from '../mcp-client';
import { rawRead } from '../raw-request';
import type { GroupModule, Invocation } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A19 — read the platform audit trail. Owner: Platform Audit Reader.
 *
 * The trail needs a KNOWN entry: Platform Users Admin changes the login email
 * of a disposable user, with a reason unique to the run. Platform Audit Reader —
 * the only role that can — then looks that entry up, and the positives must
 * return exactly it.
 *
 * The two GraphQL fields hand out the old and new address in full; masking is a
 * property of the MCP tool, so that is where it is asserted.
 */
type A19 = {
  subject: DisposableUser;
  newEmail: string;
  entryId: string;
};

const CHANGE_EMAIL =
  'mutation($adminUserEmailChangeData: AdminUserEmailChangeInput!) { adminUserEmailChange(adminUserEmailChangeData: $adminUserEmailChangeData) { success } }';
const ENTRIES =
  'query($userID: UUID!) { platformAdmin { userEmailChangeAuditEntries(userID: $userID) { auditEntries { id reason subject { id } } } } }';

type EntriesRead = {
  platformAdmin: {
    userEmailChangeAuditEntries: {
      auditEntries: {
        id: string;
        reason: string | null;
        subject: { id: string };
      }[];
    };
  };
};

type McpHistory = {
  subjectUserId: string;
  entries: { id: string; details?: { oldEmail?: string; newEmail?: string } }[];
};

export const A19_GROUP: GroupModule<A19> = {
  group: 'A19',

  build: ctx =>
    undoOnFailure(async undo => {
      const subject = await registerDisposableUser(ctx, 'audit');
      undo(() => removeDisposableUser(ctx, subject));
      const newEmail = `praudit.changed.${ctx.runId}@alkem.io`;
      const reason = `platform-roles ${ctx.runId}`;

      await rawRead(ctx.tokens.PLATFORM_USERS_ADMIN, CHANGE_EMAIL, {
        adminUserEmailChangeData: {
          userID: subject.id,
          newEmail,
          reason,
          approver: { name: 'platform-roles suite', role: 'test fixture' },
        },
      });

      const { platformAdmin } = await rawRead<EntriesRead>(
        ctx.tokens.PLATFORM_AUDIT_READER,
        ENTRIES,
        { userID: subject.id }
      );
      const entry = platformAdmin.userEmailChangeAuditEntries.auditEntries.find(
        e => e.reason === reason && e.subject.id === subject.id
      );
      if (!entry) {
        throw new Error(
          `A19: the email change of ${subject.id} left no audit entry with reason "${reason}"`
        );
      }
      return { subject, newEmail, entryId: entry.id };
    }),

  teardown: (ctx, _sdk, fx) => removeDisposableUser(ctx, fx.subject),

  invocations: {
    'A19.latestUserEmailChangeAuditEntry': {
      gate: ['platformAdmin', 'latestUserEmailChangeAuditEntry'],
      call: (sdk, headers, fx) =>
        sdk.latestUserEmailChangeAuditEntry({ userID: fx.subject.id }, headers),
      verify: async ({ fx, data }) =>
        expect(
          (
            data as {
              platformAdmin: {
                latestUserEmailChangeAuditEntry: { id: string };
              };
            }
          ).platformAdmin.latestUserEmailChangeAuditEntry.id
        ).toBe(fx.entryId),
    },
    'A19.userEmailChangeAuditEntries': {
      gate: ['platformAdmin', 'userEmailChangeAuditEntries'],
      call: (sdk, headers, fx) =>
        sdk.userEmailChangeAuditEntries({ userID: fx.subject.id }, headers),
      verify: async ({ fx, data }) =>
        expect(
          (
            data as {
              platformAdmin: {
                userEmailChangeAuditEntries: { auditEntries: { id: string }[] };
              };
            }
          ).platformAdmin.userEmailChangeAuditEntries.auditEntries.map(
            e => e.id
          )
        ).toEqual([fx.entryId]),
    },
  },
};

/**
 * `A19.audit-log-analyze` — the third audit-trail surface. It joins
 * `invocations` only when `PLATFORM_ROLES_MCP=1` says the server under test has
 * MCP switched on: against a disabled endpoint (`/rest/mcp` answers 503) every
 * role would fail alike and say nothing about roles.
 */
export const A19_MCP_INVOCATION: Invocation<A19> = {
  gate: [AUDIT_TOOL],
  call: (_sdk, headers, fx) =>
    callMcpTool<McpHistory>(headers, AUDIT_TOOL, {
      action: 'user_history',
      subjectUserId: fx.subject.id,
      category: 'email_change',
      includeDetails: true,
    }),
  verify: async ({ fx, data }) => {
    const history = data as McpHistory;
    const entry = history.entries.find(e => e.id === fx.entryId);
    expect(entry?.details).toMatchObject({
      oldEmail: '***@alkem.io',
      newEmail: '***@alkem.io',
    });
    expect(JSON.stringify(history)).not.toContain(fx.subject.email);
    expect(JSON.stringify(history)).not.toContain(fx.newEmail);
  },
};

if (MCP_AVAILABLE) {
  A19_GROUP.invocations['A19.audit-log-analyze'] = A19_MCP_INVOCATION;
}
