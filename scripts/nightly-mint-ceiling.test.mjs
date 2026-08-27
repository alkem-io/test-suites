// Fixture-driven tests for the "Assert nightly config" step embedded in
// .github/workflows/nightly-build-trigger.yml. The step's bash is extracted
// straight from the real workflow file (not hand-copied into this test) so
// this suite exercises exactly what CI runs and can never silently drift
// from it — the earlier bug class this whole file's neighbor
// (nightly-baseline-diff.test.mjs) had to fix was two sides disagreeing
// about a shared format; this test avoids ever creating a second side.
//
// The finding under test: the mint-count gate's equality check
// (`MINT_COUNT == EXPECTED_POOL_MINTS`) derives EXPECTED_POOL_MINTS from
// the `[auth] pool size: N` log line — printed by the very
// TestUserManager.populateUserModelMap() code path the gate exists to
// police. If that path ever mints the pool twice (the login-storm failure
// mode this gate exists to catch), and does so in a way that also doubles
// the printed pool-size line (e.g. an inflated workerCount feeding both the
// size calculation and the mint loop), the actual and expected mint counts
// move together and the equality check alone cannot see it. The fix adds an
// absolute ceiling — `MINT_COUNT <= 13 * requested` — computed without
// reading anything the run itself printed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github',
  'workflows',
  'nightly-build-trigger.yml'
);

/** Pulls the literal `run:` bash of the "Assert nightly config" step out of the real workflow YAML. */
function extractAssertStepScript() {
  const doc = parseYaml(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const step = doc.jobs['run-e2e-tests'].steps.find(
    s => s.name === 'Assert nightly config'
  );
  assert.ok(step, 'Assert nightly config step not found in the workflow');
  assert.equal(typeof step.run, 'string');
  return step.run;
}

/**
 * Runs the extracted step script against a synthetic fixture: a fake
 * `server-api/lanes.json` + `server-api/html-report/results.json` and a
 * fake run log. The workflow hardcodes `/tmp/nightly-run.log` (the real
 * path in CI); this substitutes a per-test temp-dir path so tests can run
 * concurrently and clean up after themselves. That substitution is the ONLY
 * change made to the script text — every regex, arithmetic expression, and
 * conditional below is the untouched text read from the workflow file.
 */
function runAssertStep({
  parallelN,
  serialM,
  resultCount,
  logLines,
  env = {},
}) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mint-ceiling-'));
  fs.mkdirSync(path.join(workDir, 'server-api', 'html-report'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(workDir, 'server-api', 'lanes.json'),
    JSON.stringify({
      parallel: Array.from({ length: parallelN }, (_, i) => `p${i}.it-spec.ts`),
      serial: Array.from({ length: serialM }, (_, i) => `s${i}.it-spec.ts`),
    })
  );
  fs.writeFileSync(
    path.join(workDir, 'server-api', 'html-report', 'results.json'),
    JSON.stringify({
      testResults: Array.from({ length: resultCount }, (_, i) => ({
        name: `f${i}.it-spec.ts`,
      })),
    })
  );

  const logPath = path.join(workDir, 'nightly-run.log');
  fs.writeFileSync(logPath, logLines.join('\n') + '\n');

  const rawScript = extractAssertStepScript();
  const script = rawScript.split('/tmp/nightly-run.log').join(logPath);

  const result = spawnSync('bash', ['-c', script], {
    cwd: workDir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  fs.rmSync(workDir, { recursive: true, force: true });
  return result;
}

function poolMintLines(count) {
  return Array.from(
    { length: count },
    (_, i) => `[auth] minted token for user${i}@example.com (pool)`
  );
}

test('a healthy single-mint run passes the equality check and the new independent ceiling', () => {
  const requested = 4;
  const poolSize = 13 * requested; // 52 — exactly at the ceiling
  const result = runAssertStep({
    parallelN: 3,
    serialM: 2,
    resultCount: 5,
    env: { NIGHTLY_MAX_WORKERS: String(requested) },
    logLines: [
      `[nightly] lanes: parallel=3 serial=2 maxWorkers=${requested} (requested=${requested} cpuCap=6 of 8 cpus)`,
      `[auth] pool size: ${poolSize}`,
      ...poolMintLines(poolSize),
    ],
  });
  assert.equal(
    result.status,
    0,
    `expected a clean pass; got: ${result.stdout}\n${result.stderr}`
  );
  assert.match(result.stdout, /assert-config OK/);
});

test('a duplicate-mint log fails the new absolute ceiling even though the pool-size line agrees with the mint count (the circularity the equality check alone cannot see)', () => {
  const requested = 4;
  const correctPoolSize = 13 * requested; // 52
  const doubledPoolSize = correctPoolSize * 2; // 104 — the populateUserModelMap
  // path minted the pool twice AND printed a doubled size, so the OLD
  // equality check (MINT_COUNT == EXPECTED_POOL_MINTS, both 104) would have
  // passed this run silently.
  const result = runAssertStep({
    parallelN: 3,
    serialM: 2,
    resultCount: 5,
    env: { NIGHTLY_MAX_WORKERS: String(requested) },
    logLines: [
      `[nightly] lanes: parallel=3 serial=2 maxWorkers=${requested} (requested=${requested} cpuCap=6 of 8 cpus)`,
      `[auth] pool size: ${doubledPoolSize}`,
      ...poolMintLines(doubledPoolSize),
    ],
  });
  assert.notEqual(
    result.status,
    0,
    `expected the ceiling to fail this run; got: ${result.stdout}\n${result.stderr}`
  );
  assert.match(result.stderr + result.stdout, /exceeds the absolute ceiling/);
  // Confirms it is specifically the NEW ceiling catching this, not the old
  // equality check (which by construction agrees: 104 == 104).
  assert.doesNotMatch(
    result.stderr + result.stdout,
    /expected exactly \d+ shared-pool token mints/
  );
});

test('the effective/requested, cpuCap, and OVERSUBSCRIBED-marker checks are unaffected by the ceiling addition', () => {
  const requested = 8;
  const cpus = 8;
  const cpuCap = 6; // 75% of 8, floored
  const poolSize = 13 * requested; // 104 — within ceiling, requested > cpuCap
  const result = runAssertStep({
    parallelN: 3,
    serialM: 2,
    resultCount: 5,
    env: {
      NIGHTLY_MAX_WORKERS: String(requested),
      NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION: 'yes-i-understand-the-risk',
    },
    logLines: [
      `[nightly] lanes: parallel=3 serial=2 maxWorkers=${requested} (requested=${requested} cpuCap=${cpuCap} of ${cpus} cpus, OVERSUBSCRIBED)`,
      `[auth] pool size: ${poolSize}`,
      ...poolMintLines(poolSize),
    ],
  });
  assert.equal(
    result.status,
    0,
    `expected the oversubscription path to still pass with its opt-out set; got: ${result.stdout}\n${result.stderr}`
  );

  // Same fixture but WITHOUT the opt-out env var must still fail — proves
  // that check is untouched by this change.
  const resultNoOptOut = runAssertStep({
    parallelN: 3,
    serialM: 2,
    resultCount: 5,
    env: { NIGHTLY_MAX_WORKERS: String(requested) },
    logLines: [
      `[nightly] lanes: parallel=3 serial=2 maxWorkers=${requested} (requested=${requested} cpuCap=${cpuCap} of ${cpus} cpus, OVERSUBSCRIBED)`,
      `[auth] pool size: ${poolSize}`,
      ...poolMintLines(poolSize),
    ],
  });
  assert.notEqual(resultNoOptOut.status, 0);
  assert.match(
    resultNoOptOut.stderr + resultNoOptOut.stdout,
    /NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION was not set/
  );
});
