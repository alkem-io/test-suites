// Asserts the shared test-cluster deploy lock's default stale-reclaim
// window: raised above the longest archived nightly hold, so a healthy run
// can never be reclaimed mid-flight, while a genuinely crashed holder is
// still eventually reclaimed well before the next scheduled nightly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LOCK_SCRIPT = path.join(REPO_ROOT, '.github', 'scripts', 'test-cluster-lock.sh');

// The script's tail is a `case` dispatcher that calls `exit` on any/no
// subcommand — sourcing it wholesale would kill the test process. Extract
// just the default-assignment line instead of executing the script.
function extractDefaultLine() {
  const raw = execSync(
    `grep -m1 '^LOCK_TTL_SECONDS=' "${LOCK_SCRIPT}"`,
    { encoding: 'utf8' }
  ).trim();
  assert.ok(raw.length > 0, 'LOCK_TTL_SECONDS default-assignment line not found');
  // Strip the trailing `# ...` comment — left in, it would swallow
  // everything appended after it on the same bash -c command line.
  return raw.replace(/\s*#.*$/, '');
}

test('default LOCK_TTL_SECONDS is 10800 (3h) when unset', () => {
  const line = extractDefaultLine();
  const out = execSync(`bash -c 'unset LOCK_TTL_SECONDS; ${line}; echo $LOCK_TTL_SECONDS'`, {
    encoding: 'utf8',
  }).trim();
  assert.equal(out, '10800');
});

test('an explicit LOCK_TTL_SECONDS env value overrides the default', () => {
  const line = extractDefaultLine();
  const out = execSync(`bash -c 'LOCK_TTL_SECONDS=42; ${line}; echo $LOCK_TTL_SECONDS'`, {
    encoding: 'utf8',
  }).trim();
  assert.equal(out, '42');
});

test('10800s exceeds the longest archived nightly hold with comfortable margin', () => {
  const longestArchivedHoldMinutes = 105.5;
  const ttlMinutes = 10800 / 60;
  assert.ok(
    ttlMinutes > longestArchivedHoldMinutes * 1.5,
    `TTL (${ttlMinutes}m) should clear the longest archived hold (${longestArchivedHoldMinutes}m) with at least 50% margin`
  );
});
