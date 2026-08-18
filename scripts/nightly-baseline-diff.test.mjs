// Fixture-driven tests for nightly-baseline-diff.mjs. Builds synthetic
// archived nights in the exact `html.meta.json.gz` shape the vitest html
// reporter writes (flatted-serialized task tree, gzip'd) so the baseline
// classifier and diff can be proven without a live gh-pages archive — the
// real-archive smoke (reproducing the 2 known-always-fail + 1
// known-intermittent cases from the live archive) is owned by the live
// verification stage, not this fixture suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { stringify } from 'flatted';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'nightly-baseline-diff.mjs');

// Archived runs are published from a DIFFERENT machine's checkout (a GitHub
// Actions runner) than the one computing `--server-api-root` here — the
// fixture deliberately uses a root that shares no prefix with REPO_ROOT, so
// a test that only passes because both sides happen to resolve to the same
// absolute path would not catch the real defect (corr-test-suites-3 /
// spec-ts-3 / qual-test-suites-2).
const ARCHIVED_SERVER_API_ROOT =
  '/home/runner/_work/test-suites/test-suites/server-api';

/**
 * Builds a File task with a realistic NESTED suite/test tree and an
 * ABSOLUTE `filepath` — the real shape the vitest html reporter writes
 * (`File.filepath` absolute; describe blocks are nested `suite` tasks, not
 * a ' > '-joined string baked into a flat test name).
 */
function fileTask(relPath, suites) {
  const filepath = path.posix.join(ARCHIVED_SERVER_API_ROOT, relPath);
  return {
    type: 'suite',
    name: path.basename(filepath),
    filepath,
    tasks: suites.map(suite => ({
      type: 'suite',
      name: suite.name,
      tasks: suite.tests.map(t => ({
        type: 'test',
        name: t.name,
        result: { state: t.state },
      })),
    })),
  };
}

function writeArchivedRun(archiveDir, date, runId, files) {
  const runDir = path.join(archiveDir, date, runId);
  fs.mkdirSync(runDir, { recursive: true });
  const result = { files };
  const json = stringify(result);
  const gz = zlib.gzipSync(json, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(path.join(runDir, 'html.meta.json.gz'), gz);
}

function makeArchive() {
  const archiveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-archive-'));
  // 3 archived nights, each with:
  //  - a case that always passes ('src/x/a.it-spec.ts > steady works')
  //  - a case that always fails (known) ('src/x/uploads.it-spec.ts > uploads known broken')
  //  - a case that flips pass/fail (intermittent) ('src/x/b.it-spec.ts > flaky sometimes')
  const nights = [
    { date: '2026-08-15', runId: '1001', bFlaky: 'pass' },
    { date: '2026-08-16', runId: '1002', bFlaky: 'fail' },
    { date: '2026-08-17', runId: '1003', bFlaky: 'pass' },
  ];
  for (const night of nights) {
    writeArchivedRun(archiveDir, night.date, night.runId, [
      fileTask('src/functional-api/x/a.it-spec.ts', [
        { name: 'steady', tests: [{ name: 'works', state: 'pass' }] },
      ]),
      fileTask('src/functional-api/x/uploads.it-spec.ts', [
        {
          name: 'uploads',
          tests: [{ name: 'known broken', state: 'fail' }],
        },
      ]),
      fileTask('src/functional-api/x/b.it-spec.ts', [
        { name: 'flaky', tests: [{ name: 'sometimes', state: night.bFlaky }] },
      ]),
    ]);
  }
  return archiveDir;
}

function runDiff(archiveDir, currentResultsPath, outPath, env = {}) {
  return spawnSync(
    'node',
    [
      SCRIPT,
      '--archive',
      archiveDir,
      '--current',
      currentResultsPath,
      '--out',
      outPath,
      '--server-api-root',
      path.join(REPO_ROOT, 'server-api'),
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, ...env } }
  );
}

test('reproduces the retrospective baseline classes from the archive', () => {
  const archiveDir = makeArchive();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-work-'));
  const currentResults = path.join(workDir, 'results.json');
  const out = path.join(workDir, 'baseline-diff.json');

  fs.writeFileSync(
    currentResults,
    JSON.stringify({
      testResults: [
        {
          name: 'src/functional-api/x/a.it-spec.ts',
          assertionResults: [{ fullName: 'steady works', status: 'passed' }],
        },
        {
          name: 'src/functional-api/x/uploads.it-spec.ts',
          assertionResults: [
            { fullName: 'uploads known broken', status: 'failed' },
          ],
        },
        {
          name: 'src/functional-api/x/b.it-spec.ts',
          assertionResults: [{ fullName: 'flaky sometimes', status: 'passed' }],
        },
      ],
    })
  );

  const result = runDiff(archiveDir, currentResults, out);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const diff = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(diff.archivedRunsRead, 3);
  assert.equal(diff.baselineCaseCount, 3);
  assert.deepEqual(diff.newFail, []);
  assert.deepEqual(diff.stillFailingKnown, [
    'src/functional-api/x/uploads.it-spec.ts > uploads known broken',
  ]);
  assert.deepEqual(diff.intermittent, [
    'src/functional-api/x/b.it-spec.ts > flaky sometimes',
  ]);
  assert.equal(diff.enforced, false);
});

// Regression test for corr-test-suites-3 / spec-ts-3 / qual-test-suites-2: on
// the broken keying, archived cases (absolute filepath from a foreign
// checkout root, ' > '-joined names) never matched current-run cases
// (server-api-relative path, single-space-joined names) — `classes.get()`
// was always `undefined`, so a genuinely known-always-failing case would be
// reported as brand new instead of `stillFailingKnown`. This asserts a real
// archived case actually matches: the always-failing `uploads` case above
// (archived under `/home/runner/_work/.../server-api/...`) must be
// recognised against a current run reporting the SAME case failing again.
test('a known-always-failing archived case matches the current run despite a different checkout root', () => {
  const archiveDir = makeArchive();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-work-'));
  const currentResults = path.join(workDir, 'results.json');
  const out = path.join(workDir, 'baseline-diff.json');

  fs.writeFileSync(
    currentResults,
    JSON.stringify({
      testResults: [
        {
          name: 'src/functional-api/x/uploads.it-spec.ts',
          assertionResults: [
            { fullName: 'uploads known broken', status: 'failed' },
          ],
        },
      ],
    })
  );

  const result = runDiff(archiveDir, currentResults, out);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const diff = JSON.parse(fs.readFileSync(out, 'utf8'));
  // Under the broken keying this case fell into `newCases` and
  // `stillFailingKnown` was always []. Fixed keying must recognise it.
  assert.deepEqual(diff.newCases, []);
  assert.deepEqual(diff.stillFailingKnown, [
    'src/functional-api/x/uploads.it-spec.ts > uploads known broken',
  ]);
});

test('an injected new failure on an always-pass case is flagged as a regression candidate', () => {
  const archiveDir = makeArchive();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-work-'));
  const currentResults = path.join(workDir, 'results.json');
  const out = path.join(workDir, 'baseline-diff.json');

  fs.writeFileSync(
    currentResults,
    JSON.stringify({
      testResults: [
        {
          // Was always-pass in the 3-night baseline — now fails.
          name: 'src/functional-api/x/a.it-spec.ts',
          assertionResults: [{ fullName: 'steady works', status: 'failed' }],
        },
      ],
    })
  );

  const result = runDiff(archiveDir, currentResults, out);
  assert.equal(result.status, 0, result.stdout + result.stderr); // non-gating by default
  const diff = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(diff.newFail, [
    'src/functional-api/x/a.it-spec.ts > steady works',
  ]);
});

test('BASELINE_DIFF_ENFORCE=true fails the process on an unexplained new failure', () => {
  const archiveDir = makeArchive();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-work-'));
  const currentResults = path.join(workDir, 'results.json');
  const out = path.join(workDir, 'baseline-diff.json');

  fs.writeFileSync(
    currentResults,
    JSON.stringify({
      testResults: [
        {
          name: 'src/functional-api/x/a.it-spec.ts',
          assertionResults: [{ fullName: 'steady works', status: 'failed' }],
        },
      ],
    })
  );

  const result = runDiff(archiveDir, currentResults, out, {
    BASELINE_DIFF_ENFORCE: 'true',
  });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  const diff = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(diff.enforced, true);
});
