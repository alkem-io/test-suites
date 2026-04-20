import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { joinOutcomes, computeMetrics } from '../src/join/outcomes.js';
import type {
  FeatureLibrary,
  Outcome,
  ReleasePlan,
  RunSummary,
  CodeTag,
  TestCase,
} from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

function baseCase(id: string, overrides: Partial<TestCase> = {}): TestCase {
  return {
    id,
    title: `Case ${id}`,
    feature: 'F',
    file: '/virtual/f.md',
    priority: 'P1',
    type: 'functional',
    state: 'Ready',
    automation: 'required',
    links: {},
    steps: '',
    expected: '',
    coveredBy: [],
    latestOutcomes: {},
    ...overrides,
  };
}

function library(cases: TestCase[]): FeatureLibrary {
  return { feature: 'F', slug: 'f', path: '/virtual/f.md', cases };
}

function plan(release: string, inScope: string[], manualOutcomes: Record<string, Outcome> = {}): ReleasePlan {
  return { release, path: `/virtual/${release}.md`, inScope, manualOutcomes };
}

function runSummaryFile(file: string, status: 'passed' | 'failed', completedAt = '2026-04-17T02:30:00Z'): RunSummary {
  return {
    date: completedAt.slice(0, 10),
    suite: 'server-api',
    runs: [{
      runId: '999',
      startedAt: '2026-04-17T02:00:00Z',
      completedAt,
      commit: 'deadbee',
      branch: 'develop',
      tests: [{ file, status }],
    }],
  };
}

function tag(file: string, caseIds: string[]): CodeTag {
  return { file, line: 1, construct: 'describe', caseIds };
}

describe('join/outcomes', () => {
  it('(a) joins manual outcomes only (no automated runs)', () => {
    const c1 = baseCase('TC-1001');
    const libs = [library([c1])];
    const plans = [
      plan('R31', ['TC-1001'], {
        'TC-1001': {
          caseId: 'TC-1001',
          release: 'R31',
          outcome: 'passed',
          executedAt: '2026-04-20',
          source: { kind: 'manual', by: 'tester' },
        },
      }),
    ];
    joinOutcomes(libs, plans, [], []);
    expect(c1.latestOutcomes['R31']?.outcome).toBe('passed');
    expect(c1.latestOutcomes['R31']?.source.kind).toBe('manual');
  });

  it('(b) joins automated outcomes from run summaries via coveredBy', () => {
    const c1 = baseCase('TC-1001');
    const libs = [library([c1])];
    const plans = [plan('R31', ['TC-1001'], {})];
    const tags = [tag('server-api/foo.it-spec.ts', ['TC-1001'])];
    const runs = [runSummaryFile('server-api/foo.it-spec.ts', 'passed')];
    joinOutcomes(libs, plans, runs, tags);
    expect(c1.coveredBy).toEqual(['server-api/foo.it-spec.ts']);
    const outcome = c1.latestOutcomes['R31'];
    expect(outcome?.outcome).toBe('passed');
    expect(outcome?.source.kind).toBe('automated');
  });

  it('(c) manual outcome takes precedence over automated for the same (case, release)', () => {
    const c1 = baseCase('TC-1001');
    const libs = [library([c1])];
    const plans = [plan('R31', ['TC-1001'], {
      'TC-1001': {
        caseId: 'TC-1001',
        release: 'R31',
        outcome: 'blocked',
        executedAt: '2026-04-20',
        source: { kind: 'manual', by: 'tester' },
      },
    })];
    const tags = [tag('server-api/foo.it-spec.ts', ['TC-1001'])];
    const runs = [runSummaryFile('server-api/foo.it-spec.ts', 'passed')];
    joinOutcomes(libs, plans, runs, tags);
    const outcome = c1.latestOutcomes['R31'];
    expect(outcome?.outcome).toBe('blocked');
    expect(outcome?.source.kind).toBe('manual');
  });

  it('(d) computeMetrics reports % automated, % passed, and priority/type breakdowns', () => {
    const cases = [
      baseCase('TC-1', { priority: 'P1', type: 'integration' }),
      baseCase('TC-2', { priority: 'P2', type: 'integration' }),
      baseCase('TC-3', { priority: 'P3', type: 'functional' }),
      baseCase('TC-4', { priority: 'P1', type: 'e2e' }),
    ];
    const libs = [library(cases)];
    const plans = [plan('R31', ['TC-1', 'TC-2', 'TC-3', 'TC-4'], {
      'TC-1': { caseId: 'TC-1', release: 'R31', outcome: 'passed',  executedAt: '2026-04-20', source: { kind: 'manual', by: 't' } },
      'TC-2': { caseId: 'TC-2', release: 'R31', outcome: 'failed',  executedAt: '2026-04-20', source: { kind: 'manual', by: 't' } },
      'TC-3': { caseId: 'TC-3', release: 'R31', outcome: 'blocked', executedAt: '2026-04-20', source: { kind: 'manual', by: 't' } },
      // TC-4: no outcome → not-run
    })];
    const tags = [
      tag('f1.it-spec.ts', ['TC-1']),
      tag('f2.it-spec.ts', ['TC-2']),
      // TC-3 and TC-4 have no automation
    ];
    joinOutcomes(libs, plans, [], tags);
    const m = computeMetrics(plans[0], libs);
    expect(m.total).toBe(4);
    expect(m.automated).toBe(2);
    expect(m.percentAutomated).toBe(50);
    expect(m.passed).toBe(1);
    expect(m.failed).toBe(1);
    expect(m.blocked).toBe(1);
    expect(m.notRun).toBe(1);
    expect(m.percentPassed).toBeCloseTo(33.33, 1);
    expect(m.byPriority.P1).toBe(2);
    expect(m.byPriority.P2).toBe(1);
    expect(m.byPriority.P3).toBe(1);
    expect(m.byType.integration).toBe(2);
    expect(m.byType.functional).toBe(1);
    expect(m.byType.e2e).toBe(1);
  });

  it('(e) FR-010 invariant: mutating a case\'s steps/expected leaves prior outcomes intact', () => {
    const c1 = baseCase('TC-1001', { steps: 'initial steps', expected: 'initial expected' });
    const libs = [library([c1])];
    const recordedOutcome = {
      caseId: 'TC-1001',
      release: 'R31',
      outcome: 'passed' as const,
      executedAt: '2026-04-20',
      source: { kind: 'manual' as const, by: 'tester' },
    };
    const plans = [plan('R31', ['TC-1001'], { 'TC-1001': recordedOutcome })];
    joinOutcomes(libs, plans, [], []);

    // Snapshot the outcome as stored on the case
    const originalSerialized = JSON.stringify(c1.latestOutcomes['R31']);

    // Mutate the case wording in place (as a QA engineer would via editing the feature library)
    c1.steps = 'revised steps';
    c1.expected = 'revised expected';

    // Re-run the join (as the dashboard would on the next build)
    joinOutcomes(libs, plans, [], []);

    // The outcome MUST remain byte-for-byte unchanged
    expect(JSON.stringify(c1.latestOutcomes['R31'])).toBe(originalSerialized);
  });

  it('uses the real fixture run summary end-to-end', async () => {
    const runJson = await readFile(path.join(fixturesDir, 'valid-run-summary.json'), 'utf8');
    const runSummary: RunSummary = JSON.parse(runJson);

    const c = baseCase('TC-1001');
    const libs = [library([c])];
    const plans = [plan('R31', ['TC-1001'], {})];
    const tags = [tag('server-api/src/functional-api/fixture/tagged-automation.it-spec.ts', ['TC-1001'])];

    joinOutcomes(libs, plans, [runSummary], tags);
    expect(c.latestOutcomes['R31']?.outcome).toBe('passed');
  });
});
