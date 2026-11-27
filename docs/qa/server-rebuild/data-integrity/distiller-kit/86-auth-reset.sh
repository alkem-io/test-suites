#!/usr/bin/env bash
# 86-auth-reset.sh: one full authorization reset on the experiment database the local server serves, as ONE step:
#   backup before -> start the reset workers -> ask the server for the reset -> wait until the queue is empty ->
#   count worker errors -> stop the workers -> backup after -> what the reset changed (policies, rules).
# Two repairs only take effect after a reset (A6 files moved to another bucket, C8 role definitions), so the flow
# (87-distill-flow.sh) always runs this right after the repairs. Rule of 2026-11-17: a backup after every reset.
# Worker log lines of OidcService are left out of the error count: a worker has no login service to find at start.
# usage: 86-auth-reset.sh <distill_db> <kratos_db> [label]
#   WORKERS_EXTERNAL=1  cluster run: an operator starts the reset workers on the same database before this script and stops
#               them after it. WORKER_LOG_FILE=<file with their logs> lets the script count their errors; without it
#               the count is reported as NOT COUNTED and the flow marks the reset OPEN, never PASS.
#   WORKERS=3   BUILD=1 rebuilds the worker image from the server clone (needed when the server version changed)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); . "$here/lib-who.sh"
db=${1:?usage: 86-auth-reset.sh <distill_db> <kratos_db> [label]}; kdb=${2:?login database}; label=${3:-reset-$(date -u +%Y%m%dT%H%M%SZ)}
case "$db" in distill_*) ;; *) echo "refused: $db is not a distill_ database"; exit 2;; esac
server=${SERVER_DIR:-$HOME/repos/server}; overlay="$here/stack/distill-overlay.yml"; out="$here/runs/$label"; mkdir -p "$out"
served=${ALK_DB:-$(grep -E '^\s*DATABASE_NAME=' "$server/.env" | tail -1 | sed 's/.*=//')}   # ALK_DB: the server was started with DATABASE_NAME in its environment
[ "$served" = "$db" ] || { echo "stop: the local server serves '$served', not $db. Set DATABASE_NAME=$db in the server .env and restart the server (that file is yours; this script does not edit it)."; exit 3; }
[ "${DISTILL_DB:-distill_acc_repaired}" = "$db" ] || { echo "stop: the reset worker in $overlay does not point at $db: export DISTILL_DB=$db"; exit 3; }
Q="docker exec alkemio_dev_rabbitmq rabbitmqctl -q list_queues name messages messages_unacknowledged"
qlen() { $Q 2>/dev/null | awk '$1=="alkemio-auth-reset"{print $2+$3}'; }
pol() { echo "select count(*), md5(string_agg(id::text || coalesce(\"credentialRules\"::text,'') || coalesce(\"privilegeRules\"::text,''), '' order by id)) from authorization_policy" | PSQL_Q "$db"; }
polrows() { echo "copy (select id, md5(coalesce(\"credentialRules\"::text,'') || coalesce(\"privilegeRules\"::text,'')), type from authorization_policy order by id) to stdout" | PSQL_Q "$db"; }
"$here/83-snapshot.sh" need "$db" before-reset
before=$(pol); polrows > "$out/86-policies-before.tsv"
compose() { (cd "$server" && docker compose -f quickstart-services.yml -f "$overlay" --env-file .env.docker --profile auth-reset "$@"); }
compose up -d ${BUILD:+--build} --no-deps --scale auth-reset-worker=${WORKERS:-3} auth-reset-worker > "$out/86-workers.log" 2>&1
started=$(date -u +%Y-%m-%dT%H:%M:%SZ); t0=$(date +%s)
admin=$(who_admin_email "$db" "$kdb") || { echo "stop: no platform admin with a login identity"; exit 3; }
node "$here/79-run-as-user.mjs" "$kdb" "$admin" "$here/86-reset-steps.mjs" > "$out/86-trigger.out" 2>&1 || { cat "$out/86-trigger.out"; exit 4; }
grep -q '"authorizationPolicyResetAll": "ok"' "$out/86-trigger.out" || { echo "stop: the server refused the reset"; cat "$out/86-trigger.out"; exit 4; }
seen=0; idle=0; peak=0
while [ $idle -lt 6 ]; do sleep 10; n=$(qlen); n=${n:-0}; [ "$n" -gt "$peak" ] && peak=$n; [ "$n" -gt 0 ] && seen=1
  if [ "$n" -eq 0 ] && { [ $seen -eq 1 ] || [ $(( $(date +%s) - t0 )) -gt 120 ]; }; then idle=$((idle+1)); else idle=0; fi
  [ $(( $(date +%s) - t0 )) -gt ${MAX_SECONDS:-3600} ] && { echo "stop: the queue did not empty in time"; exit 5; }; done
if [ -n "${WORKERS_EXTERNAL:-}" ]; then   # the operator runs the workers: their logs are not readable from here
  if [ -f "${WORKER_LOG_FILE:-}" ]; then errs=$(grep -v 'OidcService' "$WORKER_LOG_FILE" | grep -c -E '[[:space:]]ERROR|Exception' || true); else errs='NOT COUNTED'; fi
else
errs=0; for c in $(docker ps -a --format '{{.Names}}' | grep auth-reset-worker); do e=$(docker logs --since "$started" "$c" 2>&1 | grep -v 'OidcService' | grep -c -E '[[:space:]]ERROR|Exception' || true); errs=$((errs+e)); done
fi
compose stop auth-reset-worker >> "$out/86-workers.log" 2>&1
after=$(pol); polrows > "$out/86-policies-after.tsv"
"$here/83-snapshot.sh" take "$db" after-reset
{ echo "=== 86 authorization reset: database $db, label $label"
  echo "    queue peak $peak items, minutes $(( ($(date +%s) - t0) / 60 )), worker log lines with error or exception: $errs (expect 0)"
  echo "    policies before | after: ${before%%|*} | ${after%%|*}"
  join -t$'\t' -a1 -a2 -e MISSING -o 0,1.2,2.2,1.3,2.3 "$out/86-policies-before.tsv" "$out/86-policies-after.tsv" | awk -F'\t' '$2!=$3{t=($4=="MISSING"?$5:$4); n[t]++; all++} END{printf "    policies whose rules the reset changed: %d", all+0; for (t in n) printf " | %s %d", t, n[t]; print ""}'
  echo "    a reset on a state that was already reset must change 0 policies"; } | tee "$out/86-reset.out"
