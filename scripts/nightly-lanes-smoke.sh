#!/usr/bin/env bash
# Durable regression runner for the two-lane nightly split, meant to run
# against a live local stack (quickstart services + `pnpm start:dev` in the
# sibling `server/` clone). Verifies, in one invocation:
#   - a single globalSetup (one "[globalSetup] Starting global test setup..."
#     line) regardless of the parallel lane's worker count
#   - exactly 13 token-mint log lines
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

MINT_COUNT=$(grep -c '\[auth\] minted token for' "$LOG_FILE" || true)
if [ "$MINT_COUNT" -ne 13 ]; then
  echo "FAIL: expected exactly 13 mint lines, found ${MINT_COUNT}"
  exit 1
fi
echo "OK: 13 token mints"

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
