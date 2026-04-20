import type {
  CodeTag,
  FeatureLibrary,
  Outcome,
  ReleaseMetrics,
  ReleasePlan,
  RunSummary,
  TestCase,
  TestResult,
  TestType,
  Priority,
} from '../types.js';

/**
 * Populate each test case's `coveredBy` (from code tags) and `latestOutcomes`
 * (from release-plan manual outcomes + the most recent automated outcome for
 * each covering file). Manual outcomes take precedence over automated outcomes
 * for the same (case, release) pair.
 *
 * Mutates the `TestCase` objects in place. Cases with no outcome for a given
 * release simply do not have an entry for that release in `latestOutcomes`.
 */
export function joinOutcomes(
  libraries: FeatureLibrary[],
  releasePlans: ReleasePlan[],
  runSummaries: RunSummary[],
  codeTags: CodeTag[],
): void {
  const caseById = new Map<string, TestCase>();
  for (const lib of libraries) {
    for (const c of lib.cases) {
      caseById.set(c.id, c);
      // Reset derived fields so a re-run is idempotent.
      c.coveredBy = [];
      c.latestOutcomes = {};
    }
  }

  // 1. coveredBy: for each tag, attach the tag's file to each referenced case.
  for (const tag of codeTags) {
    for (const caseId of tag.caseIds) {
      const c = caseById.get(caseId);
      if (!c) continue;
      if (!c.coveredBy.includes(tag.file)) {
        c.coveredBy.push(tag.file);
      }
    }
  }

  // 2. Build a per-case → latest automated outcome map.
  const latestAutomated = computeLatestAutomatedOutcomes(caseById, runSummaries);

  // 3. For each (case, release) pair: pick manual outcome > automated > nothing.
  for (const plan of releasePlans) {
    for (const caseId of plan.inScope) {
      const c = caseById.get(caseId);
      if (!c) continue;
      const manual = plan.manualOutcomes[caseId];
      if (manual) {
        c.latestOutcomes[plan.release] = manual;
        continue;
      }
      const auto = latestAutomated.get(caseId);
      if (auto) {
        // Scope the automated outcome to this release.
        c.latestOutcomes[plan.release] = { ...auto, release: plan.release };
      }
    }
  }
}

function computeLatestAutomatedOutcomes(
  caseById: Map<string, TestCase>,
  runSummaries: RunSummary[],
): Map<string, Outcome> {
  const latest = new Map<string, Outcome>();
  for (const summary of runSummaries) {
    for (const run of summary.runs) {
      for (const t of run.tests) {
        const coveredCaseIds = findCasesCoveredByFile(caseById, t.file);
        for (const caseId of coveredCaseIds) {
          const candidate: Outcome = {
            caseId,
            release: '', // filled in by joinOutcomes when applied to a release
            outcome: testStatusToOutcome(t),
            executedAt: run.completedAt,
            source: { kind: 'automated', runId: run.runId, file: t.file },
          };
          const current = latest.get(caseId);
          if (!current || current.executedAt < candidate.executedAt) {
            latest.set(caseId, candidate);
          }
        }
      }
    }
  }
  return latest;
}

function findCasesCoveredByFile(caseById: Map<string, TestCase>, file: string): string[] {
  const ids: string[] = [];
  for (const c of caseById.values()) {
    if (c.coveredBy.includes(file)) ids.push(c.id);
  }
  return ids;
}

function testStatusToOutcome(t: TestResult): Outcome['outcome'] {
  if (t.status === 'passed') return 'passed';
  if (t.status === 'failed') return 'failed';
  return 'not-run'; // skipped → not-run
}

// ---------------------------------------------------------------------------
// Per-release metric aggregation
// ---------------------------------------------------------------------------

export function computeMetrics(
  plan: ReleasePlan,
  libraries: FeatureLibrary[],
): ReleaseMetrics {
  const caseById = new Map<string, TestCase>();
  for (const lib of libraries) {
    for (const c of lib.cases) caseById.set(c.id, c);
  }

  const metrics: ReleaseMetrics = {
    total: 0,
    automated: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    notRun: 0,
    percentAutomated: 0,
    percentPassed: 0,
    byPriority: { P1: 0, P2: 0, P3: 0 },
    byType: { functional: 0, integration: 0, e2e: 0, other: 0 },
  };

  for (const caseId of plan.inScope) {
    const c = caseById.get(caseId);
    if (!c) continue; // stale reference; surfaced by the defects layer
    metrics.total++;
    metrics.byPriority[c.priority as Priority]++;
    metrics.byType[c.type as TestType]++;
    if (c.coveredBy.length > 0) metrics.automated++;

    const outcome = c.latestOutcomes[plan.release];
    if (!outcome) {
      metrics.notRun++;
      continue;
    }
    switch (outcome.outcome) {
      case 'passed':  metrics.passed++;  break;
      case 'failed':  metrics.failed++;  break;
      case 'blocked': metrics.blocked++; break;
      case 'not-run': metrics.notRun++;  break;
    }
  }

  metrics.percentAutomated = metrics.total === 0 ? 0 : (metrics.automated / metrics.total) * 100;
  const withOutcome = metrics.passed + metrics.failed + metrics.blocked;
  metrics.percentPassed = withOutcome === 0 ? 0 : (metrics.passed / withOutcome) * 100;
  return metrics;
}
