// Self-tests for the skip-citation guard
// (server-api/src/scripts/validate-skip-citations.ts). Runs the guard as a
// child process (`tsx ... --root <fixture>`) against throwaway fixture
// trees under __fixtures__/skip-citations/ — each fixture supplies its own
// server-api/src/functional-api/**/*.it-spec.ts source and its own
// server-api/src/scripts/skip-citation-allowlist.ts, so these prove the
// guard's mechanism (citation-window detection, allowlist matching,
// fail-closed staleness, scope of what counts as an unconditional skip)
// without touching the real ~130-file functional-api tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(
  REPO_ROOT,
  'server-api',
  'src',
  'scripts',
  'validate-skip-citations.ts'
);
const FIXTURES = path.join(__dirname, '__fixtures__', 'skip-citations');

function runGuard(fixtureName) {
  const root = path.join(FIXTURES, fixtureName, 'server-api');
  const result = spawnSync('pnpm', ['exec', 'tsx', GUARD, '--root', root], {
    cwd: path.join(REPO_ROOT, 'server-api'),
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    combined: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  };
}

test('clean tree — no skips at all, guard exits 0', () => {
  const { status, combined } = runGuard('clean-tree');
  assert.equal(status, 0, combined);
  assert.match(combined, /unconditional skips:\s*0/);
  assert.match(combined, /OK — every unconditional skip is cited or grandfathered/);
});

test('a documented skip (citation directly above) passes', () => {
  const { status, combined } = runGuard('documented-skip');
  assert.equal(status, 0, combined);
  assert.match(combined, /documented:\s*1/);
  assert.match(combined, /grandfathered:\s*0/);
});

test('an undocumented skip with no allowlist entry FAILS, naming file, line, and title', () => {
  const { status, combined } = runGuard('undocumented-skip');
  assert.notEqual(status, 0);
  assert.match(combined, /a\.it-spec\.ts:3/);
  assert.match(combined, /test\.skip\("should do the undocumented thing"\)/);
  assert.match(combined, /has no bug\/issue citation/);
});

test('an undocumented skip matching an UNDOCUMENTED_SKIPS entry passes (grandfathered)', () => {
  const { status, combined } = runGuard('allowlisted-skip');
  assert.equal(status, 0, combined);
  assert.match(combined, /grandfathered:\s*1/);
});

test('an allowlist entry matching no live skip FAILS closed (stale entry)', () => {
  const { status, combined } = runGuard('stale-allowlist-entry');
  assert.notEqual(status, 0);
  assert.match(combined, /UNDOCUMENTED_SKIPS: entry for "src\/functional-api\/x\/a\.it-spec\.ts"/);
  assert.match(combined, /no longer matches any undocumented skip/);
});

test('conditional/environment skips (skipIf, runtime ctx.skip) are ignored entirely', () => {
  const { status, combined } = runGuard('conditional-skip-ignored');
  assert.equal(status, 0, combined);
  assert.match(combined, /unconditional skips:\s*0/);
});

test('.todo is scanned for visibility but never requires a citation', () => {
  const { status, combined } = runGuard('todo-not-checked');
  assert.equal(status, 0, combined);
  assert.match(combined, /unconditional skips:\s*0/);
  assert.match(combined, /\.todo \(not checked\):\s*2/);
});

test('xit/xdescribe are recognized as unconditional skips — documented one passes, undocumented one fails', () => {
  const { status, combined } = runGuard('xalias-forms');
  assert.notEqual(status, 0);
  assert.match(combined, /unconditional skips:\s*2/);
  assert.match(combined, /documented:\s*1/);
  assert.match(combined, /xit\("an undocumented jest-compat disabled test"\)/);
});

test('a duplicate UNDOCUMENTED_SKIPS entry FAILS the guard', () => {
  const { status, combined } = runGuard('duplicate-allowlist-entry');
  assert.notEqual(status, 0);
  assert.match(combined, /UNDOCUMENTED_SKIPS: duplicate entry/);
});

test('test.skip.each (tagged-template form) is recognized and its citation window works', () => {
  const { status, combined } = runGuard('each-form-documented');
  assert.equal(status, 0, combined);
  assert.match(combined, /unconditional skips:\s*1/);
  assert.match(combined, /documented:\s*1/);
});

test('a commented-out skip (// test.skip(...)) is dead code, not a live skip', () => {
  const { status, combined } = runGuard('commented-out-skip');
  assert.equal(status, 0, combined);
  assert.match(combined, /unconditional skips:\s*0/);
});

test('the real functional-api tree passes with exactly the 23 grandfathered entries', () => {
  const result = spawnSync('pnpm', ['exec', 'tsx', GUARD], {
    cwd: path.join(REPO_ROOT, 'server-api'),
    encoding: 'utf8',
  });
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert.equal(result.status, 0, combined);
  assert.match(combined, /grandfathered:\s*23/);
});
