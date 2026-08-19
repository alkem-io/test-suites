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
  assert.match(combined, /rule 1/);
  assert.match(combined, /getMails/);
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
  assert.match(combined, /rule 1/);
  assert.match(combined, /getMails/);
  // Hop path must show the class's own file — proving the class body itself
  // (not just its file) was taint-seeded and the qualified call
  // `RiskyClass.doRiskyThing()` was resolved back to it.
  assert.match(combined, /risky-class\.ts/);
});

test('(g) hazard reached through `const { getMails } = await import(...)`', () => {
  const { status, combined } = runGuard('dynamic-import-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 1/);
  assert.match(combined, /getMails/);
});

test('(h) hazard reached through `import * as hz` used inside a helper', () => {
  const { status, combined } = runGuard('namespace-helper-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 1/);
  assert.match(combined, /getMails/);
  assert.match(combined, /helper\.ts/);
});

test('(i) the manifest file itself calls the hazard symbol via a namespace import', () => {
  const { status, combined } = runGuard('namespace-direct-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 1/);
  assert.match(combined, /getMails/);
});

// qual-test-suites-4: rules 4/5 (content scans catching false-green
// vacuous-pass assertions) previously had NO self-test at all, so a
// typo'd or narrowed CONTENT_RULES pattern would silently pass every
// fixture and the real tree alike. Rule 5's fixture was rewritten in place
// (040-parallel-nightly-server-api, fifth pass) when the rule itself was
// renarrowed off "shared-identity aggregate" (neutralised by per-worker
// identity pools) onto "exact non-zero count off the async autoInvite
// flow" (a load-timing hazard the pools don't touch) — same test name/id,
// different mechanism.
test('(j) an exact non-zero count off the async autoInvite flow trips rule 5', () => {
  const { status, combined } = runGuard('content-rule-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 5/);
});

// Rule 2's convergent-setup / order-dependent-mutation split (an idempotent,
// already-has-it-guarded grant converges regardless of concurrent ordering,
// so was ACCEPTED into the parallel lane; a revocation never converges, so
// was REJECTED regardless of import shape) had five fixtures/tests here:
// (k) guarded-grant-safe, (l) revoke-direct-hazard, (m) revoke-class-hazard,
// (n) revoke-namespace-hazard, (o) revoke-dynamic-import-hazard. Rules 2 and
// 6 are REMOVED (040-parallel-nightly-server-api, fifth pass — per-worker
// identity pools eliminate the shared-identity premise both rules existed
// to catch; see validate-parallel-lanes.ts's module docstring), so all five
// are removed with them rather than kept testing a mechanism that no longer
// exists.
//
// Rule 7 (assertion on a shared user's platform-role state) had test (p)
// role-assertion-hazard; rule 8 (assertion on a shared user's
// roleSet-membership state) had test (r) roleset-membership-assertion-hazard.
// Both rules are REMOVED for the same reason — removed with their fixtures.
//
// Rule 5's old case-insensitivity fix (test (q)
// content-rule-case-hazard, 2026-08-18) proved the guard caught
// `getCommunityApplicationsInvitations` via a capitalized-substring match on
// the old `communityApplications|...` pattern. Rule 5 is RENARROWED (not
// removed) to a completely different pattern (an exact non-zero count off
// the async `autoInvite` flow — see test (j) content-rule-hazard, updated
// in place) that has nothing to do with case sensitivity, so this fixture
// no longer proves anything about the rule as it now stands and is removed
// rather than kept as a test of dead behaviour.
//
// Rule 10 (the DDT privileged-success idiom) had test (ac)
// ddt-privileged-success-hazard. Removed for the same shared-identity
// reason as rules 2/6/7/8.

// The exclusion mechanism (workspace#040): NIGHTLY_EXCLUDE is an explicit,
// documented lane-scope removal — a file listed there must land in NEITHER
// lane, the partition proof must still be exact over (NIGHTLY_INCLUDE minus
// NIGHTLY_EXCLUDE), and a stale entry (matching no file on disk) must fail
// the guard rather than silently becoming a no-op.

test('(s) an excluded file lands in neither lane, and the partition still proves', () => {
  const { status, stdout } = runGuard('exclude-neither-lane', [
    '--emit-lanes',
    path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-exclude-lanes.json'),
  ]);
  assert.equal(status, 0, stdout);
  assert.match(stdout, /nightly total:\s+2/);
  assert.match(stdout, /parallel lane:\s+1/);
  assert.match(stdout, /serial lane:\s+1/);
  assert.match(stdout, /excluded:\s+1/);

  const emitted = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-exclude-lanes.json'),
      'utf8'
    )
  );
  assert.deepEqual(emitted.parallel, ['src/functional-api/account/safe.it-spec.ts']);
  assert.deepEqual(emitted.serial, ['src/functional-api/account/other.it-spec.ts']);
  // The excluded file must appear in neither emitted lane.
  assert.ok(!emitted.parallel.includes('src/functional-api/account/excluded.it-spec.ts'));
  assert.ok(!emitted.serial.includes('src/functional-api/account/excluded.it-spec.ts'));
  fs.unlinkSync(
    path.join(REPO_ROOT, 'scripts', '__fixtures__', 'lanes', '.tmp-exclude-lanes.json')
  );
});

// 040-parallel-nightly-server-api, fourth pass: a real two-lane run found
// a file the guard had certified parallel-safe that actually interferes
// under concurrency. Root-caused to a content-rule gap — rule 9 survives
// the fifth pass's per-worker-identity re-derivation unchanged (the
// roleSet conversion window is a real server-side race independent of
// identity sharing), so this fixture still proves it fires.

test('(ab) a roleSet member/lead/admin list read off a conversion mutation trips the new rule 9', () => {
  const { status, combined } = runGuard('roleset-aggregate-post-conversion-hazard');
  assert.notEqual(status, 0, combined);
  assert.match(combined, /risky\.it-spec\.ts/);
  assert.match(combined, /rule 9/);
});

test('(t) a NIGHTLY_EXCLUDE entry matching no file on disk fails the guard closed', () => {
  const { status, combined } = runGuard('exclude-stale-entry');
  assert.notEqual(status, 0);
  assert.match(combined, /NIGHTLY_EXCLUDE/);
  assert.match(combined, /renamed-away\.it-spec\.ts/);
  assert.match(combined, /does not exist on disk/);
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

// resolveNightlyWorkers — the hybrid explicit-intent/CPU-percentage-ceiling
// rule (040-parallel-nightly-server-api). `cpus` is always pinned via
// NIGHTLY_TEST_CPUS so these assertions never depend on the host machine's
// real core count.
const RESOLVE_CLI = path.join(FIXTURES, 'resolve-workers-cli.mjs');

function runResolve(requested, capPercent, cpus) {
  const env = { ...process.env };
  if (requested === undefined) delete env.NIGHTLY_MAX_WORKERS_TEST_INPUT;
  else env.NIGHTLY_MAX_WORKERS_TEST_INPUT = requested;
  if (capPercent === undefined) delete env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT_TEST_INPUT;
  else env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT_TEST_INPUT = capPercent;
  if (cpus === undefined) delete env.NIGHTLY_TEST_CPUS;
  else env.NIGHTLY_TEST_CPUS = String(cpus);

  const result = spawnSync('pnpm', ['exec', 'tsx', RESOLVE_CLI, REPO_ROOT], {
    cwd: path.join(REPO_ROOT, 'server-api'),
    encoding: 'utf8',
    env,
  });
  const parsed = JSON.parse((result.stdout || '').trim().split('\n').pop());
  return { ...parsed, stderr: result.stderr ?? '' };
}

test('(u) resolveNightlyWorkers: requested < cap — cap does not bind', () => {
  // 8 cpus @ 75% -> cpuCap = floor(8*0.75) = 6
  const { ok, result } = runResolve('5', '75', 8);
  assert.equal(ok, true);
  assert.deepEqual(result, {
    requested: 5,
    cpuCap: 6,
    cpus: 8,
    effective: 5,
    capped: false,
  });
});

test('(v) resolveNightlyWorkers: requested > cap — cap binds, effective=cap, CAPPED', () => {
  const { ok, result } = runResolve('99', '75', 8); // cpuCap = 6
  assert.equal(ok, true);
  assert.deepEqual(result, {
    requested: 99,
    cpuCap: 6,
    cpus: 8,
    effective: 6,
    capped: true,
  });
});

test('(w) resolveNightlyWorkers: cap percent unset defaults to 75', () => {
  const { ok, result } = runResolve('5', undefined, 8);
  assert.equal(ok, true);
  assert.equal(result.cpuCap, 6); // floor(8*0.75)
});

test('(x) resolveNightlyWorkers: empty string for either var is treated as unset, not invalid', () => {
  const requestedEmpty = runResolve('', '75', 8);
  assert.equal(requestedEmpty.ok, true);
  assert.equal(requestedEmpty.result.requested, 1);

  const capEmpty = runResolve('5', '', 8);
  assert.equal(capEmpty.ok, true);
  assert.equal(capEmpty.result.cpuCap, 6); // default 75%
  assert.equal(capEmpty.result.capped, false);
});

test('(y) resolveNightlyWorkers: invalid values throw naming the offending variable', () => {
  const cases = [
    { requested: 'banana', capPercent: '75', namedVar: 'NIGHTLY_MAX_WORKERS(?!_CPU)' },
    { requested: '0', capPercent: '75', namedVar: 'NIGHTLY_MAX_WORKERS(?!_CPU)' },
    { requested: '-1', capPercent: '75', namedVar: 'NIGHTLY_MAX_WORKERS(?!_CPU)' },
    { requested: '5', capPercent: 'banana', namedVar: 'NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT' },
    { requested: '5', capPercent: '0', namedVar: 'NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT' },
    { requested: '5', capPercent: '-1', namedVar: 'NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT' },
    { requested: '5', capPercent: '101', namedVar: 'NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT' },
  ];
  for (const { requested, capPercent, namedVar } of cases) {
    const { ok, message } = runResolve(requested, capPercent, 8);
    assert.equal(ok, false, `requested=${requested} capPercent=${capPercent} should throw`);
    assert.match(
      message,
      new RegExp(namedVar),
      `requested=${requested} capPercent=${capPercent}: ${message}`
    );
  }
});

test('(z) resolveNightlyWorkers: effective is never 0 or negative even at tiny cpu counts / tiny percentages', () => {
  // 1 cpu @ 1% -> cpuCap = max(1, floor(1*0.01)) = max(1, 0) = 1
  const tinyPercent = runResolve('50', '1', 1);
  assert.equal(tinyPercent.ok, true);
  assert.equal(tinyPercent.result.cpuCap, 1);
  assert.equal(tinyPercent.result.effective, 1);
  assert.ok(tinyPercent.result.effective >= 1);

  // requested itself at the floor, cap generous — still >= 1, never 0.
  const tinyRequested = runResolve('1', '100', 1);
  assert.equal(tinyRequested.ok, true);
  assert.equal(tinyRequested.result.effective, 1);
});

test('(aa) vitest.config.ts: serial lane maxWorkers stays hard-pinned at 1, independent of both env vars, with a distinct groupOrder from the parallel lane', () => {
  const configSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'server-api', 'vitest.config.ts'),
    'utf8'
  );

  const serialIdx = configSrc.indexOf("name: 'nightly-serial'");
  assert.ok(serialIdx >= 0, 'nightly-serial project not found in vitest.config.ts');
  const serialTail = configSrc.slice(serialIdx);

  const serialMaxWorkers = serialTail.match(/maxWorkers:\s*([^,\n]+),/);
  assert.ok(serialMaxWorkers, 'no maxWorkers found for nightly-serial');
  assert.equal(
    serialMaxWorkers[1].trim(),
    '1',
    'nightly-serial maxWorkers must be the literal 1, never derived from resolveNightlyWorkers/NIGHTLY_MAX_WORKERS*'
  );

  const parallelGroupOrder = configSrc.match(
    /name: 'nightly-parallel'[\s\S]*?groupOrder:\s*(\d+)/
  );
  const serialGroupOrder = serialTail.match(/groupOrder:\s*(\d+)/);
  assert.ok(parallelGroupOrder && serialGroupOrder);
  assert.notEqual(
    parallelGroupOrder[1],
    serialGroupOrder[1],
    'nightly-parallel and nightly-serial must keep different sequence.groupOrder values'
  );
});
