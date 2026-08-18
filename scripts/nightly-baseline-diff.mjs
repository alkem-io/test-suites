#!/usr/bin/env node
// Retrospective baseline + per-run diff. Reconstructs the per-test
// verdict baseline from the already-published gh-pages archive (no new
// instrumentation needed on past runs — the html reporter has always
// written `html.meta.json.gz`), classes each case over the trailing 14
// archived nights (always-pass / intermittent / always-fail), and diffs the
// current run's results against it: newFail, newPass, stillFailingKnown,
// intermittent. Non-gating by default (BASELINE_DIFF_ENFORCE=true flips it).
//
// Usage:
//   node scripts/nightly-baseline-diff.mjs \
//     --archive out/gh-pages-root/server-api \
//     --current server-api/html-report/results.json \
//     --out server-api/html-report/baseline-diff.json \
//     [--trailing-nights 14] [--server-api-root server-api]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function parseArgs(argv) {
  const out = { trailingNights: 14 };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--archive':
        out.archive = argv[++i];
        break;
      case '--current':
        out.current = argv[++i];
        break;
      case '--out':
        out.out = argv[++i];
        break;
      case '--trailing-nights':
        out.trailingNights = Number(argv[++i]);
        break;
      case '--server-api-root':
        out.serverApiRoot = argv[++i];
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

function normalizeFile(rawPath, serverApiRoot) {
  const abs = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(serverApiRoot, rawPath);
  return toPosix(path.relative(serverApiRoot, abs));
}

/** Parses the current run's vitest `json` reporter output into `{ caseKey -> 'pass'|'fail' }`. */
function parseCurrentRun(reportJson, serverApiRoot) {
  const verdicts = new Map();
  for (const entry of reportJson.testResults ?? []) {
    const rawPath = entry.name ?? entry.filepath ?? entry.file;
    if (!rawPath) continue;
    const file = normalizeFile(rawPath, serverApiRoot);
    for (const assertion of entry.assertionResults ?? []) {
      const caseKey = `${file} > ${assertion.fullName ?? assertion.title ?? 'unnamed test'}`;
      verdicts.set(caseKey, assertion.status === 'passed' ? 'pass' : 'fail');
    }
  }
  return verdicts;
}

/**
 * Recursively walks a vitest File/Suite/Test task tree (the shape the html
 * reporter's `html.meta.json.gz` stores under `.files`) into
 * `{ caseKey -> 'pass'|'fail' }`. Tolerant of missing/partial fields —
 * archived nights are read-only historical data we must never crash on.
 * `isFileTopLevel` skips folding the top-level File task's own name (which
 * is the file path/basename, not a describe block) into the case path — only
 * genuinely nested suite ("describe") names accumulate, matching the shape
 * of the current run's `assertionResults[].fullName`.
 */
function walkTaskTree(task, filePath, namePath, out, isFileTopLevel) {
  if (!task) return;
  if (task.type === 'test' || task.type === 'custom') {
    const fullName = namePath ? `${namePath} > ${task.name}` : task.name ?? '';
    const state = task.result?.state;
    if (state === 'pass' || state === 'fail') {
      out.set(`${filePath} > ${fullName}`, state);
    }
    return;
  }
  const nextNamePath = isFileTopLevel
    ? namePath
    : namePath
      ? `${namePath} > ${task.name ?? ''}`
      : (task.name ?? '');
  for (const child of task.tasks ?? []) {
    walkTaskTree(child, filePath, nextNamePath, out, false);
  }
}

function parseArchivedRun(gzPath) {
  const compressed = fs.readFileSync(gzPath);
  const json = zlib.gunzipSync(compressed).toString('utf8');
  // The html reporter serializes with `flatted` (handles the circular task
  // tree) — a plain JSON.parse would silently misparse it.
  const { parse } = flattedModule();
  const result = parse(json);
  const verdicts = new Map();
  for (const file of result.files ?? []) {
    walkTaskTree(file, file.filepath ?? file.name ?? 'unknown-file', '', verdicts, true);
  }
  return verdicts;
}

let _flatted;
function flattedModule() {
  return _flatted;
}

function listArchivedRuns(archiveDir, trailingNights) {
  if (!fs.existsSync(archiveDir)) return [];
  const dateDirs = fs
    .readdirSync(archiveDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .reverse()
    .slice(0, trailingNights);

  const runs = [];
  for (const dateDir of dateDirs) {
    const dateDirPath = path.join(archiveDir, dateDir);
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
      const gzPath = path.join(dateDirPath, runDir, 'html.meta.json.gz');
      if (fs.existsSync(gzPath)) {
        runs.push({ date: dateDir, runId: runDir, gzPath });
      }
    }
  }
  return runs;
}

/** always-pass / intermittent / always-fail per case, over every readable archived run. */
function buildBaseline(runs) {
  const perCase = new Map(); // caseKey -> {pass: n, fail: n}
  let readableRuns = 0;
  for (const run of runs) {
    let verdicts;
    try {
      verdicts = parseArchivedRun(run.gzPath);
    } catch (e) {
      console.error(
        `[baseline-diff] skipping unreadable archived run ${run.date}/${run.runId}: ${e.message}`
      );
      continue;
    }
    readableRuns++;
    for (const [caseKey, verdict] of verdicts) {
      const counts = perCase.get(caseKey) ?? { pass: 0, fail: 0 };
      counts[verdict]++;
      perCase.set(caseKey, counts);
    }
  }

  const classes = new Map(); // caseKey -> 'always-pass'|'always-fail'|'intermittent'
  for (const [caseKey, counts] of perCase) {
    if (counts.fail === 0) classes.set(caseKey, 'always-pass');
    else if (counts.pass === 0) classes.set(caseKey, 'always-fail');
    else classes.set(caseKey, 'intermittent');
  }
  return { classes, readableRuns, totalCases: perCase.size };
}

function appendStepSummary(text) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, text + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.archive || !args.current || !args.out) {
    console.error(
      'usage: nightly-baseline-diff.mjs --archive <dir> --current <results.json> --out <baseline-diff.json>'
    );
    process.exit(1);
  }
  _flatted = await import('flatted');

  const serverApiRoot = path.resolve(
    process.cwd(),
    args.serverApiRoot ?? 'server-api'
  );
  const archiveDir = path.resolve(process.cwd(), args.archive);
  const runs = listArchivedRuns(archiveDir, args.trailingNights);
  const { classes, readableRuns, totalCases } = buildBaseline(runs);

  const currentReport = readJson(path.resolve(process.cwd(), args.current));
  const current = parseCurrentRun(currentReport, serverApiRoot);

  const newFail = [];
  const newPass = [];
  const stillFailingKnown = [];
  const intermittent = [];
  const newCases = [];

  for (const [caseKey, verdict] of current) {
    const cls = classes.get(caseKey);
    if (cls === undefined) {
      newCases.push(caseKey);
      continue;
    }
    if (cls === 'always-pass' && verdict === 'fail') newFail.push(caseKey);
    else if (cls === 'always-fail' && verdict === 'pass') newPass.push(caseKey);
    else if (cls === 'always-fail' && verdict === 'fail') stillFailingKnown.push(caseKey);
    else if (cls === 'intermittent') intermittent.push(caseKey);
  }

  const enforce = (process.env.BASELINE_DIFF_ENFORCE ?? '').toLowerCase() === 'true';

  const output = {
    archivedRunsRead: readableRuns,
    archivedRunsTotal: runs.length,
    baselineCaseCount: totalCases,
    newFail,
    newPass,
    stillFailingKnown,
    intermittent,
    newCases,
    enforced: enforce,
  };

  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), args.out)), {
    recursive: true,
  });
  fs.writeFileSync(
    path.resolve(process.cwd(), args.out),
    JSON.stringify(output, null, 2)
  );

  const summaryLines = [
    '### Nightly baseline diff',
    '',
    `- Archived nights read: ${readableRuns}/${runs.length} (trailing ${args.trailingNights})`,
    `- Baseline case count: ${totalCases}`,
    `- New failures (regression candidates): ${newFail.length}${newFail.length ? ` — ${newFail.slice(0, 10).join('; ')}` : ''}`,
    `- New passes: ${newPass.length}`,
    `- Still-failing known cases: ${stillFailingKnown.length}`,
    `- Intermittent cases: ${intermittent.length}`,
    `- New (not in baseline) cases: ${newCases.length}`,
    `- Gating: ${enforce ? 'ENFORCED (BASELINE_DIFF_ENFORCE=true)' : 'non-gating'}`,
  ].join('\n');
  console.log('\n' + summaryLines);
  appendStepSummary(summaryLines);

  if (enforce && newFail.length > 0) {
    console.error(
      `[baseline-diff] BASELINE_DIFF_ENFORCE=true and ${newFail.length} unexplained new failure(s) — failing.`
    );
    process.exit(1);
  }
  process.exit(0);
}

main();
