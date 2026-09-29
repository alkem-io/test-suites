/**
 * N-9 (forum-discussions-test-plan.md; FR-010/012, 061 US1-AS4/5) — the
 * `platform_audit_entry` rows the forum-category and reconcile mutations
 * write. Local Postgres only (`harnessPostgresConfigured`); never runs
 * against a shared/ACC environment, which this harness has no DB access to
 * anyway.
 *
 * Table/column shapes duplicated from server
 * `domain/community/user-email-change/platform.audit.entry.entity.ts` — the
 * harness has no dependency on the server's source tree. `category` is
 * stored as `'platform_operations'`; `details` is jsonb
 * `{ action, target?, error? }` (`PlatformOperationsAuditService`).
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  harnessPostgresConfigured,
  queryHarnessDb,
} from '@alkemio/tests-lib';
import {
  getPlatformForumData,
  createDiscussion,
  deleteDiscussion,
  updateDiscussion,
  reconcileForumHierarchy,
  waitForTaskSettled,
} from '../communication.params';
import { ForumDiscussionCategory } from '@alkemio/client-lib/dist/types/alkemio-schema';

const TIPS_AND_TRICKS = 'TIPS_AND_TRICKS' as ForumDiscussionCategory;

type AuditRow = {
  initiatorUserId: string | null;
  outcome: string;
  details: { action?: string; target?: Record<string, unknown>; error?: string } | null;
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

let platformForumId = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'forum-audit',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await getPlatformForumData();
  platformForumId = res?.data?.platform.forum.id ?? '';
});

describe('Audit rows for forum-category and reconcile operations (N-9, local Postgres)', () => {
  test.skipIf(!harnessPostgresConfigured())(
    'GA recategorising a post writes one operation_succeeded row; a title-only edit writes none',
    async () => {
      const created = await createDiscussion(
        platformForumId,
        'category-reorg-n9-audit',
        ForumDiscussionCategory.Help,
        TestUser.GLOBAL_ADMIN
      );
      const discId = created?.data?.createDiscussion?.id ?? '';
      try {
        const t0 = new Date();
        await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
          category: TIPS_AND_TRICKS,
        });
        const rows = await auditRowsSince('updateDiscussionCategory', t0);
        const own = rows.filter(row => row.details?.target?.discussionID === discId);
        expect(own).toHaveLength(1);
        expect(own[0].outcome).toEqual('operation_succeeded');
        expect(own[0].details?.target?.from).toEqual('help');
        expect(own[0].details?.target?.to).toEqual('tips-and-tricks');

        // A title-only edit (no category change) must write no new row.
        const t1 = new Date();
        await updateDiscussion(discId, TestUser.GLOBAL_ADMIN, {
          profileData: { displayName: 'category-reorg-n9-audit' },
          category: TIPS_AND_TRICKS,
        });
        const noNewRows = await auditRowsSince('updateDiscussionCategory', t1);
        expect(
          noNewRows.filter(row => row.details?.target?.discussionID === discId)
        ).toHaveLength(0);
      } finally {
        await deleteDiscussion(discId);
      }
    }
  );

  // The two remove-category audit sub-cases (operation_failed row on a
  // non-empty category; zero rows on a QA denial) live in
  // `platform-discussions.it-spec.ts` instead — H-1 rule 2 confines every
  // call to `adminForumRemoveDiscussionCategory` to that one file.

  test.skipIf(!harnessPostgresConfigured())(
    'GA reconcile dry run writes exactly one row keyed by its task id; this passes on any adapter version',
    async () => {
      const t0 = new Date();
      const res = await reconcileForumHierarchy(
        { dryRun: true },
        TestUser.GLOBAL_ADMIN
      );
      const taskId = res?.body?.data
        ?.adminCommunicationReconcileForumHierarchy as string | undefined;
      expect(taskId).toBeDefined();
      await waitForTaskSettled(taskId!, TestUser.GLOBAL_ADMIN);

      const rows = await auditRowsSince(
        'adminCommunicationReconcileForumHierarchy',
        t0
      );
      const own = rows.filter(row => row.details?.target?.taskId === taskId);
      expect(own).toHaveLength(1);
      expect(own[0].details?.target?.dryRun).toBe(true);
    }
  );

  test.skipIf(!harnessPostgresConfigured())(
    'QA denied reconcile writes zero audit rows',
    async () => {
      const t0 = new Date();
      await reconcileForumHierarchy({ dryRun: true }, TestUser.QA_USER);
      const rows = await auditRowsSince(
        'adminCommunicationReconcileForumHierarchy',
        t0,
        TestUserManager.users.qaUser.id
      );
      expect(rows).toHaveLength(0);
    }
  );
});
