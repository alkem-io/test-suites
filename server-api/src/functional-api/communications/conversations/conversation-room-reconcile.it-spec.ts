import {
  ConversationCreationType,
  delay,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  createConversation,
  deleteConversation,
  getTask,
  reconcileConversationRooms,
} from './conversation.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-room-reconcile',
};

type ReconcileSummary = {
  scanned: number;
  ready: number;
  failed: number;
  repaired: number;
  repairFailed: number;
  unknownRemaining: number;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

/** Task results are prepended newest-first as `[<iso>]::<line>`. */
const parseSummary = (results: string[] | undefined): ReconcileSummary => {
  const line = (results ?? []).find(entry => entry.includes('"scanned"'));
  if (!line) {
    throw new Error(
      `No summary line in task results: ${JSON.stringify(results)}`
    );
  }
  return JSON.parse(line.slice(line.indexOf('::') + 2)) as ReconcileSummary;
};

const waitForTask = async (taskId: string) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await getTask(taskId, TestUser.GLOBAL_ADMIN);
    const task = res?.data?.task;
    if (task && (task.status as string) !== 'in-progress') {
      return task;
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Task ${taskId} did not complete within ${POLL_TIMEOUT_MS}ms`
  );
};

let conversationId = '';

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const created = await createConversation(
    [TestUserManager.users.nonSpaceMember.agentId],
    ConversationCreationType.Direct,
    undefined,
    TestUser.QA_USER
  );
  conversationId = created?.data?.createConversation?.id ?? '';
});

afterAll(async () => {
  if (conversationId) {
    await deleteConversation(conversationId, TestUser.QA_USER).catch(() => {});
  }
});

describe('Operator room readiness reconciliation', () => {
  test('returns a task immediately; the task completes with the count summary and no room left UNKNOWN', async () => {
    const started = await reconcileConversationRooms(
      { repair: false, includeReady: true },
      TestUser.GLOBAL_ADMIN
    );

    expect(started?.error).toBeUndefined();
    const taskId =
      started?.data?.adminCommunicationReconcileConversationRooms?.id ?? '';
    expect(taskId).not.toBe('');
    expect(
      started?.data?.adminCommunicationReconcileConversationRooms?.status
    ).toBe('in-progress');

    const task = await waitForTask(taskId);
    expect(task.status).toBe('completed');

    const summary = parseSummary(task.results ?? undefined);
    expect(summary.scanned).toBeGreaterThanOrEqual(1);
    expect(summary.unknownRemaining).toBe(0);
    expect(summary.repaired).toBe(0);
    expect(summary.repairFailed).toBe(0);
    expect(summary.ready + summary.failed).toBeLessThanOrEqual(summary.scanned);
  });

  test('re-running is idempotent: a second sweep completes with the same shape and still no UNKNOWN', async () => {
    const started = await reconcileConversationRooms(
      { repair: true, includeReady: false },
      TestUser.GLOBAL_ADMIN
    );
    const taskId =
      started?.data?.adminCommunicationReconcileConversationRooms?.id ?? '';
    const task = await waitForTask(taskId);

    expect(task.status).toBe('completed');
    const summary = parseSummary(task.results ?? undefined);
    expect(Object.keys(summary).sort()).toEqual(
      [
        'failed',
        'ready',
        'repairFailed',
        'repaired',
        'scanned',
        'unknownRemaining',
      ].sort()
    );
    expect(summary.unknownRemaining).toBe(0);
  });

  test('a non-operator cannot start the sweep', async () => {
    const res = await reconcileConversationRooms(
      { repair: false, includeReady: false },
      TestUser.QA_USER
    );
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
    expect(JSON.stringify(res?.error)).toContain('FORBIDDEN_POLICY');
  });
});
