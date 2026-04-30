import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Run, RunSummary, TestResult, TestSuite } from '../types.js';

/** Subset of Vitest's JSON reporter output this tool consumes. */
export interface VitestJsonReport {
  startTime?: number;
  testResults: VitestTestFileResult[];
}

export interface VitestTestFileResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  assertionResults?: Array<{
    title: string;
    status: 'passed' | 'failed' | 'skipped';
    failureMessages?: string[];
  }>;
}

export interface VitestToRunMetadata {
  runId: string;
  completedAt: string;
  commit: string;
  branch: string;
  /** If omitted, derived from `report.startTime` or falls back to `completedAt`. */
  startedAt?: string;
}

/** Transforms a parsed Vitest JSON report into our `Run` shape. */
export function vitestJsonToRun(
  report: VitestJsonReport,
  meta: VitestToRunMetadata,
): Run {
  const startedAt = meta.startedAt
    ?? (report.startTime ? new Date(report.startTime).toISOString() : meta.completedAt);
  const tests: TestResult[] = report.testResults.map(r => ({
    file: r.name,
    status: r.status,
    durationMs: r.duration,
    failures: (r.assertionResults ?? [])
      .filter(a => a.status === 'failed')
      .map(a => ({
        name: a.title,
        message: (a.failureMessages?.[0] ?? '').toString(),
      })),
  }));
  return {
    runId: meta.runId,
    startedAt,
    completedAt: meta.completedAt,
    commit: meta.commit,
    branch: meta.branch,
    tests,
  };
}

export interface WriteRunSummaryOptions {
  outPath: string;
  run: Run;
  date: string;
  suite: TestSuite;
}

/**
 * Appends `run` to the RunSummary at `outPath`, creating the file if needed.
 * A run with the same `runId` as an existing entry replaces that entry
 * in-place (making the operation idempotent for re-runs of the same CI run).
 */
export async function writeRunSummary(options: WriteRunSummaryOptions): Promise<void> {
  const existing = await loadExisting(options.outPath, options.date, options.suite);
  const runs = existing.runs.filter(r => r.runId !== options.run.runId);
  runs.push(options.run);
  runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const next: RunSummary = { date: options.date, suite: options.suite, runs };
  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
}

async function loadExisting(outPath: string, date: string, suite: TestSuite): Promise<RunSummary> {
  if (!existsSync(outPath)) {
    return { date, suite, runs: [] };
  }
  try {
    return JSON.parse(await readFile(outPath, 'utf8')) as RunSummary;
  } catch {
    return { date, suite, runs: [] };
  }
}
