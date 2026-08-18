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

// The following four fixtures reproduce the taint-analysis misses found in
// the security review of this guard (sec-test-suites-1): a hazard call made
// from an exported CLASS method, through a dynamic `await import(...)`,
// through a namespace import used inside a helper, and through a namespace
// import used directly in the manifest file. Each must fail against an
// unsound guard and pass (be caught) against the fixed one.

test('(f) hazard call inside an exported CLASS method (the real TestScenarioFactory shape)', () => {
  const { status, combined } = runGuard('class-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 2/);
  assert.match(combined, /assignPlatformRole/);
  // Hop path must show the class's own file — proving the class body itself
  // (not just its file) was taint-seeded and the qualified call
  // `RiskyClass.doRiskyThing()` was resolved back to it.
  assert.match(combined, /risky-class\.ts/);
});

test('(g) hazard reached through `const { assignPlatformRole } = await import(...)`', () => {
  const { status, combined } = runGuard('dynamic-import-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 2/);
  assert.match(combined, /assignPlatformRole/);
});

test('(h) hazard reached through `import * as hz` used inside a helper', () => {
  const { status, combined } = runGuard('namespace-helper-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 2/);
  assert.match(combined, /assignPlatformRole/);
  assert.match(combined, /helper\.ts/);
});

test('(i) the manifest file itself calls the hazard symbol via a namespace import', () => {
  const { status, combined } = runGuard('namespace-direct-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 2/);
  assert.match(combined, /assignPlatformRole/);
});

// qual-test-suites-4: rules 4/5 (the content scan for unscoped global
// aggregates keyed on a shared identity — the guard's only answer to R-2,
// a false-green vacuous-pass assertion) previously had NO self-test at all,
// so a typo'd or narrowed CONTENT_RULES pattern would silently pass every
// fixture and the real tree alike.
test('(j) a global aggregate keyed on a shared identity, asserted by count, trips rule 5', () => {
  const { status, combined } = runGuard('content-rule-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 5/);
});

// The convergent-setup / order-dependent-mutation split of rule 2: an
// idempotent, already-has-it-guarded grant (the REAL TestScenarioFactory
// shape) converges regardless of concurrent ordering and must be ACCEPTED
// into the parallel lane — while a revocation is never convergent and must
// be REJECTED regardless of import shape (direct, class method, namespace
// import, dynamic import) or how guarded it looks.

test('(k) a grant guarded by an already-has-it check converges — ACCEPTED into the parallel lane', () => {
  const { status, combined } = runGuard('guarded-grant-safe');
  assert.equal(status, 0, combined);
  assert.match(combined, /OK — partition proven/);
});

test('(l) a revocation called directly trips the new fail-closed rule 6', () => {
  const { status, combined } = runGuard('revoke-direct-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 6/);
  assert.match(combined, /removePlatformRole/);
});

test('(m) a revocation inside an exported CLASS method trips rule 6 even when guard text is nearby', () => {
  const { status, combined } = runGuard('revoke-class-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 6/);
  assert.match(combined, /removePlatformRole/);
  assert.match(combined, /risky-class\.ts/);
});

test('(n) a revocation reached through a namespace import trips rule 6', () => {
  const { status, combined } = runGuard('revoke-namespace-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 6/);
  assert.match(combined, /removePlatformRole/);
  assert.match(combined, /helper\.ts/);
});

test('(o) a revocation reached through a dynamic import trips rule 6', () => {
  const { status, combined } = runGuard('revoke-dynamic-import-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 6/);
  assert.match(combined, /removePlatformRole/);
});

test('(p) an assertion reading a shared user\'s platform-role state trips rule 7', () => {
  const { status, combined } = runGuard('role-assertion-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 7/);
});

// 2026-08-18 nightly run (workspace#040): a real two-lane run found three
// files the guard had certified parallel-safe actually interfere under
// concurrency. Root-caused to two rule gaps, both fixed as generalised
// rules rather than per-file demotions — these two fixtures prove each
// fix actually fires on the shape that was missed.

test('(q) a capitalized community-invitations wrapper name trips rule 5 (case-insensitive fix)', () => {
  const { status, combined } = runGuard('content-rule-case-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 5/);
});

test('(r) an assertion reading a shared user\'s roleSet-membership state trips the new rule 8', () => {
  const { status, combined } = runGuard('roleset-membership-assertion-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 8/);
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
