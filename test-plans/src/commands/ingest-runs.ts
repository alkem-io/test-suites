import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { GlobalFlags } from '../cli.js';
import type { TestSuite } from '../types.js';
import { vitestJsonToRun, writeRunSummary, type VitestJsonReport } from '../write/run-summary.js';

export interface IngestFlags {
  inputPath: string;
  suite: TestSuite;
  date: string;
  runId: string;
  commit: string;
  branch: string;
  completedAt: string;
}

export function parseIngestFlags(args: string[]): IngestFlags {
  const flags: Partial<IngestFlags> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const take = () => {
      const v = args[++i];
      if (!v) throw new Error(`[test-plans] flag ${a} requires a value`);
      return v;
    };
    if (a === '--input')        flags.inputPath   = take();
    else if (a === '--suite')   flags.suite       = take() as TestSuite;
    else if (a === '--date')    flags.date        = take();
    else if (a === '--run-id')  flags.runId       = take();
    else if (a === '--commit')  flags.commit      = take();
    else if (a === '--branch')  flags.branch      = take();
    else if (a === '--completed-at') flags.completedAt = take();
  }
  for (const key of ['inputPath', 'suite', 'date', 'runId', 'commit', 'branch', 'completedAt'] as const) {
    if (!flags[key]) {
      throw new Error(`[test-plans] ingest-runs: missing required flag --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    }
  }
  return flags as IngestFlags;
}

export async function ingestRunsCommand(globalFlags: GlobalFlags, rawArgs: string[]): Promise<number> {
  const ingest = parseIngestFlags(rawArgs);
  const raw = await readFile(ingest.inputPath, 'utf8');
  const report = JSON.parse(raw) as VitestJsonReport;

  const run = vitestJsonToRun(report, {
    runId: ingest.runId,
    completedAt: ingest.completedAt,
    commit: ingest.commit,
    branch: ingest.branch,
  });

  const outPath = path.join(globalFlags.runsDir, ingest.suite, `${ingest.date}.json`);
  await writeRunSummary({ outPath, run, date: ingest.date, suite: ingest.suite });
  console.log(`[test-plans] ingest-runs: wrote ${run.tests.length} test result(s) for ${ingest.suite} @ ${ingest.date} (run ${ingest.runId}) to ${outPath}`);
  return 0;
}
