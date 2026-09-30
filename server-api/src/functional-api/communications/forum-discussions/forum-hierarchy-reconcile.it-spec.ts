/**
 * 061 (workspace#061-forum-matrix-hierarchy-sync) — the Matrix hierarchy
 * reconcile / sync-directory surface. All cases in this file share one
 * forum-wide Redis lease (`alkemio:forum-hierarchy-reconcile:lease`) and one
 * Matrix state, so they run SEQUENTIALLY within this file by default (no
 * `.concurrent`) — see forum-discussions-test-plan.md "Gating".
 *
 * `local` cases are gated with `localStack()` (loopback server + Postgres +
 * Synapse) and never run on nightly or ACC. Cases that read/write Matrix
 * room state additionally need `HARNESS_SYNAPSE_AS_TOKEN` (H-7) — set only
 * by the operator's own secret handling; this file never reads it from
 * anywhere else. Absent, those cases skip with that reason.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  localStack,
  redisGet,
  redisSetNx,
  redisCompareAndDelete,
  resolveAlias,
  directoryVisibility,
  childEdge,
  setDirectoryVisibility,
  getSynapseAsToken,
  delay,
} from '@alkemio/tests-lib';
import {
  getPlatformForumData,
  createDiscussion,
  deleteDiscussion,
  findPlatformDiscussionByTitle,
  getPlatformDiscussionsDataById,
  updateDiscussion,
  reconcileForumHierarchy,
  waitForTaskSettled,
  parseReconcileSummary,
  syncSpaceHierarchy,
  forumCategorySpaceId,
  ReconcileForumHierarchyData,
  TaskData,
} from '../communication.params';
import { ForumDiscussionCategory } from '@alkemio/client-lib/dist/types/alkemio-schema';

const TIPS_AND_TRICKS = 'TIPS_AND_TRICKS' as ForumDiscussionCategory;
const NEWSLETTER = 'NEWSLETTER' as ForumDiscussionCategory;
const ALL_CATEGORY_VALUES: ForumDiscussionCategory[] = [
  ForumDiscussionCategory.Releases,
  NEWSLETTER,
  TIPS_AND_TRICKS,
  ForumDiscussionCategory.Help,
  ForumDiscussionCategory.PlatformFunctionalities,
  ForumDiscussionCategory.CommunityBuilding,
  ForumDiscussionCategory.ChallengeCentric,
  ForumDiscussionCategory.Other,
];
// Server DB-stored kebab-case values — see
// `common/enums/forum.discussion.category.ts`. Needed for the uuidv5 space
// id derivation, which hashes the STORED value, not the wire enum name.
const STORED_CATEGORY_VALUE: Record<string, string> = {
  RELEASES: 'releases',
  NEWSLETTER: 'newsletter',
  TIPS_AND_TRICKS: 'tips-and-tricks',
  HELP: 'help',
  PLATFORM_FUNCTIONALITIES: 'platform-functionalities',
  COMMUNITY_BUILDING: 'community-building',
  CHALLENGE_CENTRIC: 'challenge-centric',
  OTHER: 'other',
};

const RECONCILE_LEASE_KEY = 'alkemio:forum-hierarchy-reconcile:lease';
const MATRIX_SERVER_NAME = 'alkemio.matrix.host';
// 9 = the 8 category spaces + the forum space itself — a named constant
// (N-8), never derived from the generated enum's length.
const EXPECTED_SCANNED_PARENTS = 9;
const ADAPTER_TOO_OLD_MESSAGE =
  'matrix-adapter lacks communication.hierarchy.set_children — deploy ≥ v0.8.19 (local quickstart pins v0.8.17, F-5)';

let platformForumId = '';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'forum-hierarchy-reconcile',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const res = await getPlatformForumData();
  platformForumId = res?.data?.platform.forum.id ?? '';
});

/**
 * H-3: on an `already running` task error (another process/stack holds the
 * lease), poll every 5s for up to 75s, then re-invoke once before failing —
 * so a stray concurrent pass never flakes an unrelated case. NOT used by
 * N-10, which deliberately manufactures that exact contention.
 */
const reconcileAndSettle = async (
  data: ReconcileForumHierarchyData = {},
  persona: TestUser | undefined = TestUser.GLOBAL_ADMIN
): Promise<{ taskId: string | undefined; task: TaskData | undefined }> => {
  const attempt = async () => {
    const res = await reconcileForumHierarchy(data, persona);
    const taskId = res?.body?.data
      ?.adminCommunicationReconcileForumHierarchy as string | undefined;
    if (!taskId) return { taskId: undefined, task: undefined };
    const task = await waitForTaskSettled(taskId, TestUser.GLOBAL_ADMIN);
    return { taskId, task };
  };

  let result = await attempt();
  const alreadyRunning = (task?: TaskData) =>
    (task?.errors ?? []).some(error => error.includes('already running'));
  if (result.task?.status === 'ERRORED' && alreadyRunning(result.task)) {
    const deadline = Date.now() + 75_000;
    while (Date.now() < deadline && (await redisGet(RECONCILE_LEASE_KEY))) {
      await delay(5_000);
    }
    result = await attempt();
  }
  return result;
};

describe('Reconcile authorization — legacy personas + anonymous (N-7)', () => {
  // Oracle: this stack's actual anonymous refusal code is pinned in
  // docs/qa-knowledge/harness.md once observed on first run — an anonymous
  // caller must simply be refused, whatever the exact code.
  test('anonymous is refused', async () => {
    const res = await reconcileForumHierarchy({ dryRun: true }, undefined);
    expect(res?.body?.data?.adminCommunicationReconcileForumHierarchy).toBeFalsy();
    expect(res?.body?.errors?.length ?? 0).toBeGreaterThan(0);
  });

  test.each`
    persona
    ${TestUser.QA_USER}
    ${TestUser.GLOBAL_SUPPORT_ADMIN}
    ${TestUser.GLOBAL_LICENSE_ADMIN}
  `('$persona is refused (FORBIDDEN_POLICY)', async ({ persona }) => {
    const res = await reconcileForumHierarchy({ dryRun: true }, persona);
    expect(res?.body?.data?.adminCommunicationReconcileForumHierarchy).toBeFalsy();
    expect(res?.body?.errors?.[0]?.extensions?.code).toEqual('FORBIDDEN_POLICY');
  });

  // Any terminal status passes — on a pre-v0.8.19 adapter the task ends
  // ERRORED (circuit-breaker) after ~30s; that is not asserted here (N-8
  // asserts the terminal shape).
  test('GA dry run returns a task id and reaches a terminal status', async () => {
    const { taskId, task } = await reconcileAndSettle(
      { dryRun: true },
      TestUser.GLOBAL_ADMIN
    );
    expect(taskId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(task?.status).not.toEqual('IN_PROGRESS');
  });
});

describe('Reconcile default call — full-vocabulary report (N-8, adapter-skew probe)', () => {
  test('a bare call is a dry-run report over all 9 parents, or fails loudly on a pre-v0.8.19 adapter', async () => {
    const { task } = await reconcileAndSettle({}, TestUser.GLOBAL_ADMIN);
    const summary = parseReconcileSummary(task);

    if (task?.status === 'ERRORED' && summary?.aborted === 'circuit-breaker') {
      throw new Error(ADAPTER_TOO_OLD_MESSAGE);
    }

    expect(task?.status).toEqual('COMPLETED');
    expect(summary?.repaired).toEqual(0);
    expect(summary?.failed).toEqual(0);
    expect(summary?.aborted).toBeNull();
    expect(summary?.adapterDisabled).toBe(false);
    expect(summary?.scanned).toEqual(EXPECTED_SCANNED_PARENTS);
    expect(summary?.drifted).toBeGreaterThanOrEqual(0);
    expect(summary?.unresolved).toBeGreaterThanOrEqual(0);
    expect(summary?.unknownKept).toBeGreaterThanOrEqual(0);
    expect(summary?.unconverged).toBeGreaterThanOrEqual(0);
  });
});

describe('Overlapping reconcile pass is refused, then released (N-10, local Redis)', () => {
  test.skipIf(!localStack())(
    'a lease held by another owner refuses the pass; releasing it lets the next pass proceed',
    async () => {
      // Wait for any pre-existing lease (another test/process) to clear —
      // never assert against a lease this test did not plant itself.
      const deadline = Date.now() + 70_000;
      while (Date.now() < deadline && (await redisGet(RECONCILE_LEASE_KEY))) {
        await delay(2_000);
      }
      expect(await redisGet(RECONCILE_LEASE_KEY)).toBeNull();

      const owner = `qa-held-${Date.now()}`;
      const acquired = await redisSetNx(RECONCILE_LEASE_KEY, owner, 60_000);
      expect(acquired).toBe(true);

      try {
        const res = await reconcileForumHierarchy(
          { dryRun: true },
          TestUser.GLOBAL_ADMIN
        );
        const taskId = res?.body?.data
          ?.adminCommunicationReconcileForumHierarchy as string | undefined;
        const task = await waitForTaskSettled(taskId!, TestUser.GLOBAL_ADMIN);
        expect(task?.status).toEqual('ERRORED');
        expect(
          (task?.errors ?? []).some(error => error.includes('already running'))
        ).toBe(true);
      } finally {
        await redisCompareAndDelete(RECONCILE_LEASE_KEY, owner);
      }

      // The lease is free again — a fresh pass no longer sees contention
      // (terminal status may be COMPLETED on ≥ v0.8.19, or a circuit-breaker
      // ERRORED on v0.8.17 — either way, NOT "already running").
      const { task: task2 } = await reconcileAndSettle(
        { dryRun: true },
        TestUser.GLOBAL_ADMIN
      );
      expect(task2?.status).not.toEqual('IN_PROGRESS');
      expect(
        (task2?.errors ?? []).some(error => error.includes('already running'))
      ).toBe(false);
    }
  );
});

describe('Recategorise → drift → apply → converged (N-11, local + Matrix token, opt-in adapter)', () => {
  test.skipIf(!localStack() || !getSynapseAsToken())(
    'a dry run reports the drift, apply converges Matrix, and a further dry run reports nothing left to do',
    async ctx => {
      // Capability probe: a stale adapter aborts with circuit-breaker.
      const probe = await reconcileAndSettle({ dryRun: true }, TestUser.GLOBAL_ADMIN);
      const probeSummary = parseReconcileSummary(probe.task);
      if (probe.task?.status === 'ERRORED' && probeSummary?.aborted === 'circuit-breaker') {
        ctx.skip(
          'local matrix-adapter < v0.8.19 (quickstart pins v0.8.17, F-5)'
        );
        return;
      }

      const FIXTURE_TITLE = 'qa-forum-reconcile-fixture';
      // Sibling files create and delete discussions while this runs, and the
      // forum list read fails as a whole during each of those. Retry the
      // lookup of the persistent fixture before creating it.
      let fixtureId: string | undefined;
      let cOld = 'HELP';
      for (let attempt = 0; attempt < 15 && !fixtureId; attempt++) {
        if (attempt > 0) await delay(2_000);
        const fixture = await findPlatformDiscussionByTitle(FIXTURE_TITLE);
        if (fixture?.id) {
          fixtureId = fixture.id;
          cOld = fixture.category;
          break;
        }
        const created = await createDiscussion(
          platformForumId,
          FIXTURE_TITLE,
          ForumDiscussionCategory.Help,
          TestUser.GLOBAL_ADMIN
        );
        fixtureId = created?.data?.createDiscussion?.id;
      }
      expect(fixtureId).toBeDefined();
      const read = await getPlatformDiscussionsDataById(fixtureId!);
      const discussion = read?.data?.platform?.forum?.discussion;
      const roomId = await resolveAlias(
        `#${discussion?.comments?.id}:${MATRIX_SERVER_NAME}`
      );
      expect(roomId).toBeDefined();
      const cNew = cOld === 'HELP' ? 'TIPS_AND_TRICKS' : 'HELP';
      const spaceOld = await resolveAlias(
        `#${forumCategorySpaceId(platformForumId, STORED_CATEGORY_VALUE[cOld])}:${MATRIX_SERVER_NAME}`
      );
      const spaceNew = await resolveAlias(
        `#${forumCategorySpaceId(platformForumId, STORED_CATEGORY_VALUE[cNew])}:${MATRIX_SERVER_NAME}`
      );
      expect(spaceOld).toBeDefined();
      expect(spaceNew).toBeDefined();

      // 1. Baseline apply
      await reconcileAndSettle({ dryRun: false }, TestUser.GLOBAL_ADMIN);
      // 2. Edge present under the old category
      expect(await childEdge(spaceOld!, roomId!)).toEqual('present');

      // 3. Recategorise
      await updateDiscussion(fixtureId!, TestUser.GLOBAL_ADMIN, {
        category: cNew as ForumDiscussionCategory,
      });

      // 4. FR-018: the update path makes no hierarchy call
      expect(await childEdge(spaceOld!, roomId!)).toEqual('present');
      expect(await childEdge(spaceNew!, roomId!)).toEqual('absent');

      // 5. Dry run — reports the drift, Matrix unchanged
      const { task: dry } = await reconcileAndSettle(
        { dryRun: true },
        TestUser.GLOBAL_ADMIN
      );
      const drySummary = parseReconcileSummary(dry);
      expect(drySummary?.repaired).toEqual(0);
      expect(drySummary?.drifted).toBeGreaterThanOrEqual(2);
      expect(await childEdge(spaceOld!, roomId!)).toEqual('present');
      expect(await childEdge(spaceNew!, roomId!)).toEqual('absent');

      // 6. Apply — converges
      const { task: apply } = await reconcileAndSettle(
        { dryRun: false },
        TestUser.GLOBAL_ADMIN
      );
      const applySummary = parseReconcileSummary(apply);
      expect(applySummary?.repaired).toBeGreaterThanOrEqual(2);
      expect(await childEdge(spaceNew!, roomId!)).toEqual('present');
      expect(await childEdge(spaceOld!, roomId!)).toEqual('absent');
      expect(apply?.status).toEqual(
        (applySummary?.unconverged ?? 0) === 0 ? 'COMPLETED' : 'ERRORED'
      );

      // 7. Further dry run — nothing left for the fixture's own edge
      const { task: dry2 } = await reconcileAndSettle(
        { dryRun: true },
        TestUser.GLOBAL_ADMIN
      );
      const dry2Summary = parseReconcileSummary(dry2);
      expect(dry2Summary?.repaired).toEqual(0);
      expect(await childEdge(spaceNew!, roomId!)).toEqual('present');
      expect(await childEdge(spaceOld!, roomId!)).toEqual('absent');
      // The counts are stack-wide, and sibling files create, move and delete
      // discussions while this runs. The fixture's own convergence is proven
      // by the edge checks above; the counts only bound what is left over.
      expect(dry2Summary?.drifted).toBeGreaterThanOrEqual(
        Number(dry2Summary?.unknownKept ?? 0)
      );
    }
  );
});

describe('No forum/category space is in the public directory after the sync (N-12a, local, no token)', () => {
  test.skipIf(!localStack())(
    'all 9 forum spaces resolve and report private both before and after adminCommunicationSyncSpaceHierarchy',
    async () => {
      const aliases = [
        `#${platformForumId}:${MATRIX_SERVER_NAME}`,
        ...ALL_CATEGORY_VALUES.map(
          category =>
            `#${forumCategorySpaceId(platformForumId, STORED_CATEGORY_VALUE[category])}:${MATRIX_SERVER_NAME}`
        ),
      ];

      const before = await Promise.all(aliases.map(resolveAlias));
      expect(before.every(id => id !== undefined)).toBe(true);

      const res = await syncSpaceHierarchy(TestUser.GLOBAL_ADMIN);
      expect(res?.body?.data?.adminCommunicationSyncSpaceHierarchy).toBe(true);

      const after = await Promise.all(aliases.map(resolveAlias));
      expect(after.every(id => id !== undefined)).toBe(true);

      const visibilities = await Promise.all(
        (after as string[]).map(directoryVisibility)
      );
      expect(visibilities.every(v => v === 'private')).toBe(true);
    },
    120_000
  );
});

describe('Sync retracts an already-published space (N-12b, local + Matrix token)', () => {
  test.skipIf(!localStack() || !getSynapseAsToken())(
    'a space seeded public is private again after the sync',
    async () => {
      const otherRoomId = await resolveAlias(
        `#${forumCategorySpaceId(platformForumId, STORED_CATEGORY_VALUE.OTHER)}:${MATRIX_SERVER_NAME}`
      );
      expect(otherRoomId).toBeDefined();

      try {
        await setDirectoryVisibility(otherRoomId!, 'public');
        expect(await directoryVisibility(otherRoomId!)).toEqual('public');

        const res = await syncSpaceHierarchy(TestUser.GLOBAL_ADMIN);
        expect(res?.body?.data?.adminCommunicationSyncSpaceHierarchy).toBe(
          true
        );

        expect(await directoryVisibility(otherRoomId!)).toEqual('private');
      } finally {
        if ((await directoryVisibility(otherRoomId!)) === 'public') {
          await setDirectoryVisibility(otherRoomId!, 'private');
        }
      }
    },
    120_000
  );
});

// N-13 (POA persona) lives in `platform-discussions.it-spec.ts`, NOT here —
// H-1 rule 2 confines every call to `adminForumRemoveDiscussionCategory`
// (admin-capable persona or not) to that one file.

describe('Ghost edge: reported, kept by default, pruned on request (N-15, local + token, opt-in)', () => {
  test.skipIf(
    !localStack() ||
      !getSynapseAsToken() ||
      process.env.HARNESS_ALLOW_GHOST_PRUNE !== '1'
  )(
    'a deleted discussion leaves a ghost edge that a plain apply keeps and pruneUnknown removes',
    async () => {
      const created = await createDiscussion(
        platformForumId,
        'qa-reconcile-ghost',
        ForumDiscussionCategory.Help,
        TestUser.GLOBAL_ADMIN
      );
      const discId = created?.data?.createDiscussion?.id ?? '';
      const commentsId = created?.data?.createDiscussion?.comments?.id ?? '';
      let deleted = false;
      let roomId: string | undefined;
      let helpSpace: string | undefined;

      try {
        // Anchor the room lazily, then resolve its id BEFORE deletion, while
        // the alias still exists.
        await reconcileAndSettle({ dryRun: false }, TestUser.GLOBAL_ADMIN);
        roomId = await resolveAlias(`#${commentsId}:${MATRIX_SERVER_NAME}`);
        expect(roomId).toBeDefined();
        helpSpace = await resolveAlias(
          `#${forumCategorySpaceId(platformForumId, STORED_CATEGORY_VALUE.HELP)}:${MATRIX_SERVER_NAME}`
        );
        expect(await childEdge(helpSpace!, roomId!)).toEqual('present');

        await deleteDiscussion(discId);
        deleted = true;
      } finally {
        if (!deleted && discId) await deleteDiscussion(discId);
      }
      expect(await childEdge(helpSpace!, roomId!)).toEqual('present');

      const { task: dry } = await reconcileAndSettle(
        { dryRun: true },
        TestUser.GLOBAL_ADMIN
      );
      const drySummary = parseReconcileSummary(dry);
      expect(drySummary?.unknownKept).toBeGreaterThanOrEqual(1);

      await reconcileAndSettle({ dryRun: false }, TestUser.GLOBAL_ADMIN);
      expect(await childEdge(helpSpace!, roomId!)).toEqual('present');

      const { task: pruned } = await reconcileAndSettle(
        { dryRun: false, pruneUnknown: true },
        TestUser.GLOBAL_ADMIN
      );
      const prunedSummary = parseReconcileSummary(pruned);
      expect(await childEdge(helpSpace!, roomId!)).toEqual('absent');
      expect(prunedSummary?.repaired).toBeGreaterThanOrEqual(1);
    }
  );
});
