#!/usr/bin/env bash
# Durable regression runner for the two-lane nightly split, meant to run
# against a live local stack (quickstart services + `pnpm start:dev` in the
# sibling `server/` clone). Verifies, in one invocation:
#   - a single globalSetup (one "[globalSetup] Starting global test setup..."
#     line) regardless of the parallel lane's worker count
#   - the shared user pool mints exactly once, regardless of worker count —
#     the mint count must equal the pool's own declared size ([auth] pool
#     size: N), not a fixed number (the pool is free to grow)
#   - the "[nightly] lanes: ..." line matches the requested worker count
#   - one merged html-report/ + results.json covering every requested file
#
# Usage:
#   scripts/nightly-lanes-smoke.sh                 # W=2 smoke on a bounded subset
#   NIGHTLY_MAX_WORKERS=1 scripts/nightly-lanes-smoke.sh --serial-only
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/server-api"

SERIAL_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --serial-only) SERIAL_ONLY=true ;;
  esac
done

LOG_FILE="$(mktemp)"
trap 'rm -f "$LOG_FILE"' EXIT

if [ "$SERIAL_ONLY" = true ]; then
  echo "== nightly-lanes-smoke: serial lane only (behaviour-identical semantics) =="
  NIGHTLY_MAX_WORKERS=1 pnpm exec vitest run --project nightly-serial 2>&1 | tee "$LOG_FILE"
else
  WORKERS="${NIGHTLY_MAX_WORKERS:-2}"
  echo "== nightly-lanes-smoke: bounded parallel subset at NIGHTLY_MAX_WORKERS=${WORKERS} =="
  NIGHTLY_MAX_WORKERS="$WORKERS" pnpm exec vitest run --project nightly-parallel \
    src/functional-api/callout src/functional-api/activity-logs src/functional-api/templates \
    2>&1 | tee "$LOG_FILE"
fi

echo
echo "== assertions =="

SETUP_COUNT=$(grep -c '\[globalSetup\] Starting global test setup\.\.\.' "$LOG_FILE" || true)
echo "globalSetup invocations logged: ${SETUP_COUNT} (expect exactly 1 to have done real work — repeats after the first are the inherited-per-project no-op)"

# The invariant is "the shared pool mints exactly once per run", not "the
# pool has exactly N members" — the expected count is derived from the
# pool's own declared size ([auth] pool size: N, printed once by
# TestUserManager.populateUserModelMap() from Object.keys(TestUser).length),
# never hardcoded here, so growing the pool never requires touching this
# assertion while a duplicate mint still fails it.
EXPECTED_POOL_MINTS=$(grep -oP '(?<=\[auth\] pool size: )\d+' "$LOG_FILE" | head -n1 || true)
if [ -z "$EXPECTED_POOL_MINTS" ]; then
  echo "FAIL: no '[auth] pool size: N' line found in the run log"
  exit 1
fi

# Counts only the (pool)-tagged mints — the shared-pool users minted once by
# populateUserModelMap(). (prereq)/(ad-hoc)-tagged mints are a separate,
# independent cadence and are deliberately excluded.
MINT_COUNT=$(grep -c '\[auth\] minted token for .* (pool)' "$LOG_FILE" || true)
if [ "$MINT_COUNT" -ne "$EXPECTED_POOL_MINTS" ]; then
  echo "FAIL: expected exactly ${EXPECTED_POOL_MINTS} shared-pool mint lines (the pool's own declared size, minted once), found ${MINT_COUNT}"
  exit 1
fi
echo "OK: ${MINT_COUNT} shared-pool token mints (matches declared pool size)"

if ! grep -q '\[nightly\] lanes: ' "$LOG_FILE"; then
  echo "FAIL: no [nightly] lanes: log line found"
  exit 1
fi
grep '\[nightly\] lanes: ' "$LOG_FILE"
echo "OK: lane/worker log line present"

if [ ! -f html-report/results.json ]; then
  echo "FAIL: html-report/results.json not produced"
  exit 1
fi
echo "OK: merged report present at html-report/results.json"

echo
echo "nightly-lanes-smoke: PASS"
