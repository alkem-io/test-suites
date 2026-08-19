/**
 * Unit coverage for the per-entity teardown behaviour, run directly with
 * Node's built-in test runner via tsx (no vitest config exists for `lib/`
 * itself — server-api/client-web are the only packages with a test runner
 * wired up). Invoke with:
 *
 *   node --import tsx --test src/scenario/__tests__/TeardownLeakTracker.spec.ts
 *
 * from the `lib/` package directory. Not wired into `lib/package.json` (out
 * of this change's ownership scope, which is `lib/src/**` — package.json is
 * not `src/`); run it with the command above, or via
 * `pnpm exec tsx --test <path>` from the repo root. Named `*.spec.ts`, not
 * `*.test.ts`, so `tsconfig.prod.json`'s existing `**\/*spec.ts` exclude
 * (already used to keep other spec files out of the published `dist/`)
 * covers it too — this file must never ship in the built package.
 *
 * Two things are proven here, both against the REAL classification logic
 * and the REAL `TestScenarioFactory.teardownEntity` (accessed via a
 * bracket-index cast, since `private` is compile-time-only and tsx strips
 * types — no reflection hacks needed):
 *
 * 1. One failing/throwing delete does not stop the deletes that follow it
 *    in the same teardown sequence (test-suites#608's core defect).
 * 2. Classification matches the error shape verified LIVE against the
 *    running server (see the PR/commit description for the raw probe
 *    output): `extensions.code === 'ENTITY_NOT_FOUND'` on every returned
 *    error is benign; anything else, or a thrown exception, is a leak.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { TestScenarioFactory } from "../TestScenarioFactory";
import { TeardownLeakTracker } from "../TeardownLeakTracker";

// `teardownEntity` is `private static` in the TS source, which is a
// compile-time-only restriction — at runtime it is an ordinary static
// method, reachable like this without weakening the public API.
type TeardownEntityFn = (
  scenarioName: string,
  entityType: string,
  entityId: string,
  deleteFn: () => Promise<{
    error?: { errors: Array<Record<string, unknown>> };
  }>,
) => Promise<void>;
const teardownEntity = (
  TestScenarioFactory as unknown as { teardownEntity: TeardownEntityFn }
).teardownEntity.bind(TestScenarioFactory);

test("one failing delete does not skip the deletes that follow it", async () => {
  TeardownLeakTracker.resetForTest();
  TeardownLeakTracker.recordScenarioAttempt();

  const callOrder: string[] = [];

  // First delete throws synchronously past graphqlErrorWrapper's own
  // catch-all — the exact failure mode observed live (an auth-token lookup
  // failing before the GraphQL round trip even starts).
  await teardownEntity(
    "leak-order-scenario",
    "Space",
    "space-1",
    async () => {
      callOrder.push("space-1");
      throw new Error("auth token lookup failed");
    },
  );

  // Second and third deletes must still run — this is the whole point of
  // the fix: no shared try/catch skips them because of the first failure.
  await teardownEntity(
    "leak-order-scenario",
    "Space",
    "space-2",
    async () => {
      callOrder.push("space-2");
      return {};
    },
  );
  await teardownEntity(
    "leak-order-scenario",
    "Organization",
    "org-1",
    async () => {
      callOrder.push("org-1");
      return {};
    },
  );

  assert.deepEqual(
    callOrder,
    ["space-1", "space-2", "org-1"],
    "every delete in the sequence must run, in order, even after an earlier one throws",
  );

  const summary = TeardownLeakTracker.getSummary();
  assert.equal(summary.leakCount, 1, "only the thrown delete counts as a leak");
  assert.equal(summary.leaks[0].entityId, "space-1");
  // `describeError` (shared with the ENV_FAILURE classifier) folds in the
  // stack, so this only asserts on the identifying prefix.
  assert.match(summary.leaks[0].message, /^auth token lookup failed/);
});

test("ENTITY_NOT_FOUND on every returned error classifies as benign, not a leak", async () => {
  TeardownLeakTracker.resetForTest();
  TeardownLeakTracker.recordScenarioAttempt();

  // Shape verified live against the running server for deleteSpace on an
  // already-deleted id (2026-08-19): extensions.code 'ENTITY_NOT_FOUND',
  // surfaced by graphqlErrorWrapper as `{ code: 'ENTITY_NOT_FOUND', message }`.
  await teardownEntity("benign-scenario", "Space", "already-gone", async () => ({
    error: {
      errors: [
        {
          message: "Unable to find Space using options 'undefined'",
          code: "ENTITY_NOT_FOUND",
        },
      ],
    },
  }));

  const summary = TeardownLeakTracker.getSummary();
  assert.equal(summary.leakCount, 0, "an ENTITY_NOT_FOUND-only result must not count as a leak");
  assert.equal(summary.benignSkipCount, 1);
});

test("a non-ENTITY_NOT_FOUND graphql error classifies as a real leak", async () => {
  TeardownLeakTracker.resetForTest();
  TeardownLeakTracker.recordScenarioAttempt();

  await teardownEntity("real-leak-scenario", "Organization", "org-locked", async () => ({
    error: {
      errors: [{ message: "Forbidden", code: "FORBIDDEN_POLICY" }],
    },
  }));

  const summary = TeardownLeakTracker.getSummary();
  assert.equal(summary.leakCount, 1);
  assert.equal(summary.benignSkipCount, 0);
  assert.equal(summary.leaks[0].entityId, "org-locked");
});

test("a mixed ENTITY_NOT_FOUND + other error counts conservatively as a leak", async () => {
  TeardownLeakTracker.resetForTest();
  TeardownLeakTracker.recordScenarioAttempt();

  await teardownEntity("mixed-scenario", "Space", "mixed-1", async () => ({
    error: {
      errors: [
        { message: "not found", code: "ENTITY_NOT_FOUND" },
        { message: "unexpected", code: "SOME_OTHER_CODE" },
      ],
    },
  }));

  const summary = TeardownLeakTracker.getSummary();
  assert.equal(
    summary.leakCount,
    1,
    "unknown/mixed outcomes must count as a leak, never as benign",
  );
});

test("formatSummaryLine is unambiguous for both zero and non-zero leak counts", () => {
  TeardownLeakTracker.resetForTest();
  TeardownLeakTracker.recordScenarioAttempt();
  TeardownLeakTracker.recordScenarioAttempt();
  assert.equal(
    TeardownLeakTracker.formatSummaryLine(),
    "[teardown] leaks: 0 entities across 2 scenario(s) attempted — clean",
  );

  TeardownLeakTracker.recordLeak("s", "Space", "id-1", "boom");
  assert.equal(
    TeardownLeakTracker.formatSummaryLine(),
    "[teardown] leaks: 1 entities across 2 scenario(s) attempted — see [teardown-leak] lines above",
  );
});

// Restore tracker state so this file's side effects never leak into other
// tests loaded in the same process/thread.
test.after(() => {
  TeardownLeakTracker.resetForTest();
});
