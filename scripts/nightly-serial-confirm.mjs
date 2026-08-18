#!/usr/bin/env node
// Serial-confirm — the structural exit-code gate for the parallel nightly
// Reads the main run's per-file verdicts, partitions failures
// by lane using the guard's lanes.json (the single membership source —
// missing/unreadable ⇒ fail closed), re-runs only the parallel-lane failures
// at NIGHTLY_MAX_WORKERS=1, and derives the job's exit code from serial
// verdicts only: serial-lane failures from the main run, plus the re-run's
// own results. A parallel-fail/serial-pass file never fails the build, but
// is recorded in the published interference ledger — never silently dropped.
//
// Usage:
//   node scripts/nightly-serial-confirm.mjs \
//     --results server-api/html-report/results.json \
//     --lanes server-api/lanes.json \
//     [--server-api-root server-api] \
//     [--run-id <id>] [--run-date <date>] \
//     [--ledger-archive out/gh-pages-root/server-api] \
//     [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--results':
        out.results = argv[++i];
        break;
      case '--lanes':
        out.lanes = argv[++i];
        break;
      case '--server-api-root':
        out.serverApiRoot = argv[++i];
        break;
      case '--run-id':
        out.runId = argv[++i];
        break;
      case '--run-date':
        out.runDate = argv[++i];
        break;
      case '--ledger-archive':
        out.ledgerArchive = argv[++i];
        break;
      case '--dry-run':
        out.dryRun = true;
        break;
      // Test-only overrides (used by nightly-serial-confirm.test.mjs) — let
      // the fixtures exercise the full re-run-outcome logic deterministically
      // without spawning a real vitest process against a live server.
      case '--rerun-stub':
        out.rerunStub = argv[++i];
        break;
      case '--rerun-crash':
        out.rerunCrash = true;
        break;
      default:
        break;
    }
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Normalizes a vitest/Jest-style JSON reporter `name`/`filepath` to a server-api-relative posix path. */
function normalizeFile(rawPath, serverApiRoot) {
  const abs = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(serverApiRoot, rawPath);
  return toPosix(path.relative(serverApiRoot, abs));
}

/**
 * Parses a vitest `json` reporter file into `{ file: 'pass'|'fail' }`,
 * tolerant of the Jest-compatible `testResults[]` shape (`name` + `status`,
 * or a `failed`/`passed` count on `assertionResults`).
 */
function parseFileVerdicts(reportJson, serverApiRoot) {
  const verdicts = new Map();
  const testResults = reportJson.testResults ?? [];
  for (const entry of testResults) {
    const rawPath = entry.name ?? entry.filepath ?? entry.file;
    if (!rawPath) continue;
    const file = normalizeFile(rawPath, serverApiRoot);
    let status = entry.status;
    if (!status && Array.isArray(entry.assertionResults)) {
      status = entry.assertionResults.some(a => a.status === 'failed')
        ? 'failed'
        : 'passed';
    }
    verdicts.set(file, status === 'passed' ? 'pass' : 'fail');
  }
  return verdicts;
}

function failingTestNames(reportJson, serverApiRoot, file) {
  const testResults = reportJson.testResults ?? [];
  for (const entry of testResults) {
    const rawPath = entry.name ?? entry.filepath ?? entry.file;
    if (!rawPath) continue;
    if (normalizeFile(rawPath, serverApiRoot) !== file) continue;
    return (entry.assertionResults ?? [])
      .filter(a => a.status === 'failed')
      .map(a => a.fullName ?? a.title ?? 'unnamed test');
  }
  return [];
}

function appendStepSummary(text) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, text + '\n');
}

/** Scans the trailing-7-night archived ledgers (if provided) plus this run's new entries for demotion candidates. */
function computeDemotionDue(ledgerArchiveDir, newEntriesByFile) {
  const counts = new Map();
  for (const file of newEntriesByFile.keys()) {
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }

  if (ledgerArchiveDir && fs.existsSync(ledgerArchiveDir)) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const dateDirs = fs
      .readdirSync(ledgerArchiveDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse();
    for (const dateDir of dateDirs) {
      const dateMs = Date.parse(dateDir);
      if (!Number.isNaN(dateMs) && dateMs < sevenDaysAgo) continue;
      const dateDirPath = path.join(ledgerArchiveDir, dateDir);
      let runDirs = [];
      try {
        runDirs = fs
          .readdirSync(dateDirPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
      } catch {
        continue;
      }
      for (const runDir of runDirs) {
        const ledgerPath = path.join(
          dateDirPath,
          runDir,
          'interference-ledger.json'
        );
        if (!fs.existsSync(ledgerPath)) continue;
        try {
          const entries = readJson(ledgerPath);
          for (const entry of entries) {
            counts.set(entry.file, (counts.get(entry.file) ?? 0) + 1);
          }
        } catch {
          // Malformed archived ledger — skip rather than crash the current
          // run's verdict over historical data.
        }
      }
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([file]) => file)
    .sort();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.results || !args.lanes) {
    console.error(
      'usage: nightly-serial-confirm.mjs --results <results.json> --lanes <lanes.json> [--server-api-root <dir>]'
    );
    process.exit(1);
  }

  const serverApiRoot = path.resolve(
    process.cwd(),
    args.serverApiRoot ?? 'server-api'
  );
  const htmlReportDir = path.join(serverApiRoot, 'html-report');
  const runId = args.runId ?? process.env.RUN_ID ?? 'unknown-run';
  const runDate =
    args.runDate ?? process.env.RUN_DATE ?? new Date().toISOString().slice(0, 10);

  // Fail-closed: no lane membership source, no verdict.
  let lanes;
  try {
    lanes = readJson(path.resolve(process.cwd(), args.lanes));
  } catch (e) {
    console.error(
      `[serial-confirm] FATAL: could not read lanes.json (${args.lanes}) — fail-closed: ${e.message}`
    );
    fs.mkdirSync(htmlReportDir, { recursive: true });
    fs.writeFileSync(
      path.join(htmlReportDir, 'serial-confirm.json'),
      JSON.stringify(
        { rerunFiles: [], verdictPerFile: {}, finalExitVerdict: 'fail', crashed: true, reason: 'missing lanes.json' },
        null,
        2
      )
    );
    process.exit(1);
  }
  const parallelSet = new Set(lanes.parallel ?? []);
  const serialSet = new Set(lanes.serial ?? []);

  const mainResults = readJson(path.resolve(process.cwd(), args.results));
  const mainVerdicts = parseFileVerdicts(mainResults, serverApiRoot);

  // Fail-closed: the main run's own reporter-level verdict said the run
  // failed (an unhandled rejection, a teardown failure, or anything else
  // vitest attaches to the run rather than to a specific file), but not one
  // file in the per-file breakdown is attributable as failing. Deriving the
  // exit code purely from per-file verdicts would silently publish a green
  // nightly for a run vitest itself declared failed — mirror the missing
  // lanes.json fail-closed branch above instead of trusting the file set.
  const mainRunReportedFailure =
    mainResults.success === false ||
    (typeof mainResults.numFailedTestSuites === 'number' &&
      mainResults.numFailedTestSuites > 0) ||
    (typeof mainResults.numFailedTests === 'number' &&
      mainResults.numFailedTests > 0);
  const anyAttributableFileFailure = [...mainVerdicts.values()].some(
    v => v === 'fail'
  );
  const unattributableRunFailure =
    mainRunReportedFailure && !anyAttributableFileFailure;
  if (unattributableRunFailure) {
    console.error(
      '[serial-confirm] FATAL: the main run reported a failure (results.json success=false / ' +
        'a non-zero failed-suite or failed-test count) but no per-file verdict is attributable ' +
        '— an unhandled error or teardown failure outside any test file. Fail-closed.'
    );
  }

  const serialFailures = [];
  const rerunCandidates = [];
  for (const [file, verdict] of mainVerdicts) {
    if (verdict !== 'fail') continue;
    if (serialSet.has(file)) {
      serialFailures.push(file);
    } else if (parallelSet.has(file)) {
      rerunCandidates.push(file);
    } else {
      // Not in either lane per lanes.json — the partition is supposed to be
      // exhaustive; an unattributable failure is treated as authoritative
      // (fail-closed) rather than silently ignored.
      console.error(
        `[serial-confirm] WARNING: "${file}" failed but is in neither lane — treating as a final failure (fail-closed)`
      );
      serialFailures.push(file);
    }
  }

  let verdictPerFile = {};
  let crashed = false;
  const interferenceEntries = [];

  if (rerunCandidates.length === 0) {
    console.log('[serial-confirm] no parallel-lane failures to re-run.');
  } else if (args.dryRun) {
    console.log(
      `[serial-confirm] dry-run: would re-run ${rerunCandidates.length} file(s): ${rerunCandidates.join(', ')}`
    );
    for (const f of rerunCandidates) verdictPerFile[f] = 'fail'; // conservative under dry-run
  } else {
    const rawOut = path.join(htmlReportDir, 'serial-confirm-raw.json');
    console.log(
      `[serial-confirm] re-running ${rerunCandidates.length} parallel-lane failure(s) at NIGHTLY_MAX_WORKERS=1: ${rerunCandidates.join(', ')}`
    );

    let rawResults;
    if (args.rerunCrash) {
      crashed = true;
    } else if (args.rerunStub) {
      // Test-only: skip the real subprocess, read the stub straight from disk.
      try {
        rawResults = readJson(path.resolve(process.cwd(), args.rerunStub));
      } catch (e) {
        crashed = true;
      }
    } else {
      spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--project',
          'nightly-parallel',
          '--project',
          'nightly-serial',
          '--reporter=json',
          `--outputFile=${rawOut}`,
          ...rerunCandidates,
        ],
        {
          cwd: serverApiRoot,
          env: { ...process.env, NIGHTLY_MAX_WORKERS: '1' },
          stdio: 'inherit',
        }
      );
      try {
        rawResults = readJson(rawOut);
      } catch (e) {
        console.error(
          `[serial-confirm] the re-run crashed or produced no readable output (${e.message}) — fail-closed`
        );
        crashed = true;
      }
    }

    if (crashed) {
      for (const f of rerunCandidates) verdictPerFile[f] = 'fail';
    } else {
      const rerunVerdicts = parseFileVerdicts(rawResults, serverApiRoot);
      for (const f of rerunCandidates) {
        const v = rerunVerdicts.get(f);
        // A file the re-run didn't report on at all is a crash-equivalent
        // for that file — fail-closed rather than assumed-passing.
        verdictPerFile[f] = v ?? 'fail';
        if (verdictPerFile[f] === 'pass') {
          interferenceEntries.push({
            file: f,
            runId,
            runDate,
            tests: failingTestNames(mainResults, serverApiRoot, f),
          });
        }
      }
    }
  }

  const anyRerunFailure = Object.values(verdictPerFile).some(v => v === 'fail');
  const finalExitVerdict =
    serialFailures.length > 0 ||
    anyRerunFailure ||
    crashed ||
    unattributableRunFailure
      ? 'fail'
      : 'pass';

  fs.mkdirSync(htmlReportDir, { recursive: true });

  // Interference ledger — append-only, published every run it has entries.
  const ledgerPath = path.join(htmlReportDir, 'interference-ledger.json');
  let existingLedger = [];
  if (fs.existsSync(ledgerPath)) {
    try {
      existingLedger = readJson(ledgerPath);
    } catch {
      existingLedger = [];
    }
  }
  const fullLedger = [...existingLedger, ...interferenceEntries];
  fs.writeFileSync(ledgerPath, JSON.stringify(fullLedger, null, 2));

  const demotionDue = computeDemotionDue(
    args.ledgerArchive
      ? path.resolve(process.cwd(), args.ledgerArchive)
      : undefined,
    new Map(interferenceEntries.map(e => [e.file, e]))
  );

  fs.writeFileSync(
    path.join(htmlReportDir, 'serial-confirm.json'),
    JSON.stringify(
      {
        rerunFiles: rerunCandidates,
        verdictPerFile,
        serialFailures,
        finalExitVerdict,
        crashed,
        unattributableRunFailure,
        reason: unattributableRunFailure ? 'unattributable-run-failure' : null,
        demotionDue,
      },
      null,
      2
    )
  );

  // lanes.json is the guard's authoritative membership snapshot — copy it
  // alongside the report so it publishes with every run,
  // whether or not a re-run happened.
  const lanesSrc = path.resolve(process.cwd(), args.lanes);
  if (fs.existsSync(lanesSrc)) {
    fs.copyFileSync(lanesSrc, path.join(htmlReportDir, 'lanes.json'));
  }

  const summaryLines = [
    '### Nightly serial-confirm verdict',
    '',
    `- Serial-lane failures (final, not re-run): ${serialFailures.length}${serialFailures.length ? ` — ${serialFailures.join(', ')}` : ''}`,
    `- Parallel-lane failures re-run serially: ${rerunCandidates.length}`,
    `- Interference (fail parallel / pass serial): ${interferenceEntries.length}${interferenceEntries.length ? ` — ${interferenceEntries.map(e => e.file).join(', ')}` : ''}`,
    `- Demotion due (>=2 interference entries in trailing 7 nights): ${demotionDue.length ? demotionDue.join(', ') : 'none'}`,
    `- Re-run crashed: ${crashed}`,
    `- Unattributable main-run failure (fail-closed): ${unattributableRunFailure}`,
    `- **Final verdict: ${finalExitVerdict.toUpperCase()}**`,
  ].join('\n');
  console.log('\n' + summaryLines);
  appendStepSummary(summaryLines);

  process.exit(finalExitVerdict === 'fail' ? 1 : 0);
}

main();
