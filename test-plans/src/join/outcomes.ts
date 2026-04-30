import type {
  CodeTag,
  FeatureLibrary,
  Outcome,
  OutcomeKind,
  OutcomeVariant,
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
  testCountByFile: Map<string, number> = new Map(),
): void {
  const caseById = new Map<string, TestCase>();
  for (const lib of libraries) {
    for (const c of lib.cases) {
      caseById.set(c.id, c);
      // Reset derived fields so a re-run is idempotent.
      c.coveredBy = [];
      c.automatedTestCount = 0;
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

  // Populate per-case automated test count from the static scan.
  for (const c of caseById.values()) {
    c.automatedTestCount = c.coveredBy.reduce(
      (sum, file) => sum + (testCountByFile.get(file) ?? 0),
      0,
    );
  }

  // 2. Build a per-case → aggregated-automated-outcome map (with variants).
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
        c.latestOutcomes[plan.release] = { ...auto, release: plan.release };
      }
    }
  }
}

/**
 * For every case, collect the most recent per-covering-file automated result
 * across all run summaries. Aggregates to a single "worst-severity" outcome
 * and retains the full per-file breakdown in `variants` so the dashboard can
 * surface "2/3 passed" next to the aggregate chip.
 */
function computeLatestAutomatedOutcomes(
  caseById: Map<string, TestCase>,
  runSummaries: RunSummary[],
): Map<string, Outcome> {
  // case → file → latest-per-file status
  const perCasePerFile = new Map<string, Map<string, { status: OutcomeKind; runId: string; completedAt: string }>>();

  for (const summary of runSummaries) {
    for (const run of summary.runs) {
      for (const t of run.tests) {
        const coveredCaseIds = findCasesCoveredByFile(caseById, t.file);
        const status = testStatusToOutcome(t);
        for (const caseId of coveredCaseIds) {
          let inner = perCasePerFile.get(caseId);
          if (!inner) {
            inner = new Map();
            perCasePerFile.set(caseId, inner);
          }
          const existing = inner.get(t.file);
          if (!existing || existing.completedAt < run.completedAt) {
            inner.set(t.file, { status, runId: run.runId, completedAt: run.completedAt });
          }
        }
      }
    }
  }

  const out = new Map<string, Outcome>();
  for (const [caseId, fileMap] of perCasePerFile) {
    const variants: OutcomeVariant[] = [];
    let latestCompletedAt = '';
    let latestRunId = '';
    let latestFile = '';
    for (const [file, v] of fileMap) {
      variants.push({ file, status: v.status, runId: v.runId, completedAt: v.completedAt });
      if (v.completedAt > latestCompletedAt) {
        latestCompletedAt = v.completedAt;
        latestRunId = v.runId;
        latestFile = file;
      }
    }
    // Stable display order: failed first, then blocked, not-run, passed.
    const sevRank: Record<OutcomeKind, number> = { failed: 0, blocked: 1, 'not-run': 2, passed: 3 };
    variants.sort((a, b) => sevRank[a.status] - sevRank[b.status] || a.file.localeCompare(b.file));
    out.set(caseId, {
      caseId,
      release: '',
      outcome: aggregateOutcome(variants),
      executedAt: latestCompletedAt,
      source: { kind: 'automated', runId: latestRunId, file: latestFile },
      variants,
    });
  }
  return out;
}

/** Worst-severity rule: any failed → failed; any blocked → blocked; any
 * not-run → not-run (conservative — a skipped test cannot count as "passed");
 * only all-passed → passed. */
function aggregateOutcome(variants: OutcomeVariant[]): OutcomeKind {
  if (variants.length === 0) return 'not-run';
  const statuses = new Set(variants.map(v => v.status));
  if (statuses.has('failed')) return 'failed';
  if (statuses.has('blocked')) return 'blocked';
  if (statuses.has('not-run')) return 'not-run';
  return 'passed';
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
