import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, rm } from 'node:fs/promises';
import { writeRunSummary, vitestJsonToRun } from '../src/write/run-summary.js';
import type { RunSummary } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.join(__dirname, '.tmp', `runs-${Date.now()}`);

afterEach(async () => {
  await rm(path.join(__dirname, '.tmp'), { recursive: true, force: true });
});

// A minimal Vitest JSON report shape (snapshot of the subset we consume).
const vitestJsonFixture = {
  startTime: 1713313200000, // 2026-04-17T02:00:00Z in ms since epoch
  numPassedTests: 2,
  numFailedTests: 1,
  testResults: [
    {
      name: 'server-api/src/functional-api/foo.it-spec.ts',
      status: 'passed' as const,
      duration: 41231,
      assertionResults: [],
    },
    {
      name: 'server-api/src/functional-api/bar.it-spec.ts',
      status: 'failed' as const,
      duration: 8000,
      assertionResults: [
        { title: 'something', status: 'failed' as const, failureMessages: ['expected 200 but got 500'] },
      ],
    },
  ],
};

describe('write/run-summary — vitestJsonToRun', () => {
  it('transforms a Vitest JSON report into a Run', () => {
    const run = vitestJsonToRun(vitestJsonFixture, {
      runId: '1234',
      completedAt: '2026-04-17T02:30:00Z',
      commit: 'abc1234',
      branch: 'develop',
    });
    expect(run.runId).toBe('1234');
    expect(run.commit).toBe('abc1234');
    expect(run.branch).toBe('develop');
    expect(run.tests).toHaveLength(2);
    expect(run.tests[0]).toMatchObject({ file: 'server-api/src/functional-api/foo.it-spec.ts', status: 'passed' });
    expect(run.tests[1].status).toBe('failed');
    expect(run.tests[1].failures?.[0]?.message).toContain('expected 200');
  });
});

describe('write/run-summary — writeRunSummary', () => {
  it('creates a new <date>.json when none exists', async () => {
    const outPath = path.join(scratch, 'server-api', '2026-04-17.json');
    await writeRunSummary({
      outPath,
      run: {
        runId: '1111',
        startedAt: '2026-04-17T02:00:00Z',
        completedAt: '2026-04-17T02:28:00Z',
        commit: 'deadbee',
        branch: 'develop',
        tests: [{ file: 'a.it-spec.ts', status: 'passed' }],
      },
      date: '2026-04-17',
      suite: 'server-api',
    });
    const raw = await readFile(outPath, 'utf8');
    const summary = JSON.parse(raw) as RunSummary;
    expect(summary.date).toBe('2026-04-17');
    expect(summary.suite).toBe('server-api');
    expect(summary.runs).toHaveLength(1);
    expect(summary.runs[0].runId).toBe('1111');
  });

  it('appends to an existing same-date file', async () => {
    const outPath = path.join(scratch, 'server-api', '2026-04-17.json');
    const firstRun = {
      runId: '1111',
      startedAt: '2026-04-17T02:00:00Z',
      completedAt: '2026-04-17T02:28:00Z',
      commit: 'aaa1111',
      branch: 'develop',
      tests: [{ file: 'a.it-spec.ts', status: 'passed' as const }],
    };
    const secondRun = { ...firstRun, runId: '2222', commit: 'bbb2222', startedAt: '2026-04-17T14:00:00Z', completedAt: '2026-04-17T14:28:00Z' };
    await writeRunSummary({ outPath, run: firstRun,  date: '2026-04-17', suite: 'server-api' });
    await writeRunSummary({ outPath, run: secondRun, date: '2026-04-17', suite: 'server-api' });
    const summary = JSON.parse(await readFile(outPath, 'utf8')) as RunSummary;
    expect(summary.runs.map(r => r.runId)).toEqual(['1111', '2222']);
  });

  it('deduplicates runs with the same runId (replaces in place)', async () => {
    const outPath = path.join(scratch, 'server-api', '2026-04-17.json');
    const run = {
      runId: '1111',
      startedAt: '2026-04-17T02:00:00Z',
      completedAt: '2026-04-17T02:28:00Z',
      commit: 'aaa1111',
      branch: 'develop',
      tests: [{ file: 'a.it-spec.ts', status: 'passed' as const }],
    };
    const replayedRun = { ...run, commit: 'aaa1111', tests: [{ file: 'a.it-spec.ts', status: 'failed' as const }] };
    await writeRunSummary({ outPath, run,         date: '2026-04-17', suite: 'server-api' });
    await writeRunSummary({ outPath, run: replayedRun, date: '2026-04-17', suite: 'server-api' });
    const summary = JSON.parse(await readFile(outPath, 'utf8')) as RunSummary;
    expect(summary.runs).toHaveLength(1);
    expect(summary.runs[0].tests[0].status).toBe('failed');
  });
});
