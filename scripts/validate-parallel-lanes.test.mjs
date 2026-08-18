// Self-tests for the nightly lane guard (server-api/src/scripts/validate-parallel-lanes.ts).
// Runs the guard as a child process (`tsx ... --root <fixture>`) against
// throwaway fixture trees under __fixtures__/lanes/ — proving the mechanism
// (partition, transitive taint, default-serial, fail-closed staleness)
// without touching the real 106-file nightly tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(
  REPO_ROOT,
  'server-api',
  'src',
  'scripts',
  'validate-parallel-lanes.ts'
);
const FIXTURES = path.join(__dirname, '__fixtures__', 'lanes');

function runGuard(fixtureName, extraArgs = [], env = {}) {
  const root = path.join(FIXTURES, fixtureName, 'server-api');
  const result = spawnSync(
    'pnpm',
    ['exec', 'tsx', GUARD, '--root', root, ...extraArgs],
    {
      cwd: path.join(REPO_ROOT, 'server-api'),
      encoding: 'utf8',
      env: { ...process.env, ...env },
    }
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    combined: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  };
}

test('(a) clean tree — guard exits 0', () => {
  const { status, combined } = runGuard('clean-tree');
  assert.equal(status, 0, combined);
  assert.match(combined, /OK — partition proven/);
});

test('(b) transitive hazard through a two-hop helper chain — exit != 0, names file + hop path', () => {
  const { status, combined } = runGuard('transitive-hazard');
  assert.notEqual(status, 0);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 2/);
  assert.match(combined, /assignPlatformRole/);
  // Hop path must show BOTH intermediate helpers — proving this isn't just a
  // direct-import check.
  assert.match(combined, /helper1\.ts/);
  assert.match(combined, /helper2\.ts/);
});

test('(c) a brand-new spec file absent from the manifest lands serial', () => {
  const { status, stdout } = runGuard('new-file-defaults-serial', [
    '--emit-lanes',
    path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-lanes.json'),
  ]);
  assert.equal(status, 0, stdout);
  assert.match(stdout, /newcomer\.it-spec\.ts/);

  const emitted = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-lanes.json'),
      'utf8'
    )
  );
  assert.deepEqual(emitted.serial, ['src/functional-api/account/newcomer.it-spec.ts']);
  assert.deepEqual(emitted.parallel, ['src/functional-api/account/safe.it-spec.ts']);
  fs.unlinkSync(
    path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-lanes.json')
  );
});

test('(d) a stale hazard symbol (no longer resolves to an export) fails closed', () => {
  const { status, combined } = runGuard('stale-symbol');
  assert.notEqual(status, 0);
  assert.match(combined, /stale hazard symbol/);
  assert.match(combined, /getMails/);
});

test('(e) parseNightlyWorkers edge cases', () => {
  const cases = [
    { raw: undefined, expect: { ok: true, result: 1 } },
    { raw: '', expect: { ok: true, result: 1 } },
    { raw: '2', expect: { ok: true, result: 2 } },
    { raw: 'banana', expect: { ok: false } },
    { raw: '0', expect: { ok: false } },
    { raw: '-1', expect: { ok: false } },
  ];

  const cliShim = path.join(FIXTURES, 'parse-workers-cli.mjs');
  for (const { raw, expect } of cases) {
    const env = { ...process.env };
    if (raw === undefined) {
      delete env.NIGHTLY_MAX_WORKERS_TEST_INPUT;
    } else {
      env.NIGHTLY_MAX_WORKERS_TEST_INPUT = raw;
    }
    const result = spawnSync(
      'pnpm',
      ['exec', 'tsx', cliShim, REPO_ROOT],
      {
        cwd: path.join(REPO_ROOT, 'server-api'),
        encoding: 'utf8',
        env,
      }
    );
    const parsed = JSON.parse((result.stdout || '').trim().split('\n').pop());
    assert.equal(parsed.ok, expect.ok, `raw=${JSON.stringify(raw)}: ${result.stderr}`);
    if (expect.ok) assert.equal(parsed.result, expect.result);
  }
});
