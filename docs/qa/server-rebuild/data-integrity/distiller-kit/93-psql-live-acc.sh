#!/usr/bin/env bash
# 93-psql-live-acc.sh: psql against the LIVE acceptance database server, for read-only guard runs (2026-11-19).
#
# Use it as the PSQL prefix of the guard runner, with a port-forward kept open in another shell:
#   while true; do kubectl --context <acceptance context> -n <namespace> port-forward deploy/<database> 55432:5432; sleep 2; done
#   PSQL=./93-psql-live-acc.sh ./run-guards.sh acc-live-<date> alkemio synapse kratos hydra assistant filebackup wopi
#
# Why a wrapper: the acceptance cluster drops the port-forward when a connection closes, and it takes a few seconds
# to come back. Every psql call of the guards would then fail with "connection refused". The wrapper keeps the input,
# holds the output back, and repeats the whole call (up to TRIES times) when psql ends with exit 2, which is "no
# connection". A repeated call starts a new session, so its temp tables start empty: nothing is half done.
# Read-only use: the guard files write temp tables only. This wrapper adds no safety of its own.
# Works against 127.0.0.1 only, so it cannot reach another environment by itself: the port-forward decides.
set -uo pipefail
port=${ACC_PORT:-55432}; tries=${TRIES:-12}
in=$(mktemp); out=$(mktemp); err=$(mktemp); trap 'rm -f "$in" "$out" "$err"' EXIT
# a call that carries its query in -c (or -f <file>) reads no input: do not wait for one
takes=1; prev=""; for a in "$@"; do case "$prev:$a" in -f:-) takes=1;; -f:*) takes=0;; esac; case "$a" in -c|-[!-]*c) takes=0;; esac; prev=$a; done
if [ $takes -eq 0 ] || [ -t 0 ]; then : > "$in"; else cat > "$in"; fi
for i in $(seq 1 "$tries"); do
  psql -h 127.0.0.1 -p "$port" -U "${ACC_PGUSER:?set ACC_PGUSER to the database user of the environment}" "$@" < "$in" > "$out" 2> "$err"; rc=$?
  [ $rc -eq 2 ] || { cat "$out"; cat "$err" >&2; exit $rc; }
  sleep 4
done
cat "$out"; cat "$err" >&2; echo "93: no connection after $tries tries" >&2; exit 2
