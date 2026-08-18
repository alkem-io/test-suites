// Fixture-driven verdict-logic tests for nightly-serial-confirm.mjs
// Each case is self-contained: a throwaway server-api-root
// temp dir, an inline results.json (main run) + lanes.json, and — where the
// script would re-run tests — a `--rerun-stub` standing in for a live
// vitest invocation so these run hermetically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'nightly-serial-confirm.mjs');

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'serial-confirm-'));
  fs.mkdirSync(path.join(root, 'html-report'), { recursive: true });
  return root;
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function run(root, resultsPath, lanesPath, extraArgs = []) {
  const args = [
    SCRIPT,
    '--results',
    resultsPath,
    '--lanes',
    lanesPath,
    '--server-api-root',
    root,
    ...extraArgs,
  ];
  const result = spawnSync('node', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return result;
}

function readOutcome(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'html-report', 'serial-confirm.json'), 'utf8')
  );
}

test('pass-all — no failures, exit 0, no re-run', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  const lanes = path.join(root, 'lanes.json');
  writeJson(results, {
    testResults: [
      { name: 'src/functional-api/x/a.it-spec.ts', status: 'passed' },
      { name: 'src/functional-api/x/b.it-spec.ts', status: 'passed' },
    ],
  });
  writeJson(lanes, {
    parallel: ['src/functional-api/x/a.it-spec.ts'],
    serial: ['src/functional-api/x/b.it-spec.ts'],
  });

  const result = run(root, results, lanes);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'pass');
  assert.deepEqual(outcome.rerunFiles, []);
});

test('fail-serial — a serial-lane failure is final, never re-run', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  const lanes = path.join(root, 'lanes.json');
  writeJson(results, {
    testResults: [
      {
        name: 'src/functional-api/x/serial-file.it-spec.ts',
        status: 'failed',
        assertionResults: [{ fullName: 'breaks', status: 'failed' }],
      },
    ],
  });
  writeJson(lanes, {
    parallel: [],
    serial: ['src/functional-api/x/serial-file.it-spec.ts'],
  });

  const result = run(root, results, lanes);
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'fail');
  assert.deepEqual(outcome.rerunFiles, []);
  assert.deepEqual(outcome.serialFailures, [
    'src/functional-api/x/serial-file.it-spec.ts',
  ]);
});

test('fail-parallel / pass-serial — interference, build stays green, ledger gets an entry', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  const lanes = path.join(root, 'lanes.json');
  const rerunStub = path.join(root, 'rerun-stub.json');
  writeJson(results, {
    testResults: [
      {
        name: 'src/functional-api/x/flaky.it-spec.ts',
        status: 'failed',
        assertionResults: [{ fullName: 'flakes under load', status: 'failed' }],
      },
    ],
  });
  writeJson(lanes, {
    parallel: ['src/functional-api/x/flaky.it-spec.ts'],
    serial: [],
  });
  writeJson(rerunStub, {
    testResults: [
      { name: 'src/functional-api/x/flaky.it-spec.ts', status: 'passed' },
    ],
  });

  const result = run(root, results, lanes, ['--rerun-stub', rerunStub, '--run-id', 'r1', '--run-date', '2026-08-18']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'pass');
  assert.deepEqual(outcome.rerunFiles, ['src/functional-api/x/flaky.it-spec.ts']);
  assert.equal(outcome.verdictPerFile['src/functional-api/x/flaky.it-spec.ts'], 'pass');

  const ledger = JSON.parse(
    fs.readFileSync(path.join(root, 'html-report', 'interference-ledger.json'), 'utf8')
  );
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].file, 'src/functional-api/x/flaky.it-spec.ts');
  assert.deepEqual(ledger[0].tests, ['flakes under load']);
});

test('fail-parallel / fail-serial-rerun — a genuine failure stays red', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  const lanes = path.join(root, 'lanes.json');
  const rerunStub = path.join(root, 'rerun-stub.json');
  writeJson(results, {
    testResults: [
      { name: 'src/functional-api/x/broken.it-spec.ts', status: 'failed' },
    ],
  });
  writeJson(lanes, {
    parallel: ['src/functional-api/x/broken.it-spec.ts'],
    serial: [],
  });
  writeJson(rerunStub, {
    testResults: [
      { name: 'src/functional-api/x/broken.it-spec.ts', status: 'failed' },
    ],
  });

  const result = run(root, results, lanes, ['--rerun-stub', rerunStub]);
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'fail');
  assert.equal(outcome.verdictPerFile['src/functional-api/x/broken.it-spec.ts'], 'fail');

  const ledgerPath = path.join(root, 'html-report', 'interference-ledger.json');
  const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : [];
  assert.equal(ledger.length, 0);
});

test('rerun-crash — the confirm re-run itself crashing is treated as failure (fail-closed)', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  const lanes = path.join(root, 'lanes.json');
  writeJson(results, {
    testResults: [
      { name: 'src/functional-api/x/crashy.it-spec.ts', status: 'failed' },
    ],
  });
  writeJson(lanes, {
    parallel: ['src/functional-api/x/crashy.it-spec.ts'],
    serial: [],
  });

  const result = run(root, results, lanes, ['--rerun-crash']);
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'fail');
  assert.equal(outcome.crashed, true);
  assert.equal(outcome.verdictPerFile['src/functional-api/x/crashy.it-spec.ts'], 'fail');
});

test('missing lanes.json — fails closed rather than assuming a pass', () => {
  const root = makeRoot();
  const results = path.join(root, 'results.json');
  writeJson(results, { testResults: [] });
  const missingLanes = path.join(root, 'does-not-exist.json');

  const result = run(root, results, missingLanes);
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  const outcome = readOutcome(root);
  assert.equal(outcome.finalExitVerdict, 'fail');
  assert.equal(outcome.crashed, true);
});
